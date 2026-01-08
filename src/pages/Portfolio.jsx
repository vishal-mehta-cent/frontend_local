// frontend/src/pages/Portfolio.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  NotebookPen,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import SwipeNav from "../components/SwipeNav";
import { useTheme } from "../context/ThemeContext";
import { User } from "lucide-react";


// ---------- API base (prod-safe) ----------
const API_BASE = (
  import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
)
  .trim()
  .replace(/\/+$/, "");

// ---------- formatting helpers ----------
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v) => {
  const n = toNum(v);
  return n === null
    ? "₹0.00"
    : `₹${n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
};
const signed = (n, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

// small pill
const Chip = ({ label, value, tone = "gray" }) => {
  const toneClass =
    tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "green"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${toneClass}`}
    >
      <span className="opacity-70 mr-1">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
};

const SegmentBadge = ({ segment }) => {
  const seg = (segment || "delivery").toLowerCase();
  const isIntra = seg === "intraday";
  return (
    <span
      className={`inline-flex items-center px-2 py-[2px] rounded-full text-[11px] border ${isIntra
          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
        }`}
      title="Segment"
    >
      {isIntra ? "intraday" : "delivery"}
    </span>
  );
};

export default function Portfolio({ username }) {
  const [data, setData] = useState({ open: [], closed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [quotes, setQuotes] = useState({});
  const pollRef = useRef(null);
  const navigate = useNavigate();
    const { isDark } = useTheme();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";


  const fileInputRef = useRef(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const hasLoadedOnce = useRef(false);

  // ------- load portfolio -------
  const load = (ctrl) => {
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/portfolio/${encodeURIComponent(username)}`, {
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          let detail = "";
          try {
            const j = await res.json();
            detail = j?.detail || "";
          } catch { }
          throw new Error(detail || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((result) => {
        setData({
          open: Array.isArray(result?.open) ? result.open : [],
          closed: Array.isArray(result?.closed) ? result.closed : [],
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to load portfolio");
        setData({ open: [], closed: [] });
      })
      .finally(() => {
        setLoading(false);
        hasLoadedOnce.current = true;
      });

  };


  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl);

    return () => ctrl.abort();
  }, [username]);

  const pickDateTime = (o) =>
    o?.datetime || o?.updated_at || o?.created_at || o?.time || o?.date || null;

  const parseDate = (s) => {
    if (!s || typeof s !== "string") return null;
    const safe = s.includes("T") ? s : s.replace(" ", "T");
    const d = new Date(safe);
    return isNaN(d.getTime()) ? null : d;
  };
  const toLocalYMD = (d) => {
    if (!d) return null;
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
  };

  const filteredOpen = useMemo(() => {
    if (!startDate && !endDate) return data.open;
    const start = startDate || null;
    const end = endDate || null;
    return (data.open || []).filter((p) => {
      const dtRaw = pickDateTime(p);
      const dt = parseDate(dtRaw);
      const ymd = toLocalYMD(dt);
      if (!ymd) return false;
      if (start && ymd < start) return false;
      if (end && ymd > end) return false;
      return true;
    });
  }, [data.open, startDate, endDate]);

  // ------- poll quotes (only to display "Live:" label; P&L uses backend fields) -------
  useEffect(() => {
    if (!filteredOpen.length) return;
    const syms = [
      ...new Set(
        filteredOpen.map((p) => (p.symbol || p.script || "").toUpperCase())
      ),
    ].filter(Boolean);
    if (!syms.length) return;

    const fetchQuotes = () => {
      fetch(`${API_BASE}/quotes?symbols=${syms.join(",")}`)
        .then((r) => r.json())
        .then((arr) => {
          const qmap = {};
          (arr || []).forEach((q) => {
            const sym = (q?.symbol || q?.Script || "").toUpperCase();
            if (!sym) return;
            qmap[sym] = {
              price: toNum(q.price),
              change: toNum(q.change),
              pct_change: toNum(q.pct_change),
            };
          });
          setQuotes(qmap);
        })
        .catch(() => { });
    };

    fetchQuotes();
    pollRef.current = setInterval(fetchQuotes, 2000);
    return () => clearInterval(pollRef.current);
  }, [filteredOpen]);

  const handleAdd = (symbol, position) => {
    navigate(`/buy/${symbol}`, {
      state: {
        // 🔥 REQUIRED FLAGS (Buy.jsx depends on these)
        fromAdd: true,
        fromPosition: true,
        returnTo: "/portfolio",

        // optional / informational
        fromPortfolio: true,

        qty: position.qty,
        segment: position.segment || "delivery",
        exchange: "NSE",

        stoploss: position.stoploss || "",
        target: position.target || "",

        orderMode: "MARKET",
      },
    });
  };


  const handleExit = (symbol, position) => {
    navigate(`/sell/${symbol}`, {
      state: {
        fromPortfolio: true,
        // ✅ ADD THESE:
        fromExit: true,
        fromPosition: true,
        returnTo: "/portfolio",

        qty: position.qty,
        segment: position.segment || "delivery",
        exchange: "NSE",

        stoploss: position.stoploss || "",
        target: position.target || "",

        orderMode: "MARKET",

        // 🔥 IMPORTANT FLAGS
        skipSellFirstCheck: true,
        allowShort: false,
      },
    });
  };

  const handleCloseModal = () => setSelected(null);
  const handleNoteIn = (symbol) =>
    navigate(`/notes/${encodeURIComponent((symbol || "").toUpperCase())}`, {
      state: { from: "/portfolio" }
    });


  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Please select a .xlsx file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    fetch(`${API_BASE}/portfolio/${username}/upload`, {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.detail || `Upload failed (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((result) => {
        alert(`✅ Uploaded successfully. Rows inserted: ${result.rows}`);
        load();
      })
      .catch((err) => {
        console.error("Upload error:", err);
        alert("Upload failed: " + err.message);
      });
  };

  // ===== Multi-sheet Excel (.xlsx) download =====
  const handleDownloadExcel = () => {
    const instructionSheet = XLSX.utils.aoa_to_sheet([
      ["Instruction"],
      ["This file contains Portfolio and Instrument details."],
      ["Portfolio is your uploaded/updated holdings."],
      ["Instrument sheet is refreshed daily from Zerodha."],
    ]);

    const portfolioHeaders = [
      "Symbol",
      "Name",
      "Segment",
      "Qty",
      "Avg Price",
      "Entry Price",
      "Stoploss",
      "Target",
      "Live",
      "Investment",
      "Date",
    ];
    const portfolioRows =
      filteredOpen && filteredOpen.length
        ? filteredOpen.map((p) => {
          const symbol = (p.symbol || p.script || "").toUpperCase();
          const name = p.name || "";
          const seg = (p.segment || "delivery").toLowerCase();
          const qty = toNum(p.qty) ?? 0;
          const avg = toNum(p.avg_price) ?? 0;
          const entry = toNum(p.entry_price) ?? avg;
          const live =
            toNum(quotes[symbol]?.price) ??
            toNum(p.current_price) ??
            avg ??
            0;
          const sl = toNum(p.stoploss) ?? 0;
          const tgt = toNum(p.target) ?? 0;
          const invest = qty * (avg ?? 0);
          const dtRaw = pickDateTime(p);
          const ymd = toLocalYMD(parseDate(dtRaw)) || "";
          return [
            symbol,
            name,
            seg,
            qty,
            avg,
            entry,
            sl,
            tgt,
            live,
            invest,
            ymd,
          ];
        })
        : [];
    const portfolioSheet = XLSX.utils.aoa_to_sheet([
      portfolioHeaders,
      ...portfolioRows,
    ]);

    const instrumentSheet = XLSX.utils.aoa_to_sheet([
      ["Instrument", "Exchange", "Lot Size", "Tick Size"],
      ["RELIANCE", "NSE", 505, 0.05],
      ["TCS", "NSE", 150, 0.05],
      ["INFY", "NSE", 300, 0.05],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instruction");
    XLSX.utils.book_append_sheet(workbook, portfolioSheet, "Portfolio");
    XLSX.utils.book_append_sheet(workbook, instrumentSheet, "Instrument");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", "_")
      .replace(/:/g, "");
    saveAs(blob, `portfolio_${username || "user"}_${stamp}.xlsx`);
  };

  // Totals
  const totalInvested = useMemo(
    () =>
      filteredOpen.reduce(
        (s, p) => s + (toNum(p.avg_price) ?? 0) * (toNum(p.qty) ?? 0),
        0
      ),
    [filteredOpen]
  );

  const totalCurrentValuation = useMemo(() => {
    return filteredOpen.reduce((s, p) => {
      const symbol = (p.symbol || p.script || "").toUpperCase();
      const qty = toNum(p.qty) ?? 0;
      const live =
        toNum(p.current_price) ??
        toNum(quotes[symbol]?.price) ??
        toNum(p.avg_price) ??
        0;
      return s + qty * live;
    }, 0);
  }, [filteredOpen, quotes]);

  const totalPnL = useMemo(
    () => totalCurrentValuation - totalInvested,
    [totalCurrentValuation, totalInvested]
  );
  const totalPnLPct = useMemo(() => {
    if (!totalInvested) return 0;
    return (totalPnL / totalInvested) * 100;
  }, [totalPnL, totalInvested]);

    const getInitials = (symbol) => {
    const s = (symbol || "").toUpperCase();
    return s.length >= 2 ? s.substring(0, 2) : s;
  };

  const getAvatarColor = (symbol) => {
    const colors = [
      "bg-emerald-500",
      "bg-rose-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-cyan-500",
    ];
    const index = (symbol || "").charCodeAt(0) % colors.length;
    return colors[index];
  };


  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300`}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className={`sticky top-0 z-50 ${glassClass} shadow-lg relative`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <BackButton to="/menu" />
              <div>
                <div className="text-xl font-bold">TradeHub</div>
                <div className={`text-xs ${textSecondaryClass}`}>
                  Next-Gen Trading
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/profile")}
                className={`${glassClass} p-3 rounded-xl ${cardHoverClass} transition-all shadow-lg`}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ✅ Global swipe navigation (ONLY ONE ROW) */}
          <SwipeNav glassClass={glassClass} cardHoverClass={cardHoverClass} />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6 relative pb-24">
        <div className="mb-6">
          <h2 className={`text-4xl font-bold ${textClass} mb-2`}>Portfolio</h2>
          <p className={`${textSecondaryClass}`}>
            Track your holdings and performance
          </p>
        </div>

        {loading && (
          <div className={`text-center ${textSecondaryClass} mt-20`}>
            Loading…
          </div>
        )}

        {!loading && error && (
          <div className="text-center text-red-400 mt-20">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Summary */}
            <div className={`${glassClass} rounded-2xl p-6 mb-6 shadow-lg`}>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <div className={`text-sm ${textSecondaryClass} mb-2`}>
                    Total Invested
                  </div>
                  <div className={`text-3xl font-bold ${textClass}`}>
                    {money(totalInvested)}
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${textSecondaryClass} mb-2`}>
                    Current Valuation
                  </div>
                  <div className={`text-3xl font-bold ${textClass}`}>
                    {money(totalCurrentValuation)}
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${textSecondaryClass} mb-2`}>
                    Total P&amp;L
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {money(totalPnL)}
                  </div>
                  <div
                    className={`text-sm ${
                      totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    ({signed(totalPnLPct, 2)}%)
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadExcel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-xl transition-all shadow-lg font-medium"
                >
                  <Download size={18} />
                  <span>Download Report</span>
                </button>

                <button
                  onClick={handleUploadClick}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${glassClass} ${cardHoverClass} transition-all shadow-lg font-medium`}
                >
                  <Upload size={18} />
                  <span>Upload Holdings</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </div>
            </div>

            {/* Open Holdings */}
            <h3 className={`text-2xl font-bold mb-4 ${textClass}`}>
              Open Holdings
            </h3>

            {filteredOpen.length === 0 ? (
              <div className={`text-center text-sm ${textSecondaryClass}`}>
                No holdings in portfolio
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpen.map((p, i) => {
                  const symbol = (p.symbol || p.script || "").toUpperCase();

                  const qty = toNum(p.qty) ?? 0;
                  const entry = toNum(p.entry_price) ?? toNum(p.avg_price) ?? 0;
                  const sl = toNum(p.stoploss) ?? 0;
                  const tgt = toNum(p.target) ?? 0;

                  const live =
                    toNum(p.current_price) ??
                    toNum(quotes[symbol]?.price) ??
                    toNum(p.avg_price) ??
                    0;

                  // ✅ Use backend-calculated fields (same as your corrected file)
                  const perShare =
                    toNum(p.pnl_per_share) ?? (toNum(live) - (entry ?? 0));
                  const total = toNum(p.pnl_total) ?? perShare * (qty ?? 0);
                  const absPct =
                    toNum(p.pct) ??
                    ((entry ? perShare / entry : 0) * 100);

                  const pnlColor =
                    total > 0
                      ? "text-emerald-400"
                      : total < 0
                      ? "text-rose-400"
                      : "text-gray-400";

                  return (
                    <div
                      key={`${symbol}-${i}`}
                      className={[
    "p-6 rounded-[28px] transition cursor-pointer",
    // premium glass look
    isDark
      ? "bg-white/6 border border-white/12 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      : "bg-white/70 border border-white/80 backdrop-blur-2xl shadow-[0_18px_60px_rgba(2,132,199,0.12)]",
    // soft hover
    isDark ? "hover:bg-white/8" : "hover:bg-white/85",
  ].join(" ")}
  onClick={() =>
    setSelected({
      ...p,
      symbol,
      live,
      pnlPerShare: perShare,
    })
  }
>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
  className={[
    "w-12 h-12 rounded-2xl flex items-center justify-center",
    "text-white font-extrabold text-[16px] tracking-wide",
    "bg-gradient-to-br from-emerald-400 to-emerald-600",
    "shadow-[0_10px_26px_rgba(16,185,129,0.35)]",
    "ring-1 ring-white/40",
  ].join(" ")}
>
  {getInitials(symbol)}
</div>


                          <div>
                            <div className={`text-2xl font-bold ${textClass} mb-1`}>
                              {symbol}
                            </div>

                            <div className={`text-sm ${textSecondaryClass}`}>
                              {qty < 0 ? (
                                <span className="text-orange-400 font-semibold">
                                  SELL FIRST • {Math.abs(qty)} Qty
                                </span>
                              ) : (
                                <span>
                                  {p.side || "BUY"} FIRST • {qty} Qty
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-2xl font-bold ${pnlColor}`}>
                            {money(total)}
                          </div>
                          <div className={`text-sm ${pnlColor}`}>
                            {signed(absPct, 2)}%
                          </div>
                        </div>
                      </div>

                      {/* ✅ inner rounded panel like Image 1 */}
<div
  className={[
    "mt-4 rounded-2xl px-6 py-4",
    isDark
      ? "bg-white/5 border border-white/10"
      : "bg-sky-50/70 border border-slate-200/40",
  ].join(" ")}
>
  <div className="grid grid-cols-4 gap-8">
    <div>
      <div className={`text-[11px] font-medium ${textSecondaryClass} mb-1`}>
        Live Price
      </div>
      <div className="text-base font-bold text-sky-500">
        {money(live)}
      </div>
    </div>

    <div>
      <div className={`text-[11px] font-medium ${textSecondaryClass} mb-1`}>
        Entry
      </div>
      <div className={`text-base font-bold ${textClass}`}>
        {money(entry)}
      </div>
    </div>

    <div>
      <div className={`text-[11px] font-medium ${textSecondaryClass} mb-1`}>
        Stop Loss
      </div>
      <div className="text-base font-bold text-rose-500">
        {money(sl)}
      </div>
    </div>

    <div>
      <div className={`text-[11px] font-medium ${textSecondaryClass} mb-1`}>
        Target
      </div>
      <div className="text-base font-bold text-emerald-500">
        {money(tgt)}
      </div>
    </div>
  </div>
</div>

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <div className={`${glassClass} rounded-xl shadow-lg p-6 w-96 relative`}>
            <button
              onClick={handleCloseModal}
              className={`absolute top-2 right-2 ${textSecondaryClass} hover:text-red-400 text-lg font-bold`}
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-blue-400 mb-1">
              {selected.symbol}
            </h3>

            <div className={`text-2xl font-extrabold text-center ${textClass}`}>
              {money(selected.live)}
            </div>

            <div className={`space-y-1 text-sm mt-4 ${textClass}`}>
              <div>Qty: {selected.qty}</div>
              <div>Avg Price: {money(selected.avg_price)}</div>
              <div>
                Entry Price: {money(selected.entry_price ?? selected.avg_price)}
              </div>
              <div>Stoploss: {money(selected.stoploss ?? 0)}</div>
              <div>Target: {money(selected.target ?? 0)}</div>
              <div>Current Price: {money(selected.live)}</div>
              <div>
                P&amp;L / Share:{" "}
                <span
                  className={`font-semibold ${
                    (selected.pnlPerShare ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {money(selected.pnlPerShare ?? 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-around border-t pt-4 mt-4">
              <button
                onClick={() => {
                  handleAdd(selected.symbol, selected);
                  handleCloseModal();
                }}
                className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600"
              >
                Add
              </button>

              <button
                onClick={() => {
                  handleExit(selected.symbol, selected);
                  handleCloseModal();
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600"
              >
                Exit
              </button>

              <button
                onClick={handleCloseModal}
                className={`px-4 py-2 rounded-lg ${glassClass} ${textClass} font-semibold ${cardHoverClass}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
