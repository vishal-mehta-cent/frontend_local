import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  ChevronRight,
} from "lucide-react";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";

export default function Settings() {
  const navigate = useNavigate();

  // ✅ GLOBAL THEME (from ThemeContext)
  const { isDark } = useTheme();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-50";

  const glassClass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/20"
    : "bg-white/70 backdrop-blur-xl border border-white/30";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden transition-colors duration-300`}
    >
      {/* ===== BACKGROUND BLOBS ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-none mx-auto px-2 sm:px-3 lg:px-4 py-4">
        {/* ===== TOP BAR ===== */}
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/profile" />
        </div>

        {/* ===== HEADER ===== */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Security
            </h1>
          </div>
        </div>

        {/* ===== SECURITY ===== */}
        <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4`}>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
            <Lock className="w-5 h-5 text-blue-500" />
            <h3 className="text-xl font-bold">Account</h3>
          </div>

          <button
            onClick={() => navigate("/settings/change-password")}
            className={`w-full ${glassClass} rounded-2xl p-4 flex items-center justify-between hover:scale-[1.02] transition-all shadow-lg group`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Change Password</div>
                <div className={`text-sm ${textSecondaryClass}`}>
                  Update your account password
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${textSecondaryClass} group-hover:translate-x-1 transition-transform`}
            />
          </button>

          <button
            onClick={() => navigate("/settings/change-email")}
            className={`w-full ${glassClass} rounded-2xl p-4 flex items-center justify-between hover:scale-[1.02] transition-all shadow-lg group`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Your Email</div>
                <div className={`text-sm ${textSecondaryClass}`}>
                  View your registered email
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${textSecondaryClass} group-hover:translate-x-1 transition-transform`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
