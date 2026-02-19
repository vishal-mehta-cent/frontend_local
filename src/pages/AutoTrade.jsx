// frontend/src/pages/AutoTrade.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Save,
  Trash2,
  Zap,
  Activity,
  Bell,
  Sparkles,
  Play,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

function safeUserId() {
  return (
    localStorage.getItem("username") ||
    localStorage.getItem("user_id") ||
    "default_user"
  );
}

function normalizeSymbol(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function TogglePill({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={[
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold",
        "transition-all select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        value
          ? "bg-emerald-500/90 text-white shadow"
          : "bg-white/10 text-white/80 hover:bg-white/15",
      ].join(" ")}
    >
      {value ? "ON" : "OFF"}
    </button>
  );
}

export default function AutoTrade() {
  const navigate = useNavigate();
  const userId = useMemo(() => safeUserId(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addSymbol, setAddSymbol] = useState("");
  const [search, setSearch] = useState("");

  // rows: [{symbol, fast_alert, intraday, btst, short_term, generate_signals}]
  const [rows, setRows] = useState([]);

  // suggestions from /search
  const [suggestions, setSuggestions] = useState([]);
  const [sLoading, setSLoading] = useState(false);
  const sAbort = useRef(null);

  // per-script generate run state
  const [genRunning, setGenRunning] = useState({}); // symbol -> bool

  // -----------------------------
  // Load settings
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API}/auto-trade/user-settings?user_id=${encodeURIComponent(userId)}`
        );

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }

        const j = await res.json();
        if (!mounted) return;
        setRows(Array.isArray(j.rows) ? j.rows : []);
      } catch (e) {
        console.error(e);
        alert("Failed to load Auto Trade settings: " + (e?.message || ""));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // -----------------------------
  // Suggestions (reuse /search if exists)
  // -----------------------------
  useEffect(() => {
    const q = addSymbol.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        if (sAbort.current) sAbort.current.abort();
        const controller = new AbortController();
        sAbort.current = controller;

        setSLoading(true);

        const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const j = await res.json();
        const arr = Array.isArray(j)
          ? j
          : Array.isArray(j?.results)
          ? j.results
          : [];
        setSuggestions(arr.slice(0, 10));
      } catch (e) {
        // ignore aborts
      } finally {
        setSLoading(false);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [addSymbol]);

  // -----------------------------
  // Add script
  // -----------------------------
  async function addScript(symbolRaw) {
    const sym = normalizeSymbol(symbolRaw || addSymbol);
    if (!sym) return;

    if (rows.some((r) => r.symbol === sym)) {
      setAddSymbol("");
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`${API}/auto-trade/add-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, symbol: sym }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      setRows((prev) => [
        ...prev,
        {
          symbol: sym,
          fast_alert: false,
          intraday: false,
          btst: false,
          short_term: false,
          generate_signals: false,
        },
      ]);

      setAddSymbol("");
      setSuggestions([]);
    } catch (e) {
      console.error(e);
      alert("Failed to add script: " + (e?.message || "Please try again."));
    }
  }

  // -----------------------------
  // Remove script
  // -----------------------------
  async function removeScript(sym) {
    try {
      const res = await fetch(`${API}/auto-trade/remove-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, symbol: sym }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn("remove-script failed:", txt);
      }
    } catch (e) {
      // ignore
    }
    setRows((prev) => prev.filter((r) => r.symbol !== sym));
  }

  // -----------------------------
  // Save all
  // -----------------------------
  async function saveAll() {
    try {
      setSaving(true);
      const res = await fetch(`${API}/auto-trade/save-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, rows }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      alert("Saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save: " + (e?.message || "Please try again."));
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------
  // All Signals row toggles
  // -----------------------------
  function setAllKpi(key, value) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        [key]: value,
      }))
    );
  }

  // -----------------------------
  // Generate Signals run
  // -----------------------------
  async function runGenerate(sym) {
    try {
      setGenRunning((p) => ({ ...p, [sym]: true }));

      const res = await fetch(`${API}/auto-trade/generate-signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userId, symbol: sym }),
      });

      const txt = await res.text();
      let j = null;
      try {
        j = JSON.parse(txt);
      } catch {}

      if (!res.ok) {
        const msg =
          (j && (j.detail?.message || j.detail)) ||
          txt ||
          "Generate Signals failed.";
        alert(msg);
        return;
      }

      alert("Signals generated and written to CSV.");
    } catch (e) {
      console.error(e);
      alert("Generate Signals failed: " + (e?.message || "Please try again."));
    } finally {
      setGenRunning((p) => ({ ...p, [sym]: false }));
    }
  }

  // -----------------------------
  // Filtered rows
  // -----------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return rows.slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
    return rows
      .filter((r) => r.symbol.includes(q))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [rows, search]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white">
      {/* IMPORTANT: keep outer wrapper overflow visible */}
      <div className="mx-auto max-w-6xl px-4 py-6 overflow-visible">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg backdrop-blur">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-white/10 p-2 hover:bg-white/15"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-300" />
            <div>
              <div className="text-lg font-bold leading-tight">Auto Trade</div>
              <div className="text-xs text-white/70">
                Configure scripts & alerts, and generate signals to CSV
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={saveAll}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold shadow hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save All
            </button>
          </div>
        </div>

        {/* Add Script card (HIGH Z-INDEX so dropdown stays above table) */}
        <div className="mt-5 relative z-[60] overflow-visible rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
          <div className="text-sm font-semibold text-emerald-200">
            Add New Script
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full">
              <input
                value={addSymbol}
                onChange={(e) => setAddSymbol(e.target.value)}
                placeholder="Enter Script To Add (e.g., TCS)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-emerald-400/40"
              />

              {/* Suggestions dropdown (EVEN HIGHER Z) */}
              {addSymbol.trim() && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-[80] mt-2 max-h-[260px] overflow-auto rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur">
                  {suggestions.map((s, idx) => {
                    const label =
                      typeof s === "string"
                        ? s
                        : s?.symbol || s?.tradingsymbol || s?.name || "";
                    const sym = normalizeSymbol(label);
                    if (!sym) return null;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addScript(sym)}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-white/10"
                      >
                        <div className="font-semibold text-white">{sym}</div>
                        {/* if your /search returns more fields, show them */}
                        {(s?.name || s?.exchange || s?.segment) && (
                          <div className="text-xs text-white/60">
                            {s?.name ? String(s.name).toUpperCase() : ""}
                            {(s?.exchange || s?.segment) ? " • " : ""}
                            {[s?.exchange, s?.segment].filter(Boolean).join(" | ")}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => addScript(addSymbol)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500/90 px-5 py-3 text-sm font-semibold shadow hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Existing Scripts..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Table card (LOWER Z-INDEX so it won't cover dropdown) */}
        <div className="mt-5 relative z-[10] rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Bell className="h-4 w-4" />
              Alert Configurations{" "}
              <span className="text-white/60">({rows.length} scripts)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0">
              <thead>
                <tr className="text-xs uppercase text-white/60">
                  <th className="border-b border-white/10 px-4 py-3 text-left">
                    Script
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 text-center">
                    Generate Signals
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Zap className="h-4 w-4 text-yellow-300" />
                      Fast Alert
                    </div>
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Activity className="h-4 w-4 text-sky-300" />
                      Intraday
                    </div>
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Bell className="h-4 w-4 text-emerald-300" />
                      BTST
                    </div>
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-violet-300" />
                      Short-Term
                    </div>
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 text-center">
                    <Trash2 className="mx-auto h-4 w-4 text-rose-300" />
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="bg-white/[0.03]">
                  <td className="border-b border-white/10 px-4 py-3">
                    <div className="font-semibold">All Signals</div>
                    <div className="text-xs text-white/50">
                      Apply selection to all scripts
                    </div>
                  </td>

                  <td className="border-b border-white/10 px-4 py-3 text-center text-white/40">
                    —
                  </td>

                  <td className="border-b border-white/10 px-4 py-3 text-center">
                    <TogglePill
                      value={
                        rows.length > 0 &&
                        rows.every((r) => r.fast_alert === true)
                      }
                      onChange={(v) => setAllKpi("fast_alert", v)}
                      disabled={rows.length === 0}
                    />
                  </td>
                  <td className="border-b border-white/10 px-4 py-3 text-center">
                    <TogglePill
                      value={
                        rows.length > 0 &&
                        rows.every((r) => r.intraday === true)
                      }
                      onChange={(v) => setAllKpi("intraday", v)}
                      disabled={rows.length === 0}
                    />
                  </td>
                  <td className="border-b border-white/10 px-4 py-3 text-center">
                    <TogglePill
                      value={rows.length > 0 && rows.every((r) => r.btst === true)}
                      onChange={(v) => setAllKpi("btst", v)}
                      disabled={rows.length === 0}
                    />
                  </td>
                  <td className="border-b border-white/10 px-4 py-3 text-center">
                    <TogglePill
                      value={
                        rows.length > 0 &&
                        rows.every((r) => r.short_term === true)
                      }
                      onChange={(v) => setAllKpi("short_term", v)}
                      disabled={rows.length === 0}
                    />
                  </td>
                  <td className="border-b border-white/10 px-4 py-3 text-center text-white/40">
                    —
                  </td>
                </tr>

                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-white/60"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-white/60"
                    >
                      No scripts added yet. Add your first script above.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.symbol} className="hover:bg-white/[0.03]">
                      <td className="border-b border-white/10 px-4 py-3">
                        <div className="font-semibold">{r.symbol}</div>
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => runGenerate(r.symbol)}
                          disabled={!!genRunning[r.symbol]}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 disabled:opacity-60"
                          title="Run generator and write signals to CSV"
                        >
                          {genRunning[r.symbol] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Run
                        </button>
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.fast_alert}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, fast_alert: v } : x
                              )
                            )
                          }
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.intraday}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, intraday: v } : x
                              )
                            )
                          }
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.btst}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, btst: v } : x
                              )
                            )
                          }
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.short_term}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol
                                  ? { ...x, short_term: v }
                                  : x
                              )
                            )
                          }
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeScript(r.symbol)}
                          className="rounded-xl bg-rose-500/20 p-2 hover:bg-rose-500/30"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-rose-200" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-white/50">
            Tip: Click <span className="text-white/70 font-semibold">Run</span>{" "}
            to generate signals for a script and write them into CSV outputs.
          </div>
        </div>
      </div>
    </div>
  );
}
