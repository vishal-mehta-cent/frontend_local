import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  RefreshCw,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle,
  Home,
} from "lucide-react";
import BackButton from "../components/BackButton";
import { useLocation } from "react-router-dom";

const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

const formatINR = (v, decimals = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const uncomma = (s) => (s || "").toString().replace(/,/g, "");

function ModeToggle({ value, onChange, isDark }) {
  const isAbs = value === "ABS";
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border ${isDark ? "border-white/20 bg-white/5" : "border-slate-200 bg-white"
        }`}
    >
      <button
        type="button"
        onClick={() => onChange("ABS")}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAbs
          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow"
          : isDark
            ? "text-slate-300 hover:bg-white/10"
            : "text-slate-600 hover:bg-slate-50"
          }`}
      >
        ABS
      </button>
      <button
        type="button"
        onClick={() => onChange("PCT")}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isAbs
          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow"
          : isDark
            ? "text-slate-300 hover:bg-white/10"
            : "text-slate-600 hover:bg-slate-50"
          }`}
      >
        %
      </button>
    </div>
  );
}

// ✅ Brokerage/Tax defaults (top-level constant)
const DEFAULT_RATES = {
  brokerage_mode: "ABS", // "ABS" or "PCT"

  brokerage_intraday_pct: "0.0005",
  brokerage_intraday_abs: "20",

  brokerage_delivery_pct: "0.005",
  brokerage_delivery_abs: "0",

  tax_intraday_pct: "0.00018",
  tax_delivery_pct: "0.0011",
};



export default function Funds({ username }) {
  const whoRates = username || localStorage.getItem("username");
  const [rates, setRates] = useState(DEFAULT_RATES);

  // Persist edits so refresh keeps user values
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);
  useEffect(() => {
    if (!whoRates) return;

    (async () => {
      try {
        const res = await fetch(`${API}/orders/brokerage-settings/${whoRates}`);
        if (res.ok) {
          const data = await res.json();
          setRates({ ...DEFAULT_RATES, ...data });
        } else {
          setRates(DEFAULT_RATES);
        }
      } catch {
        setRates(DEFAULT_RATES);
      }
    })();
  }, [whoRates]);


  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-50";
  const glassClass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/20"
    : "bg-white/70 backdrop-blur-xl border border-white/30";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const inputClass = isDark
    ? "bg-white/5 border-white/20 text-white placeholder-slate-400"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400";

  const [total, setTotal] = useState(0);
  const [available, setAvailable] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [savingRates, setSavingRates] = useState(false);
  const [ratesMsg, setRatesMsg] = useState("");
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  useEffect(() => {
    if (!whoRates) return;
    reload();
  }, [whoRates]);


  const reload = () => {
    setLoading(true);
    setErr("");
    setOk("");
    fetch(`${API}/funds/available/${whoRates}`)

      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch funds");
        return r.json();
      })
      .then((d) => {
        setTotal(Number(d.total_funds || 0));
        setAvailable(Number(d.available_funds || 0));
      })
      .catch((e) => setErr(e.message || "Server error"))
      .finally(() => setLoading(false));
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value;
    const cleaned = uncomma(raw);
    if (/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === "") {
      setAmountInput(raw);
    }
  };

  const handleAmountBlur = () => {
    const cleaned = uncomma(amountInput);
    if (cleaned === "") return;
    const n = Number(cleaned);
    if (Number.isFinite(n)) {
      setAmountInput(
        n.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        })
      );
    }
  };

  const handleAmountFocus = () => {
    setAmountInput(uncomma(amountInput));
  };

  const addFunds = async () => {
    setErr("");
    setOk("");

    const n = Number(uncomma(amountInput));
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Enter a valid amount.");
      return;
    }

    try {
      const res = await fetch(`${API}/funds/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: whoRates, amount: n }),

      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Add funds failed");

      setOk("Funds added successfully.");
      setAmountInput("");
      reload();
    } catch (e) {
      setErr(e.message || "Server error");
    }
  };

  // ---------------- Brokerage/Tax UI handlers ----------------
  const onRateChange = (key) => (e) => {
    const v = String(e.target.value ?? "");
    if (v === "" || /^\d*\.?\d*$/.test(v)) {
      setRates((p) => ({ ...p, [key]: v }));
    }
  };
  const resetRates = async () => {
    const defaults = { ...DEFAULT_RATES };
    setRates(defaults);
    setRatesMsg("Reset to default.");
    setSavingRates(true);

    try {
      // ✅ persist defaults in DB too
      const res = await fetch(`${API}/orders/brokerage-settings/${whoRates}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });
      if (!res.ok) throw new Error("reset failed");
    } catch {
      setRatesMsg("Reset failed. Please try again.");
    } finally {
      setSavingRates(false);
      setTimeout(() => setRatesMsg(""), 2000);
    }
  };

  const saveRates = async () => {
    setRatesMsg("");
    setSavingRates(true);

    try {
      const res = await fetch(`${API}/orders/brokerage-settings/${whoRates}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      });

      if (!res.ok) throw new Error("save failed");
      setRatesMsg("Saved successfully.");
    } catch (e) {
      setRatesMsg("Save failed. Please try again.");
    } finally {
      setSavingRates(false);
      setTimeout(() => setRatesMsg(""), 2000);
    }
  };


  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden transition-colors duration-300`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-none mx-auto px-2 sm:px-3 lg:px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <BackButton
            onClick={() => {
              if (from) nav(from);
              else nav(-1); // fallback: browser back
            }}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/trade")}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${isDark
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/70 border border-white text-slate-900"
                }`}
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${isDark
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/70 border border-white text-slate-900"
                }`}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Funds Management
            </h1>
          </div>
          <p className={textSecondaryClass}>Manage your trading capital</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw
              className={`w-8 h-8 ${textSecondaryClass} animate-spin mx-auto mb-2`}
            />
            <div className={textSecondaryClass}>Loading your funds...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: Funds management */}
              <div>
                <div className={`${glassClass} rounded-3xl shadow-2xl p-6 mb-6`}>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div
                        className={`text-sm ${textSecondaryClass} mb-2 flex items-center justify-center gap-2`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Total Funds
                      </div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                        ₹{formatINR(total, 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-sm ${textSecondaryClass} mb-2 flex items-center justify-center gap-2`}
                      >
                        <Wallet className="w-4 h-4" />
                        Available Funds
                      </div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                        ₹{formatINR(available, 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {err && (
                  <div
                    className={`mb-6 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in`}
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-400 font-medium">{err}</span>
                  </div>
                )}

                {ok && (
                  <div
                    className={`mb-6 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in`}
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-green-400 font-medium">{ok}</span>
                  </div>
                )}

                <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8`}>
                  <label
                    className={`block text-sm font-semibold ${textSecondaryClass} mb-3`}
                  >
                    Enter Amount (₹)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 1,000.50"
                    value={amountInput}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    onFocus={handleAmountFocus}
                    className={`w-full px-6 py-4 border ${inputClass} rounded-2xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                  />

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={addFunds}
                      className="col-span-2 mx-auto px-6 py-4 rounded-2xl 
                        bg-gradient-to-r from-green-500 to-emerald-500 
                        text-white font-semibold hover:scale-105 
                        transition-all shadow-lg shadow-green-500/50 
                        flex items-center justify-center gap-2"
                    >

                      Add Funds
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: Brokerage / Tax details */}
              <div>
                <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8`}>
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                          Brokerage / Tax Details
                        </h2>
                      </div>
                      <p className={`${textSecondaryClass} text-sm mt-1`}>
                        Edit values as needed. Reset restores defaults.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={resetRates}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all shadow-lg hover:scale-105 active:scale-95 ${isDark
                        ? "bg-white/10 border border-white/20 text-white"
                        : "bg-white/70 border border-white text-slate-900"
                        }`}
                    >
                      Reset
                    </button>
                  </div>

                  <div
                    className={`rounded-2xl border ${isDark ? "border-white/10" : "border-slate-200"
                      } overflow-hidden`}
                  >
                    {/* header */}
                    <div className={`${isDark ? "bg-white/5" : "bg-slate-50"} px-4 py-3`}>
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className={`col-span-6 flex items-center justify-between`}>
                          <div className={`text-xs font-semibold ${textSecondaryClass}`}>
                            Brokerage Mode
                          </div>

                          <ModeToggle
                            value={rates.brokerage_mode}
                            onChange={(m) => setRates((p) => ({ ...p, brokerage_mode: m }))}
                            isDark={isDark}
                          />
                        </div>

                        <div className={`col-span-3 text-xs font-semibold ${textSecondaryClass} text-center`}>
                          %
                        </div>

                        <div className={`col-span-3 text-xs font-semibold ${textSecondaryClass} text-center`}>
                          Abs (Only for brokerage)
                        </div>
                      </div>
                    </div>


                    {/* rows */}
                    <div className="px-4">
                      <div
                        className={`grid grid-cols-12 gap-3 items-center py-4 border-b ${isDark ? "border-white/10" : "border-slate-200"
                          }`}
                      >
                        <div className="col-span-6">
                          <div className="text-sm font-semibold">Brokerage / Trade (Intraday)</div>
                        </div>

                        {/* % column */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rates.brokerage_intraday_pct}
                            onChange={onRateChange("brokerage_intraday_pct")}
                            disabled={rates.brokerage_mode !== "PCT"}
                            className={`w-full px-3 py-2 border ${inputClass} rounded-xl text-sm font-semibold text-center
      focus:ring-2 focus:ring-blue-500 outline-none transition-all
      ${rates.brokerage_mode !== "PCT" ? "opacity-50 cursor-not-allowed" : ""}`}
                          />
                        </div>

                        {/* Abs column */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rates.brokerage_intraday_abs}
                            onChange={onRateChange("brokerage_intraday_abs")}
                            disabled={rates.brokerage_mode !== "ABS"}
                            className={`w-full px-3 py-2 border ${inputClass} rounded-xl text-sm font-semibold text-center
      focus:ring-2 focus:ring-blue-500 outline-none transition-all
      ${rates.brokerage_mode !== "ABS" ? "opacity-50 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      </div>



                      <div
                        className={`grid grid-cols-12 gap-3 items-center py-4 border-b ${isDark ? "border-white/10" : "border-slate-200"
                          }`}
                      >
                        <div className="col-span-6">
                          <div className="text-sm font-semibold">Brokerage / Trade (Delivery)</div>
                        </div>

                        {/* % column */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rates.brokerage_delivery_pct}
                            onChange={onRateChange("brokerage_delivery_pct")}
                            disabled={rates.brokerage_mode !== "PCT"}
                            className={`w-full px-3 py-2 border ${inputClass} rounded-xl text-sm font-semibold text-center
      focus:ring-2 focus:ring-blue-500 outline-none transition-all
      ${rates.brokerage_mode !== "PCT" ? "opacity-50 cursor-not-allowed" : ""}`}
                          />
                        </div>

                        {/* Abs column */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rates.brokerage_delivery_abs}
                            onChange={onRateChange("brokerage_delivery_abs")}
                            disabled={rates.brokerage_mode !== "ABS"}
                            className={`w-full px-3 py-2 border ${inputClass} rounded-xl text-sm font-semibold text-center
      focus:ring-2 focus:ring-blue-500 outline-none transition-all
      ${rates.brokerage_mode !== "ABS" ? "opacity-50 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      </div>


                      <div
                        className={`grid grid-cols-12 gap-3 items-center py-4 border-b ${isDark ? "border-white/10" : "border-slate-200"
                          }`}
                      >
                        <div className="col-span-6">
                          <div className="text-sm font-semibold">Tax - Intraday</div>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rates.tax_intraday_pct}
                            onChange={onRateChange("tax_intraday_pct")}
                            className={`w-full px-3 py-2 border ${inputClass} rounded-xl text-sm font-semibold text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                          />
                        </div>
                        <div className={`col-span-3 text-center ${textSecondaryClass} font-semibold`}>
                          -
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-3 items-center py-4">
                        <div className="col-span-6">
                          <div className="text-sm font-semibold">Tax - Delivery</div>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rates.tax_delivery_pct}
                            onChange={onRateChange("tax_delivery_pct")}
                            className={`w-full px-3 py-2 border ${inputClass} rounded-xl text-sm font-semibold text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                          />
                        </div>
                        <div className={`col-span-3 text-center ${textSecondaryClass} font-semibold`}>
                          -
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className={`text-sm font-semibold ${textSecondaryClass}`}>
                      {ratesMsg ? ratesMsg : ""}
                    </div>

                    <button
                      type="button"
                      onClick={saveRates}
                      disabled={savingRates}
                      className={`px-6 py-3 rounded-2xl text-white font-semibold shadow-lg transition-all
      bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 active:scale-95
      disabled:opacity-60 disabled:hover:scale-100`}
                    >
                      {savingRates ? "Saving..." : "Save"}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
