// frontend/src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from "react";

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const BACKEND = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
    .trim()
    .replace(/\/+$/, "");

  // ----------------------------------------
  // FETCH ONLY — NO CLIENT FILTER
  // ----------------------------------------
  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const t = setTimeout(() => {
      fetch(`${BACKEND}/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setResults(d); // 🔥 DO NOT FILTER
            setOpen(true);
          } else {
            setResults([]);
            setOpen(false);
          }
        })
        .catch((e) => {
          if (e?.name === "AbortError") return;
          setResults([]);
          setOpen(false);
        });
    }, 200);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, BACKEND]);

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
    setQuery(row.symbol); // set input to selected symbol
    setOpen(false);
    onSelect(row.symbol); // 🔥 PASS CLEAN SYMBOL
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={query}
        placeholder="Search script (e.g. NIFTY, NIFTY26, NIFTYJAN)"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
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
            maxHeight: "320px",
            overflowY: "auto",
            zIndex: 9999,
            borderRadius: "10px",
            marginTop: "6px",
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.symbol + i}
              onMouseDown={() => select(r)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ fontWeight: 700 }}>{r.symbol}</div>
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
