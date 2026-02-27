// frontend/src/pages/Trade.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Search,
  ClipboardList,
  User,
  Briefcase,
  Clock,
  Lightbulb,
  Moon,
  Sun,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Activity,
  LineChart,
  AlertCircle,
  Plus,
} from "lucide-react";
import ScriptDetailsModal from "../components/ScriptDetailsModal";
import BackButton from "../components/BackButton";
import { moneyINR } from "../utils/format";
import ChartLauncher from "../components/ChartLauncher";
import { FaWhatsapp } from "react-icons/fa";
import SwipeNav from "../components/SwipeNav";
import HeaderActions from "../components/HeaderActions";
import { useTheme } from "../context/ThemeContext";
import AppHeader from "../components/AppHeader";


const API = (import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com")
  .trim()
  .replace(/\/+$/, "");


export default function Trade({ username }) {
  const { isDark } = useTheme();

  const [tab, setTab] = useState("mylist");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allScripts, setAllScripts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [totalFunds, setTotalFunds] = useState(0);
  const [availableFunds, setAvailableFunds] = useState(0);

  const [sellChecking, setSellChecking] = useState(false);
  const [sellConfirmOpen, setSellConfirmOpen] = useState(false);
  const [sellConfirmMsg, setSellConfirmMsg] = useState("");
  const [sellPreviewData, setSellPreviewData] = useState(null);
  const [sellSymbol, setSellSymbol] = useState(null);
  const [portfolioMap, setPortfolioMap] = useState({});

  const [whatsappList, setWhatsappList] = useState([]);

  const intervalRef = useRef(null);
  const modalPollRef = useRef(null);
  const sellPreviewGuardRef = useRef({});
  const nav = useNavigate();
  const location = useLocation();
  const searchBoxRef = useRef(null);


  // ✅ define who BEFORE using it anywhere
  const who = username || localStorage.getItem("username") || "";

  // ✅ MUST WATCH (stored locally per user)
  const [mustWatchlist, setMustWatchlist] = useState([]);

  const MUSTWATCH_KEY = useMemo(() => `mustwatch:${who || "guest"}`, [who]);

  // Load Must Watch for this user
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MUSTWATCH_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      setMustWatchlist(Array.isArray(arr) ? arr : []);
    } catch {
      setMustWatchlist([]);
    }
  }, [MUSTWATCH_KEY]);

  // Save Must Watch for this user
  useEffect(() => {
    try {
      localStorage.setItem(MUSTWATCH_KEY, JSON.stringify(mustWatchlist));
    } catch { }
  }, [MUSTWATCH_KEY, mustWatchlist]);

  const addToMustWatch = (sym) => {
    const s = String(sym || "").toUpperCase().trim();
    if (!s) return;
    setMustWatchlist((prev) => (prev.includes(s) ? prev : [s, ...prev]));
  };

  const removeFromMustWatch = (sym) => {
    const s = String(sym || "").toUpperCase().trim();
    setMustWatchlist((prev) => prev.filter((x) => x !== s));
  };

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";
  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";
  const activeNavClass =
    "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg";

  // same gradient used in Landing.jsx
  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  useEffect(() => {
    if (!who) return;

    fetch(`${API}/portfolio/${who}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        (data?.open || []).forEach((p) => {
          if (Number(p.qty) > 0) {
            map[p.symbol.toUpperCase()] = true;
          }
        });
        setPortfolioMap(map);
      })
      .catch(() => setPortfolioMap({}));
  }, [who]);

  useEffect(() => {
    if (!who) return;
    fetchWatchlist();
    fetchFunds();
    preloadScripts();
  }, [who]);

  useEffect(() => {
    fetch(`${API}/whatsapp/list`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWhatsappList(data);
        else if (Array.isArray(data.list)) setWhatsappList(data.list);
        else setWhatsappList([]);
      })
      .catch(() => setWhatsappList([]));
  }, []);

  useEffect(() => {
    function onDocMouseDown(e) {
      // if click is outside search area -> close dropdown
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSuggestions([]);
        // optional: also clear query
        // setQuery("");
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);


  function preloadScripts() {
    fetch(`${API}/search/scripts`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllScripts(data);
        else setAllScripts([]);
      })
      .catch(() => setAllScripts([]));
  }

  function fetchWatchlist() {
    fetch(`${API}/watchlist/${who}`)
      .then((r) => r.json())
      .then(setWatchlist)
      .catch(() => setWatchlist([]));
  }

  function fetchFunds() {
    fetch(`${API}/funds/available/${who}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch funds");
        return res.json();
      })
      .then((data) => {
        setTotalFunds(data.total_funds || 0);
        setAvailableFunds(data.available_funds || 0);
      })
      .catch(() => {
        setTotalFunds(0);
        setAvailableFunds(0);
      });
  }

  function handleRemoveFromWatchlist(symbol) {
    fetch(`${API}/watchlist/${who}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    }).then(() => fetchWatchlist());
  }

  const combinedSymbols = useMemo(() => {
    const all = [...(watchlist || []), ...(mustWatchlist || [])]
      .map((s) => String(s || "").toUpperCase().trim())
      .filter(Boolean);
    return Array.from(new Set(all));
  }, [watchlist, mustWatchlist]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!combinedSymbols.length) return;

    const fetchQuotes = () => {
      fetch(
        `${API}/quotes?symbols=${encodeURIComponent(combinedSymbols.join(","))}`
      )
        .then((r) => r.json())
        .then((arr) => {
          const map = {};
          (arr || []).forEach((q) => (map[q.symbol] = q));
          setQuotes(map);
        })
        .catch(() => { });
    };

    fetchQuotes();
    intervalRef.current = setInterval(fetchQuotes, 2000);

    return () => clearInterval(intervalRef.current);
  }, [combinedSymbols]);

  const MONTHS = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "SEPT",
    "OCT",
    "NOV",
    "DEC",
  ];
  const normMonth = (m) => (m === "SEPT" ? "SEP" : m || "");

  function parseOptionish(q) {
    const Qraw = String(q || "").toUpperCase().replace(/\s+/g, "");
    if (!Qraw)
      return {
        raw: "",
        underlying: "",
        year2: "",
        month: "",
        strike: "",
        deriv: "",
      };

    const derivMatch = Qraw.match(/(CE|PE|FUT)$/);
    const deriv = derivMatch ? derivMatch[1] : "";
    const Q = deriv ? Qraw.slice(0, -deriv.length) : Qraw;

    let month = "",
      mIdx = -1;
    for (const m of MONTHS) {
      const idx = Q.indexOf(m);
      if (
        idx >= 0 &&
        (mIdx === -1 ||
          idx < mIdx ||
          (idx === mIdx && m.length > month.length))
      ) {
        month = normMonth(m);
        mIdx = idx;
      }
    }

    // ✅ STRIKE should be digits AFTER month (e.g. NIFTY26JAN23500CE -> 23500)
    // ❌ Do NOT treat "26" (year) as strike in NIFTY26JAN
    let strike = "";

    if (mIdx >= 0 && month) {
      // digits immediately after month
      const afterMonth = Q.slice(mIdx + month.length);
      const mStrike = afterMonth.match(/^(\d+)/);
      strike = mStrike ? mStrike[1] : "";
    } else {
      // fallback (no month case)
      const tailNum = Q.match(/(\d+)(?!.*\d)/);
      strike = tailNum ? tailNum[1] : "";
    }


    let year2 = "";
    if (mIdx >= 0) {
      const beforeMonth = Q.slice(Math.max(0, mIdx - 4), mIdx);
      const y = beforeMonth.match(/(\d{2})$/);
      year2 = y ? y[1] : "";
    }

    let underlying = Q;
    if (mIdx >= 0) {
      if (year2) {
        const yIdx = Q.indexOf(year2, Math.max(0, mIdx - 4));
        underlying = Q.slice(0, yIdx);
      } else {
        underlying = Q.slice(0, mIdx);
      }
    } else if (tailNum) {
      underlying = Q.slice(0, tailNum.index);
    }

    underlying = underlying.replace(/[^A-Z]/g, "");

    return { raw: Qraw, underlying, year2, month, strike, deriv };
  }

  function buildSeeds({ raw, underlying, year2, month, strike, deriv }) {
    const seeds = new Set();
    if (raw) seeds.add(raw); // ✅ always include raw

    if (!underlying && !month) return Array.from(seeds);

    const yy = year2 || String(new Date().getFullYear()).slice(-2);

    // broad seeds
    if (underlying && month) {
      seeds.add(`${underlying}${month}`);
      seeds.add(`${underlying}${yy}${month}`);
    } else if (underlying) {
      seeds.add(underlying);
    } else if (month) {
      seeds.add(month);
      seeds.add(`${yy}${month}`);
    }

    // ✅ precise seeds (fixes missing strikes/futures due to top-50 cut)
    if (underlying && month && strike) {
      seeds.add(`${underlying}${yy}${month}${strike}`);
      seeds.add(`${underlying}${month}${strike}`);
      if (deriv) {
        seeds.add(`${underlying}${yy}${month}${strike}${deriv}`);
        seeds.add(`${underlying}${month}${strike}${deriv}`);
      }
    }

    if (underlying && month && deriv && !strike) {
      // FUT case like BAJAJ-AUTO26JANFUT
      seeds.add(`${underlying}${yy}${month}${deriv}`);
      seeds.add(`${underlying}${month}${deriv}`);
    }

    return Array.from(seeds).filter(Boolean);
  }


  // ✅ normalize symbols/names so "-" "_" spaces don't break filtering
  const norm = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const symbolField = (s) => norm(s?.symbol || s?.tradingsymbol || "");
  const nameField = (s) => norm(s?.name || "");

  const allowedExchange = (s) =>
    ["NSE", "NFO", "BSE"].includes(String(s?.exchange || "").toUpperCase());


  function isPlainEquityQuery(q) {
    const Q = String(q || "").toUpperCase().trim();
    if (!Q) return false;

    const hasDeriv = /(CE|PE|FUT)$/i.test(Q);
    const hasMonth =
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)/i.test(Q);

    return !hasDeriv && !hasMonth;
  }

  async function backendSearchSmart(parts) {
    const { underlying, month, strike, deriv } = parts;
    const seeds = buildSeeds(parts);
    let bag = [];

    for (const seed of seeds) {
      try {
        const res = await fetch(`${API}/search/?q=${encodeURIComponent(seed)}`)
          ;
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) bag = bag.concat(data);
      } catch { }
    }

    const seen = new Set();
    const merged = [];
    for (const s of bag) {
      if (!allowedExchange(s)) continue;
      const sym = symbolField(s);
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      merged.push(s);
    }

    let filtered = merged;
    if (month) filtered = filtered.filter((s) => symbolField(s).includes(month));
    if (underlying)
      filtered = filtered.filter((s) => symbolField(s).includes(underlying));
    if (strike) {
      filtered = filtered.filter((s) => {
        const sym = symbolField(s);
        const m = sym.match(/(\d+)(CE|PE)$/);
        return m ? m[1].startsWith(strike) : sym.includes(strike);
      });
    }

    if (deriv) {
      filtered = filtered.filter((s) => {
        const sym = symbolField(s);
        return deriv === "FUT" ? sym.endsWith("FUT") : sym.endsWith(deriv);
      });
    }

    if (!month && !strike && underlying && !deriv) {
      filtered = merged.filter(
        (s) => symbolField(s).includes(underlying) || nameField(s).includes(underlying)
      );

    }

    filtered.sort((a, b) => symbolField(a).localeCompare(symbolField(b)));
    return filtered.slice(0, 50);
  }

  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // ✅ 1) Always try direct backend search with EXACT user input first
        const directRes = await fetch(
          `${API}/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        const directData = await directRes.json().catch(() => []);

        if (Array.isArray(directData) && directData.length > 0) {
          setSuggestions(directData.slice(0, 50));
          return;
        }

        // ✅ 2) If direct search returns empty, then use your smart parsing logic
        if (isPlainEquityQuery(debouncedQuery)) {
          const res = await fetch(
            `${API}/search?q=${encodeURIComponent(debouncedQuery)}`
          );
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data.slice(0, 50) : []);
          return;
        }

        const parts = parseOptionish(debouncedQuery);
        let finalList = await backendSearchSmart(parts);

        if (
          (!finalList || finalList.length === 0) &&
          Array.isArray(allScripts) &&
          allScripts.length
        ) {
          const { underlying, month, strike, deriv } = parts;

          finalList = allScripts
            .filter(allowedExchange)
            .filter((s) => {
              const sym = symbolField(s);
              const nm = nameField(s);

              if (deriv && !sym.endsWith(deriv)) return false;
              if (underlying && !(sym.includes(underlying) || nm.includes(underlying)))
                return false;
              if (month && !sym.includes(month)) return false;
              if (strike) {
                const m = sym.match(/(\d+)(CE|PE)$/);
                return m ? m[1].startsWith(strike) : sym.includes(strike);
              }
              return true;
            })
            .sort((a, b) => symbolField(a).localeCompare(symbolField(b)))
            .slice(0, 50);
        }

        setSuggestions(Array.isArray(finalList) ? finalList : []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [debouncedQuery, allScripts]);

  function handleSearch(e) {
    setQuery(e.target.value);
  }
  function openChart(e, sym) {
    e?.stopPropagation?.();
    const s = String(sym || "").toUpperCase().trim();
    if (!s) return;

    setQuery("");
    setSuggestions([]);
    nav(`/chart/${encodeURIComponent(s)}`);
  }
  function openBuy(e, sym) {
    e?.stopPropagation?.();
    const s = String(sym || "").toUpperCase().trim();
    if (!s) return;

    setQuery("");
    setSuggestions([]);
    nav(`/buy/${encodeURIComponent(s)}`);
  }

  function openSell(e, sym) {
    e?.stopPropagation?.();
    const s = String(sym || "").toUpperCase().trim();
    if (!s) return;

    setQuery("");
    setSuggestions([]);
    // uses your existing SELL preview + confirmation flow
    previewThenSell(s, 1, "intraday");
  }
  function addFromSearchToWatchlist(e, sym) {
    e?.stopPropagation?.();
    const s = String(sym || "").toUpperCase().trim();
    if (!s) return;

    // ✅ Must Watch tab → local storage list
    if (tab === "mustwatch") {
      addToMustWatch(s);
      setQuery("");
      setSuggestions([]);
      return;
    }

    // ✅ My List tab → backend watchlist
    if (!who) return;

    const already =
      Array.isArray(watchlist) &&
      watchlist.some((x) => String(x || "").toUpperCase().trim() === s);

    if (already) {
      setQuery("");
      setSuggestions([]);
      return;
    }

    fetch(`${API}/watchlist/${who}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: s }),
    })
      .then(() => fetchWatchlist())
      .finally(() => {
        setQuery("");
        setSuggestions([]);
      });
  }


  function goDetail(sym) {
    const s = String(sym || "").trim();
    if (!s) return;

    if (modalPollRef.current) clearInterval(modalPollRef.current);

    fetch(`${API}/quotes?symbols=${encodeURIComponent(s)}`)
      .then((r) => r.json())
      .then((arr) => {
        const latestQuote = Array.isArray(arr) && arr[0] ? arr[0] : {};
        setSelectedSymbol(s);
        setSelectedQuote(latestQuote);
        setQuery("");
        setSuggestions([]);
      })
      .catch(() => {
        setSelectedSymbol(s);
        setSelectedQuote(quotes[s] || {});
        setQuery("");
        setSuggestions([]);
      });

    modalPollRef.current = setInterval(() => {
      fetch(`${API}/quotes?symbols=${encodeURIComponent(s)}`)
        .then((r) => r.json())
        .then((arr) => {
          const latestQuote = Array.isArray(arr) && arr[0] ? arr[0] : null;
          if (latestQuote) setSelectedQuote(latestQuote);
        })
        .catch(() => { });
    }, 2000);
  }

  useEffect(() => {
    if (!selectedSymbol && modalPollRef.current) {
      clearInterval(modalPollRef.current);
      modalPollRef.current = null;
    }
  }, [selectedSymbol]);

  function handleAddToWatchlist() {
    // ✅ If user is on Must Watch tab → save locally
    if (tab === "mustwatch") {
      addToMustWatch(selectedSymbol);
      setSelectedSymbol(null);
      setSelectedQuote(null);
      if (modalPollRef.current) {
        clearInterval(modalPollRef.current);
        modalPollRef.current = null;
      }
      return;
    }

    // ✅ My List tab → use backend watchlist as before
    fetch(`${API}/watchlist/${who}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: selectedSymbol }),
    }).then(() => {
      fetchWatchlist();
      setSelectedSymbol(null);
      setSelectedQuote(null);
      if (modalPollRef.current) {
        clearInterval(modalPollRef.current);
        modalPollRef.current = null;
      }
    });
  }

  function handleBuy() {
    nav(`/buy/${selectedSymbol}`);
    setSelectedSymbol(null);
  }

  async function previewThenSell(sym, qty = 1, segment = "intraday") {
    if (!who) {
      alert("Please log in first.");
      return;
    }
    const signature = JSON.stringify({
      sym: String(sym || "").toUpperCase(),
      qty: Number(qty) || 1,
      segment,
    });
    if (sellPreviewGuardRef.current[signature]) return;
    sellPreviewGuardRef.current[signature] = true;
    setTimeout(() => delete sellPreviewGuardRef.current[signature], 1500);

    try {
      setSellChecking(true);
      const body = {
        username: who,
        script: String(sym || "").toUpperCase(),
        order_type: "SELL",
        qty: Number(qty) || 1,
        segment,
        allow_short: false,
      };
      const res = await fetch(`${API}/orders/sell/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      const needsConfirm = data?.needs_confirmation === true;

      if (!needsConfirm) {
        nav(`/sell/${sym}`, {
          state: {
            preview: data,
            allow_short: false,
          },
        });
        return;
      }

      if (res.ok && !needsConfirm) {
        nav(`/sell/${sym}`, {
          state: {
            requestedQty: Number(qty) || 1,
            allow_short: false,
            preview: data,
          },
        });
        setSelectedSymbol(null);
        return;
      }

      setSellSymbol(String(sym || "").toUpperCase());
      setSellPreviewData(data);
      setSellConfirmMsg(
        data?.message ||
        `You have 0 qty of ${String(sym || "").toUpperCase()}. Do you still want to sell first?`
      );
      setSellConfirmOpen(true);
    } catch (e) {
      alert("Unable to check holdings right now. Please try again.");
    } finally {
      setSellChecking(false);
    }
  }

  function handleSell() {
    previewThenSell(selectedSymbol, 1, "intraday");
  }

  function highlightMatch(text, q) {
    const str = String(text ?? "");
    if (!q) return str;
    const regex = new RegExp(`(${q})`, "ig");
    return str.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="font-bold text-cyan-400">
          {part}
        </span>
      ) : (
        part
      )
    );
  }

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300`}
    >
      <ChartLauncher />

      {/* BACKGROUND BLUR EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <AppHeader />

      {/* MAIN CONTENT */}
      <div className="w-full px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-24 relative">
        <div className="space-y-6">
          {/* Tabs + Funds (same line) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Tabs: My List / Must Watch */}
            <div
              className={`flex p-1.5 rounded-2xl ${glassClass} w-fit shadow-lg`}
            >
              {["mylist", "mustwatch"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all  ${tab === t
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : textSecondaryClass
                    }`}
                >
                  {t === "mylist" ? "My List" : "Must Watch"}
                </button>
              ))}
            </div>

            {/* Funds on right side */}
            <div
              className={[
                glassClass,
                "rounded-2xl shadow-lg sm:ml-auto",
                "px-4 py-3 w-full sm:w-fit",
              ].join(" ")}
            >

              <div className="flex items-center justify-between gap-3">
                {/* Total Funds */}
                <div>
                  <div
                    className={`text-[10px] tracking-widest font-semibold uppercase ${textSecondaryClass}`}
                  >
                    Total Funds
                  </div>
                  <div className="mt-1 text-base font-extrabold tabular-nums truncate max-w-[140px] sm:max-w-none">
                    {moneyINR(totalFunds, { decimals: 0 })}
                  </div>

                </div>

                {/* Divider */}
                <div
                  className={`h-8 w-px ${isDark ? "bg-white/15" : "bg-slate-900/10"
                    }`}
                />

                {/* Available */}
                <div className="text-right">
                  <div
                    className={`text-[10px] tracking-widest font-semibold uppercase ${textSecondaryClass}`}
                  >
                    Available
                  </div>
                  <div className="mt-1 text-base font-extrabold text-cyan-400 tabular-nums truncate max-w-[140px] sm:max-w-none">
                    {moneyINR(availableFunds, { decimals: 0 })}
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ✅ Note ONLY on Must Watch */}
          {tab === "mustwatch" && (
            <div className={`${glassClass} rounded-2xl p-4 shadow-lg`}>
              <div className={`text-sm ${textSecondaryClass}`}>
                * Enable automatic daily script additions from our recommendations —{" "}
                <span
                  className={`${isDark ? "text-cyan-300" : "text-blue-700"
                    } font-semibold`}
                >
                  contact Support to activate.
                </span>
              </div>
            </div>
          )}

          {/* Search Bar (shared) */}
          <div className="flex justify-left">
            <div ref={searchBoxRef} className="relative w-full max-w-4xl">

              <Search
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 ${isDark ? "text-slate-200" : "text-slate-500"
                  }`}
              />
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search & Add"
                className={`w-full pl-12 pr-4 py-3.5 text-[15px] rounded-2xl ${glassClass} ${textClass} placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all`}
              />

              {suggestions.length > 0 && (
                <ul
                  className={`absolute left-0 right-0 ${glassClass} rounded-2xl shadow-2xl mt-3 max-h-80 overflow-auto overscroll-contain z-10`}
                >
                  {suggestions.map((s, i) => {
                    const sym = s?.symbol || s?.tradingsymbol || "";
                    return (
                      <li
                        key={`${sym}-${i}`}
                        onClick={() => goDetail(sym)}
                        className={`px-4 py-3 ${cardHoverClass} cursor-pointer transition-all ${i !== suggestions.length - 1
                          ? `border-b ${isDark ? "border-white/10" : "border-white/40"}`
                          : ""
                          }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Symbol + name */}
                          <div className="min-w-0">
                            <div className="font-semibold text-lg truncate">
                              {highlightMatch(sym, query)}
                            </div>
                            <div className={`text-sm ${textSecondaryClass} truncate`}>
                              {highlightMatch(s.name, query)}
                            </div>
                            <div className={`text-xs ${textSecondaryClass} mt-1`}>
                              {(s.exchange || "NSE")} | {s.segment} | {s.instrument_type}
                            </div>
                          </div>

                          {/* Right: Chart icon */}
                          {/* Right: Buy / Sell / Chart */}
                          <div className="shrink-0 self-center flex items-center gap-2">
                            {/* ✅ (+) Add to watchlist */}
                            <button
                              title={tab === "mustwatch" ? "Add to Must Watch" : "Add to Watchlist"}
                              onClick={(e) => addFromSearchToWatchlist(e, sym)}
                              className={`p-2 rounded-xl border transition-all ${isDark
                                ? "border-white/10 hover:bg-white/10"
                                : "border-white/40 hover:bg-white/80"
                                }`}
                            >
                              <Plus className={`w-4 h-4 ${isDark ? "text-cyan-300" : "text-blue-700"}`} />
                            </button>

                            <button
                              title="Buy"
                              onClick={(e) => openBuy(e, sym)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold tracking-wide border transition-all ${isDark
                                ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/25 hover:bg-emerald-500/25"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                }`}
                            >
                              BUY
                            </button>

                            <button
                              title="Sell"
                              onClick={(e) => openSell(e, sym)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold tracking-wide border transition-all ${isDark
                                ? "bg-rose-500/15 text-rose-200 border-rose-400/25 hover:bg-rose-500/25"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                }`}
                            >
                              SELL
                            </button>

                            <button
                              title="Open chart"
                              onClick={(e) => openChart(e, sym)}
                              className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 hover:bg-white/10" : "border-white/40 hover:bg-white/80"
                                }`}
                            >
                              <LineChart className={`w-4 h-4 ${isDark ? "text-cyan-300" : "text-blue-700"}`} />
                            </button>
                          </div>


                        </div>
                      </li>

                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* LIST AREA */}
          {tab === "mustwatch" ? (
            <div className="space-y-4">
              {mustWatchlist.length === 0 ? (
                <div className={`text-center ${textSecondaryClass} mt-20 text-lg`}>
                  No scripts in your Must Watch list.
                </div>
              ) : (
                mustWatchlist.map((sym) => {
                  const q = quotes[sym] || {};
                  const isPos = Number(q.change || 0) >= 0;

                  return (
                    <div
                      key={sym}
                      className={`${glassClass} p-5 rounded-3xl ${cardHoverClass} cursor-pointer transition-all duration-300 shadow-xl`}
                      onClick={() => goDetail(sym)}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="flex items-end h-full">
                            <div className="flex items-end gap-2">
                              <div className="text-2xl font-bold leading-none">
                                {sym}
                              </div>

                              <span
                                className={`px-0.5 py-[0.1px] rounded-md text-[10px] font-normal ${isDark
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                                  }`}
                              >
                                {q.exchange || "NSE"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start justify-end gap-3">
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${isPos ? "text-emerald-400" : "text-rose-400"}`}>

                                {q.price != null
                                  ? Number(q.price).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                  : "--"}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromMustWatch(sym);
                                }}
                                className={`w-5 h-5 rounded-md font-extrabold flex items-center justify-center transition-all shadow-lg ${isDark
                                  ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-400/30"
                                  : "bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200"
                                  }`}
                                title="Remove"
                              >
                                -
                              </button>
                            </div>

                            <div
                              className={`mt-1 text-sm font-semibold flex items-center justify-end gap-2 ${isPos ? "text-emerald-400" : "text-rose-400"
                                }`}
                            >
                              {q.change != null && (
                                <>
                                  <span>
                                    {isPos ? "+" : ""}
                                    {Number(q.change).toFixed(2)}
                                  </span>
                                  <span>
                                    ({Number(q.pct_change || 0).toFixed(2)}%)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {watchlist.length === 0 ? (
                <div className={`text-center ${textSecondaryClass} mt-20 text-lg`}>
                  No scripts in your watchlist.
                </div>
              ) : (
                watchlist.map((sym) => {
                  const q = quotes[sym] || {};
                  const isPos = Number(q.change || 0) >= 0;

                  return (
                    <div
                      key={sym}
                      className={`${glassClass} p-2 rounded-xl ${cardHoverClass} cursor-pointer transition-all duration-300 shadow-xl`}
                      onClick={() => goDetail(sym)}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="flex items-end h-full">
                            <div className="flex items-end gap-2">
                              <div className="text-[16px] sm:text-[18px] font-semibold tracking-[0.3px] leading-none">
                                {sym}
                              </div>


                              <span
                                className={`px-0.5 py-[0.1px] rounded-md text-[7.5px] font-normal ${isDark
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                                  }`}
                              >
                                {q.exchange || "NSE"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start justify-end gap-3">
                          <div className="text-right">
                            {/* Line 1: Live price + (-) */}
                            <div className="flex items-center justify-end gap-2">
                              <div
                                className={`text-xl font-bold ${isPos ? "text-emerald-400" : "text-rose-400"
                                  }`}
                              >
                                {q.price != null
                                  ? Number(q.price).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                  : "--"}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromWatchlist(sym);
                                }}
                                className={`w-5 h-5 rounded-md font-extrabold flex items-center justify-center transition-all shadow-lg ${isDark
                                  ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-400/30"
                                  : "bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200"
                                  }`}
                                title="Remove"
                              >
                                -
                              </button>
                            </div>

                            {/* Line 2: Change + % + WhatsApp */}
                            <div
                              className={`mt-1 text-sm font-semibold flex items-center justify-end gap-2 ${isPos ? "text-emerald-400" : "text-rose-400"
                                }`}
                            >
                              {q.change != null && (
                                <>
                                  <span>
                                    {isPos ? "+" : ""}
                                    {Number(q.change).toFixed(2)}
                                  </span>
                                  <span>
                                    ({Number(q.pct_change || 0).toFixed(2)}%)
                                  </span>
                                </>
                              )}

                              {whatsappList.includes(sym) && (
                                <FaWhatsapp
                                  className="text-green-400 text-[16px] ml-1"
                                  title="Added to WhatsApp Alerts"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* SCRIPT DETAILS MODAL */}
      <ScriptDetailsModal
        symbol={selectedSymbol}
        quote={selectedQuote}
        hasPosition={!!portfolioMap[selectedSymbol?.toUpperCase()]}
        glassClass={glassClass}
        cardHoverClass={cardHoverClass}
        textClass={textClass}
        textSecondaryClass={textSecondaryClass}
        isDark={isDark}
        onClose={() => {
          setSelectedSymbol(null);
          setSelectedQuote(null);
          if (modalPollRef.current) {
            clearInterval(modalPollRef.current);
            modalPollRef.current = null;
          }
        }}
        onAdd={handleAddToWatchlist}
        onBuy={handleBuy}
        onSell={() => {
          const sym = selectedSymbol;
          setSelectedSymbol(null);
          setSelectedQuote(null);
          if (modalPollRef.current) {
            clearInterval(modalPollRef.current);
            modalPollRef.current = null;
          }
          previewThenSell(sym, 1, "intraday");
        }}
      />


      {/* SELL CONFIRMATION MODAL (Sell First style) */}
      {sellConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl ${isDark ? "bg-slate-900/90 border-white/10" : "bg-white/95 border-black/10"
              }`}
          >
            <div className="p-6 text-center">
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15">
                <AlertCircle className="h-7 w-7 text-rose-400" />
              </div>

              {/* Title */}
              <h3 className={`text-lg font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Sell First?
              </h3>

              {/* Message */}
              <p className={`mt-2 text-sm ${isDark ? "text-white/70" : "text-slate-600"}`}>
                {sellConfirmMsg ||
                  `You didn't buy ${sellSymbol}. Do you still want to sell first?`}
              </p>

              {/* Buttons */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setSellConfirmOpen(false)}
                  className={`px-5 py-2 rounded-xl font-semibold transition ${isDark
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setSellConfirmOpen(false);
                    nav(`/sell/${sellSymbol}`, {
                      state: {
                        requestedQty: 1,
                        allow_short: true,
                        preview: sellPreviewData,
                      },
                    });
                  }}
                  className="px-5 py-2 rounded-xl font-semibold bg-rose-500 text-white hover:bg-rose-600 transition"
                >
                  Yes, Sell
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
