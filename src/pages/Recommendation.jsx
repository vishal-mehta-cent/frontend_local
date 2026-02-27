import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  startTransition,
  useLayoutEffect,
} from "react";
import "./Recommendations.css";
import SignalCard from "../components/SignalCard";
import BackButton from "../components/BackButton";
import SwipeNav from "../components/SwipeNav";
import { Moon, Sun, Sparkles, User, RefreshCw } from "lucide-react";

import CustomDropdown from "../components/CustomDropdown";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import HeaderActions from "../components/HeaderActions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // base
import "./datepicker-neurocrest.css"; // ✅ same file used in History
import AppHeader from "../components/AppHeader";

const AccuracyGauge = ({ value, label }) => {
  const v = Math.max(0, Math.min(100, value));
  const angle = 180 - (v / 100) * 180;

  const needleX = 70 + 45 * Math.cos((Math.PI / 180) * angle);
  const needleY = 80 - 45 * Math.sin((Math.PI / 180) * angle);

  return (
    <svg
      width="140"
      height="120"
      viewBox="0 0 140 120"
      className="accuracy-gauge"
    >
      {/* RED zone */}
      <path
        d="M10 80 A60 60 0 0 1 50 20"
        fill="none"
        stroke="#d9534f"
        strokeWidth="12"
      />

      {/* YELLOW */}
      <path
        d="M50 20 A60 60 0 0 1 90 20"
        fill="none"
        stroke="#f0ad4e"
        strokeWidth="12"
      />

      {/* GREEN */}
      <path
        d="M90 20 A60 60 0 0 1 130 80"
        fill="none"
        stroke="#5cb85c"
        strokeWidth="12"
      />

      {/* Needle */}
      <line
        x1="70"
        y1="80"
        x2={needleX}
        y2={needleY}
        stroke="black"
        strokeWidth="3"
      />

      {/* Dot */}
      <circle cx="70" cy="80" r="4" fill="black" />

      {/* % Value */}
      <text
        x="70"
        y="100"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#000"
      >
        {value.toFixed(2)}%
      </text>

      {/* Label */}
      <text
        x="70"
        y="115"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="#0d47a1"
      >
        {label}
      </text>
    </svg>
  );
};

