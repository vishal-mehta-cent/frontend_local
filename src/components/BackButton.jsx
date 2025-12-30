// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ inline = true, className = "" }) {
  const navigate = useNavigate();

  const base =
    "flex items-center gap-2 text-sm font-medium " +
    "text-white hover:text-white " +
    "bg-black/40 hover:bg-black/60 " +
    "px-3 py-2 rounded-xl " +
    "border border-white/20 shadow-lg backdrop-blur-md transition";

  const pos = inline ? "" : "absolute top-2 left-2 z-50";
  const cls = `${base} ${pos} ${className}`.trim();

  const handleBack = () => {
    // Browser-like back navigation
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback (only if page opened directly)
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
      <span>Back</span>
    </button>
  );
}
