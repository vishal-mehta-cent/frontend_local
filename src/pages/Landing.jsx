import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Target,
  Brain,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Zap,
  Shield
} from "lucide-react";
import { BadgePercent, Building2, Headset } from "lucide-react";
import { Phone, MessageCircle } from "lucide-react";
import { Mail } from "lucide-react";
import { FaApple, FaAndroid } from "react-icons/fa";


export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  // 🔥 EXACT SAME GRADIENT AS LoginRegister.jsx
  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // ✅ WhatsApp redirect (same as Payments.jsx WhatsApp button)
  const openWhatsApp = () => {
    const phone = "919426001601"; // ✅ your WhatsApp number with country code
    const msg = encodeURIComponent(
      "Hi NeuroCrest Team, I want to know more about your plans / support. Please guide me."
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white overflow-hidden relative">
      {/* BACKGROUND TEXTURE */}
      <div className="fixed inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

      {/* ANIMATED GRADIENT ORBS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* HEADER */}
      <header className="relative z-50 px-4 sm:px-6 pt-3 sm:pt-4">
        <div className="max-w-7xl mx-auto">
          {/* Mobile: stacked (brand center, login below) | Desktop: 3-column grid with centered brand */}
          <div className="flex flex-col gap-3 sm:gap-0 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            {/* Left spacer (keeps center perfect on desktop) */}
            <div className="hidden sm:block" />

            {/* Brand (ALWAYS centered) */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 group min-w-0">
              <div className="relative flex-shrink-0">
                {/* Subtle glow effect behind logo */}
                <div
                  className="absolute inset-0 blur-2xl opacity-40 group-hover:opacity-60
                       bg-gradient-to-r from-cyan-400 via-blue-500 to-yellow-300 rounded-full
                       transition-all duration-500 group-hover:blur-3xl"
                />

                <img
                  src="logo1.png"
                  alt="NeuroCrest"
                  className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain
                       drop-shadow-[0_8px_25px_rgba(0,0,0,0.6)]
                       transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_10px_35px_rgba(34,211,238,0.4)]"
                />
              </div>

              <div
                className={`font-extrabold tracking-wide bg-clip-text text-transparent ${brandGradient}
                      leading-none whitespace-nowrap
                      text-[clamp(20px,6vw,52px)] md:text-5xl`}
              >
                NEUROCREST
              </div>
            </div>

            {/* Login: mobile center below | desktop right */}
            <div className="flex justify-center sm:justify-end">
              <button
                onClick={() => navigate("/login?mode=login")}
                className={`px-8 sm:px-6 py-2.5 rounded-full font-semibold text-black
                      text-xl sm:text-base ${brandGradient}
                      hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]
                      transition-all duration-300 shadow-lg whitespace-nowrap`}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* ✅ Coming Soon Mobile Apps (Left Side Floating) */}
{/* ✅ Coming Soon Mobile App (Single Badge - Left Side) */}
<div className="fixed left-4 top -translate-y-1/2 z-40 flex
">
  <div
    className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4
               hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300
               hover:shadow-[0_20px_50px_rgba(34,211,238,0.18)]"
  >
    <div className="flex items-center gap-3">
      {/* Icons */}
      <div className="flex items-center gap-2">
        <FaAndroid className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.5)]" />
        <FaApple className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.5)]" />
      </div>

      {/* Text */}
      <div className="leading-tight">
        <div className={`text-sm font-extrabold ${brandGradient} bg-clip-text text-transparent`}>
  Coming Soon
</div>

        <div className="text-sm font-bold text-white">Android &amp; iOS App</div>
      </div>
    </div>
  </div>