export default function Recommendations() {
  const [rows, setRows] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [priceRefreshing, setPriceRefreshing] = useState(false);
  const [lastPriceUpdatedAt, setLastPriceUpdatedAt] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ hydrate access state from the daily subscription cache written by RequireSubscription.jsx
  const initialAccess = (() => {
    const username = (localStorage.getItem("username") || "")
      .trim()
      .toLowerCase();

    try {
      const raw = localStorage.getItem("nc_sub_cache_v1");
      const c = raw ? JSON.parse(raw) : null;

      const fresh =
        c &&
        (c.userId || "").toLowerCase() === username &&
        typeof c.nextCheckAtMs === "number" &&
        Date.now() < c.nextCheckAtMs;

      if (fresh) {
        return {
          locked: !!c.isLocked,
          checked: true, // ✅ already checked today
          hasAccess: !c.isLocked,
        };
      }
    } catch {}

    return { locked: true, checked: false, hasAccess: false };
  })();

  const [locked, setLocked] = useState(() => initialAccess.locked);
  const [accessChecked, setAccessChecked] = useState(() => initialAccess.checked);
  const hasAccessRef = useRef(initialAccess.hasAccess);

  // ✅ used for live price polling on active signals
  const activeSymbolsRef = useRef([]);

  const [segment, setSegment] = useState("Equity");
  const [selectedScreener, setSelectedScreener] = useState("All");
  const [screenerList, setScreenerList] = useState([]);

  const [selectedAlertType, setSelectedAlertType] = useState("All");
  const [alertTypeList, setAlertTypeList] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [activeType, setActiveType] = useState("Intraday");
  const [signalTab, setSignalTab] = useState("active"); // "active" | "closed"

  const [subIntraday, setSubIntraday] = useState("All");
  const [priceCloseFilter, setPriceCloseFilter] = useState("All");
  const [priceCloseList, setPriceCloseList] = useState(["All"]);

  // ✅ NEW: Date sort order (DESC = newest first, ASC = oldest first)
  const [dateSortOrder, setDateSortOrder] = useState("desc"); // "asc" | "desc"

  const { isDark, toggle } = useTheme();

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

  const [closedPriceMap, setClosedPriceMap] = useState({});

  const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
    .toString()
    .replace(/\/+$/, "");

  const toNum = (v) => {
    if (v === null || v === undefined) return undefined;
    const n = Number.parseFloat(
      typeof v === "string" ? v.replace(/[, ]/g, "") : v
    );
    return Number.isFinite(n) ? n : undefined;
  };

  const normalizeToISODate = (raw) => {
    if (!raw) return "";

    const s = String(raw).trim();

    // ✅ ISO with or without time: 2025-12-15 OR 2025-12-15 12:45:00
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      return `${yyyy}-${mm}-${dd}`;
    }

    // ✅ MM/DD/YYYY or MM/DD/YYYY HH:MM AM
    const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) {
      const [, mm, dd, yyyy] = m;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }

    return "";
  };

  const getField = (row, candidates) => {
    if (!row) return undefined;
    const norm = (s) =>
      String(s || "").replace(/\s+/g, "").replace(/[_-]/g, "").toLowerCase();
    const map = {};
    for (const k of Object.keys(row)) map[norm(k)] = k;
    for (const c of candidates) {
      const hit = map[norm(c)];
      if (hit !== undefined) return row[hit];
    }
    return undefined;
  };

  const pickConfidence = (r) => {
    let raw = getField(r, [
      "backtest_accuracy",
      "backtestaccuracy",
      "accuracy",
      "%accuracy",
      "confidence",
    ]);

    if (!raw) return null;
    if (typeof raw === "string") raw = raw.replace("%", "").trim();

    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const pickSignalPrice = (r) =>
    toNum(
      getField(r, ["signal_price", "close_price", "Signal_price", "Signal Price"])
    );

  const pickCurrentPrice = (r) => toNum(r.currentPrice);

  const pickStoploss = (r) =>
    toNum(getField(r, ["stoploss", "Stoploss", "fno_stoploss", "FNO_stoploss"]));

  const pickTarget = (r) =>
    toNum(getField(r, ["target", "Target", "fno_target", "FNO_target"]));

  const pickSupport = (r) =>
    toNum(getField(r, ["support", "Support", "sup", "SUP"]));

  const pickResistance = (r) =>
    toNum(getField(r, ["resistance", "Resistance", "res", "RES"]));

  const pickAlertType = (r) =>
    getField(r, ["signal_type", "Signal_type"]) || "N/A";

  const pickDescription = (r) =>
    getField(r, ["Alert_description", "description", "Description"]) || "";

  const pickScript = (r) => {
    let s = getField(r, ["script", "Script", "symbol", "Symbol"]);
    return s ? String(s).trim() : "N/A";
  };

  const pickScreener = (r) =>
    getField(r, ["screener", "Screener"]) || "Unknown";

  const pickRawDate = (r) =>
    getField(r, ["raw_datetime", "Date", "date", "signal_date"]);

  const pickTime = (row) => {
    const raw = getField(row, ["raw_datetime", "Date", "date", "signal_date"]);
    if (!raw) return "--:--";

    const match = String(raw).match(/(\d{1,2}):(\d{2})/);
    if (!match) return "--:--";

    let hour = parseInt(match[1], 10);
    const minute = match[2];

    // 🟢 KEY FIX:
    // Many Short-term rows have time stored as 00:00.
    // Instead of showing 12:00, treat that as "no specific time".
    if (hour === 0 && minute === "00") {
      return "--:--";
    }

    const ampm = hour >= 12 ? "PM" : "AM";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;

    return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  };

  const pickStrategy = (r) => {
    let raw = getField(r, ["Strategy", "strategy"]) || "";
    raw = String(raw).trim().toLowerCase();

    // handle all variants coming from CSV/backend
    // ex: "Intraday - Fast Alerts", "Intraday Fast Alerts", "INTRADAY_FAST_ALERTS"
    if (raw.includes("intraday") && raw.includes("fast")) return "intraday-fast";
    if (raw.includes("intraday")) return "intraday";
    if (raw.includes("btst")) return "btst";
    if (raw.includes("short")) return "short-term";

    return raw;
  };

  const pickAlertText = (r) =>
    getField(r, ["alert", "ALERT", "Alert"]) || "";

  const pickUserActions = (r) => getField(r, ["user_actions"]) || "";

  const pickPriceCloseTo = (r) =>
    (getField(r, ["price_closeto", "price_close_to"]) || "").toString().trim();

  async function fetchLivePrice(script) {
    try {
      const res = await fetch(
        `${API}/quotes/price?symbol=${encodeURIComponent(script)}`
      );
      const json = await res.json();

      return Number(
        json?.price || json?.ltp || json?.last_price || json?.currentPrice
      );
    } catch (e) {
      console.error("Live price error for:", script, e);
      return null;
    }
  }

  // ----------------------------------------------------
  // NORMALIZE FUNCTION (FINAL — ONLY CSV decides open/closed)
  // ----------------------------------------------------
  const normalize = (row) => {
    const script = pickScript(row);

    const sigPrice = pickSignalPrice(row);

    // ---- CSV close price ----
    let csvCloseRaw = getField(row, ["signal_closing_price"]);
    let csvClose = Number(csvCloseRaw);
    if (isNaN(csvClose)) csvClose = null;

    // ---- CSV close time ----
    const csvCloseTime = getField(row, ["close_time"]) || "";

    // -------------------------------
    // FINAL ACTIVE / CLOSED LOGIC
    // -------------------------------
    const isClosed = csvClose !== null && csvClose > 0;
    const isActive = !isClosed;

    // Freeze price for CLOSED, Live price for ACTIVE
    let live = pickCurrentPrice(row);
    const currentPrice = isClosed ? csvClose : live;

    const sup = pickSupport(row);
    const st = pickStoploss(row);
    const t = pickTarget(row);
    const res = pickResistance(row);

    const strategy = pickStrategy(row);

    // ✅ FULL datetime (date + time) — DO NOT MODIFY
    const rawDateTime = getField(row, [
      "raw_datetime",
      "signal_date",
      "Date",
      "date",
    ]);

    // ✅ Date only (used for date filter dropdown)
    const dateVal = normalizeToISODate(rawDateTime);

    const timeVal = pickTime(row);
    const alertText = pickAlertText(row);
    const userActions = pickUserActions(row);
    const priceCloseTo = pickPriceCloseTo(row);

    // outcome only needed to visually color closed blocks
    const outcome = isClosed ? "CLOSED" : null;

    return {
      id: `${script}-${dateVal}-${sigPrice}`,
      script,
      screener: pickScreener(row),
      alertType: pickAlertType(row),
      confidence: pickConfidence(row),
      description: pickDescription(row),
      strategy,
      sup,
      st,
      t,
      res,
      signalPrice: sigPrice,
      currentPrice,
      outcome,
      isClosed,

      // 🔥 CRITICAL FIELDS
      dateVal, // YYYY-MM-DD → for filtering
      rawDateTime, // YYYY-MM-DD HH:MM:SS → for sorting

      timeVal,
      alertText,
      userActions,
      priceCloseTo,
      closeTime: csvCloseTime,
    };
  };

  // ----------------------------------------------------
  // FETCH RECOMMENDATION DATA ONCE (NO AUTO-POLLING)
  // ----------------------------------------------------
  const fetchRecommendationsOnce = async ({ mergeOnlyPrices = false } = {}) => {
    const username = (localStorage.getItem("username") || "").trim();

    if (!username) {
      setLocked(true);
      if (!mergeOnlyPrices) setRows([]);
      setInitialLoading(false);
      setAccessChecked(true);
      return;
    }

    const res = await fetch(
      `${API}/recommendations/data?username=${encodeURIComponent(
        username
      )}&ts=${Date.now()}`,
      { cache: "no-store" }
    );

    setAccessChecked(true);

    if (res.status === 403 || res.status === 401) {
      setLocked(true);
      if (!mergeOnlyPrices) setRows([]);
      setInitialLoading(false);
      return;
    }

    if (res.status === 404) {
      setLocked(false);
      if (!mergeOnlyPrices) setRows([]);
      setInitialLoading(false);
      return;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("recommendations/data failed:", res.status, errText);

      if (!hasAccessRef.current) {
        setLocked(true);
        if (!mergeOnlyPrices) setRows([]);
      }
      setInitialLoading(false);
      return;
    }

    const json = await res.json();
    hasAccessRef.current = true;
    setLocked(false);

    const normalized = (Array.isArray(json) ? json : []).map(normalize);

    // ✅ Only refresh LIVE PRICES, keep signals stable
    if (mergeOnlyPrices) {
      const priceById = new Map();
      const priceByScript = new Map();

      for (const r of normalized) {
        if (r?.id) priceById.set(r.id, r.currentPrice);
        if (r?.script) priceByScript.set(r.script, r.currentPrice);
      }

      setRows((prev) =>
        (prev || []).map((r) => {
          if (!r || r.isClosed) return r; // ✅ refresh only ACTIVE cards
          const nextPrice = priceById.get(r.id) ?? priceByScript.get(r.script);
          return nextPrice === undefined ? r : { ...r, currentPrice: nextPrice };
        })
      );

      setLastPriceUpdatedAt(Date.now());
      return;
    }

    // ✅ Full load only on page open
    const seen = new Set();
    const ordered = [];

    for (const r of normalized) {
      if (!r.script || r.script === "N/A") continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      ordered.push(r);
    }

    const uniqueScreeners = ["All", ...new Set(ordered.map((r) => r.screener))];
    const uniqueAlertTypes = ["All", ...new Set(ordered.map((r) => r.alertType))];
    const uniquePriceCloseTo = [
      "All",
      ...new Set(ordered.map((r) => r.priceCloseTo).filter(Boolean)),
    ];

    startTransition(() => {
      setScreenerList(uniqueScreeners);
      setAlertTypeList(uniqueAlertTypes);
      setPriceCloseList(uniquePriceCloseTo);
      setRows(ordered);
      setInitialLoading(false);
    });

    setLastPriceUpdatedAt(Date.now());
  };

  // ✅ manual refresh button: fetch ONLY prices once
  const onRefreshPrices = async () => {
    if (priceRefreshing) return;

    try {
      setPriceRefreshing(true);
      await fetchRecommendationsOnce({ mergeOnlyPrices: true }); // ✅ price only
    } catch (e) {
      console.error("Price refresh failed:", e);
    } finally {
      setPriceRefreshing(false);
    }
  };

  // =====================================================
  // ✅ FIX: prevent scroll jumping on tab changes
  // =====================================================
  const scrollYBeforeSwitchRef = useRef(0);
  const restoringScrollRef = useRef(false);

  const setSignalTabKeepScroll = (nextTab) => {
    // Save current position, then switch tab
    scrollYBeforeSwitchRef.current =
      window.scrollY || document.documentElement.scrollTop || 0;
    restoringScrollRef.current = true;
    setSignalTab(nextTab);
  };

  const setActiveTypeKeepScroll = (nextType) => {
    scrollYBeforeSwitchRef.current =
      window.scrollY || document.documentElement.scrollTop || 0;
    restoringScrollRef.current = true;

    setActiveType(nextType);
    setSubIntraday("All");
    setSignalTab("active");
  };

  // Restore scroll immediately after React commits DOM updates
  useLayoutEffect(() => {
    if (!restoringScrollRef.current) return;

    restoringScrollRef.current = false;

    const y = scrollYBeforeSwitchRef.current || 0;

    // 2 RAFs makes it stable in mobile chrome
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: "auto" });
      });
    });
  }, [signalTab, activeType]);

  useEffect(() => {
    // Hydrate filters from URL only on first mount
    const qpSegment = searchParams.get("segment");
    const qpScreener = searchParams.get("screener");
    const qpAlertType = searchParams.get("alertType");
    const qpDate = searchParams.get("date");
    const qpActiveType = searchParams.get("type"); // Intraday/BTST/Short-term
    const qpSubIntraday = searchParams.get("subIntraday");
    const qpPriceClose = searchParams.get("priceClose");
    const qpTab = searchParams.get("tab"); // active/closed
    const qpSort = searchParams.get("sort"); // ✅ asc/desc

    if (qpSegment) setSegment(qpSegment);
    if (qpScreener) setSelectedScreener(qpScreener);
    if (qpAlertType) setSelectedAlertType(qpAlertType);
    if (qpDate) setSelectedDate(qpDate);
    if (qpActiveType) setActiveType(qpActiveType);
    if (qpSubIntraday) setSubIntraday(qpSubIntraday);
    if (qpPriceClose) setPriceCloseFilter(qpPriceClose);
    if (qpTab) setSignalTab(qpTab);
    if (qpSort === "asc" || qpSort === "desc") setDateSortOrder(qpSort);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    next.set("segment", segment || "Equity");
    next.set("screener", selectedScreener || "All");
    next.set("alertType", selectedAlertType || "All");
    next.set("date", selectedDate || "");
    next.set("type", activeType || "Intraday");
    next.set("subIntraday", subIntraday || "All");
    next.set("priceClose", priceCloseFilter || "All");
    next.set("tab", signalTab || "active");
    next.set("sort", dateSortOrder || "desc"); // ✅ keep sort in URL

    // remove empty date to keep URL clean
    if (!selectedDate) next.delete("date");

    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    segment,
    selectedScreener,
    selectedAlertType,
    selectedDate,
    activeType,
    subIntraday,
    priceCloseFilter,
    signalTab,
    dateSortOrder,
  ]);

  // ✅ fetch once when page opens (NO polling)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await fetchRecommendationsOnce({ mergeOnlyPrices: false }); // ✅ full load once
      } catch (e) {
        console.error("Fetch failed:", e);
        if (!alive) return;
        setAccessChecked(true);
        if (!hasAccessRef.current) {
          setLocked(true);
          setRows([]);
        }
        setInitialLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  // -------------------------------------------------------
  // FILTERING
  // -------------------------------------------------------
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // ✅ DATE FILTER (FINAL FIX)
      let matchDate = true;

      if (selectedDate) {
        console.log(
          "📅 DATE FILTER →",
          "selectedDate (ISO):",
          selectedDate,
          "| row.dateVal:",
          r.dateVal
        );
        matchDate = r.dateVal === selectedDate;
      }

      // DEBUG (keep this for now)
      console.log(
        "DATE CHECK → selected:",
        selectedDate,
        "| row.dateVal:",
        r.dateVal,
        "| row.rawDateTime:",
        r.rawDateTime,
        "| match:",
        matchDate
      );

      // ✅ SCREENER
      const matchScreener =
        selectedScreener === "All" ||
        (r.screener || "").toLowerCase() === selectedScreener.toLowerCase();

      // ✅ ALERT TYPE
      const matchAlert =
        selectedAlertType === "All" ||
        (r.alertType || "").toLowerCase() === selectedAlertType.toLowerCase();

      // ✅ MAIN TAB STRATEGY
      let matchStrategy = false;
      if (activeType === "Intraday") {
        matchStrategy = ["intraday", "intraday-fast"].includes(r.strategy);
      } else if (activeType === "BTST") {
        matchStrategy = r.strategy === "btst";
      } else if (activeType === "Short-term") {
        matchStrategy = r.strategy === "short-term";
      }

      // ✅ Intraday subtype
      let matchSub = true;
      if (activeType === "Intraday") {
        if (subIntraday === "Intraday") matchSub = r.strategy === "intraday";
        else if (subIntraday === "Intraday - Fast Alerts")
          matchSub = r.strategy === "intraday-fast";
      }

      // ✅ Price Close To
      const matchPriceClose =
        priceCloseFilter === "All" ||
        (r.priceCloseTo || "")
          .toLowerCase()
          .includes(priceCloseFilter.toLowerCase());

      return (
        matchDate &&
        matchScreener &&
        matchAlert &&
        matchStrategy &&
        matchSub &&
        matchPriceClose
      );
    });
  }, [
    rows,
    selectedDate,
    selectedScreener,
    selectedAlertType,
    activeType,
    subIntraday,
    priceCloseFilter,
  ]);

  // -------------------------------------------------------
  // ACTIVE & CLOSED SIGNALS
  // -------------------------------------------------------
  const activeSignals = useMemo(() => {
    const dir = dateSortOrder === "asc" ? 1 : -1;

    return filteredRows
      .filter((r) => !r.outcome)
      .sort((a, b) => {
        // Sort ONLY by date (YYYY-MM-DD)
        const d = String(a.dateVal || "").localeCompare(String(b.dateVal || ""));
        if (d !== 0) return d * dir;

        // optional tie-breaker (keeps same-day order stable without Date parsing)
        return (
          String(a.rawDateTime || "").localeCompare(String(b.rawDateTime || "")) *
          dir
        );
      })
      .slice(0, 30);
  }, [filteredRows, dateSortOrder]);

  // ✅ keep a stable list of active symbols for polling
  useEffect(() => {
    activeSymbolsRef.current = Array.from(
      new Set(
        (activeSignals || [])
          .map((s) => (s?.script || "").toUpperCase())
          .filter(Boolean)
      )
    );
  }, [activeSignals]);

  // ✅ Live price polling (same behaviour as Watchlist)
  // Updates ONLY ACTIVE cards; closed cards stay frozen at close price
  useEffect(() => {
    if (locked) return;

    let mounted = true;

    async function pollOnce() {
      const syms = activeSymbolsRef.current || [];
      if (!syms.length) return;

      try {
        const res = await fetch(
          `${API}/quotes?symbols=${encodeURIComponent(
            syms.join(",")
          )}&ts=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!res.ok) return;
        const json = await res.json();

        const priceMap = new Map();
        if (Array.isArray(json)) {
          for (const q of json) {
            const s = (q?.symbol || "").toUpperCase();
            const p = toNum(q?.price);
            if (s && p !== undefined) priceMap.set(s, p);
          }
        }

        if (!mounted) return;

        setRows((prev) =>
          (prev || []).map((r) => {
            if (!r || r.isClosed) return r;
            const s = (r.script || "").toUpperCase();
            const p = priceMap.get(s);
            if (p === undefined) return r;
            if (r.currentPrice === p) return r;
            return { ...r, currentPrice: p };
          })
        );

        setLastPriceUpdatedAt(Date.now());
      } catch (e) {
        // keep silent — UI should not flicker
        // console.error("Recommendations live price poll error:", e);
      }
    }

    // run immediately + then every 3s
    pollOnce();
    const id = setInterval(pollOnce, 3000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, locked]);

  console.table(
    activeSignals.map((s) => ({
      script: s.script,
      rawDateTime: s.rawDateTime,
      time: s.timeVal,
    }))
  );

  const closedSignals = useMemo(() => {
    const dir = dateSortOrder === "asc" ? 1 : -1;

    return filteredRows
      .filter((r) => r.outcome)
      .sort((a, b) => {
        const ta = new Date(a.rawDateTime).getTime();
        const tb = new Date(b.rawDateTime).getTime();
        return (ta - tb) * dir;
      });
  }, [filteredRows, dateSortOrder]);

  // -------------------------------------------------------
  // BUY/SELL COUNTS
  // -------------------------------------------------------
  const totalBuySignals = activeSignals.filter(
    (r) => String(r.alertType).toLowerCase() === "buy"
  ).length;

  const totalSellSignals = activeSignals.filter(
    (r) => String(r.alertType).toLowerCase() === "sell"
  ).length;

  // -------------------------------------------------------
  // BUY / SELL Closed Signals
  // -------------------------------------------------------
  const buyClosedSignals = closedSignals.filter(
    (s) => String(s.alertType).toLowerCase() === "buy"
  );

  const sellClosedSignals = closedSignals.filter(
    (s) => String(s.alertType).toLowerCase() === "sell"
  );

  // ⭐ NEW ACCURACY CALCULATION ⭐
  // Accuracy = (Number of PROFIT signals / Total signals) × 100
  const computeAccuracy = (list) => {
    if (!list.length) return 0;

    const profitCount = list.filter(
      (s) => String(s.outcome).toUpperCase() === "PROFIT"
    ).length;

    const accuracy = (profitCount / list.length) * 100;

    return Number.isFinite(accuracy) ? accuracy : 0;
  };

  // BUY accuracy
  const buyClosedAccuracy = computeAccuracy(buyClosedSignals);

  // SELL accuracy
  const sellClosedAccuracy = computeAccuracy(sellClosedSignals);

  // COUNTS for showing below the speedometer
  const buyClosedCount = buyClosedSignals.length;
  const sellClosedCount = sellClosedSignals.length;

  // ✅ Show locked screen ONLY after access is confirmed
  if (locked && accessChecked) {
    return (
      <div
        className={`min-h-screen ${bgClass} ${textClass} flex items-center justify-center p-6`}
      >
        <div
          className={`${glassClass} rounded-3xl p-8 max-w-md w-full text-center shadow-2xl`}
        >
          <h2 className="text-2xl font-bold mb-2">Recommendations Locked</h2>

          <p className={`${textSecondaryClass} mb-6`}>
            This feature is enabled only for approved users.
          </p>

          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1ea7ff] to-[#22d3ee] text-white font-semibold shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ STICKY refresh button component (used under Active Signals title)
  const StickyRefreshBar = () => (
    <div
      style={{
        position: "sticky",
        top: "86px", // ✅ adjust if your AppHeader height is different
        zIndex: 50,
        paddingTop: "8px",
        paddingBottom: "8px",
        marginBottom: "8px",
        background: isDark ? "rgba(2,6,23,0.35)" : "rgba(255,255,255,0.35)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "10px",
          padding: "6px 8px",
        }}
      >
        {lastPriceUpdatedAt ? (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              opacity: isDark ? 0.85 : 0.8,
              whiteSpace: "nowrap",
            }}
          >
            Updated:{" "}
            {new Date(lastPriceUpdatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        ) : null}

        <button
          onClick={onRefreshPrices}
          disabled={priceRefreshing || locked || initialLoading}
          className={[
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
            "transition-all duration-200 border shadow-sm",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
            priceRefreshing
              ? "opacity-70 cursor-not-allowed"
              : "hover:scale-[1.02] active:scale-[0.98]",
            isDark
              ? "bg-white/10 border-white/10 text-white hover:bg-white/15"
              : "bg-white/80 border-slate-200/60 text-slate-900 hover:bg-white",
          ].join(" ")}
          title="Refresh live price"
          type="button"
        >
          <RefreshCw
            className={`w-4 h-4 ${priceRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
    </div>
  );

  // -------------------------------------------------------
  // SIGNALS LAYOUT
  // -------------------------------------------------------
  const renderSignalLayout = () => (
    <div className="intraday-section">
      {/* ================= ADVANCED FILTER CONTAINER ================= */}
      <div className="advanced-filter-wrapper">
        {/* ---------------- DATE ROW ---------------- */}
        <div className="filters-row date-row-centered">
          <div className="filter-item">
            <label>Date:</label>
            <DatePicker
              selected={selectedDate ? new Date(`${selectedDate}T00:00:00`) : null}
              onChange={(d) => {
                if (!d) return setSelectedDate("");

                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");

                setSelectedDate(`${y}-${m}-${day}`); // ✅ local YYYY-MM-DD (no UTC shift)
              }}
              dateFormat="MM/dd/yyyy"
              placeholderText="mm/dd/yyyy"
              className={`px-3 py-2 rounded-xl ${glassClass} ${textClass} text-sm shadow-lg transition-all focus:ring-2 focus:ring-blue-500 nc-date-input`}
              calendarClassName="nc-date-calendar"
              popperClassName={`nc-date-popper ${
                isDark ? "nc-date-dark" : "nc-date-light"
              }`}
              wrapperClassName={`nc-date-wrapper ${
                isDark ? "nc-date-dark" : "nc-date-light"
              }`}
            />
          </div>

          {activeType === "Intraday" && (
            <div className="filter-item">
              <label>Intraday Type:</label>
              <CustomDropdown
                label=""
                value={subIntraday}
                options={["All", "Intraday", "Intraday - Fast Alerts"]}
                onChange={setSubIntraday}
              />
            </div>
          )}

          <div className="filter-item">
            <label>Segment:</label>
            <CustomDropdown
              label=""
              value={segment}
              options={["Equity", "F&O"]}
              onChange={setSegment}
            />
          </div>
        </div>

        {/* ---------------- DROPDOWN FILTERS ---------------- */}
        <div className="filters-row filters-row-legend">
          <div className="filter-item">
            <label>Alert Type:</label>
            <CustomDropdown
              label=""
              value={selectedAlertType}
              options={alertTypeList}
              onChange={setSelectedAlertType}
            />
          </div>

          <div className="filter-item">
            <label>Screener:</label>
            <CustomDropdown
              label=""
              value={selectedScreener}
              options={screenerList}
              onChange={setSelectedScreener}
            />
          </div>

          <div className="filter-item">
            <label>Price Close To:</label>
            <CustomDropdown
              label=""
              value={priceCloseFilter}
              options={priceCloseList}
              onChange={setPriceCloseFilter}
            />
          </div>
        </div>

        {/* ---------------- LEGEND ---------------- */}
        <div className="legend-row">
          <div className="legend-box">
            <h4>Acronyms</h4>
            <p>
              <strong>RES</strong> = Resistance | <strong>SUP</strong> = Support
            </p>
            <p>
              <strong>T</strong> = Target | <strong>ST</strong> = Stoploss
            </p>
            <p>● = Signal Price</p>
          </div>
        </div>
      </div>
      {/* ================= END ADVANCED FILTER CONTAINER ================= */}

      {/* ---------------- SIGNALS SECTION ---------------- */}
      <div className="signals-section">
        {/* ✅ MOBILE TABS (pill style like Open Trades / Positions) */}
        <div className="md:hidden w-full flex justify-center mb-4">
          <div
            className={[
              "flex w-full max-w-md rounded-2xl p-1 shadow-lg",
              "backdrop-blur-xl border",
              isDark
                ? "bg-white/10 border-white/15"
                : "bg-white/70 border-slate-200/70",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setSignalTabKeepScroll("active")}
              className={[
                "flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                "text-center",
                signalTab === "active"
                  ? "bg-gradient-to-r from-[#1ea7ff] to-[#22d3ee] text-white shadow-md"
                  : isDark
                  ? "text-white/85 hover:bg-white/10"
                  : "text-slate-700 hover:bg-white/70",
              ].join(" ")}
            >
              Active Signals
            </button>

            <button
              type="button"
              onClick={() => setSignalTabKeepScroll("closed")}
              className={[
                "flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                "text-center",
                signalTab === "closed"
                  ? "bg-gradient-to-r from-[#1ea7ff] to-[#22d3ee] text-white shadow-md"
                  : isDark
                  ? "text-white/85 hover:bg-white/10"
                  : "text-slate-700 hover:bg-white/70",
              ].join(" ")}
            >
              Closed Signals
            </button>
          </div>
        </div>

        {/* ✅ MOBILE VIEW: show only one section */}
        <div className="md:hidden">
          {signalTab === "active" ? (
            <div className="signals-column">
              {/* ===== ACTIVE SIGNALS ===== */}
              <h3
                className="section-title active-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <span className="signal-title-wrap">
                  <span className="signal-dot signal-dot-active"></span>
                  Active Signals
                </span>

                {/* ✅ NEW: Date sort (right side of title) */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: isDark ? 0.85 : 0.8,
                    }}
                  ></span>
                  <button
                    type="button"
                    onClick={() => setDateSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
                    className="nc-sort-btn"
                    title={dateSortOrder === "asc" ? "Oldest first" : "Newest first"}
                  >
                    <span className="nc-sort-label">Date:</span>
                    <span className="nc-sort-icon">
                      {dateSortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </span>
              </h3>

              {/* ✅ MOVED HERE: Refresh button (sticky, never disappears) */}
              <StickyRefreshBar />

              <div className="signal-count-box">
                <div className="signal-count-item buy">
                  BUY Signals: <span>{totalBuySignals}</span>
                </div>
                <div className="signal-count-item sell">
                  SELL Signals: <span>{totalSellSignals}</span>
                </div>
                <div className="signal-count-item total">
                  Total: <span>{totalBuySignals + totalSellSignals}</span>
                </div>
              </div>

              {initialLoading ? (
                <p>Loading data...</p>
              ) : (
                <div className="active-signals-container">
                  <div
                    style={{
                      width: "100%",
                      textAlign: "left",
                      marginBottom: "4px",
                      paddingLeft: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "rgba(255,255,255,0.85)" : "#333",
                    }}
                  >
                    % = Confidence | ▼ = Current Price
                  </div>

                  <div className="signal-grid">
                    {activeSignals.length > 0 ? (
                      activeSignals.map((sig) => (
                        <SignalCard
                          key={sig.id}
                          script={sig.script}
                          confidence={sig.confidence}
                          alertType={sig.alertType}
                          description={sig.description}
                          sup={sig.sup}
                          st={sig.st}
                          signalPrice={sig.signalPrice}
                          currentPrice={sig.currentPrice}
                          t={sig.t}
                          res={sig.res}
                          timeVal={sig.timeVal}
                          alertText={sig.alertText}
                          userActions={sig.userActions}
                          isClosed={false}
                          strategy={sig.strategy}
                          rawDate={sig.dateVal}
                          rawTime={sig.timeVal}
                          fromReco={true}
                          returnTo={`${location.pathname}?${searchParams.toString()}`}
                          closeTime={sig.closeTime}
                        />
                      ))
                    ) : (
                      <p>No active signals.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="signals-column">
              {/* ===== CLOSED SIGNALS ===== */}
              <h3
                className="section-title closed-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <span className="signal-title-wrap">
                  <span className="signal-dot signal-dot-closed"></span>
                  Closed Signals
                </span>

                {/* ✅ NEW: Date sort (right side of title) */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: isDark ? 0.85 : 0.8,
                    }}
                  ></span>
                  <button
                    type="button"
                    onClick={() => setDateSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
                    className="nc-sort-btn"
                    title={dateSortOrder === "asc" ? "Oldest first" : "Newest first"}
                  >
                    <span className="nc-sort-label">Date:</span>
                    <span className="nc-sort-icon">
                      {dateSortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </span>
              </h3>

              <div className="closed-signals-container">
                <div
                  style={{
                    width: "100%",
                    textAlign: "left",
                    marginBottom: "4px",
                    paddingLeft: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: isDark ? "rgba(255,255,255,0.85)" : "#333",
                  }}
                >
                  % = Gain | ▼ = Close Price
                </div>

                <div className="signal-grid">
                  {closedSignals.length > 0 ? (
                    closedSignals.map((sig) => (
                      <div
                        className="closed-card-wrapper"
                        key={sig.id}
                        style={{
                          backgroundColor: (() => {
                            const sp = Number(sig.signalPrice);
                            const cp = Number(sig.currentPrice);
                            const side = String(sig.alertType).toLowerCase();
                            let pnl = 0;
                            if (side === "buy") pnl = (cp / sp - 1) * 100;
                            else pnl = (1 - cp / sp) * 100;
                            return pnl >= 0 ? "#E6FFE6" : "#FFE5E5";
                          })(),
                          borderRadius: "12px",
                          padding: "8px",
                          transition: "0.25s ease",
                        }}
                      >
                        <SignalCard
                          key={sig.id}
                          script={sig.script}
                          confidence={sig.confidence}
                          alertType={sig.alertType}
                          description={sig.description}
                          sup={sig.sup}
                          st={sig.st}
                          signalPrice={sig.signalPrice}
                          currentPrice={sig.currentPrice}
                          t={sig.t}
                          res={sig.res}
                          timeVal={sig.timeVal}
                          alertText={sig.alertText}
                          userActions={sig.userActions}
                          isClosed={true}
                          strategy={sig.strategy}
                          rawDate={sig.dateVal}
                          rawTime={sig.timeVal}
                          closeTime={sig.closeTime}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="no-signals-text">No closed signals.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ DESKTOP VIEW: ORIGINAL 2-COLUMN LAYOUT (DO NOT CHANGE UI) */}
        <div className="hidden md:block w-full">
          <div className="signals-columns">
            {/* ================= ACTIVE COLUMN ================= */}
            <div className="signals-column">
              <h3
                className="section-title active-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <span className="signal-title-wrap">
                  <span className="signal-dot signal-dot-active"></span>
                  Active Signals
                </span>

                {/* ✅ NEW: Date sort (right side of title) */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: isDark ? 0.85 : 0.8,
                    }}
                  ></span>
                  <button
                    type="button"
                    onClick={() => setDateSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
                    className="nc-sort-btn"
                    title={dateSortOrder === "asc" ? "Oldest first" : "Newest first"}
                  >
                    <span className="nc-sort-label">Date:</span>
                    <span className="nc-sort-icon">
                      {dateSortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </span>
              </h3>

              {/* ✅ MOVED HERE: Refresh button (sticky, never disappears) */}
              <StickyRefreshBar />

              <div className="signal-count-box">
                <div className="signal-count-item buy">
                  BUY Signals: <span>{totalBuySignals}</span>
                </div>
                <div className="signal-count-item sell">
                  SELL Signals: <span>{totalSellSignals}</span>
                </div>
                <div className="signal-count-item total">
                  Total: <span>{totalBuySignals + totalSellSignals}</span>
                </div>
              </div>

              {initialLoading ? (
                <p>Loading data...</p>
              ) : (
                <div className="active-signals-container">
                  <div
                    style={{
                      width: "100%",
                      textAlign: "left",
                      marginBottom: "4px",
                      paddingLeft: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "rgba(255,255,255,0.85)" : "#333",
                    }}
                  >
                    % = Confidence | ▼ = Current Price
                  </div>

                  <div className="signal-grid">
                    {activeSignals.length > 0 ? (
                      activeSignals.map((sig) => (
                        <SignalCard
                          key={sig.id}
                          script={sig.script}
                          confidence={sig.confidence}
                          alertType={sig.alertType}
                          description={sig.description}
                          sup={sig.sup}
                          st={sig.st}
                          signalPrice={sig.signalPrice}
                          currentPrice={sig.currentPrice}
                          t={sig.t}
                          res={sig.res}
                          timeVal={sig.timeVal}
                          alertText={sig.alertText}
                          userActions={sig.userActions}
                          isClosed={false}
                          strategy={sig.strategy}
                          rawDate={sig.dateVal}
                          rawTime={sig.timeVal}
                          fromReco={true}
                          closeTime={sig.closeTime}
                        />
                      ))
                    ) : (
                      <p>No active signals.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ================= CLOSED COLUMN ================= */}
            <div className="signals-column">
              <h3
                className="section-title closed-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <span className="signal-title-wrap">
                  <span className="signal-dot signal-dot-closed"></span>
                  Closed Signals
                </span>

                {/* ✅ NEW: Date sort (right side of title) */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: isDark ? 0.85 : 0.8,
                    }}
                  ></span>
                  <button
                    type="button"
                    onClick={() => setDateSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
                    className="nc-sort-btn"
                    title={dateSortOrder === "asc" ? "Oldest first" : "Newest first"}
                  >
                    <span className="nc-sort-label">Date:</span>
                    <span className="nc-sort-icon">
                      {dateSortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </span>
              </h3>

              <div className="closed-signals-container">
                <div
                  style={{
                    width: "100%",
                    textAlign: "left",
                    marginBottom: "4px",
                    paddingLeft: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: isDark ? "rgba(255,255,255,0.85)" : "#333",
                  }}
                >
                  % = Gain | ▼ = Close Price
                </div>

                <div className="signal-grid">
                  {closedSignals.length > 0 ? (
                    closedSignals.map((sig) => (
                      <div
                        className="closed-card-wrapper"
                        key={sig.id}
                        style={{
                          backgroundColor: (() => {
                            const sp = Number(sig.signalPrice);
                            const cp = Number(sig.currentPrice);
                            const side = String(sig.alertType).toLowerCase();
                            let pnl = 0;
                            if (side === "buy") pnl = (cp / sp - 1) * 100;
                            else pnl = (1 - cp / sp) * 100;
                            return pnl >= 0 ? "#E6FFE6" : "#FFE5E5";
                          })(),
                          borderRadius: "12px",
                          padding: "8px",
                          transition: "0.25s ease",
                        }}
                      >
                        <SignalCard
                          key={sig.id}
                          script={sig.script}
                          confidence={sig.confidence}
                          alertType={sig.alertType}
                          description={sig.description}
                          sup={sig.sup}
                          st={sig.st}
                          signalPrice={sig.signalPrice}
                          currentPrice={sig.currentPrice}
                          t={sig.t}
                          res={sig.res}
                          timeVal={sig.timeVal}
                          alertText={sig.alertText}
                          userActions={sig.userActions}
                          isClosed={true}
                          strategy={sig.strategy}
                          rawDate={sig.dateVal}
                          rawTime={sig.timeVal}
                          closeTime={sig.closeTime}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="no-signals-text">No closed signals.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* end signals-section */}
    </div>
    /* end intraday-section */
  );

  // -------------------------------------------------------
  // MAIN PAGE RETURN
  // -------------------------------------------------------
  return (
    <div
      className={`min-h-screen ${
        isDark ? "theme-dark" : "theme-light"
      } ${bgClass} ${textClass} relative transition-colors duration-300`}
    >
      {/* ===== BACKGROUND BLOBS (same as History) ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <AppHeader />

      {/* ===== MAIN CONTENT (STEP 5) ===== */}
      <div className="w-full px-3 sm:px-4 md:px-6 py-6 relative pb-24">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className={`text-4xl font-bold ${textClass} mb-2`}>
              Recommendations
            </h2>
            <p className={textSecondaryClass}>Trading signals & analytics</p>

            {lastPriceUpdatedAt ? (
              <p className={`mt-1 text-xs ${textSecondaryClass}`}>
                Price updated:{" "}
                {new Date(lastPriceUpdatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            ) : null}
          </div>

          {/* ✅ Refresh button removed from here (moved below Active Signals) */}
        </div>

        {/* MAIN CATEGORY BUTTONS (UNCHANGED LOGIC) */}
        <div className="w-full flex justify-center mb-6">
          <div className="flex items-center gap-3">
            {["Intraday", "BTST", "Short-term"].map((type) => {
              const isActiveTab = activeType === type;

              return (
                <button
                  key={type}
                  onClick={() => setActiveTypeKeepScroll(type)}
                  className={[
                    "px-5 py-3 rounded-xl text-sm font-semibold",
                    "transition-all duration-200",
                    "border",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
                    "shadow-sm",
                    isActiveTab
                      ? "bg-gradient-to-r from-[#1ea7ff] to-[#22d3ee] text-white border-white/10 shadow-xl"
                      : `${glassClass} ${textClass} ${cardHoverClass} ${
                          isDark ? "border-white/10" : "border-slate-200/60"
                        }`,
                  ].join(" ")}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* SIGNALS LAYOUT (UNCHANGED) */}
        <div className="recommendation-content">{renderSignalLayout()}</div>
      </div>
    </div>
  );
}
