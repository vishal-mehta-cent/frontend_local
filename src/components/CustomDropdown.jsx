import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="custom-dd-wrapper" ref={ref}>
      {label && <label className="custom-dd-label">{label}</label>}

      <button
        type="button"
        className={`custom-dd-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span className="custom-dd-value">{value || placeholder}</span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="custom-dd-menu">
          {options.map((opt) => (
            <div
              key={opt}
              className={`custom-dd-option ${
                opt === value ? "selected" : ""
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
