import React from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Sun, Moon, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function HeaderActions({
  glassClass = "",
  cardHoverClass = "",
  showFunds = true,
  showTheme = true,
  showProfile = true,
}) {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const btnClass = [
    glassClass || "bg-white/5 backdrop-blur-xl border border-white/10",
    "p-3 rounded-xl transition-all shadow-lg",
    cardHoverClass || "hover:bg-white/10",
  ].join(" ");

  return (
    <div className="flex items-center gap-3">
      {/* ✅ Funds (LEFT of theme) */}
      {showFunds && (
        <button
          onClick={() => navigate("/profile/funds")}
          className={btnClass}
          title="Funds"
          aria-label="Funds"
        >
          <Wallet className="w-5 h-5" />
        </button>
      )}

      {/* ✅ Theme */}
      {showTheme && (
        <button
          onClick={toggle}
          className={btnClass}
          title="Theme"
          aria-label="Theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      )}

      {/* ✅ Profile */}
      {showProfile && (
        <button
          onClick={() => navigate("/profile")}
          className={btnClass}
          title="Profile"
          aria-label="Profile"
        >
          <User className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
