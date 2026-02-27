// frontend/src/pages/Orders.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, X, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import BackButton from "../components/BackButton";
import { toast } from "react-toastify";
import useOpenTrades from "../hooks/useOpenTrades";
import { FaWhatsapp } from "react-icons/fa";
import SwipeNav from "../components/SwipeNav";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import HeaderActions from "../components/HeaderActions";
import AppHeader from "../components/AppHeader";
import { BarChart2 } from "lucide-react";


const API = (import.meta.env.VITE_BACKEND_BASE_URL || "https://paper-trading-backend.onrender.com")
  .trim()
  .replace(/\/+$/, "");


// ---------- Safe helpers ----------

// ---------- Brokerage settings helpers (from Funds page localStorage) ----------
const DEFAULT_RATES = {
  brokerage_mode: "ABS", // "ABS" or "PCT"
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

// ✅ per-side additional cost calculator
// segment: "intraday" | "delivery"
const calcAdditionalCost = ({ rates, segment, investment }) => {
  const seg = (segment || "delivery").toLowerCase();
  const isIntra = seg === "intraday";

  const brokerage = (() => {
    if ((rates?.brokerage_mode || "ABS") === "PCT") {
      const pct = isIntra ? toF(rates.brokerage_intraday_pct) : toF(rates.brokerage_delivery_pct);
      return investment * pct;
    } else {
      // ABS = per trade flat brokerage
      return isIntra ? toF(rates.brokerage_intraday_abs) : toF(rates.brokerage_delivery_abs);
    }
  })();

  const taxPct = isIntra ? toF(rates.tax_intraday_pct) : toF(rates.tax_delivery_pct);
  const tax = investment * taxPct;

  const additional = brokerage + tax;
  return Number.isFinite(additional) ? additional : 0;
};


const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v) => {
  const n = toNum(v);
  return n === null
    ? "—"
    : `₹${n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
};
const intval = (v) => {
  const n = toNum(v);
  return n === null ? "—" : n;
};
const toNumOrNull = (v) =>
  v === null || v === undefined || v === ""
    ? null
    : Number.isFinite(Number(v))
      ? Number(v)
      : null;

// Robust datetime utils (local timezone)
// Robust datetime utils (FORCE IST, treat naive timestamps as UTC)
// Robust datetime utils (IST display; treat PROD naive timestamps as UTC)
const pickDateTime = (o) =>
  o?.datetime || o?.updated_at || o?.created_at || o?.time || o?.date || null;

const ASSUME_UTC_FOR_NAIVE = import.meta.env.PROD; // ✅ production/deployed only

const parseDate = (s) => {
  if (!s) return null;
  const raw = String(s).trim();
  if (!raw) return null;

  // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  let isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");

  // trim microseconds to milliseconds (Date() supports 3 digits)
  isoLike = isoLike.replace(/(\.\d{3})\d+/, "$1");

  // if timezone is missing, assume UTC only in production
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(isoLike);
  const safe = hasTZ ? isoLike : (ASSUME_UTC_FOR_NAIVE ? `${isoLike}Z` : isoLike);

  const d = new Date(safe);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtTime = (d) =>
  d
    ? d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",   // ✅ force IST
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    : "—";

const fmtDate = (d) =>
  d
    ? d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",   // ✅ force IST
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    : "—";


const Chip = ({ label, value, tone = "gray" }) => {
  const toneClass =
    tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "green"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${toneClass}`}>
      <span className="opacity-70 mr-1">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
};

