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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white overflow-hidden">

            {/* BACKGROUND TEXTURE */}
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

            {/* HEADER */}
            <header className="relative z-50 px-6 py-6">
                <nav className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo1.png"
                            alt="Neurocrest Logo"
                            className="w-12 h-12 rounded-lg"
                        />
                        <span className={`text-4xl font-bold bg-clip-text text-transparent ${brandGradient}`}>
                            NEUROCREST
                        </span>
                    </div>


                    <button
                        onClick={() => navigate("/login")}
                        className={`px-6 py-2.5 rounded-full font-semibold text-black ${brandGradient}
                        hover:shadow-xl hover:scale-105 transition-all`}
                    >
                        Login
                    </button>
                </nav>
            </header>

            <main className="relative z-10">

                {/* HERO SECTION */}
                <section className="px-6 pt-20 pb-32">
                    <div
                        className="max-w-7xl mx-auto text-center"
                        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
                    >
                        <div className="inline-block mb-6 px-4 py-2 bg-white/10 border border-white/20 rounded-full">
                            <span className="text-sm font-medium text-cyan-300">
                                AI-Powered Trading Platform
                            </span>
                        </div>

                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
                            Trade less.
                            <br />
                            <span className={`bg-clip-text text-transparent ${brandGradient}`}>
                                Trade smarter.
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
                            Your all-in-one AI trading mentor for smarter, faster decision-making.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                className={`px-8 py-4 rounded-full font-bold text-black text-lg ${brandGradient}
                            hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2`}
                            >
                                Get Started <ArrowRight className="w-5 h-5" />
                            </button>

                            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full font-semibold text-lg hover:bg-white/20 transition-all">
                                Watch Demo
                            </button>
                        </div>

                        <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                            <div className="text-center">
                                <div className={`text-4xl font-bold bg-clip-text text-transparent ${brandGradient}`}>
                                    98%
                                </div>
                                <div className="text-sm text-gray-400 mt-1">Accuracy</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-4xl font-bold bg-clip-text text-transparent ${brandGradient}`}>
                                    10K+
                                </div>
                                <div className="text-sm text-gray-400 mt-1">Active Traders</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-4xl font-bold bg-clip-text text-transparent ${brandGradient}`}>
                                    $2M+
                                </div>
                                <div className="text-sm text-gray-400 mt-1">Daily Volume</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="px-6 py-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <TrendingUp className="w-8 h-8 text-white" />
                                </div>

                                <div className="text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">
                                    EXISTING TODAY
                                </div>

                                <h3 className="text-2xl font-bold mb-4">
                                    Paper Trading (Live Now)
                                </h3>

                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Broker-like paper trading</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Candlestick pattern alerts</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Visual signals directly on charts</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Foundation for custom strategies</span>
                                    </li>
                                </ul>

                                <div className="text-sm text-slate-400 border-t border-slate-700 pt-4">
                                    Production-ready. In daily use.
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Target className="w-8 h-8 text-white" />
                                </div>

                                <div className="text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">
                                    BUILD WITH US
                                </div>

                                <h3 className="text-2xl font-bold mb-4">
                                    Custom Trading Solutions
                                </h3>

                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Strategy to algo automation</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Real-time chart & WhatsApp</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Portfolio tracking & analytics</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Broker-side execution</span>
                                    </li>
                                </ul>

                                <div className="text-sm text-slate-400 border-t border-slate-700 pt-4">
                                    Tailored to your strategy.
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Brain className="w-8 h-8 text-white" />
                                </div>

                                <div className="text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">
                                    ENTERPRISE & AI
                                </div>

                                <h3 className="text-2xl font-bold mb-4">
                                    Advanced AI Capabilities
                                </h3>

                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>AI-driven strategy research</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Agentic portfolio intelligence</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>Trade learning & optimization</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                        <span>News intelligence & alerting</span>
                                    </li>
                                </ul>

                                <div className="text-sm text-slate-400 border-t border-slate-700 pt-4">
                                    Designed for scale.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* BENEFITS */}
                <section className="px-6 py-20">
                    <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
                        {[Zap, Shield, BarChart3].map((Icon, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                                <div className={`w-12 h-12 ${brandGradient} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                    <Icon className="w-6 h-6 text-black" />
                                </div>
                                <h4 className="text-xl font-bold mb-2">Premium Feature</h4>
                                <p className="text-gray-400">Description text here</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6 py-20 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Have a specific requirement?
                    </h2>
                    <p className="text-xl text-gray-300 mb-8">
                        <span className="text-yellow-400 font-semibold">Let's build it together.</span>
                    </p>
                    <button
                        className={`px-10 py-4 rounded-full font-bold text-black text-lg ${brandGradient}
                        hover:shadow-2xl hover:scale-105 transition-all`}
                    >
                        Contact Us
                    </button>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="px-6 py-12 border-t border-white/10 text-center text-gray-400">
                © 2024 NEUROCREST. All rights reserved.
            </footer>
        </div>
    );
}
