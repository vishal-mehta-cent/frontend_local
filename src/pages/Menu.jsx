// ✅ frontend/src/pages/Menu.jsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

export default function Menu({ logout }) {
  const nav = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);

  const { isDark } = useTheme();

  // ---------------- Feature Access (from feature_access.csv via backend) ----------------
  const [feature, setFeature] = useState({
    loading: true,
    allow_recommendation_page: false,
  });

  useEffect(() => {
    const u = (
      localStorage.getItem("username") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("user") ||
      ""
    ).trim();

    if (!u) {
      setFeature({ loading: false, allow_recommendation_page: false });
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `${API}/features/access/${encodeURIComponent(u)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setFeature({
          loading: false,
          allow_recommendation_page: !!data?.allow_recommendation_page,
        });
      } catch (e) {
        if (e?.name === "AbortError") return;
        // fail-safe: if API fails, keep it disabled
        setFeature({ loading: false, allow_recommendation_page: false });
      }
    })();

    return () => controller.abort();
  }, []);

  const items = useMemo(() => {
    const recoEnabled = !!feature.allow_recommendation_page;
    const recoDisabled = feature.loading ? true : !recoEnabled;

    return [
      {
        label: "Paper Trading App",
        path: "/trade",
        icon: <TrendingUp size={28} />,
        color: "from-emerald-400 to-teal-500",
      },
      {
        label: "Portfolio Tracking",
        path: "/portfolio",
        icon: <Briefcase size={28} />,
        color: "from-blue-400 to-cyan-500",
      },

      // ✅ Recommendations: enabled only if user has allow_recommendation_page in feature_access.csv
      {
        label: "Recommendations",
        path: "/recommendations",
        disabled: recoDisabled,
        disabledNote: feature.loading
          ? "Checking access..."
          : "Contact support to activate",
        icon: <Lightbulb size={28} />,
        color: recoEnabled
          ? "from-amber-400 to-orange-500"
          : "from-slate-400 to-gray-500",
      },

      // ✅ (Coming soon)
      {
        label: "On-demand script Insignts",
        comingSoon: true,
        icon: <BarChart2 size={28} />,
        color: "from-slate-400 to-gray-500",
      },

      // ✅ (Coming soon)
      {
        label: "Event based ALERTS",
        comingSoon: true,
        sublabel: "News / Bulk deals etc.",
        icon: <ClipboardList size={28} />,
        color: "from-slate-400 to-gray-500",
      },

      // ✅ (Coming soon)
      {
        label: "IPO Intelligence",
        comingSoon: true,
        icon: <Eye size={28} />,
        color: "from-slate-400 to-gray-500",
      },

      {
        label: "Profile",
        path: "/Profile",
        icon: <User size={28} />,
        color: "from-rose-400 to-pink-500",
      },
      {
        label: "Feedback / Contact Us",
        path: "/feedback",
        icon: <MessageCircle size={28} />,
        color: "from-indigo-400 to-purple-500",
      },
    ];
  }, [feature.allow_recommendation_page, feature.loading]);

  // ✅ Same theme system as History.jsx
  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";
  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  const headerClass = isDark
    ? "bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-r from-blue-600 to-cyan-600";

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300`}
    >
      {/* Background glow blobs (aligned with History.jsx style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-blue-500/20" : "bg-blue-400/20"
            }`}
        ></div>
        <div
          className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-cyan-500/20" : "bg-cyan-400/20"
            }`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-blue-400/10" : "bg-blue-300/15"
            }`}
        ></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Brand (above menu box) */}
        <div className="flex flex-col items-center text-center mb-5">
          <img
            src="/logo1.png"
            alt="NeuroCrest"
            className="h-14 w-14 mb-2 select-none"
            draggable="false"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="text-4xl font-extrabold uppercase tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]">
            NEUROCREST
          </div>
          <div className={`text-sm mt-1 ${textSecondaryClass}`}>
            Your All-in-One AI Trading Mentor
          </div>
        </div>

        {/* Main Container */}
        <div className={`${glassClass} rounded-3xl shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className={`relative ${headerClass} px-8 py-6`}>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {" "}
                    Menu
                  </h2>
                  <p className="text-white/70 text-sm mt-0.5">
                    Choose your destination
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg
                  ${isDark
                    ? "bg-white/10 hover:bg-white/20 border border-white/20"
                    : "bg-white/20 hover:bg-white/30 border border-white/30"
                  }
                  text-white backdrop-blur-sm`}
              >
                <LogOut
                  size={18}
                  className="group-hover:rotate-12 transition-transform duration-300"
                />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item, index) => {
                const isDisabled = !!item.comingSoon || !!item.disabled;
                const isHovered = hoveredItem === index;

                const enabledBg = isDark
                  ? "bg-gradient-to-br from-white/5 to-white/0"
                  : "bg-gradient-to-br from-white to-slate-50";

                const disabledBg = isDark
                  ? "bg-gradient-to-br from-white/5 to-white/5"
                  : "bg-gradient-to-br from-slate-100 to-gray-100";

                const borderClass = isDark
                  ? isDisabled
                    ? "border-white/10"
                    : "border-white/10 hover:border-white/20"
                  : isDisabled
                    ? "border-slate-200"
                    : "border-white hover:border-slate-200";

                const title = isDisabled
                  ? item.comingSoon
                    ? "Coming soon"
                    : item.disabledNote || "Disabled"
                  : item.label;

                return (
                  <button
                    key={item.path || item.label}
                    onClick={() => {
                      if (!isDisabled && item.path) nav(item.path);
                    }}
                    onMouseEnter={() => setHoveredItem(index)}
                    onMouseLeave={() => setHoveredItem(null)}
                    disabled={isDisabled}
                    title={title}
                    className={`group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 border-2 overflow-hidden
                      ${isDisabled
                        ? `cursor-not-allowed ${disabledBg}`
                        : `cursor-pointer hover:scale-105 hover:-translate-y-1 active:scale-95 shadow-lg hover:shadow-2xl ${enabledBg}`
                      }
                      ${borderClass}
                    `}
                  >
                    {/* ✅ Hover Glow Effect */}
                    {!isDisabled && isHovered && (
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${item.color} ${isDark ? "opacity-10" : "opacity-5"
                          } transition-opacity duration-300`}
                      ></div>
                    )}

                    {/* Coming Soon Badge */}
                    {item.comingSoon && (
                      <div
                        className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md bg-gradient-to-r from-indigo-500 to-blue-500 ${isDark
                            ? "bg-white/15 border border-white/15"
                            : "bg-slate-700"
                          }`}
                      >
                        SOON
                      </div>
                    )}

                    {/* Icon Container */}
                    <div
                      className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDisabled
                          ? isDark
                            ? "bg-white/10"
                            : "bg-gradient-to-br from-slate-200 to-gray-300"
                          : `bg-gradient-to-br ${item.color} group-hover:scale-110 group-hover:rotate-3 shadow-lg`
                        } ${!isDisabled && isHovered ? "shadow-2xl" : ""}`}
                    >
                      <div
                        className={`${isDisabled
                            ? isDark
                              ? "text-slate-300"
                              : "text-slate-500"
                            : "text-white"
                          } transition-transform duration-300 ${isHovered && !isDisabled ? "scale-110" : ""
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
                    <div className="mt-4 text-center relative z-10">
                      <span
                        className={`text-sm font-bold transition-colors duration-300 ${isDisabled
                            ? isDark
                              ? "text-slate-300"
                              : "text-slate-500"
                            : isDark
                              ? "text-white group-hover:text-white"
                              : "text-slate-800 group-hover:text-slate-900"
                          }`}
                      >
                        {item.label}
                      </span>

                      {/* Optional disabled note (used for Recommendations) */}
                      {isDisabled && item.disabledNote && (
                        <p
                          className={`mt-1.5 text-xs leading-tight ${isDark ? "text-amber-300/90" : "text-amber-700"
                            }`}
                        >
                          {item.disabledNote}
                        </p>
                      )}

                      {item.sublabel && (
                        <p
                          className={`mt-1.5 text-xs leading-tight ${textSecondaryClass}`}
                        >
                          {item.sublabel}
                        </p>
                      )}
                    </div>

                    {/* Bottom Accent Line */}
                    {!isDisabled && (
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color
                          } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                      ></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-8 pb-6 pt-2">
            <div
              className={`flex items-center justify-center gap-2 text-sm ${textSecondaryClass}`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
