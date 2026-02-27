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

function fmtTime(d) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(dt);
  } catch {
    return "";
  }
}

function TogglePill({ value, onChange, disabled, loading = false }) {
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
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{value ? "ON" : "OFF"}</span>
        </span>
      ) : value ? (
        "ON"
      ) : (
        "OFF"
      )}
    </button>
  );
}

export default function AutoTrade() {
  const navigate = useNavigate();
  const userId = useMemo(() => safeUserId(), []);

  // Feature access (same as Recommendations page)
  const [accessChecked, setAccessChecked] = useState(false);
  const [allowAutoTrade, setAllowAutoTrade] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addSymbol, setAddSymbol] = useState("");
  const [search, setSearch] = useState("");

  // master enable
  const [enabled, setEnabled] = useState(true);

  // Amount per trade (₹)
  const [amounts, setAmounts] = useState({
    intraday: 100000,
    fast_alert: 100000,
    generate_signals: 100000,
    btst: 100000,
    short_term: 100000,
  });
  const amountsRef = useRef(amounts);
  useEffect(() => {
    amountsRef.current = amounts;
  }, [amounts]);

  // rows: [{symbol, fast_alert, intraday, btst, short_term, generate_signals}]
  const [rows, setRows] = useState([]);

  // suggestions from /search
  const [suggestions, setSuggestions] = useState([]);
  const [sLoading, setSLoading] = useState(false);
  const sAbort = useRef(null);

  // UI status
  const [genRunning, setGenRunning] = useState({}); // symbol -> bool
  const [genStatus, setGenStatus] = useState({}); // symbol -> { ok, at, msg }
  const [engineStatus, setEngineStatus] = useState(null);

  // -----------------------------
  // Check Auto Trade access (feature_access.csv)
  // -----------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/features/access/${encodeURIComponent(userId)}`);
        if (res.ok) {
          const j = await res.json();
          if (!mounted) return;
          setAllowAutoTrade(!!j?.allow_auto_trade);
        }
      } catch {
        // ignore (fallback to backend 403 if any)
      } finally {
        if (mounted) setAccessChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);


  // --- Frontend 20s loop (supports MULTIPLE generate_signals scripts) ---
  const loopRef = useRef({
    timers: {}, // sym -> timeout id
    aborts: {}, // sym -> AbortController
    inFlight: {}, // sym -> bool
  });

  function stopLoop(sym) {
    if (!sym) return;
    const t = loopRef.current.timers?.[sym];
    if (t) {
      clearTimeout(t);
      delete loopRef.current.timers[sym];
    }
    const a = loopRef.current.aborts?.[sym];
    if (a) {
      try {
        a.abort();
      } catch {}
      delete loopRef.current.aborts[sym];
    }
    delete loopRef.current.inFlight[sym];
    setGenRunning((p) => ({ ...p, [sym]: false }));
  }

  function stopAllLoops() {
    const syms = Object.keys(loopRef.current.timers || {});
    syms.forEach(stopLoop);
  }

  // Stop everything if access is locked
  useEffect(() => {
    if (accessChecked && !allowAutoTrade) {
      stopAllLoops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessChecked, allowAutoTrade]);


  async function runOnce(sym, { navigateToPositions = false } = {}) {
    if (!sym) return { ok: false };
    if (loopRef.current.inFlight[sym]) return { ok: false };

    loopRef.current.inFlight[sym] = true;
    setGenRunning((p) => ({ ...p, [sym]: true }));

    try {
      // cancel previous request for this sym
      const prev = loopRef.current.aborts[sym];
      if (prev) {
        try {
          prev.abort();
        } catch {}
      }
      const controller = new AbortController();
      loopRef.current.aborts[sym] = controller;

      const res = await fetch(`${API}/auto-trade/generate-signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userId, symbol: sym }),
        signal: controller.signal,
      });

      const txt = await res.text();
      let j = null;
      try {
        j = JSON.parse(txt);
      } catch {}

      if (!res.ok) {
        const msg =
          (j && (j.detail?.message || j.detail)) || txt || "Generate failed";
        setGenStatus((p) => ({
          ...p,
          [sym]: { ok: false, at: new Date().toISOString(), msg: String(msg) },
        }));
        return { ok: false };
      }

      setGenStatus((p) => ({
        ...p,
        [sym]: { ok: true, at: new Date().toISOString(), msg: "CSV updated" },
      }));

      if (navigateToPositions) {
        navigate("/positions");
      }
      return { ok: true, data: j };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false };
      setGenStatus((p) => ({
        ...p,
        [sym]: {
          ok: false,
          at: new Date().toISOString(),
          msg: e?.message || "Generate failed",
        },
      }));
      return { ok: false };
    } finally {
      delete loopRef.current.aborts[sym];
      loopRef.current.inFlight[sym] = false;
      setGenRunning((p) => ({ ...p, [sym]: false }));
    }
  }

  function startLoop(sym) {
    if (!sym) return;
    if (loopRef.current.timers?.[sym]) return; // already running

    const tick = async () => {
      // if it was stopped, do nothing
      if (!loopRef.current.timers?.[sym]) return;

      const start = Date.now();
      await runOnce(sym);
      const elapsed = Date.now() - start;

      // reschedule
      if (!loopRef.current.timers?.[sym]) return;
      const delay = Math.max(0, 20000 - elapsed);
      loopRef.current.timers[sym] = setTimeout(tick, delay);
    };

    // first run after small delay to avoid burst when enabling many
    loopRef.current.timers[sym] = setTimeout(tick, 50);
  }

  async function setEnabledRemote(v) {
    const res = await fetch(`${API}/auto-trade/set-enabled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, enabled: !!v }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function updateAmountsRemote(nextAmounts) {
    const res = await fetch(`${API}/auto-trade/update-amounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, amounts: nextAmounts }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function updateScript(sym, patch) {
    const res = await fetch(`${API}/auto-trade/update-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, symbol: sym, patch }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // -----------------------------
  // Load settings
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    // Wait for feature access check (same as Recommendations page)
    if (!accessChecked) {
      return () => {
        mounted = false;
      };
    }
    if (!allowAutoTrade) {
      // Access denied: show locked popup (no alerts)
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

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
        setEnabled(!!j?.enabled);
        if (j?.amounts && typeof j.amounts === "object") {
          setAmounts((p) => ({ ...p, ...j.amounts }));
        }
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
  }, [userId, accessChecked, allowAutoTrade]);

  // -----------------------------
  // Poll backend status
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    if (!accessChecked || !allowAutoTrade) {
      return () => {
        mounted = false;
      };
    }
    const tick = async () => {
      try {
        const res = await fetch(
          `${API}/auto-trade/run-status?user_id=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;
        const j = await res.json();
        setEngineStatus(j);
        const u = j?.user || {};
        const scripts = u?.scripts || {};
        if (!mounted) return;

        const next = {};
        for (const [sym, st] of Object.entries(scripts)) {
          if (st?.last_generate_at) {
            next[sym] = {
              ok: !!st?.last_generate_ok,
              at: st?.last_generate_at,
              msg: st?.last_generate_ok ? "CSV updated" : (st?.last_generate_msg || "Generate failed"),
            };
          }
        }
        setGenStatus((p) => ({ ...p, ...next }));
      } catch {
        // ignore
      }
    };

    tick();
    const t = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [userId, accessChecked, allowAutoTrade]);

  // Stop loops when master disabled
  useEffect(() => {
    if (!enabled) stopAllLoops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Maintain loops for all scripts where generate_signals is ON
  useEffect(() => {
    if (!enabled) {
      stopAllLoops();
      return;
    }

    const activeSyms = rows.filter((x) => !!x.generate_signals).map((x) => x.symbol);

    // start loops for active
    activeSyms.forEach((sym) => startLoop(sym));

    // stop loops for inactive
    Object.keys(loopRef.current.timers || {}).forEach((sym) => {
      if (!activeSyms.includes(sym)) stopLoop(sym);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, enabled]);

  // cleanup on unmount
  useEffect(() => {
    return () => stopAllLoops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // Suggestions
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
      } catch {
        // ignore
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
    stopLoop(sym);
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
    } catch {
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

  // IMPORTANT FIX:
  // "All Signals" row must update backend immediately (so Recommendation_Data behavior matches UI).
  async function setAllKpi(key, value) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        [key]: value,
      }))
    );

    // push to backend for each script (best-effort)
    try {
      await Promise.all(
        (rows || []).map((r) => updateScript(r.symbol, { [key]: value }))
      );
    } catch (e) {
      console.warn("Failed to update All Signals:", e?.message || e);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q)
      return rows.slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
    return rows
      .filter((r) => r.symbol.includes(q))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [rows, search]);

  async function saveAmountKey(key, value) {
    const next = { ...amountsRef.current, [key]: Number(value || 0) };
    setAmounts(next);
    try {
      await updateAmountsRemote(next);
    } catch (e) {
      alert("Failed to save amounts: " + (e?.message || ""));
    }
  }


  // -----------------------------
  // Locked screen (same UX as Recommendations)
  // -----------------------------
  if (!accessChecked) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Checking access…</span>
        </div>
      </div>
    );
  }

  if (!allowAutoTrade) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-3xl bg-white/80 backdrop-blur border border-white/70 shadow-2xl p-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Auto Trade Locked</h1>
          <p className="mt-3 text-slate-600">This feature is enabled only for approved users.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-sky-500 px-10 py-3 font-semibold text-white shadow-lg hover:bg-sky-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white">
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

        {/* Auto Trade Master + Amount per trade */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-200">
                Auto Trade
              </div>
              <div className="text-xs text-white/60">
                If OFF, no signals will be pushed to Positions.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Enabled</span>
              <TogglePill
                value={!!enabled}
                onChange={async (v) => {
                  setEnabled(v);
                  try {
                    await setEnabledRemote(v);
                  } catch (e) {
                    alert("Failed to update enabled: " + (e?.message || ""));
                  }
                }}
                disabled={false}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-emerald-200">
              Amount per trade (₹)
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-5">
              {[
                ["generate_signals", "Generate"],
                ["fast_alert", "Fast Alert"],
                ["intraday", "Intraday"],
                ["btst", "BTST"],
                ["short_term", "Short-Term"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-xs text-white/70">{label}</div>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={amounts[key] ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value || 0);
                      setAmounts((p) => ({ ...p, [key]: v }));
                    }}
                    onBlur={(e) => saveAmountKey(key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-emerald-400/40"
                  />
                  <div className="mt-1 text-[10px] text-white/50">
                    EQ qty = Amount/LTP • F&amp;O lots = Amount/(LTP×lotSize) → round down
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Script */}
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
        </div>

        {/* Table */}
        <div className="mt-5 relative z-[10] rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Bell className="h-4 w-4" />
              Alert Configurations{" "}
              <span className="text-white/60">({rows.length} scripts)</span>
            </div>

            <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:w-[360px]">
              <Search className="h-4 w-4 text-white/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Existing Scripts..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
              />
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
                      Apply selection to all scripts (and backend uses this as “All Scripts”)
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
                        rows.length > 0 && rows.every((r) => r.intraday === true)
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
                    <td colSpan={7} className="px-4 py-10 text-center text-white/60">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-white/60">
                      No scripts added yet. Add your first script above.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.symbol} className="hover:bg-white/[0.03]">
                      <td className="border-b border-white/10 px-4 py-3">
                        <div className="font-semibold">{r.symbol}</div>
                      </td>

                      {/* Generate Signals */}
                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <TogglePill
                            value={!!r.generate_signals}
                            loading={!!genRunning[r.symbol]}
                            disabled={!enabled}
                            onChange={async (v) => {
                              const sym = r.symbol;

                              // FIX: do NOT reset other scripts when toggling this one
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.symbol === sym ? { ...x, generate_signals: v } : x
                                )
                              );

                              try {
                                await updateScript(sym, { generate_signals: v });

                                if (v && enabled) {
                                  // Run once immediately for faster UX, backend will also repeat.
                                  await runOnce(sym, { navigateToPositions: true });
                                  startLoop(sym);
                                } else {
                                  stopLoop(sym);
                                }
                              } catch (e) {
                                alert("Failed to update: " + (e?.message || ""));
                                // rollback UI state (best-effort)
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.symbol === sym ? { ...x, generate_signals: !v } : x
                                  )
                                );
                              }
                            }}
                          />

                          {genStatus?.[r.symbol]?.at && (
                            <div
                              className={[
                                "text-[10px]",
                                genStatus[r.symbol]?.ok
                                  ? "text-white/50"
                                  : "text-rose-200/80",
                              ].join(" ")}
                              title={genStatus?.[r.symbol]?.msg || ""}
                            >
                              {genStatus[r.symbol]?.ok ? "Last" : "Err"}:{" "}
                              {fmtTime(genStatus[r.symbol].at)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.fast_alert}
                          onChange={async (v) => {
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, fast_alert: v } : x
                              )
                            );
                            try {
                              await updateScript(r.symbol, { fast_alert: v });
                            } catch {}
                          }}
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.intraday}
                          onChange={async (v) => {
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, intraday: v } : x
                              )
                            );
                            try {
                              await updateScript(r.symbol, { intraday: v });
                            } catch {}
                          }}
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.btst}
                          onChange={async (v) => {
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, btst: v } : x
                              )
                            );
                            try {
                              await updateScript(r.symbol, { btst: v });
                            } catch {}
                          }}
                        />
                      </td>

                      <td className="border-b border-white/10 px-4 py-3 text-center">
                        <TogglePill
                          value={!!r.short_term}
                          onChange={async (v) => {
                            setRows((prev) =>
                              prev.map((x) =>
                                x.symbol === r.symbol ? { ...x, short_term: v } : x
                              )
                            );
                            try {
                              await updateScript(r.symbol, { short_term: v });
                            } catch {}
                          }}
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
            Tip: Turn{" "}
            <span className="text-white/70 font-semibold">Generate Signals</span>{" "}
            <span className="text-white/70 font-semibold">ON</span> to run now +
            backend repeats every 20s. Intraday orders only before 1:00 PM IST.
            Between 1:00–2:45 PM, signals are deferred (no intraday orders placed).
            After 2:45 PM they execute as Delivery. BTST/Short-Term always Delivery.
          </div>
        </div>
      </div>
    </div>
  );
}
