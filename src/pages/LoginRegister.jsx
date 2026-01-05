import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import "../index.css";
import { useTheme } from "../context/ThemeContext";

export default function LoginRegister({ onLoginSuccess }) {
  const { isDark } = useTheme();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ avoid portal issues during initial mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // ✅ Same theme system as History.jsx
  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  const inputClass = isDark
    ? "bg-white/10 border-white/10 focus:border-white/20 text-white placeholder:text-slate-300"
    : "bg-white/70 border-white/40 focus:border-white/70 text-slate-900 placeholder:text-slate-500";

  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!username || !password) {
      setMessage("❌ Please enter username and password.");
      setMessageType("error");
      return;
    }

    if (!isLogin && password !== confirm) {
      setMessage("❌ Password and Confirm Password do not match.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    const endpoint = isLogin ? "login" : "register";

    try {
      const res = await fetch(`${backendBaseUrl}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        if (isLogin) {
          localStorage.setItem("user_id", username);
          localStorage.setItem("session_id", data.session_id);
          localStorage.setItem("email_id", data.email || "");
          localStorage.setItem("username", username);

          onLoginSuccess(username);
        } else {
          setMessage("✅ " + (data.message || "Registration successful"));
          setMessageType("success");
        }
      } else {
        setMessage("❌ " + (data.message || "Something went wrong"));
        setMessageType("error");
      }
    } catch (err) {
      setMessage("❌ Cannot connect to server.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const token = credentialResponse.credential;

    try {
      const res = await fetch(`${backendBaseUrl}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("user_id", data.username);
        localStorage.setItem("session_id", data.session_id || "");
        localStorage.setItem("email_id", data.email || "");
        localStorage.setItem("username", data.username);

        onLoginSuccess(data.username);
      } else {
        setMessage("❌ " + (data.message || "Google login failed"));
        setMessageType("error");
      }
    } catch (err) {
      setMessage("❌ Google login failed");
      setMessageType("error");
    }
  };

  if (!mounted) return null;

  const ui = (
    <div
      className={`fixed inset-0 w-screen h-[100dvh] ${bgClass} ${textClass} flex items-center justify-center px-4 overflow-hidden transition-colors duration-300`}
      style={{ zIndex: 9999 }}
    >
      {/* ✅ Background blobs (History.jsx style) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-[34rem] h-[34rem] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-[34rem] h-[34rem] bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[34rem] h-[34rem] bg-blue-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ✅ Centered layout */}
      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* BRAND */}
        <div className="hidden lg:flex flex-col items-center">
          <img
            src="/logo1.png"
            alt="NeuroCrest"
            className="h-28 w-28 mb-6 select-none"
            draggable="false"
            onError={(e) => {
              const tried = e.currentTarget.getAttribute("data-tried") || "";
              if (!tried) {
                e.currentTarget.setAttribute("data-tried", "publicpath");
                e.currentTarget.src = "/public/logo1.png";
              } else {
                e.currentTarget.style.display = "none";
              }
            }}
          />
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#1ea7ff] via-[#22c55e] to-[#f59e0b]">
            NEUROCREST
          </h1>
          <p className={`text-lg ${textSecondaryClass} text-center mt-2`}>
            Your All-in-One AI Trading Mentor
          </p>
        </div>

        {/* CARD */}
        <div className={`w-full max-w-md mx-auto rounded-3xl ${glassClass} shadow-2xl p-8`}>
          {/* mobile brand */}
          <div className="flex flex-col items-center mb-6 lg:hidden">
            <img
              src="/logo1.png"
              alt="NeuroCrest"
              className="h-20 w-20 mb-3 select-none"
              draggable="false"
              onError={(e) => {
                const tried = e.currentTarget.getAttribute("data-tried") || "";
                if (!tried) {
                  e.currentTarget.setAttribute("data-tried", "publicpath");
                  e.currentTarget.src = "/public/logo1.png";
                } else {
                  e.currentTarget.style.display = "none";
                }
              }}
            />
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#1ea7ff] via-[#22c55e] to-[#f59e0b]">
              NEUROCREST
            </h1>
            <p className={`text-sm ${textSecondaryClass} mt-1 text-center`}>
              Your All-in-One AI Trading Mentor
            </p>
          </div>

          {/* toggle */}
          <div
            className={`flex rounded-full p-1 mb-6 ${
              isDark ? "bg-white/10" : "bg-white/70 border border-white/40"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setMessage("");
                setMessageType("");
              }}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${
                isLogin ? `${brandGradient} text-black shadow-lg` : `${textSecondaryClass} hover:opacity-90`
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setMessage("");
                setMessageType("");
              }}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${
                !isLogin ? `${brandGradient} text-black shadow-lg` : `${textSecondaryClass} hover:opacity-90`
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* message */}
          {message && (
            <div
              className={`mb-4 text-sm text-center ${
                messageType === "success"
                  ? isDark
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : isDark
                  ? "text-rose-400"
                  : "text-rose-600"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete={isLogin ? "username" : "new-username"}
              className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all ${inputClass}`}
            />

            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all pr-12 ${inputClass}`}
              />
              <button
                type="button"
                aria-label={showPwd ? "Hide password" : "Show password"}
                onClick={() => setShowPwd((s) => !s)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <input
                  type={showPwd2 ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all pr-12 ${inputClass}`}
                />
                <button
                  type="button"
                  aria-label={showPwd2 ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowPwd2((s) => !s)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                  tabIndex={-1}
                >
                  {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {isLogin && (
              <p
                className={`text-xs text-right cursor-pointer hover:underline select-none ${
                  isDark ? "text-cyan-300" : "text-blue-600"
                }`}
              >
                Forgot Password?
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
            >
              {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          {googleClientId && (
            <div className="mt-5 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setMessage("❌ Google login failed");
                  setMessageType("error");
                }}
              />
            </div>
          )}

          <p className={`mt-6 text-xs text-center ${textSecondaryClass}`}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );

  // ✅ KEY FIX: portal to body so it never gets clipped by parent transforms/layouts
  return createPortal(ui, document.body);
}
