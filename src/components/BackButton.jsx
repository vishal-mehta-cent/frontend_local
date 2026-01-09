// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ inline = true, className = "" }) {
  const navigate = useNavigate();

  // ✅ Dark theme = white, Light theme = black (auto via Tailwind dark: class)
  const base =
    "flex items-center transition text-slate-900 hover:text-slate-900 dark:text-white dark:hover:text-white";

  const pos = inline ? "" : "absolute top-[5px] left-2 z-50";
  const cls = `${base} ${pos} ${className}`.trim();

  const handleBack = () => {
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
