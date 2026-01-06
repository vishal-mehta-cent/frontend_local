import React, { useEffect, useState, useMemo } from "react";
import { moneyINR } from "../utils/format";
import { NotebookPen, Download, Moon, Sun, Sparkles, ClipboardList, Briefcase, Clock, Activity, User, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import SwipeNav from "../components/SwipeNav";
import { useTheme } from "../context/ThemeContext";
import BackButton from "../components/BackButton";


const API = import.meta.env.VITE_BACKEND_BASE_URL || "https://paper-trading-backend.onrender.com";

export default function History({ username }) {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = useParams();
  const navigate = useNavigate();

  const who = useMemo(
    () => username || params.username || localStorage.getItem("username") || "",
    [username, params.username]
  );

  const bgClass = isDark
    ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
    : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100';
  const glassClass = isDark
    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
    : 'bg-white/60 backdrop-blur-xl border border-white/40';
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const cardHoverClass = isDark ? 'hover:bg-white/10' : 'hover:bg-white/80';

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

  const asNum = (v) => {
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

  const pickRowDate = (t) => {
    const cands = [t.sell_date, t.buy_date, t.time];
    for (const s of cands) {
      if (typeof s === "string" && s.trim()) {
        const d = s.split(" ")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      }
    }
    return null;
  };

  const filteredHistory = useMemo(() => {
    if (!startDate && !endDate) return history;
    return history.filter((t) => {
      const ymd = pickRowDate(t);
      if (!ymd) return false;
      if (startDate && ymd < startDate) return false;
      if (endDate && ymd > endDate) return false;
      return true;
    });
  }, [history, startDate, endDate]);

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
      "Realized P&L",
    ];

    const rows =
      filteredHistory && filteredHistory.length
        ? filteredHistory.map((t) => {
          const symbolUpper = (t.symbol || "—").toUpperCase();
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
      headers.map((h) => `<th style="font-weight:600">${escapeHTML(h)}</th>`).join("") +
      "</tr>";

    const tbody =
      rows.length > 0
        ? rows
          .map(
            (r) =>
              "<tr>" + r.map((c) => `<td>${escapeHTML(c)}</td>`).join("") + "</tr>"
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
    const stamp = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "");
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

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className={`sticky top-0 z-50 ${glassClass} shadow-2xl relative`}>
        <div className="w-full px-4 md:px-6 py-4">


          <div className="relative flex items-start justify-between mb-4">
            {/* Left: Back ABOVE Title */}
            <div className="flex flex-col items-start">
              <BackButton />

              <div className="mt-1">
                <div className="text-xl font-bold">Neurocrest</div>
                <div className={`text-xs ${textSecondaryClass}`}>
                  Next-Gen Trading
                </div>
              </div>
            </div>



            {/* Right: Profile */}
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

      <div className="w-full px-6 py-6 relative pb-24">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className={`text-4xl font-bold ${textClass}`}>History</h2>
            <p className={`${textSecondaryClass}`}>
              Your trading history and analytics
            </p>
          </div>

          {/* Right: Date filters + Export */}
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


        {loading ? (
          <div className={`text-center ${textSecondaryClass} mt-20`}>Loading...</div>
        ) : error ? (
          <div className="text-center text-red-400 whitespace-pre-wrap mt-20">
            {error}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className={`text-center ${textSecondaryClass} mt-20`}>No history available.</div>
        ) : (
          <div className={`${glassClass} rounded-3xl overflow-hidden shadow-2xl`}>
            {/* ✅ Horizontal scroll like WhatsApp */}
            <div className="overflow-x-auto">
              {/* ✅ Force overflow on small screens so horizontal scroll appears */}
              <div className="min-w-[1100px]">

                {/* Header stays fixed (inside the scroll area) */}
                <div className="grid grid-cols-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold p-4 text-center sticky top-0 z-10">
                  <div>Symbol & Time</div>
                  <div>Quantity</div>
                  <div>Buy Details</div>
                  <div>P&amp;L</div>
                  <div>Sell Details</div>
                </div>

                {/* ✅ Vertical scroll (body only) */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {filteredHistory.map((t, idx) => {
                    const buyQty = asNum(t.buy_qty) ?? 0;
                    const remaining = asNum(t.remaining_qty);
                    const isClosedOrPartial =
                      t.is_closed || (remaining !== null ? remaining < buyQty : false);

                    const pnlNum = asNum(t.pnl) ?? 0;
                    const pnlTone =
                      pnlNum > 0
                        ? "text-green-400"
                        : pnlNum < 0
                          ? "text-red-400"
                          : "text-gray-400";

                    const sellQty = asNum(t.sell_qty) ?? 0;
                    const sellAvg = asNum(t.sell_avg_price);
                    const investedValue = asNum(t.invested_value);

                    const symbolUpper = (t.symbol || "—").toUpperCase();

                    return (
                      <div
                        key={`${t.symbol || "row"}-${t.time || "time"}-${idx}`}
                        className={`grid grid-cols-5 items-center p-4 border-t ${isDark ? "border-white/10" : "border-white/40"
                          } ${isClosedOrPartial ? "opacity-60" : ""}`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            <span className="font-bold text-lg">{symbolUpper}</span>
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
                            {t.time || ""}
                          </span>
                        </div>

                        <div className="font-medium text-center">{buyQty || "—"}</div>

                        <div className="text-sm leading-tight text-center">
                          {t.buy_date ? (
                            <>
                              <div className={textSecondaryClass}>
                                <span className="font-medium">{dateOnly(t.buy_date)}</span>
                              </div>
                              <div className={textClass}>{fmtMoney(t.buy_price)}</div>
                            </>
                          ) : (
                            <span className={textSecondaryClass}>—</span>
                          )}
                        </div>

                        <div className={`font-bold text-lg flex items-center justify-center gap-1 ${pnlTone}`}>
                          <span className="text-xl">{pnlNum >= 0 ? "↗" : "↘"}</span>
                          <span>{fmtMoney(pnlNum)}</span>
                        </div>

                        <div className="text-sm leading-tight text-center">
                          {sellQty > 0 ? (
                            <>
                              <div className={textSecondaryClass}>
                                <span className="font-medium">{dateOnly(t.sell_date)}</span>
                              </div>
                              <div className={textClass}>
                                Qty: <span className="font-medium">{sellQty}</span> • Avg:{" "}
                                {sellAvg !== null ? fmtMoney(sellAvg) : "—"}
                              </div>
                              <div className={textSecondaryClass}>
                                Invested: {investedValue !== null ? fmtMoney(investedValue) : "—"}
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
