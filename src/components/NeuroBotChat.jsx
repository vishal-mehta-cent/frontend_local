// src/components/NeuroBotChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

const TRAINING_MSG =
  "I am still getting trained, please contact our support: 9426016001 until I am ready to handle your questions";

function prettyName(raw) {
  if (!raw) return "Trader";
  return String(raw).replace(/_/g, " ").trim();
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

  const displayName = useMemo(() => {
    return prettyName(
      username ||
        localStorage.getItem("username") ||
        localStorage.getItem("user_id")
    );
  }, [username]);

  const [messages, setMessages] = useState([
    {
      role: "bot",
      text:
        "Hi 👋 I’m NeuroBot.\nI can help you understand NeuroCrest features, navigation, recommendations & payments.",
      ts: Date.now(),
    },
  ]);

  // ✅ SINGLE scroll container (only one scrollbar)
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

  async function send(qOverride) {
    const q = (qOverride ?? input).trim();
    if (!q) return;

    // Prevent double-sends while an answer is in progress
    if (isSending) return;

    if (qOverride == null) setInput("");

    const now = Date.now();
    const thinkingId = `thinking_${now}`;

    // 1) Push user message immediately
    // 2) Push a "thinking" assistant bubble immediately (like ChatGPT/Gemini)
    setMessages((m) => [
      ...m,
      { role: "user", text: q, ts: now },
      {
        id: thinkingId,
        role: "bot",
        text: "Thinking…",
        thinking: true,
        ts: now + 1,
      },
    ]);

    setIsSending(true);

    let answer = "";

    try {
      const r = await fetch(`${API}/chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, username: displayName }),
      });

      const raw = await r.text();

      if (!r.ok) {
        answer = `Bot backend error (${r.status}): ${raw}`;
      } else {
        let d = {};
        try { d = JSON.parse(raw); } catch {}
        answer = d?.answer || d?.markdown || `Bot ok but empty response: ${raw}`;
      }
    } catch (e) {
      answer = `Bot connection failed: ${String(e?.message || e)}`;
    }

    // Replace the thinking bubble with the real answer
    setMessages((m) =>
      m.map((msg) =>
        msg?.id === thinkingId
          ? { ...msg, text: answer || "(No response)", thinking: false, ts: Date.now() + 1 }
          : msg
      )
    );

    setIsSending(false);
  }

  function quickAsk(text) {
    if (!open) setOpen(true);
    send(text);
  }

  const offers = [
    { emoji: "🧠", label: "Paper Trading", q: "How does paper trading work in NeuroCrest?" },
    { emoji: "🤖", label: "AI Alerts", q: "Explain AI alerts and how to use them." },
    { emoji: "🔔", label: "Real-Time Alerts", q: "How do real-time alerts work? Can I get WhatsApp alerts?" },
    { emoji: "🏆", label: "Trading Challenges", q: "What are trading challenges and how do I join?" },
  ];

  const assist = [
    { icon: "🧾", label: "Explain Strategies", q: "Explain NeuroCrest strategies in simple terms." },
    { icon: "🔎", label: "Extract Signals by Criteria", q: "Extract signals by criteria (symbol, timeframe, direction, accuracy, date) and explain them." },
    { icon: "📁", label: "Guide on Portfolio", q: "Help me understand Portfolio page and P&L calculations." },
    { icon: "💳", label: "Help with Pricing", q: "Explain pricing, plans, and how payments work." },
  ];

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[9999]
                     flex items-center gap-2 px-4 py-3
                     rounded-full backdrop-blur-xl
                     bg-black/60 border border-white/10
                     text-white shadow-2xl
                     hover:bg-black/70 transition"
        >
          <MessageCircle size={18} className="text-cyan-400" />
          <span className="text-sm font-semibold">Neuro bot</span>
        </button>
      )}

      {/* Window */}
      {open && (
        <div
          className="
            fixed z-[9999]
            inset-0 sm:inset-auto
            sm:bottom-5 sm:right-5
            w-screen h-screen [height:100dvh] sm:w-[460px]
            sm:h-[92vh]
            rounded-none sm:rounded-[28px]
            overflow-hidden
            border border-white/10
            shadow-[0_25px_80px_rgba(0,0,0,0.65)]
            text-white
            bg-gradient-to-b from-[#070a16]/95 via-[#0b1440]/92 to-[#060816]/95
          "
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

          {/* Header (fixed) */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-xl">
            <div>
              <div className="font-bold text-sm">Neuro bot</div>
              <div className="text-[11px] text-white/70">NeuroCrest Assistant</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative flex flex-col h-[calc(100vh-56px)] [height:calc(100dvh-56px)] sm:h-[calc(92vh-56px)] min-h-0">
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-3 nc-chat-scroll"
            >
              {/* HERO */}
              <div className="rounded-[26px] p-4 bg-gradient-to-r from-white/12 to-white/6 border border-white/10 backdrop-blur-xl shadow-[0_0_50px_rgba(120,120,255,0.12)]">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#6dfcff]/25 to-[#b56dff]/20 border border-white/10 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(120,200,255,0.18)]">
                    🤖
                  </div>
                  <div className="min-w-0">
                    <div className="text-[22px] font-extrabold leading-tight">
                      Welcome, {displayName}!
                    </div>
                    <div className="text-sm text-white/85 mt-1">
                      I’m NeuroBot, your AI Trading Mentor.
                    </div>
                    <div className="text-[12px] text-white/60 mt-1">
                      Learn, Practice &amp; Trade Smart — Risk-Free!
                    </div>
                  </div>
                </div>
              </div>

              {/* OFFERS */}
              <div className="mt-4 rounded-[26px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
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
                        <div className="pointer-events-none absolute -top-8 -left-8 h-20 w-20 rounded-full bg-cyan-400/15 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-fuchsia-400/10 blur-2xl" />
                        <div className="text-2xl drop-shadow">{o.emoji}</div>
                        <div className="text-[11px] mt-2 font-semibold leading-tight text-white/95">
                          {o.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ASSIST */}
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

              {/* Question bar */}
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                  💬
                </div>
                <div className="font-semibold">Have a question? Just ask!</div>
              </div>

              {/* ✅ MESSAGES */}
              <div className="mt-4 space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.ts}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        px-3 py-2 text-sm rounded-2xl max-w-[85%] whitespace-pre-wrap
                        ${m.role === "user"
                          ? "bg-cyan-400 text-black shadow-[0_10px_30px_rgba(34,211,238,0.22)]"
                          : "bg-white/10 text-white"}
                      `}
                    >
                      {m.thinking ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white/90">Thinking</span>
                          <ThinkingDots />
                        </div>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input (fixed) */}
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
