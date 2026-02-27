import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Search, ClipboardList, Briefcase, Clock, Activity, Settings } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export default function SwipeNav({ glassClass, cardHoverClass }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔑 Feature flag from .env
  const SHOW_WHATSAPP = import.meta.env.VITE_SHOW_WHATSAPP === "true";

  const containerRef = useRef(null);
  const activeBtnRef = useRef(null);

  // ✅ Tabs built conditionally (MATCH ROUTES EXACTLY)
  const tabs = [
    { label: "Watchlist", path: "/trade", icon: <Search size={18} /> },
    { label: "Orders", path: "/orders", icon: <ClipboardList size={18} /> },
    { label: "Portfolio", path: "/portfolio", icon: <Briefcase size={18} /> },
    { label: "Recommendations", path: "/recommendations", icon: <Activity size={18} /> },

    ...(SHOW_WHATSAPP
      ? [{ label: "Whatsapp", path: "/whatsapp", icon: <FaWhatsapp size={18} /> }]
      : []),

    { label: "History", path: "/history", icon: <Clock size={18} /> },

    // ✅ NEW TAB: Auto Trade (after History)
    { label: "Auto Trade", path: "/autotrade", icon: <Settings size={18} /> },
  ];

  // ✅ Better "active" matching for nested routes too
  const currentPath = (location.pathname || "").toLowerCase();

  const isActiveTab = (tabPath) => {
    const tp = (tabPath || "").toLowerCase();

    if (tp === "/trade") return currentPath === "/trade" || currentPath.startsWith("/trade/");
    if (tp === "/orders") return currentPath === "/orders" || currentPath.startsWith("/orders") || currentPath.startsWith("/modify");
    if (tp === "/portfolio") return currentPath === "/portfolio" || currentPath.startsWith("/portfolio");
    if (tp === "/recommendations") return currentPath === "/recommendations" || currentPath.startsWith("/recommendations");
    if (tp === "/whatsapp") return currentPath === "/whatsapp" || currentPath.startsWith("/whatsapp");
    if (tp === "/history") return currentPath === "/history" || currentPath.startsWith("/history");

    // ✅ NEW: active match for AutoTrade
    if (tp === "/autotrade") return currentPath === "/autotrade" || currentPath.startsWith("/autotrade");

    return currentPath === tp;
  };

  // ✅ Auto-scroll active tab into view (so Recommendations/History/Auto Trade becomes visible)
  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      className="
        flex gap-2
        overflow-x-auto whitespace-nowrap
        touch-pan-x
        no-scrollbar
        scroll-smooth
        snap-x snap-mandatory
        -mx-4 px-4
        pb-2
      "
    >
      {tabs.map((tab) => {
        const active = isActiveTab(tab.path);

        return (
          <button
            key={tab.path}
            ref={active ? activeBtnRef : null}
            onClick={() => navigate(tab.path)}
            className={`
              shrink-0 snap-start
              flex items-center gap-2
              px-4 py-2.5
              rounded-xl font-medium
              transition-all
              ${
                active
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${glassClass} ${cardHoverClass}`
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
