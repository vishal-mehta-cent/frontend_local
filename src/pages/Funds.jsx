import React, { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus, Minus, RefreshCw, Sun, Moon, AlertCircle, CheckCircle } from "lucide-react";
import BackButton from "../components/BackButton";

const API = "http://localhost:8000";

const formatINR = (v, decimals = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const uncomma = (s) => (s || "").toString().replace(/,/g, "");

export default function Funds({ username }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

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

  useEffect(() => {
    if (!username) return;
    reload();
  }, [username]);

  const reload = () => {
    setLoading(true);
    setErr("");
    setOk("");
    fetch(`${API}/funds/available/${username}`)

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
      setAmountInput(n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 }));
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

if (n > available) {
  setErr("Withdraw amount cannot exceed available funds.");
  return;
}

    try {
      const res = await fetch(`${API}/funds/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, amount: n }),
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





  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden transition-colors duration-300`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/profile" />
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-10 h-10 flex items-center justify-center rounded-full ${glassClass} hover:scale-110 transition-all shadow-lg`}
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
          </button>
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
            <RefreshCw className={`w-8 h-8 ${textSecondaryClass} animate-spin mx-auto mb-2`} />
            <div className={textSecondaryClass}>Loading your funds...</div>
          </div>
        ) : (
          <>
            <div className={`${glassClass} rounded-3xl shadow-2xl p-6 mb-6`}>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className={`text-sm ${textSecondaryClass} mb-2 flex items-center justify-center gap-2`}>
                    <TrendingUp className="w-4 h-4" />
                    Total Funds
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                    ₹{formatINR(total, 0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-sm ${textSecondaryClass} mb-2 flex items-center justify-center gap-2`}>
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
              <div className={`mb-6 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in`}>
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 font-medium">{err}</span>
              </div>
            )}

            {ok && (
              <div className={`mb-6 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in`}>
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-green-400 font-medium">{ok}</span>
              </div>
            )}

            <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8`}>
              <label className={`block text-sm font-semibold ${textSecondaryClass} mb-3`}>
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
    <Plus className="w-5 h-5" />
    Add Funds
  </button>
</div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
