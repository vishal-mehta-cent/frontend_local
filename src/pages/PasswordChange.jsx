// ✅ frontend/src/pages/ChangePassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Home, Sun, Moon } from "lucide-react";

const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

export default function ChangePassword({ username }) {
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async () => {
    setErr("");
    setOk("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErr("Please fill all fields.");
      return;
    }
    if (newPassword.length < 6) {
      setErr("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErr("New password and confirm password do not match.");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ CHANGE THIS ENDPOINT if your backend uses a different route
      // Example alternatives you might have:
      // `${API}/auth/change-password` or `${API}/users/change-password`
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to change password.");

      setOk("✅ Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e) {
      setErr(e?.message || "Server error");
    } finally {
      setSubmitting(false);
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
          <BackButton to="/profile" />

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
            <Lock className="w-8 h-8 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Password Change
            </h1>
          </div>
          <p className={textSecondaryClass}>Update your account password securely</p>
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

          {/* Current password */}
          <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>Current Password</label>
          <div className="relative mb-4">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className={`w-full px-5 py-4 pr-12 border ${inputClass} rounded-2xl text-base font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              title="Show/Hide"
            >
              {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* New password */}
          <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>New Password</label>
          <div className="relative mb-4">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className={`w-full px-5 py-4 pr-12 border ${inputClass} rounded-2xl text-base font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              title="Show/Hide"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm password */}
          <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>Confirm New Password</label>
          <div className="relative mb-6">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full px-5 py-4 pr-12 border ${inputClass} rounded-2xl text-base font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              title="Show/Hide"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={`w-full px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]
              bg-gradient-to-r from-blue-600 to-cyan-600 text-white
              ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {submitting ? "Changing..." : "Change Password"}
          </button>

          
        </div>
      </div>
    </div>
  );
}
