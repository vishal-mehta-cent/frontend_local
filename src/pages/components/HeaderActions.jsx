// frontend/src/components/HeaderActions.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Reusable header right-side actions:
 *  - Theme toggle (Light/Dark) ✅ global + persistent via ThemeContext
 *  - Profile button
 */
export default function HeaderActions({ glassClass = "", cardHoverClass = "" }) {
    const navigate = useNavigate();
    const { isDark, toggle } = useTheme();

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={toggle}
                className={`${glassClass} p-3 rounded-xl ${cardHoverClass} transition-all shadow-lg`}
                title="Theme"
                aria-label="Toggle theme"
            >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
                type="button"
                onClick={() => navigate("/profile")}
                className={`${glassClass} p-3 rounded-xl ${cardHoverClass} transition-all shadow-lg`}
                title="Profile"
                aria-label="Open profile"
            >
                <User className="w-5 h-5" />
            </button>
        </div>
    );
}
