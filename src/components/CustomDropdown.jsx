import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export default function CustomDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  multiple = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const normalizedOptions = useMemo(
    () => Array.from(new Set((options || []).filter((opt) => String(opt || "").trim()))),
    [options]
  );

  const selectedValues = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return value ? [value] : [];
  }, [multiple, value]);

  const toggleValue = (opt) => {
    if (!multiple) {
      onChange?.(opt);
      setOpen(false);
      return;
    }

    const exists = selectedValues.includes(opt);
    const next = exists
      ? selectedValues.filter((item) => item !== opt)
      : [...selectedValues, opt];

    onChange?.(next);
  };

  const clearAll = (event) => {
    event?.stopPropagation?.();
    onChange?.(multiple ? [] : "");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = useMemo(() => {
    if (!multiple) return value || placeholder;
    if (!selectedValues.length) return placeholder;
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} selected`;
  }, [multiple, placeholder, selectedValues, value]);

  return (
    <div className="custom-dd-wrapper" ref={ref}>
      {label && <label className="custom-dd-label">{label}</label>}

      <button
        type="button"
        className={`custom-dd-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="custom-dd-value">{displayValue}</span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {multiple && selectedValues.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              onClick={clearAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") clearAll(e);
              }}
              style={{ display: "inline-flex", alignItems: "center" }}
              aria-label="Clear selected options"
            >
              <X size={16} />
            </span>
          ) : null}
          <ChevronDown size={18} />
        </span>
      </button>

      {open && (
        <div className="custom-dd-menu">
          {normalizedOptions.length ? (
            normalizedOptions.map((opt) => {
              const selected = selectedValues.includes(opt);
              return (
                <div
                  key={opt}
                  className={`custom-dd-option ${selected ? "selected" : ""}`}
                  onClick={() => toggleValue(opt)}
                >
                  {multiple ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: "1px solid currentColor",
                        marginRight: 8,
                        opacity: selected ? 1 : 0.6,
                        flexShrink: 0,
                      }}
                    >
                      {selected ? <Check size={12} /> : null}
                    </span>
                  ) : null}
                  <span>{opt}</span>
                </div>
              );
            })
          ) : (
            <div className="custom-dd-option">No options</div>
          )}
        </div>
      )}
    </div>
  );
}
