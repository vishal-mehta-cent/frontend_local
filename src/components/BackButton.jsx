// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ inline = true, className = "" }) {
  const navigate = useNavigate();

  const base =
    "flex items-center text-white hover:text-white transition";

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
