// src/components/BackButton.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({
  inline = true,
  className = "",
  to = null,          // explicit target (highest priority)
  state = undefined,  // optional navigation state when using "to"
  replace = false,    // optional
  fallback = "/menu", // ✅ NEW: final fallback route
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const base =
    "flex items-center transition text-slate-900 hover:text-slate-900 dark:text-white dark:hover:text-white";

  const pos = inline ? "" : "absolute top-[5px] left-2 z-50";
  const cls = `${base} ${pos} ${className}`.trim();

  const handleBack = () => {
    // ✅ 1) If caller provided explicit target, go there
    if (to) {
      navigate(to, { state, replace });
      return;
    }

    // ✅ 2) If current page was opened from Recommendations (or anywhere),
    // and returnTo was passed via navigation state, go back there.
    const returnTo = location.state?.returnTo;
    if (returnTo) {
      navigate(returnTo, { replace: false });
      return;
    }

    // ✅ 3) Otherwise fallback to history
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    // ✅ 4) Final fallback
    navigate(fallback);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cls}
      aria-label="Back"
    >
      <ArrowLeft size={18} />
    </button>
  );
}
