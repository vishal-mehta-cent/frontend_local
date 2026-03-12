// src/components/NeuroBotChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, ChevronRight, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

const FALLBACK_THINKING_STAGES = [
  "Understanding your question",
  "Checking app and signal context",
  "Running the agent",
  "Preparing the response",
];

function prettyName(raw) {
  if (!raw) return "Trader";
  return String(raw).replace(/_/g, " ").trim();
}

function absUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const base = String(API || "").trim().replace(/\/+$/, "");
  if (!base) return u;
  return base + (u.startsWith("/") ? u : "/" + u);
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse [animation-delay:300ms]" />
    </span>
  );
}

export default function NeuroBotChat({ username }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lightbox, setLightbox] = useState({ open: false, src: "", title: "" });

  const apiUsername = useMemo(() => {
    return String(
      username ||
        localStorage.getItem("username") ||
        localStorage.getItem("user_id") ||
        ""
    ).trim();
  }, [username]);

  const displayName = useMemo(() => {
    return prettyName(apiUsername);
  }, [apiUsername]);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 50);
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setLightbox({ open: false, src: "", title: "" });
    }
    if (lightbox.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]);

  function normalizeImg(item) {
    if (!item) return null;
    if (typeof item === "string") return { url: item, title: "" };
    const url = item.url || item.src || item.path || "";
    const title = item.title || item.caption || item.alt || "";
    return url ? { url, title } : null;
  }

  function updateMessage(messageId, updater) {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg?.id !== messageId) return msg;
        return typeof updater === "function" ? updater(msg) : { ...msg, ...updater };
      })
    );
  }

  function appendThinkingStep(messageId, step) {
    if (!step) return;
    updateMessage(messageId, (msg) => {
      const current = Array.isArray(msg.thinkingSteps) ? msg.thinkingSteps : [];
      if (current.includes(step)) return msg;
      return {
        ...msg,
        thinkingSteps: [...current, step],
      };
    });
  }

  async function readStreamResponse(response, thinkingId) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Streaming not supported by this browser.");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let answerText = "";
    let images = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        let evt;
        try {
          evt = JSON.parse(line);
        } catch {
          continue;
        }

        if (evt.type === "status") {
          updateMessage(thinkingId, {
            statusText: evt.text || "Thinking",
            thinking: true,
            thinkingOpen: true,
          });
        }

        if (evt.type === "step") {
          appendThinkingStep(thinkingId, evt.text);
          updateMessage(thinkingId, {
            statusText: evt.text || "Thinking",
            thinking: true,
            thinkingOpen: true,
          });
        }

        if (evt.type === "answer") {
          answerText = evt.text || "";
          updateMessage(thinkingId, {
            text: answerText,
          });
        }

        if (evt.type === "answer_delta") {
          answerText += evt.text || "";
          updateMessage(thinkingId, {
            text: answerText,
          });
        }

        if (evt.type === "images") {
          images = Array.isArray(evt.images) ? evt.images : [];
          updateMessage(thinkingId, {
            images,
          });
        }

        if (evt.type === "done") {
          updateMessage(thinkingId, {
            text: answerText || "(No response)",
            images,
            thinking: false,
            statusText: "Done",
            thinkingOpen: false,
            ts: Date.now() + 1,
          });
        }

        if (evt.type === "error") {
          throw new Error(evt.text || "Bot stream failed.");
        }
      }
    }

    updateMessage(thinkingId, {
      text: answerText || "(No response)",
      images,
      thinking: false,
      statusText: "Done",
      thinkingOpen: false,
      ts: Date.now() + 1,
    });
  }

  async function send(qOverride) {
    const q = (qOverride ?? input).trim();
    if (!q || isSending) return;
    if (qOverride == null) setInput("");

    const now = Date.now();
    const thinkingId = `thinking_${now}`;
    const session_id =
      localStorage.getItem("session_id") || localStorage.getItem("sessionId") || "";

    setMessages((m) => [
      ...m,
      { role: "user", text: q, images: [], ts: now },
      {
        id: thinkingId,
        role: "bot",
        text: "",
        thinking: true,
        statusText: "Thinking",
        thinkingOpen: true,
        thinkingSteps: ["Starting assistant"],
        images: [],
        ts: now + 1,
      },
    ]);

    setIsSending(true);

    let stageIndex = 0;
    const fallbackTimer = setInterval(() => {
      stageIndex = (stageIndex + 1) % FALLBACK_THINKING_STAGES.length;
      const stage = FALLBACK_THINKING_STAGES[stageIndex];
      appendThinkingStep(thinkingId, stage);
      updateMessage(thinkingId, {
        statusText: stage,
      });
    }, 1400);

    try {
      const streamResponse = await fetch(`${API}/chatbot/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          username: apiUsername,
          session_id,
        }),
      });

      const streamContentType = streamResponse.headers.get("content-type") || "";
      const canStream = streamResponse.ok && streamResponse.body && streamContentType.includes("application/x-ndjson");

      if (canStream) {
        await readStreamResponse(streamResponse, thinkingId);
      } else {
        const r = await fetch(`${API}/chatbot/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            username: apiUsername,
            session_id,
          }),
        });

        const raw = await r.text();
        let answer = "";
        let images = [];

        if (!r.ok) {
          answer = `Bot backend error (${r.status}): ${raw}`;
        } else {
          let d = {};
          try {
            d = JSON.parse(raw);
          } catch {
            d = {};
          }
          answer = d?.answer || d?.markdown || `Bot ok but empty response: ${raw}`;
          images = Array.isArray(d?.images) ? d.images : [];
        }

        updateMessage(thinkingId, {
          text: answer || "(No response)",
          images,
          thinking: false,
          statusText: "Done",
          thinkingOpen: false,
          ts: Date.now() + 1,
        });
      }
    } catch (e) {
      updateMessage(thinkingId, {
        text: `Bot connection failed: ${String(e?.message || e)}`,
        thinking: false,
        statusText: "Failed",
        thinkingOpen: false,
        ts: Date.now() + 1,
      });
    } finally {
      clearInterval(fallbackTimer);
      setIsSending(false);
    }
  }

  function quickAsk(text) {
    if (!open) setOpen(true);
    send(text);
  }

  function toggleThinking(messageId) {
    updateMessage(messageId, (msg) => ({
      ...msg,
      thinkingOpen: !msg.thinkingOpen,
    }));
  }

  const offers = [
    {
      emoji: "🧠",
      label: "Paper Trading",
      q: "How does paper trading work in NeuroCrest?",
    },
    { emoji: "🤖", label: "AI Alerts", q: "Explain AI alerts and how to use them." },
    {
      emoji: "🔔",
      label: "Real-Time Alerts",
      q: "How do real-time alerts work? Can I get WhatsApp alerts?",
    },
    {
      emoji: "🏆",
      label: "Trading Challenges",
      q: "What are trading challenges and how do I join?",
    },
  ];

  const assist = [
    {
      icon: "🧾",
      label: "Explain Strategies",
      q: "Explain NeuroCrest strategies in simple terms.",
    },
    {
      icon: "🔎",
      label: "Extract Signals by Criteria",
      q: "Extract signals by criteria (symbol, timeframe, direction, accuracy, date) and explain them.",
    },
    {
      icon: "📁",
      label: "Guide on Portfolio",
      q: "Help me understand Portfolio page and P&L calculations.",
    },
    { icon: "💳", label: "Help with Pricing", q: "Explain pricing, plans, and how payments work." },
  ];

  return (
    <>
      {lightbox.open && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox({ open: false, src: "", title: "" })}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox({ open: false, src: "", title: "" })}
              className="absolute -top-7 -right-3 p-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition"
              aria-label="Close preview"
              type="button"
            >
              <X size={18} className="text-white" />
            </button>

            <img
              src={lightbox.src}
              alt={lightbox.title || "Preview"}
              className="w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 bg-black/30"
            />
            {lightbox.title ? (
              <div className="mt-2 text-center text-sm text-white/80">{lightbox.title}</div>
            ) : null}
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-full backdrop-blur-xl bg-black/60 border border-white/10 text-white shadow-2xl hover:bg-black/70 transition"
        >
          <MessageCircle size={18} className="text-cyan-400" />
          <span className="text-sm font-semibold">Neuro bot</span>
        </button>
      )}

      {open && (
        <div
          className="fixed z-[9999] inset-0 sm:inset-auto sm:bottom-5 sm:right-5 w-screen h-screen [height:100dvh] sm:w-[460px] sm:h-[92vh] rounded-none sm:rounded-[28px] overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.65)] text-white bg-gradient-to-b from-[#070a16]/95 via-[#0b1440]/92 to-[#060816]/95"
        >
          <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-xl">
            <div>
              <div className="font-bold text-sm">Neuro bot</div>
              <div className="text-[11px] text-white/70">NeuroCrest Assistant • {displayName}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition"
              aria-label="Close"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative flex flex-col h-[calc(100vh-56px)] [height:calc(100dvh-56px)] sm:h-[calc(92vh-56px)] min-h-0">
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-3 nc-chat-scroll">
              <div className="rounded-[26px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => quickAsk("What NeuroCrest offers? Give me a quick overview.")}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="text-base font-bold">What NeuroCrest Offers</div>
                  <ChevronRight size={18} className="text-white/60" />
                </button>
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-4 gap-3">
                    {offers.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => quickAsk(o.q)}
                        type="button"
                        className="relative rounded-2xl p-3 text-left overflow-hidden bg-gradient-to-b from-[#1b2a64]/60 to-[#0b1230]/60 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.30)] hover:from-[#22347a]/65 hover:to-[#0b1230]/65 transition"
                        title={o.label}
                      >
                        <div className="text-2xl drop-shadow">{o.emoji}</div>
                        <div className="text-[11px] mt-2 font-semibold leading-tight text-white/95">{o.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[26px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => quickAsk("How can you assist me?")}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="text-base font-bold">How I Can Assist You</div>
                  <ChevronRight size={18} className="text-white/60" />
                </button>

                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assist.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => quickAsk(a.q)}
                      className="rounded-2xl p-4 flex items-center gap-3 text-left bg-gradient-to-b from-white/10 to-white/5 border border-white/10 hover:from-white/12 hover:to-white/7 transition"
                      type="button"
                    >
                      <div className="text-xl">{a.icon}</div>
                      <div className="font-semibold">{a.label}</div>
                      <ChevronRight size={16} className="ml-auto text-white/50" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  const imgList = Array.isArray(m.images)
                    ? m.images.map(normalizeImg).filter(Boolean)
                    : [];
                  const hasThinkingPanel = !isUser && Array.isArray(m.thinkingSteps) && m.thinkingSteps.length > 0;

                  return (
                    <div key={m.id || m.ts} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`px-3 py-2 text-sm rounded-2xl ${
                          isUser
                            ? "bg-cyan-400 text-black shadow-[0_10px_30px_rgba(34,211,238,0.22)] max-w-[85%] whitespace-pre-wrap"
                            : "bg-white/10 text-white max-w-[92%]"
                        }`}
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{m.text}</div>
                        ) : (
                          <>
                            {hasThinkingPanel && (
                              <div className="mb-3 rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleThinking(m.id)}
                                  className="w-full px-3 py-2 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition"
                                >
                                  <div className="flex items-center gap-2 text-white/90">
                                    <span className="font-medium">{m.statusText || "Thinking"}</span>
                                    {m.thinking ? <ThinkingDots /> : null}
                                  </div>
                                  {m.thinkingOpen ? (
                                    <ChevronDown size={16} className="text-white/60 shrink-0" />
                                  ) : (
                                    <ChevronRight size={16} className="text-white/60 shrink-0" />
                                  )}
                                </button>

                                {m.thinkingOpen && (
                                  <div className="px-3 pb-3 pt-1 space-y-2">
                                    {m.thinkingSteps.map((step, idx) => (
                                      <div key={`${m.id}_step_${idx}`} className="flex items-start gap-2 text-[12px] text-white/75">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300 shrink-0" />
                                        <span>{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {m.text ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                  p: ({ node, ...props }) => <p className="whitespace-pre-wrap" {...props} />,
                                  a: ({ node, ...props }) => (
                                    <a className="text-cyan-300 underline" target="_blank" rel="noreferrer" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                                  table: ({ node, ...props }) => (
                                    <div className="my-2 overflow-x-auto max-w-full">
                                      <table className="w-full border-collapse text-[12px]" {...props} />
                                    </div>
                                  ),
                                  th: ({ node, ...props }) => (
                                    <th
                                      className="border border-white/10 bg-white/10 px-2 py-1 text-left font-semibold"
                                      {...props}
                                    />
                                  ),
                                  td: ({ node, ...props }) => (
                                    <td className="border border-white/10 px-2 py-1 align-top" {...props} />
                                  ),
                                  code: ({ node, inline, ...props }) =>
                                    inline ? (
                                      <code
                                        className="px-1 py-0.5 rounded bg-black/30 border border-white/10"
                                        {...props}
                                      />
                                    ) : (
                                      <pre className="p-3 rounded-xl bg-black/30 border border-white/10 overflow-x-auto">
                                        <code {...props} />
                                      </pre>
                                    ),
                                }}
                              >
                                {m.text}
                              </ReactMarkdown>
                            ) : m.thinking ? null : <div className="text-white/70">(No response)</div>}

                            {imgList.length > 0 && (
                              <div className="mt-3 grid grid-cols-1 gap-3">
                                {imgList.map((img, idx) => {
                                  const src = absUrl(img.url);
                                  const title = img.title || "";
                                  return (
                                    <button
                                      key={`${src}_${idx}`}
                                      type="button"
                                      onClick={() => setLightbox({ open: true, src, title })}
                                      className="group text-left"
                                      title="Click to zoom"
                                    >
                                      <img
                                        src={src}
                                        alt={title || `Image ${idx + 1}`}
                                        loading="lazy"
                                        className="w-full max-h-[280px] object-contain rounded-xl border border-white/10 bg-black/20 cursor-zoom-in transition duration-200 group-hover:scale-[1.01]"
                                      />
                                      {title ? <div className="mt-1 text-[11px] text-white/70">{title}</div> : null}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border-t border-white/10 bg-white/5 backdrop-blur-xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-white/5 border border-white/10 outline-none focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => send()}
                disabled={isSending}
                className="p-2 rounded-xl bg-cyan-400 text-black hover:bg-cyan-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Send"
                type="button"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