</div>


      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="px-6 pt-12 sm:pt-14 md:pt-16 pb-16 md:pb-20">
          <div
            className="max-w-7xl mx-auto text-center"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          >
            <div
              className="inline-block mb-4 md:mb-5 px-4 py-2 bg-white/10 border border-white/20 rounded-full
                                        backdrop-blur-md hover:bg-white/15 hover:border-cyan-400/40
                                        transition-all duration-300 shadow-lg hover:shadow-cyan-500/20"
            >
              <span className="text-sm font-medium text-cyan-300">
                AI-Powered Trading Platform
              </span>
            </div>

            <h1
              className="text-6xl md:text-6xl lg:text-8xl font-bold mb-6 leading-tight
                                       drop-shadow-[0_0_50px_rgba(34,211,238,0.2)]"
            >
              Learn Faster.
              <br />
              <span
                className={`bg-clip-text text-transparent ${brandGradient}
                                            drop-shadow-[0_0_60px_rgba(34,211,238,0.4)]
                                            animate-[gradient_3s_ease-in-out_infinite]`}
              >
                Trade Smarter.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Your all-in-one AI trading mentor for smarter, faster decision-making.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                type="button"
                onClick={() => navigate("/login?mode=signup")}
                className={`px-8 py-4 rounded-full font-bold text-black text-lg ${brandGradient}
                                hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:scale-105
                                transition-all duration-300 flex items-center gap-2
                                shadow-[0_10px_30px_rgba(0,0,0,0.3)]
                                relative overflow-hidden
                                before:absolute before:inset-0 before:bg-white/20 before:translate-x-[-100%]
                                hover:before:translate-x-[100%] before:transition-transform before:duration-700`}
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  window.open(
                    "https://www.youtube.com/channel/UC6RbmJPj3SgIjV1mHiAJV5g",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full
             font-semibold text-lg hover:bg-white/20 hover:border-cyan-400/40
             transition-all duration-300 hover:scale-105
             hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
              >
                Watch Demo
              </button>
            </div>

            {/* HERO MINI CARDS (3) */}
            <div className="mt-10 md:mt-12 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div
                  className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 text-center
                    hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500
                    hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
                >
                  {/* ✅ Icon ONLY (no box), with premium glow */}
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <Zap
                      className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]
                        group-hover:scale-110 transition-all duration-300"
                    />
                  </div>

                  <div className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
                    Built for{" "}
                    <span className={`bg-clip-text text-transparent ${brandGradient}`}>
                      Beginners
                    </span>
                  </div>
                  <div className="text-sm md:text-base text-gray-300/80 mt-2">
                    Learn &amp; Practice Safely
                  </div>
                </div>

                {/* Card 2 */}
                <div
                  className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 text-center
                    hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500
                    hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
                >
                  {/* ✅ Icon ONLY (no box), with premium glow */}
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <BarChart3
                      className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]
                        group-hover:scale-110 transition-all duration-300"
                    />
                  </div>

                  <div className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
                    Loved by{" "}
                    <span className={`bg-clip-text text-transparent ${brandGradient}`}>
                      Active
                    </span>{" "}
                    Traders
                  </div>
                  <div className="text-sm md:text-base text-gray-300/80 mt-2">
                    Faster, clearer decisions
                  </div>
                </div>

                {/* Card 3 */}
                <div
                  className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 text-center
                    hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500
                    hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
                >
                  {/* ✅ Icon ONLY (no box), with premium glow */}
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <Shield
                      className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]
                        group-hover:scale-110 transition-all duration-300"
                    />
                  </div>

                  <div className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
                    Trusted by{" "}
                    <span className={`bg-clip-text text-transparent ${brandGradient}`}>
                      Serious
                    </span>{" "}
                    Builders
                  </div>
                  <div className="text-sm md:text-base text-gray-300/80 mt-2">
                    Validate &amp; refine systems
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section (3) */}
        <section className="px-6 py-12 md:py-14 mt-8 md:-mt-10">

          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_25px_60px_rgba(34,211,238,0.25)] hover:-translate-y-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* ✅ Icon ONLY (no box), with premium glow */}
                <div className="relative mb-6">
                  <TrendingUp
                    className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_22px_rgba(34,211,238,0.55)]
                      group-hover:scale-110 transition-all duration-300"
                  />
                </div>

                <div className="relative text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">
                  EXISTING TODAY
                </div>

                <h3 className="relative text-2xl font-bold mb-4">
                  Paper Trading (Live Now)
                </h3>

                <ul className="relative space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Broker-like paper trading</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Interactive live charts</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Visual signals on charts (only for edu, approval-only)</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Strategy-based recommendations (Intraday • Short-term • BTST)
                      Only for edu, approval only
                    </span>
                  </li>
                </ul>

                <div className="relative text-sm text-slate-400 border-t border-slate-700 pt-4">
                  Upcoming: Event Alerts • Portfolio IQ • Ask-the-Agent Insights.
                </div>
              </div>

              {/* Card 2 */}
              <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_25px_60px_rgba(34,211,238,0.25)] hover:-translate-y-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* ✅ Icon ONLY (no box), with premium glow */}
                <div className="relative mb-6">
                  <Target
                    className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_22px_rgba(34,211,238,0.55)]
                      group-hover:scale-110 transition-all duration-300"
                  />
                </div>

                <div className="relative text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">
                  BUILD WITH US
                </div>

                <h3 className="relative text-2xl font-bold mb-4">
                  Custom Trading Solutions
                </h3>

                <ul className="relative space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Your strategy → we build the algo</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Alerts on chart + cards + Email/WhatsApp</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Integrate with your broker</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>End-to-end autonomous Algo-trading setup</span>
                  </li>
                </ul>

                <div className="relative text-sm text-slate-400 border-t border-slate-700 pt-4">
                  For brokers & institutions: White-label customization available.
                </div>
              </div>

              {/* Card 3 */}
              <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_25px_60px_rgba(34,211,238,0.25)] hover:-translate-y-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* ✅ Icon ONLY (no box), with premium glow */}
                <div className="relative mb-6">
                  <Brain
                    className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_22px_rgba(34,211,238,0.55)]
                      group-hover:scale-110 transition-all duration-300"
                  />
                </div>

                <div className="relative text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">
                  ENTERPRISE & AI
                </div>

                <h3 className="relative text-2xl font-bold mb-4">
                  Advanced AI Capabilities
                </h3>

                <ul className="relative space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>AI-assisted strategy research partner</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Custom AI agents & automations</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Learn from trades, optimize decisions</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>Insights from events, news & fundamentals</span>
                  </li>
                </ul>

                <div className="relative text-sm text-slate-400 border-t border-slate-700 pt-4">
                  Built for scale • Designed for teams.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OFFERS / BENEFITS (3) */}
        <section id="offers" className="px-6 py-12 md:py-14 -mt-6 md:-mt-10">
          <div className="max-w-7xl mx-auto">
            {/* Top row: Title + Subscription Button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
              <div>
                <div className="text-sm font-semibold text-cyan-200/90 tracking-wider uppercase">
                  OFFERS
                </div>

                <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-white">
                  Choose the plan that fits you
                </h2>

                <p className="mt-2 text-gray-300/80 max-w-2xl">
                  Early-access pricing, broker-ready builds, and fast support—everything designed
                  to help you learn & execute better.
                </p>
              </div>

              {/* ✅ Subscription button */}
              <button
                type="button"
                onClick={() => navigate("/payments")}
                className={`px-7 py-3 rounded-full font-bold text-black ${brandGradient}
  hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:scale-105
  transition-all duration-300 inline-flex items-center gap-2
  shadow-lg`}
              >
                Subscription <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div
                className="group bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl
                      hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500
                      hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
              >
                {/* ✅ Icon ONLY (no box), with premium glow */}
                <div className="mb-5 flex items-center">
                  <BadgePercent
                    className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]
                      group-hover:scale-110 transition-all duration-300"
                  />
                </div>

                <h3 className="text-2xl font-extrabold text-white leading-snug">
                  Introductory <br /> Offer
                </h3>

                <p className="mt-3 text-gray-300/80">
                  Early-access pricing for paper trading, plus add-on chart learning alerts
                  (education-only).
                </p>
              </div>

              {/* Card 2 */}
              <div
                className="group bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl
                      hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500
                      hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
              >
                {/* ✅ Icon ONLY (no box), with premium glow */}
                <div className="mb-5 flex items-center">
                  <Building2
                    className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]
                      group-hover:scale-110 transition-all duration-300"
                  />
                </div>

                <h3 className="text-2xl font-extrabold text-white leading-snug">
                  Broker-Ready <br /> Builds
                </h3>

                <p className="mt-3 text-gray-300/80">
                  White-label, custom strategies, alerts, plus broker integrations—tailored to you.
                </p>
              </div>

              {/* Card 3 */}
              <div
                className="group bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl
                      hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500
                      hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
              >
                {/* ✅ Icon ONLY (no box), with premium glow */}
                <div className="mb-5 flex items-center">
                  <Headset
                    className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]
                      group-hover:scale-110 transition-all duration-300"
                  />
                </div>

                <h3 className="text-2xl font-extrabold text-white leading-snug">
                  Real-Time <br /> Support
                </h3>

                <p className="mt-3 text-gray-300/80">
                  Stuck or have ideas? Ping us anytime—fast replies, clear fixes, real feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent"></div>
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              Have a specific requirement?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              <span className={`font-semibold bg-clip-text text-transparent ${brandGradient}`}>
                Let's build it together.
              </span>
            </p>
            <button
              type="button"
              onClick={openWhatsApp}
              className={`px-10 py-4 rounded-full font-bold text-black text-lg ${brandGradient}
    hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] hover:scale-105
    transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.3)]
    relative overflow-hidden
    before:absolute before:inset-0 before:bg-white/20 before:translate-x-[-100%]
    hover:before:translate-x-[100%] before:transition-transform before:duration-700`}
            >
              Contact Us
            </button>



            {/* Contact pill: WhatsApp + Phone + Email */}
            <div className="mt-6 flex items-center justify-center">
              <a
                href="mailto:neurocrest.app@gmail.com"
                className="inline-flex items-center gap-4 px-8 py-4 rounded-full
               bg-white/5 border border-white/10 backdrop-blur
               hover:bg-white/10 hover:border-cyan-400/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]
               transition-all duration-300 hover:scale-105"
              >
                {/* Icons */}
                <span className="inline-flex items-center gap-3 text-white/90">
                  <MessageCircle className="w-6 h-6 hover:text-cyan-400 transition-colors" />
                  <Phone className="w-6 h-6 hover:text-cyan-400 transition-colors" />
                  <Mail className="w-6 h-6 hover:text-cyan-400 transition-colors" />
                </span>

                {/* Text */}
                <span className="text-white/90 font-semibold tracking-wide">
                  9426001601 | neurocrest.app@gmail.com
                </span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="px-6 py-12 border-t border-white/10 text-center text-gray-400 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent opacity-50"></div>
        <p className="relative">
          © 2024{" "}
          <span className={`font-bold bg-clip-text text-transparent ${brandGradient}`}>
            NEUROCREST
          </span>
          . All rights reserved.
        </p>
      </footer>
    </div>
  );
}
