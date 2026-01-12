import React, { useEffect, useState, useMemo } from "react";
import { moneyINR } from "../utils/format";
import {
  NotebookPen,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import SwipeNav from "../components/SwipeNav";
import { useTheme } from "../context/ThemeContext";
import BackButton from "../components/BackButton";
import HeaderActions from "../components/HeaderActions";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com";

export default function History({ username }) {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const [history, setHistory] = useState([]);
  const [positions, setPositions] = useState([]);

  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [tab, setTab] = useState("history"); // "history" | "all"

  const params = useParams();
  const navigate = useNavigate();

  const who = useMemo(
    () => username || params.username || localStorage.getItem("username") || "",
    [username, params.username]
  );

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";
  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  // -------------------- Fetch CLOSED history (BUY+SELL completed rows) --------------------
  useEffect(() => {
    if (!who) {
      setError("Username missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const url = `${API}/orders/history/${encodeURIComponent(who)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(
            `HTTP ${res.status}: ${txt || "Failed to fetch history"}`
          );
        }
        return res.json();
      })
      .then((data) => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("History fetch error:", err);
        setError(err.message || "Failed to load history");
      })
      .finally(() => setLoading(false));
  }, [who]);

  // -------------------- Fetch POSITIONS (so BUY shows in All History) --------------------
  useEffect(() => {
    if (!who) return;

    // Only needed for All History
    if (tab !== "all") return;

    setLoadingPositions(true);

    const url = `${API}/orders/positions/${encodeURIComponent(who)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(
            `HTTP ${res.status}: ${txt || "Failed to fetch positions"}`
          );
        }
        return res.json();
      })
      .then((data) => {
        setPositions(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Positions fetch error:", e);
        setPositions([]);
      })
      .finally(() => setLoadingPositions(false));
  }, [who, tab]);

  // -------------------- Helpers --------------------
  const asNum = (v) => {
    // ✅ prevent Number(null) -> 0 issue
    if (v === null || v === undefined) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const fmtMoney = (n) =>
    n !== null && n !== undefined ? moneyINR(n, { decimals: 2 }) : "—";

  const dateOnly = (dt) => {
    if (!dt || typeof dt !== "string") return "—";
    const [d] = dt.split(" ");
    return d || dt;
  };

  const normSym = (s) => String(s || "").toUpperCase().trim() || "—";

  const pickRowDate = (t) => {
    const cands = [t.sell_date, t.buy_date, t.time, t.datetime];
    for (const s of cands) {
      if (typeof s === "string" && s.trim()) {
        const d = s.split(" ")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      }
    }
    return null;
  };

  const isClosedRow = (t) => {
    const sellQty = asNum(t.sell_qty) ?? 0;
    const sellDate = typeof t.sell_date === "string" ? t.sell_date.trim() : "";
    return sellQty > 0 || !!sellDate;
  };

  // ✅ stable key to remove duplicates (prefer closed rows)
  const dedupeKey = (t) => {
    const sym = normSym(t.symbol || t.script || t.tradingsymbol);

    const anyId =
      t.trade_id ??
      t.order_id ??
      t.id ??
      t.modifyId ??
      t.position_id ??
      t.row_id ??
      null;

    if (anyId !== null && anyId !== undefined && String(anyId).trim() !== "") {
      return `${sym}|ID:${String(anyId)}`;
    }

    const bq = asNum(t.buy_qty) ?? 0;
    const bp = asNum(t.buy_price);
    const bd = (t.buy_date || t.time || t.datetime || "").toString();

    const sq = asNum(t.sell_qty) ?? 0;
    const sp = asNum(t.sell_avg_price);
    const sd = (t.sell_date || "").toString();

    return [
      sym,
      dateOnly(bd),
      bq,
      bp !== null ? bp.toFixed(4) : "",
      dateOnly(sd),
      sq,
      sp !== null ? sp.toFixed(4) : "",
    ].join("|");
  };

  const dedupePreferClosed = (rows) => {
    const map = new Map();

    for (const r of rows || []) {
      const key = dedupeKey(r);

      if (!map.has(key)) {
        map.set(key, r);
        continue;
      }

      const existing = map.get(key);
      const exClosed = isClosedRow(existing);
      const rClosed = isClosedRow(r);

      // ✅ keep closed row if one is closed
      if (!exClosed && rClosed) {
        map.set(key, r);
      }
    }

    return Array.from(map.values());
  };

  const applyDateFilter = (rows) => {
    const cleaned = dedupePreferClosed(rows || []);

    if (!startDate && !endDate) return cleaned;

    return cleaned.filter((t) => {
      const ymd = pickRowDate(t);
      if (!ymd) return false;
      if (startDate && ymd < startDate) return false;
      if (endDate && ymd > endDate) return false;
      return true;
    });
  };

  // -------------------- Filtered history (date range) --------------------
  const filteredHistory = useMemo(() => {
    return applyDateFilter(history || []);
  }, [history, startDate, endDate]);

  // -------------------- Convert POSITIONS -> rows that match your table --------------------
  const positionRows = useMemo(() => {
    return (positions || []).map((p) => {
      const sym = normSym(p.symbol || p.script || p.tradingsymbol);

      const dt = p.datetime || p.time || "";

      const qty = Number(p.qty ?? p.quantity ?? p.net_qty ?? 0);
      const price = Number(p.price ?? p.avg_price ?? p.average_price ?? 0);

      const invested = Number.isFinite(qty * price) ? qty * price : null;

      const pnlValue = Number(p.pnl_value ?? p.script_pnl ?? p.pnl ?? 0);

      const side = String(p.type || p.side || "").toUpperCase();

      if (side === "BUY" || side === "LONG") {
        return {
          symbol: sym,
          time: dt,
          buy_qty: qty,
          buy_price: price,
          buy_date: dt,
          sell_qty: 0,
          sell_avg_price: null,
          sell_date: "",
          invested_value: invested,
          pnl: pnlValue,
          remaining_qty: qty,
          is_closed: false,
        };
      }

      return {
        symbol: sym,
        time: dt,
        buy_qty: 0,
        buy_price: null,
        buy_date: "",
        sell_qty: qty,
        sell_avg_price: price,
        sell_date: dt,
        invested_value: invested,
        pnl: pnlValue,
        remaining_qty: qty,
        is_closed: false,
      };
    });
  }, [positions]);

  // -------------------- All History (positions + closed history) --------------------
  const allHistoryRows = useMemo(() => {
    const combined = [...(positionRows || []), ...(history || [])];
    const cleaned = dedupePreferClosed(combined);

    // sort latest first
    const safeTime = (t) =>
      String(t.sell_date || t.buy_date || t.time || t.datetime || "").trim();

    cleaned.sort((a, b) => safeTime(b).localeCompare(safeTime(a)));
    return cleaned;
  }, [positionRows, history]);

  // ✅ Apply date filter to All History also
  const filteredAllHistory = useMemo(() => {
    return applyDateFilter(allHistoryRows || []);
  }, [allHistoryRows, startDate, endDate]);

  // -------------------- What to render --------------------
  const displayHistory = useMemo(() => {
    return tab === "all" ? filteredAllHistory : filteredHistory;
  }, [tab, filteredAllHistory, filteredHistory]);

  // -------------------- Excel export (exports current view) --------------------
  const escapeHTML = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const buildExcelHtml = () => {
    const headers = [
      "Symbol",
      "Row Date",
      "Buy Qty",
      "Buy Date",
      "Buy Price",
      "Sell Qty",
      "Sell Avg Price",
      "Sell Date",
      "Invested",
      "P&L",
    ];

    const rows =
      displayHistory && displayHistory.length
        ? displayHistory.map((t) => {
          const symbolUpper = normSym(t.symbol || "—");
          const rowDate = pickRowDate(t) || "";
          const buyQty = asNum(t.buy_qty) ?? "";
          const buyPrice = asNum(t.buy_price);
          const sellQty = asNum(t.sell_qty) ?? "";
          const sellAvg = asNum(t.sell_avg_price);
          const invested = asNum(t.invested_value);
          const pnl = asNum(t.pnl);

          return [
            symbolUpper,
            rowDate,
            buyQty,
            dateOnly(t.buy_date),
            buyPrice !== null ? buyPrice.toFixed(2) : "",
            sellQty,
            sellAvg !== null ? sellAvg.toFixed(2) : "",
            dateOnly(t.sell_date),
            invested !== null ? invested.toFixed(2) : "",
            pnl !== null ? pnl.toFixed(2) : "",
          ];
        })
        : [];

    const thead =
      "<tr>" +
      headers
        .map((h) => `<th style="font-weight:600">${escapeHTML(h)}</th>`)
        .join("") +
      "</tr>";

    const tbody =
      rows.length > 0
        ? rows
          .map(
            (r) =>
              "<tr>" +
              r.map((c) => `<td>${escapeHTML(c)}</td>`).join("") +
              "</tr>"
          )
          .join("")
        : "";

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>History</x:Name>
    <x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml><![endif]-->
<style>
  table, td, th { border: 1px solid #ccc; border-collapse: collapse; }
  td, th { padding: 4px 6px; font-family: Arial, sans-serif; font-size: 12px; }
  th { background: #eef3ff; }
</style>
</head>
<body>
  <table>
    ${thead}
    ${tbody}
  </table>
</body>
</html>`;
  };

  const handleDownloadExcel = () => {
    const html = buildExcelHtml();
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", "_")
      .replace(/:/g, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `history_${(who || "user")}_${stamp}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const goNotes = (s) =>
    navigate(`/notes/${encodeURIComponent((s || "").toUpperCase())}`);

  const showLoading = loading || (tab === "all" && loadingPositions);

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className={`sticky top-0 z-50 ${glassClass} shadow-2xl relative`}>
        <div className="w-full px-4 md:px-6 py-4">
          <div className="relative flex items-start justify-between mb-4">
            <div className="flex flex-col items-start">
              <BackButton />

              <div className="mt-1">
                <div
                  className={`text-2xl sm:text-2xl font-extrabold uppercase tracking-wide
              bg-clip-text text-transparent ${brandGradient}`}
                >
                  NEUROCREST
                </div>
                <div className={`text-xs ${textSecondaryClass}`}>
                  Next-Gen Trading
                </div>
              </div>
            </div>

            <HeaderActions
              glassClass={glassClass}
              cardHoverClass={cardHoverClass}
            />
          </div>

          <SwipeNav glassClass={glassClass} cardHoverClass={cardHoverClass} />
        </div>
      </div>

      <div className="w-full px-6 py-6 relative pb-24">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className={`text-4xl font-bold ${textClass}`}>History</h2>
            <p className={`${textSecondaryClass}`}>
              Your trading history and analytics
            </p>

            <div className={`mt-4 inline-flex p-1 rounded-2xl ${glassClass}`}>
              <button
                onClick={() => setTab("history")}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "history"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : `${textSecondaryClass} hover:opacity-90`
                  }`}
              >
                History
              </button>

              <button
                onClick={() => setTab("all")}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "all"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : `${textSecondaryClass} hover:opacity-90`
                  }`}
              >
                All History
              </button>
            </div>
          </div>

          {/* ✅ Date filters now work for BOTH tabs */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-2 rounded-xl ${glassClass} ${textClass} text-sm shadow-lg transition-all focus:ring-2 focus:ring-blue-500`}
              placeholder="mm/dd/yyyy"
            />

            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-2 rounded-xl ${glassClass} ${textClass} text-sm shadow-lg transition-all focus:ring-2 focus:ring-blue-500`}
              placeholder="mm/dd/yyyy"
            />

            <button
              onClick={handleDownloadExcel}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-xl transition-all shadow-lg font-medium mx-auto md:mx-0"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {showLoading ? (
          <div className={`text-center ${textSecondaryClass} mt-20`}>
            Loading...
          </div>
        ) : error ? (
          <div className="text-center text-red-400 whitespace-pre-wrap mt-20">
            {error}
          </div>
        ) : displayHistory.length === 0 ? (
          <div className={`text-center ${textSecondaryClass} mt-20`}>
            No history available.
          </div>
        ) : (
          <div className={`${glassClass} rounded-3xl overflow-hidden shadow-2xl`}>
            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold p-4 text-center sticky top-0 z-10">
                  <div>Symbol & Time</div>
                  <div>Quantity</div>
                  <div>Buy Details</div>
                  <div>P&amp;L</div>
                  <div>Sell Details</div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {displayHistory.map((t, idx) => {
                    const buyQty = asNum(t.buy_qty) ?? 0;
                    const pnlNum = asNum(t.pnl) ?? 0;

                    const sellQty = asNum(t.sell_qty) ?? 0;
                    const sellAvg = asNum(t.sell_avg_price);
                    const investedValue = asNum(t.invested_value);

                    const symbolUpper = normSym(t.symbol || "—");

                    return (
                      <div
                        key={`${dedupeKey(t)}-${idx}`}
                        className={`grid grid-cols-5 items-center p-4 border-t ${isDark ? "border-white/10" : "border-white/40"
                          }`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            <span className="font-bold text-lg">
                              {symbolUpper}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                goNotes(t.symbol || "");
                              }}
                              title="Notes"
                              className={`p-1 rounded-lg ${cardHoverClass} ${textSecondaryClass} transition-all`}
                            >
                              <NotebookPen size={14} />
                            </button>
                          </div>
                          <span className={`text-xs ${textSecondaryClass} mt-1`}>
                            {t.time || t.datetime || ""}
                          </span>
                        </div>

                        <div className="font-medium text-center">
                          {buyQty || "—"}
                        </div>

                        <div className="text-sm leading-tight text-center">
                          {t.buy_date ? (
                            <>
                              <div className={textSecondaryClass}>
                                <span className="font-medium">
                                  {dateOnly(t.buy_date)}
                                </span>
                              </div>
                              <div className={textClass}>
                                {fmtMoney(t.buy_price)}
                              </div>
                            </>
                          ) : (
                            <span className={textSecondaryClass}>—</span>
                          )}
                        </div>

                        <div className="flex justify-center">
                          <div
                            className={[
                              "inline-flex items-center gap-2",
                              "px-4 py-2 rounded-2xl",
                              "shadow-lg ring-1",
                              "backdrop-blur-xl",
                              pnlNum > 0
                                ? isDark
                                  ? "bg-emerald-500/15 ring-emerald-400/20"
                                  : "bg-emerald-50 ring-emerald-200/70"
                                : pnlNum < 0
                                  ? isDark
                                    ? "bg-rose-500/15 ring-rose-400/20"
                                    : "bg-rose-50 ring-rose-200/70"
                                  : isDark
                                    ? "bg-white/8 ring-white/10"
                                    : "bg-slate-100/80 ring-slate-200/70",
                            ].join(" ")}
                          >
                            {pnlNum > 0 ? (
                              <ArrowUpRight
                                size={18}
                                className={
                                  isDark
                                    ? "text-emerald-300"
                                    : "text-emerald-600"
                                }
                              />
                            ) : pnlNum < 0 ? (
                              <TrendingDown
                                size={18}
                                className={
                                  isDark ? "text-rose-300" : "text-rose-600"
                                }
                              />
                            ) : (
                              <TrendingUp
                                size={18}
                                className={
                                  isDark
                                    ? "text-slate-300/70"
                                    : "text-slate-500/70"
                                }
                              />
                            )}

                            <span
                              className={[
                                "font-extrabold tracking-tight",
                                pnlNum > 0
                                  ? isDark
                                    ? "text-emerald-300"
                                    : "text-emerald-600"
                                  : pnlNum < 0
                                    ? isDark
                                      ? "text-rose-300"
                                      : "text-rose-600"
                                    : isDark
                                      ? "text-slate-200/70"
                                      : "text-slate-600",
                              ].join(" ")}
                            >
                              {fmtMoney(pnlNum)}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm leading-tight text-center">
                          {sellQty > 0 ? (
                            <>
                              <div className={textSecondaryClass}>
                                <span className="font-medium">
                                  {dateOnly(t.sell_date)}
                                </span>
                              </div>
                              <div className={textClass}>
                                Qty:{" "}
                                <span className="font-medium">{sellQty}</span> •
                                Avg:{" "}
                                {sellAvg !== null ? fmtMoney(sellAvg) : "—"}
                              </div>
                              <div className={textSecondaryClass}>
                                Invested:{" "}
                                {investedValue !== null
                                  ? fmtMoney(investedValue)
                                  : "—"}
                              </div>
                            </>
                          ) : (
                            <span className={textSecondaryClass}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
