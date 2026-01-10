// ✅ frontend/src/pages/Menu.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Briefcase,
  ClipboardList,
  Lightbulb,
  Eye,
  BarChart2,
  MessageCircle,
  User,
  LogOut,
  Sparkles
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const items = [
  { label: "Paper Trading App", path: "/trade", icon: <TrendingUp size={28} />, color: "from-emerald-400 to-teal-500" },
  { label: "Portfolio Tracking", path: "/portfolio", icon: <Briefcase size={28} />, color: "from-blue-400 to-cyan-500" },
  // ✅ DISABLE Recommendations (grey + SOON badge)
{
  label: "Recommendations",
  path: "/recommendations",
  disabled: true, // ✅ grey + disabled
  disabledNote: "Contact support to activate", // ✅ small note under text
  icon: <Lightbulb size={28} />,
  color: "from-slate-400 to-gray-500",
},




  // ✅ (Coming soon)
  { label: "On-demand script Insignts", comingSoon: true, icon: <BarChart2 size={28} />, color: "from-slate-400 to-gray-500" },

  // ✅ (Coming soon)
  { label: "Event based ALERTS", comingSoon: true, sublabel: "News / Bulk deals etc.", icon: <ClipboardList size={28} />, color: "from-slate-400 to-gray-500" },

  // ✅ (Coming soon)
  { label: "IPO Tracking", comingSoon: true, icon: <Eye size={28} />, color: "from-slate-400 to-gray-500" },

  { label: "Profile", path: "/Profile", icon: <User size={28} />, color: "from-rose-400 to-pink-500" },
  {
    label: "Feedback / Contact Us",
    path: "/feedback",
    icon: <MessageCircle size={28} />,
    color: "from-indigo-400 to-purple-500",
  },

  
];

export default function Menu({ logout }) {
  const nav = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);

  const { isDark } = useTheme();

  // ✅ Same theme system as History.jsx
  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";
  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  const headerClass = isDark
    ? "bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-r from-blue-600 to-cyan-600";

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300`}>
      {/* Background glow blobs (aligned with History.jsx style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-blue-500/20" : "bg-blue-400/20"}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-cyan-500/20" : "bg-cyan-400/20"}`}></div>
        <div className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-blue-400/10" : "bg-blue-300/15"}`}></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Main Container */}
        <div className={`${glassClass} rounded-3xl shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className={`relative ${headerClass} px-8 py-6`}>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg`}>
                  <Sparkles className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Main Menu</h2>
                  <p className="text-white/70 text-sm mt-0.5">Choose your destination</p>
                </div>
              </div>

              <button
                onClick={logout}
                className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg
                  ${isDark ? "bg-white/10 hover:bg-white/20 border border-white/20" : "bg-white/20 hover:bg-white/30 border border-white/30"}
                  text-white backdrop-blur-sm`}
              >
                <LogOut size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item, index) => {
                const isDisabled = !!item.comingSoon;
                const isHovered = hoveredItem === index;

                const enabledBg = isDark
                  ? "bg-gradient-to-br from-white/5 to-white/0"
                  : "bg-gradient-to-br from-white to-slate-50";

                const disabledBg = isDark
                  ? "bg-gradient-to-br from-white/5 to-white/5"
                  : "bg-gradient-to-br from-slate-100 to-gray-100";

                const borderClass = isDark
                  ? (isDisabled ? "border-white/10" : "border-white/10 hover:border-white/20")
                  : (isDisabled ? "border-slate-200" : "border-white hover:border-slate-200");

                return (
                  <button
                    key={item.path || item.label}
                    onClick={() => {
                      if (!isDisabled && item.path) nav(item.path);
                    }}
                    onMouseEnter={() => setHoveredItem(index)}
                    onMouseLeave={() => setHoveredItem(null)}
                    disabled={isDisabled}
                    title={isDisabled ? "Coming soon" : item.label}
                    className={`group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 border-2 overflow-hidden
                      ${isDisabled
                        ? `cursor-not-allowed ${disabledBg}`
                        : `cursor-pointer hover:scale-105 hover:-translate-y-1 active:scale-95 shadow-lg hover:shadow-2xl ${enabledBg}`
                      }
                      ${borderClass}
                    `}
                  >
                    {/* ✅ Hover Glow Effect (FIXED: no dynamic opacity class) */}
                    {!isDisabled && isHovered && (
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${item.color} ${isDark ? "opacity-10" : "opacity-5"
                          } transition-opacity duration-300`}
                      ></div>
                    )}

                    {/* Coming Soon Badge */}
                    {isDisabled && (
                      <div className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md bg-gradient-to-r from-indigo-500 to-blue-500 ${isDark ? "bg-white/15 border border-white/15" : "bg-slate-700"}`}>
                        SOON
                      </div>
                    )}

                    {/* Icon Container */}
                    <div
                      className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDisabled
                        ? (isDark ? "bg-white/10" : "bg-gradient-to-br from-slate-200 to-gray-300")
                        : `bg-gradient-to-br ${item.color} group-hover:scale-110 group-hover:rotate-3 shadow-lg`
                        } ${!isDisabled && isHovered ? "shadow-2xl" : ""}`}
                    >
                      <div
                        className={`${isDisabled ? (isDark ? "text-slate-300" : "text-slate-500") : "text-white"} transition-transform duration-300 ${isHovered && !isDisabled ? "scale-110" : ""
                          }`}
                      >
                        {item.icon}
                      </div>

                      {/* Shine Effect */}
                      {!isDisabled && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      )}
                    </div>

                    {/* Label */}
                    {/* Label */}
<div className="mt-4 text-center relative z-10">
  <span
    className={`text-sm font-bold transition-colors duration-300 ${isDisabled
      ? (isDark ? "text-slate-300" : "text-slate-500")
      : (isDark ? "text-white group-hover:text-white" : "text-slate-800 group-hover:text-slate-900")
    }`}
  >
    {item.label}
  </span>

  {/* ✅ Only for Recommendations */}
  {item.label === "Recommendations" && (
    <p className={`mt-1.5 text-xs leading-tight ${isDark ? "text-amber-300/90" : "text-amber-700"}`}>
      Contact support to activate
    </p>
  )}

  {item.sublabel && (
    <p className={`mt-1.5 text-xs leading-tight ${textSecondaryClass}`}>
      {item.sublabel}
    </p>
  )}


                    </div>

                    {/* Bottom Accent Line */}
                    {!isDisabled && (
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          

          {/* Footer Info */}
          <div className="px-8 pb-6 pt-2">
            <div className={`flex items-center justify-center gap-2 text-sm ${textSecondaryClass}`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
