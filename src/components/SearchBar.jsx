// frontend/src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from "react";

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const BACKEND = "http://127.0.0.1:8000";

  // ----------------------------------------
  // FETCH ONLY — NO CLIENT FILTER
  // ----------------------------------------
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(() => {
      fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setResults(d);   // 🔥 DO NOT FILTER
            setOpen(true);
          } else {
            setResults([]);
            setOpen(false);
          }
        })
        .catch(() => {
          setResults([]);
          setOpen(false);
        });
    }, 200);

    return () => clearTimeout(t);
  }, [query]);

  // ----------------------------------------
  // CLOSE ON OUTSIDE CLICK
  // ----------------------------------------
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ----------------------------------------
  // SELECT SCRIPT (ONLY SYMBOL)
  // ----------------------------------------
  const select = (row) => {
    setQuery(row.symbol);     // 360ONE
    setOpen(false);
    onSelect(row.symbol);     // 🔥 PASS CLEAN SYMBOL
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={query}
        placeholder="Search script (e.g. 360ONE)"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #333",
          background: "#fff",
          color: "#000",
        }}
      />

      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 9999,
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.symbol + i}
              onMouseDown={() => select(r)}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {r.symbol}
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {r.display_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
