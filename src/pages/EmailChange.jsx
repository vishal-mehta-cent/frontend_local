// ✅ frontend/src/pages/ChangeEmail.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";
import { Mail, AlertCircle, CheckCircle, Home, Sun, Moon, Send, BadgeCheck } from "lucide-react";

const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

export default function ChangeEmail({ username }) {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-50";

  const glassClass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/20"
    : "bg-white/70 backdrop-blur-xl border border-white/30";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  const inputClass = isDark
    ? "bg-white/5 border-white/20 text-white placeholder-slate-400"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400";

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const sendOtp = async () => {
    setErr("");
    setOk("");

    if (!currentEmail || !newEmail) {
      setErr("Please enter current email and new email.");
      return;
    }

    setSending(true);
    try {
      // ✅ CHANGE THIS ENDPOINT if your backend uses a different route
      // Example alternatives:
      // `${API}/auth/send-email-otp` or `${API}/users/change-email/send-otp`
      const res = await fetch(`${API}/auth/change-email/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          current_email: currentEmail,
          new_email: newEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to send verification code.");

      setOk("✅ Verification code sent to your email.");
    } catch (e) {
      setErr(e?.message || "Server error");
    } finally {
      setSending(false);
    }
  };

  const confirmChange = async () => {
    setErr("");
    setOk("");

    if (!otp) {
      setErr("Please enter verification code.");
      return;
    }

    setVerifying(true);
    try {
      // ✅ CHANGE THIS ENDPOINT if your backend uses a different route
      // Example alternatives:
      // `${API}/auth/verify-email-otp` or `${API}/users/change-email/confirm`
      const res = await fetch(`${API}/auth/change-email/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          new_email: newEmail,
          otp,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Email change failed.");

      setOk("✅ Email updated successfully.");
      setOtp("");
    } catch (e) {
      setErr(e?.message || "Server error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden transition-colors duration-300`}>
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-none mx-auto px-2 sm:px-3 lg:px-4 py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/settings" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/trade")}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95
                ${isDark ? "bg-white/10 border border-white/20 text-white" : "bg-white/70 border border-white text-slate-900"}`}
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggle}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95
                ${isDark ? "bg-white/10 border border-white/20 text-white" : "bg-white/70 border border-white text-slate-900"}`}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Email Change
            </h1>
          </div>
          <p className={textSecondaryClass}>Verify and update your email address</p>
        </div>

        {/* Card */}
        <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8 max-w-xl mx-auto`}>
          {err && (
            <div className={`mb-5 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg`}>
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400 font-medium">{err}</span>
            </div>
          )}

          {ok && (
            <div className={`mb-5 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg`}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-400 font-medium">{ok}</span>
            </div>
          )}

          <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>Current Email</label>
          <input
            type="email"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            placeholder="Enter current email"
            className={`w-full px-5 py-4 border ${inputClass} rounded-2xl text-base font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-4`}
          />

          <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>New Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter new email"
            className={`w-full px-5 py-4 border ${inputClass} rounded-2xl text-base font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-5`}
          />

          <button
            type="button"
            onClick={sendOtp}
            disabled={sending}
            className={`w-full px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]
              bg-gradient-to-r from-blue-600 to-cyan-600 text-white
              ${sending ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              {sending ? "Sending..." : "Send Verification Code"}
            </span>
          </button>

          <div className="mt-6 pt-6 border-t border-white/10">
            <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>Verification Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter code (OTP)"
              className={`w-full px-5 py-4 border ${inputClass} rounded-2xl text-base font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-5`}
            />

            <button
              type="button"
              onClick={confirmChange}
              disabled={verifying}
              className={`w-full px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]
                bg-gradient-to-r from-green-500 to-emerald-500 text-white
                ${verifying ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <BadgeCheck className="w-5 h-5" />
                {verifying ? "Verifying..." : "Confirm Email Change"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
