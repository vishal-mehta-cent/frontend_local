// ✅ frontend/src/pages/ChangeEmail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";
import { Mail, Home, Sun, Moon, Info } from "lucide-react";

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
    ? "bg-white/5 border-white/20 text-slate-300 placeholder-slate-500"
    : "bg-slate-100 border-slate-200 text-slate-500 placeholder-slate-400";

  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("nc_user") || "{}");
      if (u?.email) setEmail(u.email);
    } catch { }
  }, []);

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
              Your Email
            </h1>
          </div>
          <p className={textSecondaryClass}>This is the email you used when signing up</p>
        </div>

        {/* Card */}
        <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8 max-w-xl mx-auto`}>
          <div className={`mb-5 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg`}>
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <span className={`${textSecondaryClass} font-medium`}>
              Your email cannot be changed.
            </span>
          </div>

          <label className={`block text-sm font-semibold ${textSecondaryClass} mb-2`}>Registered Email</label>

          <input
            type="email"
            value={email || ""}
            readOnly
            disabled
            placeholder="No email found"
            className={`w-full px-5 py-4 border ${inputClass} rounded-2xl text-base font-semibold outline-none transition-all
              opacity-70 cursor-not-allowed`}
          />

          <div className={`mt-4 text-sm ${textSecondaryClass}`}>
            If you need help, contact support.
          </div>
        </div>
      </div>
    </div>
  );
}
