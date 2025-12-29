import { useNavigate, useLocation } from "react-router-dom";
import {
    Search,
    ClipboardList,
    Briefcase,
    Clock,
    Activity,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export default function SwipeNav({ glassClass, cardHoverClass }) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { label: "Watchlist", path: "/trade", icon: <Search size={18} /> },
        { label: "Orders", path: "/orders", icon: <ClipboardList size={18} /> },
        { label: "Portfolio", path: "/portfolio", icon: <Briefcase size={18} /> },
        { label: "History", path: "/history", icon: <Clock size={18} /> },
        { label: "Recommendations", path: "/Recommendations", icon: <Activity size={18} /> },
        { label: "Whatsapp", path: "/whatsapp", icon: <FaWhatsapp size={18} /> },
    ];

    return (
        <div
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
                const active = location.pathname === tab.path;

                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className={`
              shrink-0 snap-start
              flex items-center gap-2
              px-4 py-2.5
              rounded-xl font-medium
              transition-all
              ${active
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                                : `${glassClass} ${cardHoverClass}`}
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
