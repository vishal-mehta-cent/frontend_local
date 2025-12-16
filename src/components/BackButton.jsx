// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ inline = true, className = "" }) {
  const navigate = useNavigate();

  const base =
    "flex items-center gap-1 text-gray-700 hover:text-blue-600 text-sm";
  const pos = inline ? "" : "absolute top-2 left-2";
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