const SegmentBadge = ({ segment }) => {
  const seg = (segment || "").toLowerCase();
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

const ExchangeBadge = ({ exchange }) => {
  const ex = (exchange || "NSE").toUpperCase();
  const isNSE = ex === "NSE";

  return (
    <span
      className={`text-[11px] px-2 py-[1px] rounded border font-semibold ${isNSE
        ? "bg-blue-50 text-blue-700 border-blue-300"
        : "bg-purple-50 text-purple-700 border-purple-300"
        }`}
    >
      {ex}
    </span>
  );
};

const PnlArrowBox = ({ up }) => {
  return (
    <span
      className={[
        "inline-flex items-center justify-center",
        "w-7 h-7 rounded-md",
        up ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300",
        "border",
        up ? "border-emerald-400/20" : "border-rose-400/20",
      ].join(" ")}
    >
      <span className="text-base font-black leading-none">
        {up ? "↗" : "↘"}
      </span>
    </span>
  );
};

// ✅ Freeze closed-row values (so later brokerage changes won't affect old closed trades)
const closedSnapKey = (who, o) => {
  const sym = (o.script || o.symbol || "").toUpperCase();
  const seg = (o.segment || "delivery").toLowerCase();
  const dt = (o.datetime || o.updated_at || o.created_at || "").toString();
  const qty = Number(o.qty || 0);
  const entry = Number(o.price || 0);
  const exitp = o.exit_price != null ? Number(o.exit_price) : "";
  const side = (o.type || o.order_type || "").toUpperCase();
  return `nc_closed_snap|${who}|${sym}|${seg}|${side}|${dt}|${qty}|${entry}|${exitp}`;
};

const readClosedSnap = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeClosedSnap = (key, snap) => {
  try {
    localStorage.setItem(key, JSON.stringify(snap));
  } catch { }
};


export default function Orders({ username }) {
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || "open");

  const [openOrders, setOpenOrders] = useState([]);
  const [positions, setPositions] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const { data: openTrades, isRefreshing, refresh } = useOpenTrades(username);

  // polling refs
  const dataPollRef = useRef(null);
  const prevOpenRef = useRef([]);
  const prevPosRef = useRef([]);

  const isOrdersTab = tab === "open";
  const getSymbol = (o) => (o?.script || o?.symbol || "").toString().toUpperCase();
  const who = username || localStorage.getItem("username");
  const prevPriceRef = useRef({});
  const [priceFlash, setPriceFlash] = useState({});
  const isInactiveSel = Boolean(selectedOrder?.inactive);
  const closedSnapRef = useRef({});


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

  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  // Stop spinner early if username is missing
  useEffect(() => {
    if (!who) {
      setLoading(false);
      setErrorMsg("Username missing. Please sign in again.");
    }
  }, [who]);

  // ---------- Data loaders ----------
  const normalize = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((o) => ({
      ...o,
      id: o.id ?? o.order_id,
      type: o.type || o.order_type,
      script: o.script || o.symbol, // keep both, prefer script
      // entry / trigger / live
      price: toNum(o?.price) ?? null,                 // entry/avg for positions
      trigger_price: toNum(o?.trigger_price),         // open orders
      live_price: toNum(o?.live_price),
      // P&L fields from backend (if any)
      abs_per_share: toNum(o?.abs_per_share) ?? toNum(o?.abs),
      abs_pct: toNum(o?.abs_pct),
      script_pnl: toNum(o?.script_pnl) ?? toNum(o?.pnl_value),
      // misc numeric
      pnl: toNum(o?.pnl),
      stoploss: toNumOrNull(o?.stoploss),
      target: toNumOrNull(o?.target),
      status: o.status,
      status_msg: o.status_msg,
      qty: Number(o.qty) || 0,
      total: Number(o.total) || 0,
      inactive: Boolean(o.inactive),
      segment: o.segment,
      exchange: (o.exchange || "").toUpperCase(),   // ✅ ADD THIS
      short_first: Boolean(o.short_first || o.is_short || o.isShort),
      // timestamps
      datetime: o.datetime,
      updated_at: o.updated_at,
      created_at: o.created_at,
      time: o.time,
      date: o.date,
    }));
  };

  const loadData = useCallback(async () => {
    if (!who) {
      setOpenOrders([]);
      setPositions([]);
      setErrorMsg("Username missing. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();
    const timer = setTimeout(() => {
      try { ctrl1.abort(); } catch { }
      try { ctrl2.abort(); } catch { }
    }, 10000); // 10s timeout

    try {
      const [openRes, posRes] = await Promise.all([
        fetch(`${API}/orders/${who}`, { signal: ctrl1.signal }),
        fetch(`${API}/orders/positions/${who}`, { signal: ctrl2.signal }),
      ]);

      if (!openRes.ok || !posRes.ok) {
        const t1 = await openRes.text().catch(() => "");
        const t2 = await posRes.text().catch(() => "");
        throw new Error(
          `Failed to load orders (open ${openRes.status}, pos ${posRes.status}). ${t1 || t2 || ""}`.trim()
        );
      }

      const [openData, posData] = await Promise.all([openRes.json(), posRes.json()]);
      setOpenOrders(normalize(openData));
      setPositions(normalize(posData));
      setErrorMsg("");
    } catch (e) {
      // ⛑️ On any error or timeout: stop the spinner (no red message),
      // the page shows empty state and polling below will refill when API returns.
      setErrorMsg("");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [who]);

  const whoRates = username || localStorage.getItem("username");
  const [rates, setRates] = useState(DEFAULT_RATES);

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




  // initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // refresh when a route asks us to
  useEffect(() => {
    if (location.state?.refresh) {
      loadData();
    }
  }, [location.state, loadData]);

  // 🔁 ALSO refresh **whenever the user clicks a tab** (your ask)
  useEffect(() => {
    loadData();
  }, [tab, loadData]);

  // lightweight polling of orders/positions
  useEffect(() => {
    if (!who) return;
    const silentRefresh = async () => {
      try {
        const [openRes, posRes] = await Promise.all([
          fetch(`${API}/orders/${who}`),
          fetch(`${API}/orders/positions/${who}`),
        ]);
        if (!openRes.ok || !posRes.ok) return;
        const [openData, posData] = await Promise.all([openRes.json(), posRes.json()]);
        setOpenOrders(normalize(openData));
        setPositions(normalize(posData));
        setLoading(false); // ensure we leave spinner once any data arrives
      } catch {
        /* ignore */
      }
    };
    dataPollRef.current = setInterval(silentRefresh, 3000);
    return () => {
      if (dataPollRef.current) clearInterval(dataPollRef.current);
      dataPollRef.current = null;
    };
  }, [who, loadData]);

  // Live quotes polling
  useEffect(() => {
    const allSymbols = Array.from(
      new Set(
        [...openOrders, ...positions]
          .map((o) => (o.script || o.symbol || "").toUpperCase())
          .filter(Boolean)
      )
    );
    if (!allSymbols.length) return;

    const fetchQuotes = () => {
      fetch(`${API}/quotes?symbols=${allSymbols.join(",")}`)
        .then((r) => r.json())
        .then((arr) => {
          const map = {};
          (arr || []).forEach((q) => {
            const sym = (q?.symbol || "").toUpperCase();
            if (!sym) return;
            map[sym] = {
              price: toNum(q?.price),
              change: toNum(q?.change),
              pct_change: toNum(q?.pct_change),
              open: toNum(q?.open),
            };
          });
          setQuotes(map);
          setPriceFlash((prev) => {
            const next = { ...prev };

            Object.entries(map).forEach(([sym, q]) => {
              const isInactive = [...openOrders, ...positions].some(
                (o) => (o.script || o.symbol)?.toUpperCase() === sym && o.inactive
              );
              if (isInactive) return;

              const newPrice = q.price;
              const oldPrice = prevPriceRef.current[sym];

              if (oldPrice != null && newPrice != null && newPrice !== oldPrice) {
                next[sym] = newPrice > oldPrice ? "up" : "down";

                // clear flash after 600ms
                setTimeout(() => {
                  setPriceFlash((p) => ({ ...p, [sym]: null }));
                }, 600);
              }

              prevPriceRef.current[sym] = newPrice;
            });

            return next;
          });

        })
        .catch(() => { });
    };

    fetchQuotes();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchQuotes, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [openOrders, positions]);

  const ordersToShow = isOrdersTab ? openOrders : positions;

  // ---------- Total P&L (includes both active & closed) ----------
  const totalPnl = positions.reduce((sum, o) => {
    const qty = toNum(o.qty) ?? 0;
    const entryPrice = toNum(o.price) ?? 0;

    const side = (o.type || o.order_type || "").toUpperCase();
    const isBuy = side === "BUY";

    const script = (o.script || o.symbol || "").toUpperCase();
    const livePx =
      (o.inactive && o.exit_price != null)
        ? toNum(o.exit_price)
        : (toNum(quotes[script]?.price) ?? toNum(o.live_price) ?? entryPrice);

    const investment = entryPrice * qty;

    const entryAdditionalCost = calcAdditionalCost({
      rates,
      segment: o.segment,
      investment,
    });

    // ✅ CLOSED row (gray) -> use EXIT price and total additional cost
    if (o.inactive && o.exit_price != null) {
      const exitPrice = toNum(o.exit_price) ?? 0;
      const exitInvestment = exitPrice * qty;

      const exitAdditionalCost = calcAdditionalCost({
        rates,
        segment: o.segment,
        investment: exitInvestment,
      });

      // total additional = entry + exit
      let totalAdditionalCost = entryAdditionalCost + exitAdditionalCost;

      // ✅ if you froze closed values, use frozen additionalCost so totals never change
      const key = closedSnapKey(who, o);
      const frozen = readClosedSnap(key);
      if (frozen?.additionalCost != null) totalAdditionalCost = frozen.additionalCost;

      // ✅ your required closed formulas:
      // BUY  : (exit - entry) - additionalCost
      // SELL : (entry - exit) - additionalCost
      const pnl = isBuy
        ? (exitInvestment - investment - totalAdditionalCost)
        : (investment - exitInvestment - totalAdditionalCost);

      return sum + (Number.isFinite(pnl) ? pnl : 0);
    }

    // ✅ ACTIVE row -> live MTM minus entry additional cost
    const liveValue = (livePx ?? 0) * qty;

    // BUY  : (live - entry) - entryAdditionalCost
    // SELL : (entry - live) - entryAdditionalCost
    const pnl = isBuy
      ? (liveValue - investment - entryAdditionalCost)
      : (investment - liveValue - entryAdditionalCost);

    return sum + (Number.isFinite(pnl) ? pnl : 0);
  }, 0);



  // auto-switch to Positions when orders trigger
  useEffect(() => {
    const countBySymbol = (list) =>
      (list || []).reduce((acc, o) => {
        const s = (o.script || o.symbol || "").toUpperCase();
        const ex = (o.exchange || "NSE").toUpperCase();
        if (!s) return acc;
        const key = `${s}_${ex}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const prevOpen = prevOpenRef.current || [];
    const prevPos = prevPosRef.current || [];

    const prevOpenCount = countBySymbol(prevOpen);
    const currOpenCount = countBySymbol(openOrders);
    const prevPosCount = countBySymbol(prevPos);
    const currPosCount = countBySymbol(positions);

    const movedSymbols = Object.keys(prevOpenCount).filter((sym) => {
      const openDecreased = (currOpenCount[sym] || 0) < (prevOpenCount[sym] || 0);
      const posIncreased = (currPosCount[sym] || 0) > (prevPosCount[sym] || 0);
      return openDecreased && posIncreased;
    });

    if (movedSymbols.length && tab === "open") {
      setTab("positions");
      toast.info("Order triggered → moved to Positions");
    }

    prevOpenRef.current = openOrders;
    prevPosRef.current = positions;
  }, [openOrders, positions, tab]);



  // ---------- Action handlers ----------
  const handleCancel = async (orderId) => {
    try {
      const res = await fetch(`${API}/orders/cancel/${orderId}`, { method: "POST" });
      if (res.ok) {
        toast.success("Order cancelled ✅");
        loadData();
        setShowActions(false);
      } else {
        toast.error("Cancel failed ❌");
      }
    } catch {
      toast.error("Cancel error");
    }
  };

  const handleModify = (order) => {
    const side = order.type || order.order_type;

    const limitPx = toNum(order.trigger_price) ?? toNum(order.price); // ✅ use trigger_price first
    const mode = limitPx != null ? "LIMIT" : "MARKET";

    navigate(
      side === "SELL" ? `/sell/${order.script}` : `/buy/${order.script}`,
      {
        state: {
          modifyId: order.id,

          qty: order.qty,
          price: limitPx ?? "",            // ✅ correct prefill
          trigger_price: limitPx ?? null,  // ✅ optional, helps Buy.jsx
          exchange: (order.exchange || "NSE").toUpperCase(),
          segment: (order.segment || "intraday").toLowerCase(),

          stoploss: order.stoploss,
          target: order.target,
          orderMode: mode,
          fromModify: true,
          returnTo: "/orders",
          returnTab: tab === "open" ? "open" : "positions",
          // ✅ REQUIRED for backend modify_position
          short_first: Boolean(order.short_first),
          positionDatetime: selectedOrder.datetime, // ✅ anchor datetime
        },
      }
    );

    setShowActions(false);
  };


  const handleExit = (pos) => {
    if (!pos || pos.inactive) return;

    const sym = pos.symbol || pos.script;

    if ((pos.type || pos.order_type) === "BUY") {
      // BUY position -> EXIT means SELL page
      navigate(`/sell/${sym}`, {
        state: {
          fromExit: true,
          fromPosition: true,        // ✅ ADD THIS (MOST IMPORTANT)
          action: "EXIT",            // ✅ optional but recommended

          symbol: sym,
          qty: pos.qty,
          price: pos.price,
          exchange: pos.exchange || "NSE",
          segment: (pos.segment || "delivery").toLowerCase(),

          // EXIT must be MARKET only
          orderMode: "MARKET",

          // optional (Sell.jsx clears these on isExit anyway)
          stoploss: pos.stoploss,
          target: pos.target,

          returnTo: "/orders",
          returnTab: "positions",
          short_first: Boolean(pos.short_first),
          positionDatetime: pos.datetime,

        },
      });
    } else {
      // SELL position -> EXIT means BUY page
      navigate(`/buy/${sym}`, {
        state: {
          fromExit: true,
          fromPosition: true,        // ✅ ADD THIS (MOST IMPORTANT)
          action: "EXIT",            // ✅ optional but recommended

          symbol: sym,
          qty: pos.qty,
          price: pos.price,
          exchange: pos.exchange || "NSE",
          segment: (pos.segment || "delivery").toLowerCase(),

          orderMode: "MARKET",

          stoploss: pos.stoploss,
          target: pos.target,

          returnTo: "/orders",
          returnTab: "positions",
          short_first: Boolean(pos.short_first),
          positionDatetime: pos.datetime,

        },
      });
    }

    setShowActions(false);
  };


  const handleAdd = (pos) => {
    if (!pos || pos.inactive) return;
    const symbol = pos.symbol || pos.script;

    const isSellFirst = Boolean(pos.short_first);

    navigate(
      isSellFirst ? `/sell/${symbol}` : `/buy/${symbol}`,
      {
        state: {
          fromAdd: true,
          fromPosition: true,   // 🔥 IMPORTANT
          // ✅ ADD THESE:
          returnTo: "/orders",
          returnTab: "positions",
          qty: pos.qty,
          price: pos.price,
          stoploss: pos.stoploss,
          target: pos.target,
          segment: (pos.segment || "delivery").toLowerCase(),
          exchange: (pos.exchange || "NSE").toUpperCase(),
          orderMode: "MARKET",
          // ✅ NEW
          short_first: Boolean(pos.short_first),
          positionDatetime: pos.datetime,   // ✅ anchor
        },
      }
    );
  };



  const handleClose = async () => {
    if (!selectedOrder) return;
    const symbol = getSymbol(selectedOrder);
    setBusy(true);
    try {
      const payload = {
        username,
        script,
        order_type,
        qty: Number(qty),
        price: price ? Number(price) : 0,
        stoploss: stoploss ? Number(stoploss) : 0,
        target: target ? Number(target) : 0,
        segment,
        is_short,
      };

      const res = await fetch(`${API}/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to close position");
      toast.success(data.message || `Closed ${symbol} ✅`);
      setShowActions(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || "Close failed ❌");
    } finally {
      setBusy(false);
    }
  };

  const handleCloseModal = () => {
    setShowActions(false);
    setSelectedOrder(null);
  };


  // ---------- UI ----------
  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-500 ease-out`}>
      {/* BACKGROUND BLUR EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>
      <AppHeader />
      {/* ✅ Main content */}
      <div className="w-full px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-24 relative">
        {/* Page header + Tabs + Refresh button */}
        <div className="flex items-start justify-between mb-6">
          <div>
            {/*<h2 className={`text-4xl font-bold ${textClass} mb-1`}>Orders</h2>
            <p className={textSecondaryClass}>Your active trades and positions</p>*/}
            <div className={`flex p-1.5 rounded-2xl ${glassClass} w-fit mt-4 shadow-lg`}>
              {["open", "positions"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${tab === t
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : textSecondaryClass
                    }`}
                >
                  {t === "open" ? "Open Trades" : "Positions"}
                </button>
              ))}
            </div>
          </div>


        </div>

        {/* Total P&L (Positions only) */}
        {tab !== "open" && (
          <div className="mb-4 text-center">
            <div className={`inline-block px-4 py-2 ${glassClass} rounded-xl shadow text-xl font-semibold`}>
              Total P&L:{" "}
              <span
                className={
                  totalPnl >= 0
                    ? (isDark ? "text-emerald-400" : "text-emerald-600")
                    : (isDark ? "text-rose-400" : "text-rose-600")
                }
              >
                {money(totalPnl)}
              </span>

            </div>
          </div>
        )}

        {/* List Rendering */}
        {loading ? (
          <div className={`text-center ${textSecondaryClass}`}>Loading...</div>
        ) : errorMsg ? (
          <div className="text-center text-red-400">{errorMsg}</div>
        ) : ordersToShow.length === 0 ? (
          <div className={`text-center ${textSecondaryClass} mt-10`}>
            No {isOrdersTab ? "open trades" : "positions"}.
          </div>
        ) : (
          <div className="space-y-3">
            {ordersToShow.map((o, i) => {
              const script = (o.script || o.symbol || "N/A").toUpperCase();
              const q = quotes[script] || {};

              const live =
                o.inactive && o.exit_price != null
                  ? toNum(o.exit_price)
                  : toNum(q.price) ?? toNum(o.live_price) ?? toNum(o.price) ?? 0;

              const dtRaw = pickDateTime(o);
              const dt = parseDate(dtRaw);

              const side = o.type || o.order_type || "";
              const isBuy = side === "BUY";

              const entryPrice = isOrdersTab
                ? toNum(o.trigger_price) ?? toNum(o.price) ?? 0
                : toNum(o.price) ?? 0;

              const qty = toNum(o.qty) ?? 0;
              const investment = (entryPrice || 0) * (qty || 0);

              // Entry additional cost + net investment
              // Entry additional cost
              // Entry additional cost
              const entryAdditionalCost = calcAdditionalCost({
                rates,
                segment: o.segment,
                investment,
              });

              // Net Investment depends on side
              const netInvestment = isBuy
                ? (investment + entryAdditionalCost)
                : (investment - entryAdditionalCost);

              // Exit side (only if closed)
              // ✅ Exit total investment (exitPrice * qty)
              const exitInvestment =
                o.inactive && o.exit_price != null
                  ? (toNum(o.exit_price) ?? 0) * (qty || 0)
                  : 0;

              // ✅ Exit charges (tax + brokerage on exit investment)
              const exitAdditionalCost =
                o.inactive && o.exit_price != null
                  ? calcAdditionalCost({
                    rates,
                    segment: o.segment,
                    investment: exitInvestment,
                  })
                  : 0;

              // ✅ Total additional cost till exit = entry charges + exit charges
              const totalAdditionalCostTillExit =
                o.inactive && o.exit_price != null
                  ? (entryAdditionalCost + exitAdditionalCost)
                  : 0;

              // ✅ Exit Net Investment = exitInvestment - totalAdditionalCostTillExit
              const exitNetInvestment =
                o.inactive && o.exit_price != null
                  ? (exitInvestment - exitAdditionalCost)
                  : 0;
              const additionalCostToShow =
                o.inactive && o.exit_price != null
                  ? totalAdditionalCostTillExit   // ✅ entry + exit
                  : entryAdditionalCost;          // ✅ only entry for active

              // ✅ Freeze values when row becomes inactive (gray)
              let frozen = null;

              if (o.inactive && o.exit_price != null) {
                const key = closedSnapKey(who, o);

                frozen = closedSnapRef.current[key] || readClosedSnap(key);

                if (!frozen) {
                  frozen = {
                    additionalCost: totalAdditionalCostTillExit, // ✅ entry + exit
                    netInvestment,                               // ✅ freeze netInvestment at close time
                    exitNetInvestment,                           // ✅ freeze exitNetInvestment at close time
                    frozenAt: Date.now(),
                  };
                  closedSnapRef.current[key] = frozen;
                  writeClosedSnap(key, frozen);
                } else {
                  closedSnapRef.current[key] = frozen;
                }
              }

              // ✅ Use frozen values for gray rows, live values for active rows
              const displayAdditionalCost = (o.inactive && frozen) ? frozen.additionalCost : additionalCostToShow;
              const displayNetInvestment = (o.inactive && frozen) ? frozen.netInvestment : netInvestment;
              const displayExitNetInvestment = (o.inactive && frozen) ? frozen.exitNetInvestment : exitNetInvestment;


              const effectivePrice =
                o.inactive && o.exit_price != null ? toNum(o.exit_price) : live;

              // ✅ side-aware P&L (BUY and SELL both correct)
              // ✅ Net-investment based P&L (includes entry charges via netInvestment)
              const liveValue = (effectivePrice ?? 0) * (qty || 0);

              // Active row: P&L = liveValue - netInvestment (BUY)
              // Active row: P&L = netInvestment - liveValue (SELL)
              // ✅ Active row P&L (side-aware)
              const activePnl = isBuy
                ? (liveValue - netInvestment)
                : (netInvestment - liveValue); // ✅ SELL = investment - liveValue - additionalCost



              // Grey/closed row: P&L = exitNetInvestment - netInvestment (BUY)
              // Grey/closed row: P&L = netInvestment - exitNetInvestment (SELL)
              const closedPnl = isBuy
                ? (displayExitNetInvestment - displayNetInvestment)
                : (investment - exitInvestment - displayAdditionalCost);


              // ✅ This is your "script_pnl" now:
              const total = (o.inactive && o.exit_price != null) ? closedPnl : activePnl;

              // Optional: show per-share + pct using net investment base (not entryPrice base)
              const perShare = qty ? (total / qty) : 0;
              const pctBase = Math.abs(netInvestment) || 0;
              const pct = pctBase ? (total / pctBase) * 100 : 0;


              const pnlUp = total >= 0;

              const pnlColor = pnlUp
                ? (isDark ? "text-emerald-400" : "text-emerald-600")
                : (isDark ? "text-rose-400" : "text-rose-600");

              const pctColor = pnlUp
                ? (isDark ? "text-emerald-300" : "text-emerald-600")
                : (isDark ? "text-rose-300" : "text-rose-600");


              const sl = toNum(o.stoploss);
              const tgt = toNum(o.target);
              const disabledRow = !!o.inactive;

              return (
                <div
                  key={o.id ?? `${script}-${dtRaw ?? ""}-${i}`}
                  className={[
                    "rounded-[30px] p-4 sm:p-6 md:p-7 border",

                    "shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
                    "transition",
                    disabledRow
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)]",
                    isDark
                      ? "bg-[#2c447a]/85 border-white/10 backdrop-blur-xl"
                      : "bg-white/80 border-slate-200/60 backdrop-blur-xl",
                  ].join(" ")}
                  onClick={() => {
                    if (disabledRow) return;
                    setSelectedOrder(o);
                    setShowActions(true);
                  }}
                >
                  {/* ===== TOP ROW ===== */}
                  <div className="flex items-start justify-between gap-4">
                    {/* LEFT: icon + symbol + meta */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* ✅ TC glass + glow block */}
                      <div className="relative">
                        {/* glow behind */}
                        <div
                          className={[
                            "absolute -inset-2 rounded-[22px] blur-xl",
                            isBuy ? "bg-emerald-400/25" : "bg-rose-400/25",
                          ].join(" ")}
                        />

                        {/* main icon */}
                        <div
                          className={[
                            "relative w-16 h-16 rounded-[22px] text-white flex items-center justify-center",
                            "font-extrabold text-lg",
                            "shadow-[0_12px_25px_rgba(0,0,0,0.25)]",
                            isBuy
                              ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                              : "bg-gradient-to-br from-rose-400 to-rose-600",
                          ].join(" ")}
                        >
                          {(script || "NA").slice(0, 2)}


                          {/* ✅ BUY/SELL overlay */}
                          <span
                            className={[
                              "absolute -bottom-3 right-0 translate-x-1 z-10",
                              "px-2 rounded-[8px] text-[11px] font-extrabold tracking-wide",
                              "text-white shadow-md",
                              isBuy ? "bg-emerald-600" : "bg-rose-600",
                            ].join(" ")}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                        </div>

                      </div>


                      <div className="min-w-0">

                        {/* SYMBOL */}
                        <div className={`text-2xl font-extrabold ${textClass} truncate max-w-[180px] sm:max-w-none`}>
                          {script}
                        </div>


                        {/* Entry / Order Price + Qty */}
                        <div className={`mt-1 text-sm ${textSecondaryClass}`}>
                          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                            <div className="whitespace-nowrap">
                              {isOrdersTab ? "Order Price" : "Entry Price"}{" "}
                              <span className={`${isDark ? "text-cyan-200" : "text-sky-600"} font-bold`}>
                                {money(entryPrice)}
                              </span>
                            </div>

                            <span className={`hidden sm:inline ${isDark ? "text-white/35" : "text-slate-300"}`}>•</span>

                            <span
                              className={`${isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"} px-3 py-1 rounded-full text-xs font-semibold w-fit`}
                            >
                              {intval(o.qty)} Qty
                            </span>
                          </div>
                        </div>


                        {/* ✅ NSE + Segment + Chart */}
                        <div className="mt-1 flex items-center gap-2">

                          {/* NSE */}
                          <span
                            className={`inline-block px-3 py-[2px] rounded-full text-[11px] font-semibold ${isDark
                              ? "bg-white/10 text-white"
                              : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {(o.exchange || "NSE").toUpperCase()}
                          </span>

                          {/* INTRADAY / DELIVERY */}
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-[2px] rounded-full text-[11px] font-semibold tracking-wide ${(o.segment || "").toLowerCase() === "intraday"
                              ? isDark
                                ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/20"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : isDark
                                ? "bg-amber-500/20 text-amber-200 border border-amber-400/20"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                          >
                            {(o.segment || "delivery").toUpperCase()}
                          </span>

                        </div>


                      </div>

                    </div>
                    {isOrdersTab && (
                      <div className="text-right flex-shrink-0 mt-1 min-w-[140px]">


                        {/* ✅ Buy/Sell Date ABOVE "Yet to trigger" */}
                        <div className="flex flex-col items-end sm:flex-row sm:items-center sm:justify-end sm:gap-1">
                          <span>{isBuy ? "Buy Date" : "Sell Date"}</span>

                          {/* desktop dot only */}
                          <span className="hidden sm:inline">•</span>

                          {/* date/time line (mobile = next line) */}
                          <span className="tabular-nums sm:whitespace-nowrap">
                            {fmtDate(dt)} {fmtTime(dt)}
                          </span>
                        </div>



                        {/* Yet to trigger */}
                        {o.status_msg && (
                          <div className={`mt-1 text-xs ${isDark ? "text-slate-200/70" : "text-slate-500"}`}>
                            {o.status_msg}
                          </div>
                        )}

                        {/* Live price BELOW */}
                        <div
                          className={[
                            "mt-2 flex items-baseline justify-end gap-1 text-sm font-bold transition-all duration-300",
                            priceFlash[script] === "up"
                              ? "text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md"
                              : priceFlash[script] === "down"
                                ? "text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-md"
                                : isDark
                                  ? "text-cyan-200"
                                  : "text-sky-600",
                          ].join(" ")}
                        >
                          {priceFlash[script] === "up" && <span className="text-xs">▲</span>}
                          {priceFlash[script] === "down" && <span className="text-xs">▼</span>}
                          <span className="opacity-80">Live:</span>
                          <span className="tabular-nums">{money(live)}</span>
                        </div>
                      </div>
                    )}


                    {/* ✅ RIGHT: P&L exactly like Image-2 */}
                    {!isOrdersTab && (
                      <div className="text-right flex-shrink-0 mt-1 min-w-[140px]">

                        {/* ✅ Buy/Sell Date ABOVE P&L */}
                        <div className={`text-xs font-semibold ${isDark ? "text-slate-200/80" : "text-slate-500"}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end sm:gap-1">
                            <span>{isBuy ? "Buy Date" : "Sell Date"}</span>

                            {/* dot only on desktop */}
                            <span className="hidden sm:inline">•</span>

                            <span className="tabular-nums">
                              {fmtDate(dt)} {fmtTime(dt)}
                            </span>
                          </div>
                        </div>


                        {/* P&L */}
                        <div className={`mt-2 flex items-baseline justify-end gap-1 ${pnlColor}`}>
                          {pnlUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          <div className="text-2xl font-extrabold leading-none">
                            {money(total)}
                          </div>
                        </div>

                        {/* % */}
                        <div className={`mt-1 text-sm font-bold ${pctColor}`}>
                          {(perShare >= 0 ? "+" : "") + perShare.toFixed(4)} (
                          {(pct >= 0 ? "+" : "") + pct.toFixed(2)}%)
                        </div>

                        {/* Live */}
                        <div className={`mt-2 text-sm font-bold ${isDark ? "text-cyan-200" : "text-sky-600"}`}>
                          Live: {money(o.inactive && o.exit_price != null ? o.exit_price : live)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ===== BOTTOM GLASS PANEL (mobile swipe) ===== */}
                  <div
                    className={[
                      "mt-4 rounded-2xl px-3 sm:px-5 py-3",
                      // mobile: scroll row
                      "flex gap-3 overflow-x-auto hide-scrollbar",
                      // desktop: equal-width columns
                      "sm:grid sm:overflow-visible sm:gap-6 sm:items-stretch",
                      // ✅ equal width columns (important)
                      "sm:[grid-auto-columns:1fr]",
                      o.inactive && o.exit_price != null ? "sm:grid-cols-7" : "sm:grid-cols-5",
                      isDark
                        ? "bg-white/5 border border-white/10"
                        : "bg-slate-50/70 border border-slate-200/50",
                    ].join(" ")}
                  >



                    {/* Stop Loss */}
                    <div className="flex-shrink-0 min-w-[140px] sm:min-w-0">
                      <div className={`text-xs font-semibold ${textSecondaryClass}`}>Stop Loss</div>
                      <div className="mt-1 text-lg sm:text-xl font-extrabold text-rose-400 whitespace-nowrap">
                        {money(sl ?? 0)}
                      </div>
                    </div>

                    {/* Target */}
                    <div className="flex-shrink-0 min-w-[140px] sm:min-w-0">
                      <div className={`text-xs font-semibold ${textSecondaryClass}`}>Target</div>
                      <div className="mt-1 text-lg sm:text-xl font-extrabold text-emerald-400 whitespace-nowrap">
                        {money(tgt ?? 0)}
                      </div>
                    </div>

                    {/* Investment */}
                    <div className="flex-shrink-0 min-w-[170px] sm:min-w-0">
                      <div className={`text-xs font-semibold ${textSecondaryClass}`}>Investment</div>
                      <div className={`mt-1 text-lg sm:text-xl font-extrabold ${textClass} whitespace-nowrap`}>
                        {money(investment)}
                      </div>
                    </div>

                    {/* Additional Cost */}
                    <div className="flex-shrink-0 min-w-[170px] sm:min-w-0">
                      <div className={`text-xs font-semibold ${textSecondaryClass}`}>Additional Cost</div>
                      <div className={`mt-1 text-lg sm:text-xl font-extrabold ${isDark ? "text-cyan-200" : "text-sky-600"} whitespace-nowrap`}>
                        {money(displayAdditionalCost)}
                      </div>
                    </div>

                    {/* Net Investment */}
                    <div className="flex-shrink-0 min-w-[190px] sm:min-w-0">
                      <div className={`text-xs font-semibold ${textSecondaryClass}`}>Net Investment</div>
                      <div className={`mt-1 text-lg sm:text-xl font-extrabold ${textClass} whitespace-nowrap`}>
                        {money(displayNetInvestment)}
                      </div>
                    </div>





                    {/* ✅ Exit Price — SAME ROW (only for inactive rows) */}
                    {o.inactive && o.exit_price != null && (
                      <>
                        {/* Exit Price */}
                        <div className="flex-shrink-0 min-w-[170px] sm:min-w-0">
                          <div className={`text-xs font-semibold ${textSecondaryClass}`}>Exit Price</div>
                          <div
                            className={`mt-1 text-lg sm:text-xl font-extrabold ${isDark ? "text-cyan-200" : "text-sky-600"
                              } whitespace-nowrap`}
                          >
                            {money(o.exit_price)}
                          </div>
                        </div>

                        {/* Exit Net Investment */}
                        <div className="flex-shrink-0 min-w-[190px] sm:min-w-0">
                          <div className={`text-xs font-semibold ${textSecondaryClass} whitespace-nowrap`}>
                            Exit Net Investment
                          </div>

                          <div
                            className={`mt-1 text-lg sm:text-xl font-extrabold ${isDark ? "text-amber-200" : "text-amber-700"
                              } whitespace-nowrap`}
                          >
                            {money(displayExitNetInvestment)}
                          </div>
                        </div>
                      </>
                    )}




                  </div>

                  {/* Optional bottom-right status (only if exists) */}


                </div>
              );

            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {/* Modal (Portfolio-style detailed modal) */}
      {showActions && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Card */}
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div
              className={[
                "relative overflow-hidden rounded-3xl shadow-2xl",
                isDark
                  ? "bg-white/5 border border-white/10 backdrop-blur-xl"
                  : "bg-white/70 border border-white/50 backdrop-blur-xl",
                textClass,
              ].join(" ")}
            >
              {/* Decorative gradient glow */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl" />

              {(() => {
                const sym = getSymbol(selectedOrder);
                const q = (sym && quotes[sym]) || {};

                const live =
                  selectedOrder?.inactive && selectedOrder?.exit_price != null
                    ? toNum(selectedOrder.exit_price)
                    : (toNum(q.price) ?? toNum(selectedOrder.live_price) ?? toNum(selectedOrder.price) ?? 0);

                const isBuy = (selectedOrder.type || selectedOrder.order_type) === "BUY";

                // Entry/Order price
                const entryPrice =
                  isOrdersTab
                    ? (toNum(selectedOrder.trigger_price) ?? toNum(selectedOrder.price) ?? 0)
                    : (toNum(selectedOrder.price) ?? 0);

                // P&L per share (only meaningful for positions tab)
                const perShare =
                  !isOrdersTab && entryPrice && live
                    ? (isBuy ? (live - entryPrice) : (entryPrice - live))
                    : 0;

                return (
                  <>
                    {/* Header */}
                    <div className="relative z-10 p-6 border-b border-white/10">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            {sym}
                          </h2>
                          <p className={`text-sm ${textSecondaryClass} mt-1`}>
                            {isOrdersTab ? "Order Details" : "Position Details"}
                          </p>
                        </div>

                        <button
                          onClick={handleCloseModal}
                          className={`${glassClass} p-2 rounded-xl ${cardHoverClass} transition-all hover:rotate-90 duration-300`}
                          title="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className={`text-3xl font-extrabold ${textClass}`}>
                          {money(live)}
                        </div>

                        {/* 📊 Chart icon beside Live */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sym = getSymbol(selectedOrder);
                            if (!sym) return;
                            navigate(`/chart/${sym}`);
                            setShowActions(false); // optional: close modal after navigating
                          }}
                          title="View Chart"
                          aria-label="View Chart"
                          className={`p-2 rounded-full transition
      hover:scale-105 active:scale-95
      ${isDark
                              ? "bg-white/10 hover:bg-white/20 text-white"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                            }`}
                        >
                          <BarChart2 size={18} />
                        </button>
                      </div>

                    </div>

                    {/* Info Card (inner glass) */}
                    <div className="relative z-10 p-6">
                      <div className={`${glassClass} rounded-2xl p-5 space-y-3`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textSecondaryClass}`}>Qty</span>
                          <span className="font-semibold">{intval(selectedOrder.qty)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textSecondaryClass}`}>
                            {isOrdersTab ? "Order Price" : "Entry Price"}
                          </span>
                          <span className="font-semibold">{money(entryPrice)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textSecondaryClass}`}>Stoploss</span>
                          <span className="font-semibold">{money(selectedOrder.stoploss ?? 0)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textSecondaryClass}`}>Target</span>
                          <span className="font-semibold">{money(selectedOrder.target ?? 0)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textSecondaryClass}`}>Exchange</span>
                          <span className="font-semibold">{(selectedOrder.exchange || "NSE").toUpperCase()}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${textSecondaryClass}`}>Segment</span>
                          <span className="font-semibold">{(selectedOrder.segment || "delivery").toUpperCase()}</span>
                        </div>

                        {/* P&L / Share (positions only) */}
                        {!isOrdersTab && (
                          <div className="flex justify-between items-center pt-3 border-t border-white/10">
                            <span className={`text-sm ${textSecondaryClass}`}>P&amp;L / Share</span>
                            <span
                              className={`font-semibold ${perShare >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                            >
                              {money(perShare)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (keep your existing logic) */}
                    <div className="relative z-10 px-6 pb-6">
                      {isOrdersTab ? (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleModify(selectedOrder)}
                            className="py-3 rounded-xl font-semibold text-white
                        bg-gradient-to-r from-blue-500 to-cyan-500
                        hover:from-blue-600 hover:to-cyan-600
                        shadow-lg hover:shadow-blue-500/30 transition"
                          >
                            Modify
                          </button>

                          <button
                            disabled={busy}
                            onClick={() => handleCancel(selectedOrder.id)}   // ✅ correct
                            className={`py-3 rounded-xl font-semibold
    bg-white/10 hover:bg-white/15 border border-white/10
    shadow-lg transition
    ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
                            title="Cancel"
                          >
                            Cancel
                          </button>

                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            disabled={isInactiveSel}
                            onClick={() => {
                              if (isInactiveSel) return;
                              handleAdd(selectedOrder);
                              setShowActions(false);
                            }}
                            className={`py-3 rounded-xl font-semibold text-white
    bg-gradient-to-r from-emerald-500 to-green-600
    hover:from-emerald-600 hover:to-green-700
    shadow-lg hover:shadow-emerald-500/25 transition
    ${isInactiveSel ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                          >
                            Add
                          </button>

                          <button
                            disabled={isInactiveSel}
                            onClick={() => {
                              if (isInactiveSel) return;

                              const side = selectedOrder.type || selectedOrder.order_type;

                              navigate(
                                side === "BUY"
                                  ? `/buy/${selectedOrder.script}`
                                  : `/sell/${selectedOrder.script}`,
                                {
                                  state: {
                                    fromPosition: true,
                                    fromModify: true,

                                    short_first: Boolean(selectedOrder.short_first),
                                    positionDatetime: selectedOrder.datetime,

                                    qty: selectedOrder.qty,
                                    price: selectedOrder.price,
                                    stoploss: selectedOrder.stoploss,
                                    target: selectedOrder.target,
                                    segment: (selectedOrder.segment || "delivery").toLowerCase(),
                                    exchange: (selectedOrder.exchange || "NSE").toUpperCase(),
                                    orderMode: "MARKET",

                                    returnTo: "/orders",
                                    returnTab: "positions",
                                  },
                                }
                              );

                              setShowActions(false);
                            }}
                            className={`py-3 rounded-xl font-semibold text-white
    bg-gradient-to-r from-blue-500 to-indigo-600
    hover:from-blue-600 hover:to-indigo-700
    shadow-lg hover:shadow-blue-500/25 transition
    ${isInactiveSel ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                          >
                            Modify
                          </button>
                          <button
                            disabled={isInactiveSel}
                            onClick={() => {
                              if (isInactiveSel) return;
                              handleExit(selectedOrder);
                            }}
                            className={`py-3 rounded-xl font-semibold text-white
    bg-gradient-to-r from-rose-500 to-red-600
    hover:from-rose-600 hover:to-red-700
    shadow-lg hover:shadow-red-500/25 transition
    ${isInactiveSel ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                          >
                            Exit
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
