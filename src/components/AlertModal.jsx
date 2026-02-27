import React from "react";

// Copied from Chart.jsx (same UI)
export default function AlertModal({ open, title, message, onClose, isDark }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-5 ${
          isDark
            ? "bg-[#0b1220] border border-white/10"
            : "bg-white border border-black/10"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={`text-[17px] font-semibold tracking-tight ${
                isDark ? "text-blue-300" : "text-blue-700"
              }`}
              style={{ fontFamily: "'Segoe UI', Inter, system-ui" }}
            >
              {title || "Alert"}
            </div>

            <div
              className={`mt-3 text-[14.5px] leading-[1.7] whitespace-pre-line ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {message}
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-xl grid place-items-center ${
              isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"
            } transition`}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
