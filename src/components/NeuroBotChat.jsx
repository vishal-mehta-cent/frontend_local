r"""
NeuroBot Agentic RAG backend (v1)

- Builds/loads a Chroma vector index from:
  1) A DOCX file (NeuroCrest documentation)
  2) Website pages (https://www.neurocrest.in) - optional crawl

- Runs an agentic pipeline (Planner -> Retrieve -> Draft -> Validate -> Revise)
- Returns BOTH:
  - Markdown answer
  - UI-ready JSON (for professional chat UI rendering)

Environment variables (recommended):
- OPENAI_API_KEY (required)
- NEUROBOT_DOCX_PATH (optional, default auto-detected)
- NEUROBOT_BASE_URL (optional, default: "https://www.neurocrest.in")
- NEUROBOT_MAX_PAGES (optional, default: 20)
- NEUROBOT_INDEX_DIR (optional, default auto-detected)
- NEUROBOT_DISABLE_WEB (optional, "1" disables website crawling)
- NEUROBOT_FORCE_REINDEX (optional, "1" forces rebuilding the vector DB on startup)
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
import json
import os
import re
import threading
import logging
import shutil
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from pydantic import BaseModel, Field, ConfigDict, field_validator, AliasChoices

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.document_loaders import Docx2txtLoader

from langgraph.graph import StateGraph, END


logger = logging.getLogger("neurobot")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


# ---------------------------
# Robust JSON helpers
# ---------------------------

def _extract_json(text: str) -> str:
    """Extract the first JSON object from a model response (handles ```json fences)."""
    if text is None:
        raise ValueError("Empty response (None)")
    s = str(text).strip()

    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", s, flags=re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()

    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end != -1 and end > start:
        return s[start : end + 1].strip()

    return s


def safe_json_loads(text: str) -> Dict[str, Any]:
    return json.loads(_extract_json(text))


# ---------------------------
# Agent schemas
# ---------------------------

class Plan(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    user_intent: str = Field(validation_alias=AliasChoices("user_intent", "intent"))
    subquestions: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("subquestions", "sub_questions", "questions"),
    )
    retrieval_hints: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("retrieval_hints", "hints", "keywords"),
    )
    retrieval_kinds: List[Literal["web", "doc", "both"]] = Field(default_factory=list)
    output_style: Literal["markdown", "ui_json", "both"] = "both"

    @field_validator("subquestions", mode="before")
    @classmethod
    def _coerce_subquestions(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            parts = [p.strip(" -•\t") for p in re.split(r"[\n,]+", v) if p.strip()]
            return parts[:5]
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()][:5]
        return []

    @field_validator("retrieval_hints", mode="before")
    @classmethod
    def _coerce_hints(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            parts = [p.strip() for p in re.split(r"[\n,]+", v) if p.strip()]
            return parts
        if isinstance(v, dict):
            out: List[str] = []
            for val in v.values():
                if isinstance(val, list):
                    out += [str(x) for x in val]
                else:
                    out.append(str(val))
            return [s.strip() for s in out if str(s).strip()]
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        return []

    @field_validator("retrieval_kinds", mode="before")
    @classmethod
    def _coerce_kinds(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            s = v.lower()
            if "both" in s:
                return ["both"]
            out = []
            if "web" in s:
                out.append("web")
            if "doc" in s:
                out.append("doc")
            return out
        if isinstance(v, list):
            out = []
            for x in v:
                xs = str(x).lower().strip()
                if xs in ("web", "doc", "both"):
                    out.append(xs)
            return out
        return []


class ValidationResult(BaseModel):
    verdict: Literal["pass", "revise", "ask_user"]
    issues: List[str] = Field(default_factory=list)
    suggested_fixes: List[str] = Field(default_factory=list)
    missing_info_questions: List[str] = Field(default_factory=list)


class AgentState(BaseModel):
    user_query: str
    plan: Optional[Plan] = None
    retrieved: List[Document] = Field(default_factory=list)
    draft_markdown: Optional[str] = None
    draft_ui: Optional[Dict[str, Any]] = None
    validation: Optional[ValidationResult] = None
    iterations: int = 0
    max_iterations: int = 2


def parse_plan(resp_text: str) -> Plan:
    data = safe_json_loads(resp_text)
    return Plan.model_validate(data)


def parse_validation(resp_text: str) -> ValidationResult:
    data = safe_json_loads(resp_text)
    return ValidationResult.model_validate(data)


# ---------------------------
# Data loading / indexing
# ---------------------------

def load_docx(path: str) -> List[Document]:
    loader = Docx2txtLoader(path)
    docs = loader.load()
    for d in docs:
        d.metadata["source_type"] = "docx"
        d.metadata["source"] = path
    return docs


def is_same_domain(url: str, base: str) -> bool:
    return urlparse(url).netloc == urlparse(base).netloc


def clean_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n")
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if l]
    return "\n".join(lines)


def crawl_site(base_url: str, max_pages: int = 20, timeout: int = 15) -> List[Document]:
    visited = set()
    queue = [base_url]
    docs: List[Document] = []
    headers = {"User-Agent": "NeuroCrestAgentRAG/1.0"}

    while queue and len(visited) < max_pages:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            if r.status_code != 200 or "text/html" not in (r.headers.get("Content-Type", "") or ""):
                continue
            text = clean_text(r.text)
            if len(text) < 400:
                continue

            docs.append(
                Document(
                    page_content=text,
                    metadata={"source_type": "website", "source": url, "url": url},
                )
            )

            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.find_all("a", href=True):
                nxt = urljoin(url, a["href"])
                if is_same_domain(nxt, base_url):
                    nxt = nxt.split("#")[0]
                    if nxt not in visited and nxt not in queue:
                        queue.append(nxt)

        except Exception:
            continue

    return docs


def _ensure_dir(p: str) -> None:
    Path(p).mkdir(parents=True, exist_ok=True)


def _file_manifest(doc_path: str) -> Dict[str, Any]:
    p = Path(doc_path)
    if p.exists():
        st = p.stat()
        return {"path": str(p), "size": st.st_size, "mtime": int(st.st_mtime)}
    return {"path": str(p), "size": None, "mtime": None}


# ---------------------------
# Core RAG Engine (singleton)
# ---------------------------

class NeuroBotEngine:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._ready = False

        self.base_url = os.getenv("NEUROBOT_BASE_URL", "https://www.neurocrest.in")
        self.max_pages = int(os.getenv("NEUROBOT_MAX_PAGES", "20"))
        self.disable_web = os.getenv("NEUROBOT_DISABLE_WEB", "").strip() == "1"
        self.force_reindex = os.getenv("NEUROBOT_FORCE_REINDEX", "").strip() == "1"

        # DOCX path:
        # 1) env var
        # 2) Render disk default (/data/Document.docx)
        # 3) local fallback inside repo
        env_doc = (os.getenv("NEUROBOT_DOCX_PATH") or "").strip()
        if env_doc:
            self.docx_path = env_doc
        else:
            render_doc = "/data/Document.docx"
            local_doc = str(Path(__file__).resolve().parent.parent / "data" / "Document.docx")
            local_doc_old = str(
                Path(__file__).resolve().parent.parent / "data" / "Neuro Crest – Agent Training Knowledge Base (2) (1).docx"
            )
            if Path(render_doc).exists():
                self.docx_path = render_doc
            elif Path(local_doc).exists():
                self.docx_path = local_doc
            else:
                self.docx_path = local_doc_old  # may or may not exist

        # Index dir:
        # 1) env var
        # 2) Render disk default (/data/neurobot_chroma)
        # 3) local storage folder
        env_idx = (os.getenv("NEUROBOT_INDEX_DIR") or "").strip()
        if env_idx:
            self.index_dir = str(Path(env_idx).resolve())
        else:
            if Path("/data").exists():
                self.index_dir = "/data/neurobot_chroma"
            else:
                self.index_dir = str(Path(__file__).resolve().parent / "storage" / "neurobot_chroma")

        # will be set in init()
        self.embeddings: Optional[OpenAIEmbeddings] = None
        self.llm: Optional[ChatOpenAI] = None
        self.llm_json: Optional[Any] = None
        self.retriever: Any = None
        self.app: Any = None

    def init(self) -> None:
        """Initialize model clients + vector index + agent graph. Safe to call multiple times."""
        if self._ready:
            return
        with self._lock:
            if self._ready:
                return

            logger.info("NeuroBot init...")
            logger.info("DOCX path: %s (exists=%s)", self.docx_path, Path(self.docx_path).exists())
            logger.info("Index dir: %s", self.index_dir)
            logger.info("Disable web: %s", self.disable_web)
            logger.info("Force reindex: %s", self.force_reindex)

            self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            self.llm = ChatOpenAI(model="gpt-5-nano", temperature=0.2)

            try:
                self.llm_json = self.llm.bind(response_format={"type": "json_object"})
            except Exception:
                self.llm_json = self.llm

            vs = self._load_or_build_vectorstore()
            self.retriever = vs.as_retriever(search_kwargs={"k": 10})

            self.app = self._build_graph()
            self._ready = True

    def _manifest_path(self) -> str:
        return str(Path(self.index_dir) / "neurobot_manifest.json")

    def _current_manifest(self) -> Dict[str, Any]:
        return {
            "doc": _file_manifest(self.docx_path),
            "base_url": self.base_url,
            "max_pages": self.max_pages,
            "disable_web": self.disable_web,
        }

    def _read_manifest(self) -> Optional[Dict[str, Any]]:
        mp = Path(self._manifest_path())
        if not mp.exists():
            return None
        try:
            return json.loads(mp.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _write_manifest(self, data: Dict[str, Any]) -> None:
        try:
            Path(self._manifest_path()).write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass

    def _reset_index_dir(self) -> None:
        try:
            if Path(self.index_dir).exists():
                shutil.rmtree(self.index_dir, ignore_errors=True)
        except Exception:
            pass
        _ensure_dir(self.index_dir)

    def _load_or_build_vectorstore(self):
        assert self.embeddings is not None
        _ensure_dir(self.index_dir)

        current = self._current_manifest()
        previous = self._read_manifest()

        # If force_reindex is set, or doc changed, rebuild.
        manifest_changed = previous != current
        if self.force_reindex:
            logger.info("NEUROBOT_FORCE_REINDEX=1 → rebuilding index.")
            self._reset_index_dir()
        elif manifest_changed and previous is not None:
            logger.info("Manifest changed (doc updated/config changed) → rebuilding index.")
            self._reset_index_dir()

        # Try load existing
        try:
            vs = Chroma(
                collection_name="neurobot",
                persist_directory=self.index_dir,
                embedding_function=self.embeddings,
            )
            try:
                count = vs._collection.count()
            except Exception:
                count = 0

            if count > 0 and not (self.force_reindex or manifest_changed):
                logger.info("Loaded existing Chroma index (count=%s).", count)
                return vs
        except Exception as e:
            logger.warning("Chroma load failed (will rebuild): %s", e)

        # Build new
        docs: List[Document] = []

        if Path(self.docx_path).exists():
            try:
                docs += load_docx(self.docx_path)
                logger.info("Loaded DOCX chunks from: %s", self.docx_path)
            except Exception as e:
                logger.warning("DOCX load failed: %s", e)
        else:
            logger.warning("DOCX not found at: %s", self.docx_path)

        if not self.disable_web:
            try:
                web_docs = crawl_site(self.base_url, max_pages=self.max_pages)
                docs += web_docs
                logger.info("Crawled %s web pages from %s", len(web_docs), self.base_url)
            except Exception as e:
                logger.warning("Website crawl failed: %s", e)

        if not docs:
            logger.warning("No docs loaded → using bootstrap placeholder.")
            docs = [Document(page_content="NeuroCrest: documentation not loaded.", metadata={"source": "bootstrap"})]

        splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=160)
        chunks = splitter.split_documents(docs)

        vs = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            collection_name="neurobot",
            persist_directory=self.index_dir,
        )

        # Write manifest after successful build
        self._write_manifest(current)

        logger.info("Built Chroma index (chunks=%s) at %s", len(chunks), self.index_dir)
        return vs

    # ---------------------------
    # Prompt templates
    # ---------------------------

    @property
    def PLANNER_SYSTEM(self) -> str:
        return """
You are NeuroBot Planner for NeuroCrest.

Return ONLY a JSON object with EXACTLY these keys (no extra text, no markdown):

{
  "user_intent": "string",
  "subquestions": ["string", "..."],
  "retrieval_hints": ["string", "..."],
  "retrieval_kinds": ["doc"|"web"|"both"],
  "output_style": "markdown"|"ui_json"|"both"
}

Rules:
- Keep subquestions <= 5.
- retrieval_hints must be an ARRAY of strings (not an object/dict).
- If the user asks about pricing, note that prices may change and include hint: "Payments page".
- If the user asks "where/how/why can't I" for a feature, set intent to "navigation/troubleshooting".
"""

    @property
    def ANSWERER_SYSTEM(self) -> str:
        return """
You are NeuroBot, the NeuroCrest AI mentor.

You MUST use ONLY the provided context. If something is not in context, say you don't have it and ask a follow-up.

Write in a crisp, precise style.

You will receive:
- USER QUESTION
- CONTEXT (retrieved chunks with [#] labels)

Formatting rules:
- If the question is "what/which/list/define" → answer as a tight bullet list (3–10 bullets).
- If the question is "how/where/why can't I" → provide step-by-step steps.
- Add a short "Sources" line at the end referencing the chunk numbers you used (e.g., Sources: [1], [4]).

Safety:
- Never promise returns.
- Never give financial advice.
- Never invent pricing, features, WhatsApp numbers, or integrations not present in context.

Output format: Markdown.
"""

    @property
    def UI_FORMATTER_SYSTEM(self) -> str:
        return """
Convert the Markdown answer into a UI-ready JSON.

Return ONLY JSON with keys:
- hero_title (string)
- hero_subtitle (string)
- sections (array of {title, bullets[]})
- next_steps (array of strings)
- quick_replies (array of short chip strings)
"""

    @property
    def VALIDATOR_SYSTEM(self) -> str:
        return """
You are NeuroBot Validator.

Check the answer against the context.
Return ONLY JSON matching:
{
  "verdict": "pass"|"revise"|"ask_user",
  "issues": ["..."],
  "suggested_fixes": ["..."],
  "missing_info_questions": ["..."]
}

Criteria:
- Grounded: no invented details
- Helpful: answers + steps + follow-ups
- Safe: no financial advice, no guaranteed returns
If missing needed info: verdict="ask_user"
If fixable: verdict="revise"
If good: verdict="pass"
"""

    @property
    def REVISER_SYSTEM(self) -> str:
        return """
You are NeuroBot Reviser.
Revise the answer using validator feedback.
Stay grounded in context only.
Keep UI-friendly Markdown formatting.
"""

    # ---------------------------
    # Nodes
    # ---------------------------

    def _pack_context(self, docs: List[Document], max_chars: int = 9000) -> str:
        out = []
        total = 0
        for i, d in enumerate(docs, 1):
            src = d.metadata.get("source", "source")
            block = f"[{i}] SOURCE: {src}\n{d.page_content.strip()}\n"
            if total + len(block) > max_chars:
                break
            out.append(block)
            total += len(block)
        return "\n---\n".join(out)

    def planner_node(self, state: AgentState) -> AgentState:
        client = self.llm_json or self.llm
        resp = client.invoke([("system", self.PLANNER_SYSTEM), ("user", state.user_query)]).content
        state.plan = parse_plan(resp)
        return state

    def retrieve_node(self, state: AgentState) -> AgentState:
        queries: List[str] = []
        if state.plan:
            queries.extend(state.plan.subquestions)
            queries.extend(state.plan.retrieval_hints)
        if not queries:
            queries = [state.user_query]

        retrieved: List[Document] = []
        for q in queries[:6]:
            try:
                if hasattr(self.retriever, "invoke"):
                    docs = self.retriever.invoke(q)
                else:
                    docs = self.retriever.get_relevant_documents(q)
            except Exception:
                docs = []
            retrieved.extend(docs)

        # de-dup
        seen = set()
        uniq: List[Document] = []
        for d in retrieved:
            key = (d.metadata.get("source"), d.page_content[:160])
            if key not in seen:
                seen.add(key)
                uniq.append(d)

        state.retrieved = uniq[:10]
        return state

    def answerer_node(self, state: AgentState) -> AgentState:
        context = self._pack_context(state.retrieved)
        user_payload = f"""USER QUESTION:
{state.user_query}

CONTEXT:
{context}
"""
        md = self.llm.invoke([("system", self.ANSWERER_SYSTEM), ("user", user_payload)]).content
        state.draft_markdown = md

        if state.plan and state.plan.output_style in ("ui_json", "both"):
            ui_json_str = (self.llm_json or self.llm).invoke([("system", self.UI_FORMATTER_SYSTEM), ("user", md)]).content
            state.draft_ui = safe_json_loads(ui_json_str)

        return state

    def validator_node(self, state: AgentState) -> AgentState:
        context = self._pack_context(state.retrieved)
        payload = f"""
QUESTION: {state.user_query}

ANSWER:
{state.draft_markdown}

CONTEXT:
{context}
"""
        resp = (self.llm_json or self.llm).invoke([("system", self.VALIDATOR_SYSTEM), ("user", payload)]).content
        state.validation = parse_validation(resp)
        return state

    def revise_node(self, state: AgentState) -> AgentState:
        issues = state.validation.issues if state.validation else []
        fixes = state.validation.suggested_fixes if state.validation else []
        context = self._pack_context(state.retrieved)

        payload = f"""
QUESTION: {state.user_query}

CURRENT ANSWER:
{state.draft_markdown}

ISSUES:
{issues}

SUGGESTED FIXES:
{fixes}

CONTEXT:
{context}
"""
        md = self.llm.invoke([("system", self.REVISER_SYSTEM), ("user", payload)]).content
        state.draft_markdown = md

        if state.plan and state.plan.output_style in ("ui_json", "both"):
            ui_json_str = (self.llm_json or self.llm).invoke([("system", self.UI_FORMATTER_SYSTEM), ("user", md)]).content
            state.draft_ui = safe_json_loads(ui_json_str)
        return state

    def route_after_validate(self, state: AgentState) -> str:
        state.iterations += 1
        if not state.validation:
            return "revise"
        if state.validation.verdict in ("pass", "ask_user"):
            return "end"
        if state.validation.verdict == "revise" and state.iterations <= state.max_iterations:
            return "revise"
        return "end"

    def _build_graph(self):
        graph = StateGraph(AgentState)
        graph.add_node("planner", self.planner_node)
        graph.add_node("retrieve", self.retrieve_node)
        graph.add_node("answer", self.answerer_node)
        graph.add_node("validate", self.validator_node)
        graph.add_node("revise", self.revise_node)

        graph.set_entry_point("planner")
        graph.add_edge("planner", "retrieve")
        graph.add_edge("retrieve", "answer")
        graph.add_edge("answer", "validate")
        graph.add_conditional_edges("validate", self.route_after_validate, {"revise": "revise", "end": END})
        graph.add_edge("revise", "validate")
        return graph.compile()

    # ---------------------------
    # Public API
    # ---------------------------

    def ask(self, question: str) -> Dict[str, Any]:
        self.init()
        state = AgentState(user_query=question)
        final_state = self.app.invoke(state)

        md = final_state.get("draft_markdown") or "I couldn't generate an answer. Please try again."
        ui = final_state.get("draft_ui")

        answer_text = self._markdown_to_text(md)

        sources = []
        try:
            for d in (final_state.get("retrieved") or [])[:10]:
                sources.append(d.metadata.get("source"))
        except Exception:
            pass

        return {"answer": answer_text, "markdown": md, "ui": ui, "sources": sources}

    @staticmethod
    def _markdown_to_text(md: str) -> str:
        s = md or ""
        s = re.sub(r"```.*?```", "", s, flags=re.S)
        s = re.sub(r"^\s{0,3}#{1,6}\s*", "", s, flags=re.M)
        s = re.sub(r"^\s*[-*]\s+", "• ", s, flags=re.M)
        return s.strip()


_ENGINE: Optional[NeuroBotEngine] = None
_ENGINE_LOCK = threading.Lock()


def get_engine() -> NeuroBotEngine:
    global _ENGINE
    if _ENGINE is None:
        with _ENGINE_LOCK:
            if _ENGINE is None:
                _ENGINE = NeuroBotEngine()
    return _ENGINE


def answer_question(question: str) -> Dict[str, Any]:
    """Main entry used by router.py."""
    engine = get_engine()
    return engine.ask(question)
