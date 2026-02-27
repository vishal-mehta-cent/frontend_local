import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import BackButton from "./BackButton";
import HeaderActions from "./HeaderActions";
import SwipeNav from "./SwipeNav";

export default function AppHeader({ zClass = "z-50", showBack = true, showNav = true }) {
  const { isDark } = useTheme();

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  // ✅ measure header height so content never goes under it
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => setHeaderH(el.getBoundingClientRect().height || 0);
    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      {/* ✅ FIXED HEADER */}
      <div
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 ${zClass} ${glassClass} shadow-2xl`}
        style={{ paddingTop: "env(safe-area-inset-top)" }} // nice for mobiles/notches
      >
        <div className="w-full px-3 sm:px-4 md:px-6 py-4">
          <div className="relative flex items-start justify-between mb-4">
            <div className="flex flex-col items-start">
              {showBack ? <BackButton /> : <div className="h-10" />}

              <div className="mt-1">
                <div className={`text-2xl font-extrabold uppercase tracking-wide bg-clip-text text-transparent ${brandGradient}`}>
                  NEUROCREST
                </div>

                <div className={`text-xs ${textSecondaryClass}`}>Next-Gen Trading</div>
              </div>
            </div>

            <HeaderActions glassClass={glassClass} cardHoverClass={cardHoverClass} />
          </div>

          {showNav && <SwipeNav glassClass={glassClass} cardHoverClass={cardHoverClass} />}
        </div>
      </div>

      {/* ✅ Spacer: pushes page content below header (auto height, works on all screens) */}
      <div style={{ height: headerH }} />
    </>
  );
}
