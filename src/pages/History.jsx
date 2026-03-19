import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { moneyINR } from "../utils/format";
import {
  NotebookPen,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { formatToIST_YMDHMS } from "../utils/time";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-neurocrest.css";
import AppHeader from "../components/AppHeader";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com";

// ---------- Brokerage helpers (History: additional_tax + net_investment) ----------
const DEFAULT_RATES = {
  brokerage_mode: "ABS",
  brokerage_intraday_pct: "0.0005",
  brokerage_intraday_abs: "20",
  brokerage_delivery_pct: "0.005",
  brokerage_delivery_abs: "0",
  tax_intraday_pct: "0.00018",
  tax_delivery_pct: "0.0011",
};

const toF = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const calcAdditionalCost = ({ rates, segment, investment }) => {
  const seg = (segment || "delivery").toLowerCase();
  const isIntra = seg === "intraday";

  const brokerage = (() => {
    if ((rates?.brokerage_mode || "ABS") === "PCT") {
      const pct = isIntra
        ? toF(rates.brokerage_intraday_pct)
        : toF(rates.brokerage_delivery_pct);
      return investment * pct;
    } else {
      return isIntra
        ? toF(rates.brokerage_intraday_abs)
        : toF(rates.brokerage_delivery_abs);
    }
  })();

  const taxPct = isIntra ? toF(rates.tax_intraday_pct) : toF(rates.tax_delivery_pct);
  const tax = investment * taxPct;

  const additional = brokerage + tax;
  return Number.isFinite(additional) ? additional : 0;
};

export default function History({ username }) {
  const { isDark } = useTheme();

  const handleHorizontalWheel = useCallback((e) => {
    const el = e.currentTarget;
    if (!el) return;

    if (el.scrollWidth <= el.clientWidth) return;

    if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [history, setHistory] = useState([]);
  const [activity, setActivity] = useState([]);

  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [tab, setTab] = useState("history");

  const params = useParams();
  const navigate = useNavigate();

  const who = useMemo(
    () => username || params.username || localStorage.getItem("username") || "",
    [username, params.username]
  );
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    if (!who) return;

    (async () => {
      try {
        const res = await fetch(
          `${API}/orders/brokerage-settings/${encodeURIComponent(who)}`
        );
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
  }, [who]);

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";
  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  const xScrollRef = useRef(null);
  const dragState = useRef({ down: false, startX: 0, startLeft: 0 });

  const trackerGridCols =
    "minmax(170px,1.05fr) minmax(260px,1.55fr) minmax(130px,0.85fr) minmax(110px,0.7fr) minmax(170px,1fr) minmax(95px,0.65fr) minmax(120px,0.8fr) minmax(140px,0.9fr) minmax(170px,1fr)";

  const historyGridCols =
    "minmax(230px,1.45fr) minmax(110px,0.7fr) minmax(160px,0.95fr) minmax(150px,0.9fr) minmax(150px,0.9fr) minmax(170px,1fr) minmax(180px,1.05fr) minmax(210px,1.2fr) minmax(190px,1.05fr)";

  const onDragStart = (e) => {
    const el = xScrollRef.current;
    if (!el) return;
    dragState.current.down = true;
    dragState.current.startX = e.clientX;
    dragState.current.startLeft = el.scrollLeft;
  };

  const onDragMove = (e) => {
    const el = xScrollRef.current;
    if (!el || !dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    el.scrollLeft = dragState.current.startLeft - dx;
  };

  const onDragEnd = () => {
    dragState.current.down = false;
  };

  // -------------------- Fetch CLOSED history --------------------
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
          throw new Error(`HTTP ${res.status}: ${txt || "Failed to fetch history"}`);
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

  // -------------------- Fetch ACTIVITY --------------------
  useEffect(() => {
    if (!who) return;
    if (tab !== "all") return;

    setLoadingActivity(true);

    const url = `${API}/orders/activity/${encodeURIComponent(who)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt || "Failed to fetch activity"}`);
        }
        return res.json();
      })
      .then((data) => {
        setActivity(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Activity fetch error:", e);
        setActivity([]);
      })
      .finally(() => setLoadingActivity(false));
  }, [who, tab]);

  const asNum = (v) => {
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

  const filteredHistory = useMemo(() => {
    return applyDateFilter(history || []);
  }, [history, startDate, endDate]);

  const normalizeMarket = (v) => {
    const s = String(v || "").toUpperCase().trim();
    if (!s) return "—";
    if (s.includes("NSE")) return "NSE";
    if (s.includes("BSE")) return "BSE";
    return "—";
  };

  const normalizeSegment = (v) => {
    const s = String(v || "").toLowerCase().trim();
    if (!s) return "—";
    if (s.includes("delivery") || s === "c" || s.includes("cnc")) return "Delivery";
    if (s.includes("intraday") || s.includes("intra") || s.includes("mis"))
      return "Intraday";
    return "—";
  };

  const pickExchange = (t) =>
    t.exchange || t.market || t.exch || t.exc || t.Exchange || t.Market || "";

  const pickSegment = (t) =>
    t.segment || t.product || t.trade_segment || t.order_segment || t.Segment || "";

  const pickAdditionalTax = (t) =>
    asNum(
      t.additional_tax ??
      t.additionalTax ??
      t.tax ??
      t.taxes ??
      t.charges ??
      t.brokerage ??
      t.fees ??
      t.total_charges ??
      null
    );

  const pickDateTimeAny = (s) => {
    const str = String(s || "").trim();
    return str || "";
  };

  const ledgerKey = (r) => {
    const sym = normSym(r.symbol);
    const dt = String(r.datetime || "").trim();
    const side = String(r.side || "").toUpperCase();
    const qty = asNum(r.qty) ?? "";
    const price = asNum(r.price);
    const ex = normalizeMarket(r.market);
    const seg = normalizeSegment(r.segment);
    const tax = asNum(r.additional_tax);
    return [
      sym,
      dt,
      side,
      ex,
      seg,
      qty,
      price !== null ? price.toFixed(6) : "",
      tax !== null ? tax.toFixed(6) : "",
    ].join("|");
  };

  const applyLedgerDateFilter = (rows) => {
    if (!startDate && !endDate) return rows || [];

    return (rows || []).filter((r) => {
      const dt = String(r.datetime || "").trim();
      const ymd = dt ? dt.split(" ")[0] : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
      if (startDate && ymd < startDate) return false;
      if (endDate && ymd > endDate) return false;
      return true;
    });
  };

  const allHistoryLedgerRows = useMemo(() => {
    const rows = (activity || []).map((a) => {
      const symbol = normSym(a.script || a.symbol || a.tradingsymbol);
      const dt = String(a.datetime || a.time || "").trim();

      const type = String(a.activity_type || a.action || "")
        .toUpperCase()
        .trim();
      const sideLabel = type || "—";

      const qty = asNum(a.qty) ?? 0;
      const price = asNum(a.price);

      const market = normalizeMarket(a.exchange || a.market || a.exch || "");
      const segment = normalizeSegment(a.segment || a.product || "");
      const inv =
        qty > 0 && price !== null && Number.isFinite(qty * price) ? qty * price : null;

      let addTax = pickAdditionalTax(a);
      if (addTax === null && inv !== null) {
        const segKey = segment === "Intraday" ? "intraday" : "delivery";
        addTax = calcAdditionalCost({ rates, segment: segKey, investment: inv });
      }

      const typ = String(a.activity_type ?? a.action ?? "").toUpperCase().trim();
      const isSell =
        typ.includes("SELL_FIRST") || typ === "EXIT" || typ.startsWith("SELL");

      let netInv = asNum(a.net_investment ?? a.netInvestment);
      if (netInv === null && inv !== null) {
        netInv = isSell ? inv - (addTax || 0) : inv + (addTax || 0);
      }

      return {
        datetime: dt,
        symbol,
        side: sideLabel,
        market,
        segment,
        qty,
        price,
        additional_tax: addTax,
        net_investment: netInv,
        gross_investment: inv,
        notes: a.notes || "",
      };
    });

    rows.sort((x, y) => String(y.datetime || "").localeCompare(String(x.datetime || "")));
    return applyLedgerDateFilter(rows);
  }, [activity, startDate, endDate, rates]);

  const displayHistory = useMemo(() => {
    return tab === "all" ? allHistoryLedgerRows : filteredHistory;
  }, [tab, allHistoryLedgerRows, filteredHistory]);

  const escapeHTML = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const computeHistoryCosts = (t) => {
    const qty = asNum(t.buy_qty) ?? 0;
    const segKey = (t.segment || "delivery").toLowerCase();

    const entryPrice = asNum(t.buy_price) ?? 0;
    const exitPrice = asNum(t.exit_price) ?? asNum(t.sell_avg_price) ?? 0;

    const investment = entryPrice * qty;
    const exitInvestment = exitPrice * qty;

    const entryAdd = calcAdditionalCost({
      rates,
      segment: segKey,
      investment,
    });

    const exitAdd = calcAdditionalCost({
      rates,
      segment: segKey,
      investment: exitInvestment,
    });

    const entrySide = String(t.entry_side || t.entrySide || "").toUpperCase();
    const isShort =
      Boolean(t.short_first) ||
      entrySide.includes("SELL_FIRST") ||
      entrySide === "SELL";

    const isBuy = !isShort;

    const backendAddCost = asNum(t.additional_cost);
    const backendNetInv = asNum(t.net_investment);
    const backendExitNetInv = asNum(t.exit_net_investment);

    const addCost = backendAddCost ?? (entryAdd + exitAdd);

    const netInv =
      backendNetInv ?? (isBuy ? investment + entryAdd : investment - entryAdd);

    const exitNetInv = backendExitNetInv ?? (exitInvestment - exitAdd);

    return {
      isBuy,
      qty,
      entryPrice,
      exitPrice,
      investment,
      exitInvestment,
      entryAdd,
      exitAdd,
      addCost,
      netInv,
      exitNetInv,
    };
  };

  const buildExcelHtml = () => {
    if (tab === "all") {
      const headers = [
        "DateTime",
        "Script",
        "BUY/SELL",
        "Market",
        "Delivery/Intraday",
        "QTY",
        "PRICE",
        "Additional tax",
        "Net Investment",
      ];

      const rows =
        displayHistory && displayHistory.length
          ? displayHistory.map((r) => {
            const dt = formatToIST_YMDHMS(r.datetime);
            const sym = normSym(r.symbol || "—");
            const side = String(r.side || "—").toUpperCase();
            const market = r.market || "—";
            const seg = r.segment || "—";
            const qty = asNum(r.qty) ?? "";
            const price = asNum(r.price);
            const tax = asNum(r.additional_tax);
            const netInv = asNum(r.net_investment);

            return [
              dt,
              sym,
              side,
              market,
              seg,
              qty,
              price !== null ? price.toFixed(2) : "",
              tax !== null ? tax.toFixed(2) : "",
              netInv !== null ? netInv.toFixed(2) : "",
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
    <x:Name>All_History</x:Name>
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
    }

    const headers = [
      "Symbol",
      "Row Date",
      "Buy Qty",
      "Buy Date",
      "Buy Price",
      "Additional Cost",
      "Net Investment",
      "Sell Qty",
      "Exit Price",
      "Exit Net Investment",
      "Sell Date",
      "Invested",
      "P&L",
    ];

    const rows =
      displayHistory && displayHistory.length
        ? displayHistory.map((t) => {
          const symbolUpper = normSym(t.symbol || t.script || t.tradingsymbol || "—");
          const rowDate = pickRowDate(t) || "";
          const buyQty = asNum(t.buy_qty) ?? "";
          const buyPrice = asNum(t.buy_price);
          const sellQty = asNum(t.sell_qty) ?? "";
          const c = computeHistoryCosts(t);
          const invested = c.investment;

          const pnl = c.isBuy
            ? c.exitNetInv - c.netInv
            : c.investment - c.exitInvestment - c.addCost;

          const exitPrice = c.exitPrice;
          const addCost = c.addCost;
          const netInv = c.netInv;
          const exitNetInv = c.exitNetInv;

          return [
            symbolUpper,
            rowDate,
            buyQty,
            dateOnly(t.buy_date),
            buyPrice !== null ? buyPrice.toFixed(2) : "",
            addCost !== null ? Number(addCost).toFixed(2) : "",
            netInv !== null ? Number(netInv).toFixed(2) : "",
            sellQty,
            exitPrice ? Number(exitPrice).toFixed(2) : "",
            exitNetInv !== null ? Number(exitNetInv).toFixed(2) : "",
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
    a.download = `history_${who || "user"}_${stamp}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const goNotes = (s) => navigate(`/notes/${encodeURIComponent((s || "").toUpperCase())}`);

  const showLoading = loading || (tab === "all" && loadingActivity);

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <AppHeader />

      <div className="w-full px-3 sm:px-4 md:px-6 py-6 relative pb-24">
        <div className="mb-6 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div className="min-w-0">
            <h2 className={`text-3xl sm:text-4xl font-bold ${textClass}`}>History</h2>
            <p className={`${textSecondaryClass}`}>Your trading history and analytics</p>

            <div className={`mt-4 inline-flex w-full sm:w-auto p-1 rounded-2xl ${glassClass}`}>
              <button
                onClick={() => setTab("history")}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "history"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${textSecondaryClass} hover:opacity-90`
                  }`}
              >
                History
              </button>

              <button
                onClick={() => setTab("all")}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "all"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${textSecondaryClass} hover:opacity-90`
                  }`}
              >
                Trades Tracker
              </button>
            </div>
          </div>

          <div className="flex w-full xl:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3 xl:justify-end">
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(d) => {
                if (!d) return setStartDate("");
                const ymd = d.toISOString().slice(0, 10);
                setStartDate(ymd);
              }}
              dateFormat="MM/dd/yyyy"
              placeholderText="Start date"
              className={`w-full px-3 py-2 rounded-xl ${glassClass} ${textClass} text-sm shadow-lg transition-all focus:ring-2 focus:ring-blue-500 nc-date-input`}
              calendarClassName="nc-date-calendar"
              popperClassName={`nc-date-popper ${isDark ? "nc-date-dark" : "nc-date-light"}`}
              wrapperClassName={`w-full sm:w-[180px] nc-date-wrapper ${isDark ? "nc-date-dark" : "nc-date-light"}`}
              isClearable
            />

            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(d) => {
                if (!d) return setEndDate("");
                const ymd = d.toISOString().slice(0, 10);
                setEndDate(ymd);
              }}
              dateFormat="MM/dd/yyyy"
              placeholderText="End date"
              className={`w-full px-3 py-2 rounded-xl ${glassClass} ${textClass} text-sm shadow-lg transition-all focus:ring-2 focus:ring-blue-500 nc-date-input`}
              calendarClassName="nc-date-calendar"
              popperClassName={`nc-date-popper ${isDark ? "nc-date-dark" : "nc-date-light"}`}
              wrapperClassName={`w-full sm:w-[180px] nc-date-wrapper ${isDark ? "nc-date-dark" : "nc-date-light"}`}
              isClearable
            />

            <button
              onClick={handleDownloadExcel}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-xl transition-all shadow-lg font-medium"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {showLoading ? (
          <div className={`text-center ${textSecondaryClass} mt-20`}>Loading...</div>
        ) : error ? (
          <div className="text-center text-red-400 whitespace-pre-wrap mt-20">{error}</div>
        ) : displayHistory.length === 0 ? (
          <div className={`text-center ${textSecondaryClass} mt-20`}>No history available.</div>
        ) : tab === "all" ? (
          <div className={`${glassClass} rounded-3xl overflow-hidden shadow-2xl`}>
            <div
              ref={xScrollRef}
              className="w-full max-w-full overflow-x-auto nc-scrollbar touch-pan-x overscroll-x-contain cursor-grab active:cursor-grabbing"
              onWheel={handleHorizontalWheel}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={onDragEnd}
            >
              <div className="min-w-[1500px]">
                <div
                  className="grid items-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold p-4 text-center text-sm md:text-base sticky top-0 z-10"
                  style={{ gridTemplateColumns: trackerGridCols }}
                >
                  <div>Date &amp; Time</div>
                  <div>Script</div>
                  <div>BUY / SELL</div>
                  <div>Market</div>
                  <div>Delivery / Intraday</div>
                  <div>QTY</div>
                  <div>PRICE</div>
                  <div>Additional tax</div>
                  <div>Net Investment</div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto nc-scrollbar nc-scrollbar-overlay pr-0">
                  {displayHistory.map((r, idx) => {
                    const side = String(r.side || "").toUpperCase();
                    const isBuy =
                      side.includes("BUY") ||
                      side === "ADD" ||
                      side.includes("COVER") ||
                      side.includes("LONG");

                    return (
                      <div
                        key={`${ledgerKey(r)}-${idx}`}
                        className={`grid items-center gap-x-3 p-4 border-t ${isDark ? "border-white/10" : "border-white/40"
                          }`}
                        style={{ gridTemplateColumns: trackerGridCols }}
                      >
                        <div className="min-w-0 text-left text-sm leading-tight">
                          <div className="font-medium whitespace-nowrap">
                            {formatToIST_YMDHMS(r.datetime)}
                          </div>
                        </div>

                        <div className="min-w-0 flex items-center justify-start gap-2">
                          <span
                            title={r.symbol || ""}
                            className="block max-w-full truncate font-bold text-base md:text-lg cursor-help"
                          >
                            {r.symbol}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              goNotes(r.symbol || "");
                            }}
                            title="Notes"
                            className={`shrink-0 p-1 rounded-lg ${cardHoverClass} ${textSecondaryClass} transition-all`}
                          >
                            <NotebookPen size={14} />
                          </button>
                        </div>

                        <div className="flex justify-center">
                          <span
                            className={[
                              "px-3 py-1 rounded-xl text-xs font-extrabold tracking-wide",
                              "ring-1 backdrop-blur-xl",
                              isBuy
                                ? isDark
                                  ? "shadow-[0_12px_24px_rgba(16,185,129,0.50),0_6px_12px_rgba(16,185,129,0.26)]"
                                  : "shadow-[0_12px_24px_rgba(16,185,129,0.34),0_6px_12px_rgba(16,185,129,0.18)]"
                                : isDark
                                  ? "shadow-[0_12px_24px_rgba(244,63,94,0.46),0_6px_12px_rgba(244,63,94,0.24)]"
                                  : "shadow-[0_12px_24px_rgba(244,63,94,0.32),0_6px_12px_rgba(244,63,94,0.16)]",
                              isBuy
                                ? isDark
                                  ? "bg-emerald-500/15 ring-emerald-400/20 text-emerald-200"
                                  : "bg-emerald-50 ring-emerald-200/70 text-emerald-700"
                                : isDark
                                  ? "bg-rose-500/15 ring-rose-400/20 text-rose-200"
                                  : "bg-rose-50 ring-rose-200/70 text-rose-700",
                            ].join(" ")}
                          >
                            {side || "—"}
                          </span>
                        </div>

                        <div className="text-center font-medium">{r.market || "—"}</div>

                        <div className="text-center font-medium">{r.segment || "—"}</div>

                        <div className="text-center font-semibold">{asNum(r.qty) ?? "—"}</div>

                        <div className="text-center font-medium">
                          {asNum(r.price) !== null ? fmtMoney(r.price) : "—"}
                        </div>

                        <div className="text-center font-medium">
                          {asNum(r.additional_tax) !== null ? fmtMoney(r.additional_tax) : "—"}
                        </div>

                        <div className="text-center font-extrabold">
                          {asNum(r.net_investment) !== null ? fmtMoney(r.net_investment) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${glassClass} rounded-3xl overflow-hidden shadow-2xl`}>
            <div
              ref={xScrollRef}
              className="w-full max-w-full overflow-x-auto nc-scrollbar touch-pan-x overscroll-x-contain cursor-grab active:cursor-grabbing"
              onWheel={handleHorizontalWheel}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={onDragEnd}
            >
              <div className="min-w-[1750px]">
                <div
                  className="grid items-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold p-4 text-center text-sm md:text-base sticky top-0 z-10"
                  style={{ gridTemplateColumns: historyGridCols }}
                >
                  <div>Symbol &amp; Time</div>
                  <div>Quantity</div>
                  <div>Buy Details</div>
                  <div>Invested</div>
                  <div>Additional Cost</div>
                  <div>Net Investment</div>
                  <div>P&amp;L</div>
                  <div>Sell Details</div>
                  <div>Exit Net Investment</div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto nc-scrollbar nc-scrollbar-overlay pr-0">
                  {displayHistory.map((t, idx) => {
                    const symbolUpper = normSym(t.symbol || t.script || t.tradingsymbol || "—");
                    const buyQty = asNum(t.buy_qty) ?? 0;

                    const sellQty = asNum(t.sell_qty) ?? 0;
                    const sellAvg = asNum(t.sell_avg_price);
                    const costs = computeHistoryCosts(t);
                    const exitPrice = costs.exitPrice;

                    const investment = Number.isFinite(costs.investment) ? costs.investment : 0;
                    const addCost = Number.isFinite(costs.addCost) ? costs.addCost : 0;

                    const netInv = Number.isFinite(costs.netInv) ? costs.netInv : 0;
                    const exitNetInv = Number.isFinite(costs.exitNetInv) ? costs.exitNetInv : 0;

                    const pnlNum = costs.isBuy
                      ? exitNetInv - netInv
                      : investment - costs.exitInvestment - addCost;

                    const investedValue = investment;

                    return (
                      <div
                        key={`${dedupeKey(t)}-${idx}`}
                        className={`grid items-center gap-x-3 p-4 border-t ${isDark ? "border-white/10" : "border-white/40"
                          }`}
                        style={{ gridTemplateColumns: historyGridCols }}
                      >
                        <div className="min-w-0 flex flex-col items-start text-left">
                          <div className="inline-flex max-w-full items-center gap-2">
                            <span
                              title={symbolUpper || ""}
                              className="block max-w-full truncate font-bold text-base md:text-lg cursor-help"
                            >
                              {symbolUpper}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                goNotes(t.symbol || "");
                              }}
                              title="Notes"
                              className={`shrink-0 p-1 rounded-lg ${cardHoverClass} ${textSecondaryClass} transition-all`}
                            >
                              <NotebookPen size={14} />
                            </button>
                          </div>
                          <span className={`text-xs ${textSecondaryClass} mt-1 whitespace-nowrap`}>
                            {formatToIST_YMDHMS(t.time || t.datetime)}
                          </span>
                        </div>

                        <div className="font-semibold text-center">{buyQty || "—"}</div>

                        <div className="text-sm leading-tight text-center whitespace-nowrap">
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

                        <div className="text-center font-medium">
                          {investedValue !== null ? fmtMoney(investedValue) : "—"}
                        </div>

                        <div className="text-center font-medium">
                          {addCost !== null && addCost !== undefined ? fmtMoney(addCost) : "—"}
                        </div>

                        <div className="text-center font-extrabold">
                          {netInv !== null && netInv !== undefined ? fmtMoney(netInv) : "—"}
                        </div>

                        <div className="flex justify-center">
                          <div
                            className={[
                              "inline-flex items-center gap-2",
                              "px-4 py-2 rounded-2xl",
                              "ring-1",
                              pnlNum > 0
                                ? isDark
                                  ? "shadow-[0_14px_28px_rgba(16,185,129,0.55),0_6px_14px_rgba(16,185,129,0.30)]"
                                  : "shadow-[0_14px_28px_rgba(16,185,129,0.40),0_6px_14px_rgba(16,185,129,0.22)]"
                                : pnlNum < 0
                                  ? isDark
                                    ? "shadow-[0_14px_28px_rgba(244,63,94,0.50),0_6px_14px_rgba(244,63,94,0.28)]"
                                    : "shadow-[0_14px_28px_rgba(244,63,94,0.36),0_6px_14px_rgba(244,63,94,0.20)]"
                                  : isDark
                                    ? "shadow-[0_14px_26px_rgba(148,163,184,0.22),0_6px_14px_rgba(148,163,184,0.12)]"
                                    : "shadow-[0_14px_26px_rgba(148,163,184,0.18),0_6px_14px_rgba(148,163,184,0.10)]",
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
                                className={isDark ? "text-emerald-300" : "text-emerald-600"}
                              />
                            ) : pnlNum < 0 ? (
                              <TrendingDown
                                size={18}
                                className={isDark ? "text-rose-300" : "text-rose-600"}
                              />
                            ) : (
                              <TrendingUp
                                size={18}
                                className={isDark ? "text-slate-300/70" : "text-slate-500/70"}
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

                        <div className="text-sm leading-tight text-center whitespace-nowrap">
                          {sellQty > 0 ? (
                            <>
                              <div className={textSecondaryClass}>
                                <span className="font-medium">{dateOnly(t.sell_date)}</span>
                              </div>
                              <div className={textClass}>
                                Qty: <span className="font-medium">{sellQty}</span> • Exit:{" "}
                                {exitPrice
                                  ? fmtMoney(exitPrice)
                                  : sellAvg !== null
                                    ? fmtMoney(sellAvg)
                                    : "—"}
                              </div>
                            </>
                          ) : (
                            <span className={textSecondaryClass}>—</span>
                          )}
                        </div>

                        <div className="text-center font-extrabold">
                          {exitNetInv !== null && exitNetInv !== undefined ? fmtMoney(exitNetInv) : "—"}
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
