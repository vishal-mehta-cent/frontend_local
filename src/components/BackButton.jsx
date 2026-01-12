// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({
  inline = true,
  className = "",
  to = null,          // ✅ NEW
  state = undefined,  // ✅ NEW
  replace = false,    // ✅ optional
}) {
  const navigate = useNavigate();

  const base =
    "flex items-center transition text-slate-900 hover:text-slate-900 dark:text-white dark:hover:text-white";

  const pos = inline ? "" : "absolute top-[5px] left-2 z-50";
  const cls = `${base} ${pos} ${className}`.trim();

  const handleBack = () => {
    // ✅ If caller provided explicit target, go there
    if (to) {
      navigate(to, { state, replace });
      return;
    }

    // ✅ Otherwise fallback to history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/menu");
    }
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
