import React from "react";
import { useTheme } from "../context/ThemeContext";
import BackButton from "./BackButton";
import HeaderActions from "./HeaderActions";
import SwipeNav from "./SwipeNav";

export default function AppHeader({
  zClass = "z-50",
  showBack = true,
  showNav = true,
}) {
  const { isDark } = useTheme();

  // ✅ Same styling you use across pages
  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  return (
    <div className={`fixed top-0 left-0 right-0 ${zClass} ${glassClass} shadow-2xl`}>
      <div className="w-full px-3 sm:px-4 md:px-6 py-4">
        {/* Top Row */}
        <div className="relative flex items-start justify-between mb-4">
          {/* Left: Back + Title */}
          <div className="flex flex-col items-start">
            {showBack ? <BackButton /> : <div className="h-10" />}

            <div className="mt-1">
              <div
                className={`text-2xl font-extrabold uppercase tracking-wide bg-clip-text text-transparent ${brandGradient}`}
              >
                NEUROCREST
              </div>

              <div className={`text-xs ${textSecondaryClass}`}>
                Next-Gen Trading
              </div>
            </div>
          </div>

          {/* Right: Funds + Theme + Profile */}
          <HeaderActions glassClass={glassClass} cardHoverClass={cardHoverClass} />
        </div>

        {/* Tabs row */}
        {showNav && <SwipeNav glassClass={glassClass} cardHoverClass={cardHoverClass} />}
      </div>
    </div>
  );
}
