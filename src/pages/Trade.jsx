import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Search, ClipboardList, User, Briefcase, Clock, Lightbulb, Moon, Sun, Sparkles, ArrowLeft, RefreshCw, Activity } from "lucide-react";
import ScriptDetailsModal from "../components/ScriptDetailsModal";
import BackButton from "../components/BackButton";
import { moneyINR } from "../utils/format";
import ChartLauncher from "../components/ChartLauncher";
import { FaWhatsapp } from "react-icons/fa";
import SwipeNav from "../components/SwipeNav";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com";

export default function Trade({ username }) {
  const [isDark, setIsDark] = useState(true);
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
  const nav = useNavigate();
  const location = useLocation();

  const sellPreviewGuardRef = useRef({});
  const who = username || localStorage.getItem("username") || "";

  const bgClass = isDark
    ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
    : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100';
  const glassClass = isDark
    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
    : 'bg-white/60 backdrop-blur-xl border border-white/40';
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const cardHoverClass = isDark ? 'hover:bg-white/10' : 'hover:bg-white/80';
  const activeNavClass =
    "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg";

  useEffect(() => {
    if (!who) return;

    fetch(`${API}/portfolio/${who}`)
      .then(res => res.json())
      .then(data => {
        const map = {};
        (data?.open || []).forEach(p => {
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

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!watchlist.length) return;

    const fetchQuotes = () => {
      fetch(`${API}/quotes?symbols=${encodeURIComponent(watchlist.join(","))}`)
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
  }, [watchlist]);

  const MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "SEPT", "OCT", "NOV", "DEC"
  ];
  const normMonth = (m) => (m === "SEPT" ? "SEP" : m || "");

  function parseOptionish(q) {
    const Qraw = String(q || "").toUpperCase().replace(/\s+/g, "");
    if (!Qraw)
      return { raw: "", underlying: "", year2: "", month: "", strike: "", deriv: "" };

    const derivMatch = Qraw.match(/(CE|PE|FUT)$/);
    const deriv = derivMatch ? derivMatch[1] : "";
    const Q = deriv ? Qraw.slice(0, -deriv.length) : Qraw;

    let month = "", mIdx = -1;
    for (const m of MONTHS) {
      const idx = Q.indexOf(m);
      if (
        idx >= 0 &&
        (mIdx === -1 || idx < mIdx || (idx === mIdx && m.length > month.length))
      ) {
        month = normMonth(m);
        mIdx = idx;
      }
    }

    const tailNum = Q.match(/(\d+)(?!.*\d)/);
    const strike = tailNum ? tailNum[1] : "";

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

  function buildSeeds({ underlying, year2, month }) {
    const seeds = new Set();
    if (!underlying && !month) return [];
    const yy = year2 || String(new Date().getFullYear()).slice(-2);
    if (underlying && month) {
      seeds.add(`${underlying}${month}`);
      seeds.add(`${underlying}${yy}${month}`);
    } else if (underlying) {
      seeds.add(underlying);
    } else if (month) {
      seeds.add(month);
      seeds.add(`${yy}${month}`);
    }
    return Array.from(seeds);
  }

  const symbolField = (s) =>
    (s?.symbol || s?.tradingsymbol || "").toUpperCase().replace(/\s+/g, "");
  const allowedExchange = (s) =>
    ["NSE", "NFO", "BSE"].includes(String(s?.exchange || "").toUpperCase());

  function isPlainEquityQuery(q) {
    const Q = String(q || "").toUpperCase().trim();
    if (!Q) return false;

    const hasDeriv = /(CE|PE|FUT)$/i.test(Q);
    const hasMonth = /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)/i.test(Q);

    return !hasDeriv && !hasMonth;
  }

  async function backendSearchSmart(parts) {
    const { underlying, month, strike, deriv } = parts;
    const seeds = buildSeeds(parts);
    let bag = [];

    for (const seed of seeds) {
      try {
        const res = await fetch(`${API}/search?q=${encodeURIComponent(seed)}`);
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
    if (underlying) filtered = filtered.filter((s) => symbolField(s).includes(underlying));
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
        (s) =>
          symbolField(s).includes(underlying) ||
          String(s.name || "").toUpperCase().includes(underlying)
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
          const { raw, underlying, month, strike, deriv } = parts;

          finalList = allScripts
            .filter(allowedExchange)
            .filter((s) => {
              const sym = symbolField(s);
              const nm = String(s.name || "").toUpperCase();

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
    fetch(`${API}/watchlist/${who}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: selectedSymbol }),
    }).then(() => {
      fetchWatchlist();
      setSelectedSymbol(null);
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
            allow_short: false
          }
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
    <div className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300`}>
      <ChartLauncher />

      {/* BACKGROUND BLUR EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* HEADER */}
      <div className={`sticky top-0 z-50 ${glassClass} shadow-2xl relative`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Top Row: Logo, Title, Theme Toggle, Profile */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500 rounded-2xl shadow-lg shadow-blue-500/50"></div>
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">TradeHub</div>
                <div className={`text-xs ${textSecondaryClass}`}>Next-Gen Trading</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`${glassClass} p-3 rounded-xl ${cardHoverClass} transition-all shadow-lg`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => nav("/profile")}
                className={`${glassClass} p-3 rounded-xl ${cardHoverClass} transition-all shadow-lg`}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* ✅ Global swipe navigation (ONLY ONE ROW) */}
          <SwipeNav glassClass={glassClass} cardHoverClass={cardHoverClass} />



          {/* Funds Display */}
          <div className={`${glassClass} rounded-2xl p-2 mb-4 shadow-lg text-center`}>
            <div className="flex items-center justify-center gap-3 text-sm font-medium">
              <span>Total: {moneyINR(totalFunds, { decimals: 0 })}</span>
              <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
              <span>Available: {moneyINR(availableFunds, { decimals: 0 })}</span>
            </div>
          </div>

          {/* Tabs: My List / Must Watch */}
          <div className={`flex p-1.5 rounded-2xl ${glassClass} w-fit mx-auto shadow-lg`}>

            {["mylist", "mustwatch"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all ${tab === t
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : textSecondaryClass
                  }`}
              >
                {t === "mylist" ? "My List" : "Must Watch"}
              </button>

            ))}

          </div>
        </div>
      </div>



      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-6 relative pb-24">
        {tab === "mylist" && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search & Add"
                className={`w-full pl-4 pr-4 py-3 rounded-2xl ${glassClass} ${textClass} placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all`}
              />

              {suggestions.length > 0 && (
                <ul className={`absolute w-full ${glassClass} rounded-2xl shadow-2xl mt-3 max-h-80 overflow-auto z-10`}>
                  {suggestions.map((s, i) => {
                    const sym = s?.symbol || s?.tradingsymbol || "";
                    return (
                      <li
                        key={`${sym}-${i}`}
                        onClick={() => goDetail(sym)}
                        className={`px-4 py-3 ${cardHoverClass} cursor-pointer transition-all ${i !== suggestions.length - 1 ? `border-b ${isDark ? 'border-white/10' : 'border-white/40'}` : ''
                          }`}
                      >
                        <div className="font-semibold text-lg">
                          {highlightMatch(sym, query)}
                        </div>
                        <div className={`text-sm ${textSecondaryClass}`}>
                          {highlightMatch(s.name, query)}
                        </div>
                        <div className={`text-xs ${textSecondaryClass} mt-1`}>
                          {(s.exchange || "NSE")} | {s.segment} | {s.instrument_type}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* WATCHLIST LIST */}
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
                      className={`${glassClass} p-5 rounded-3xl ${cardHoverClass} cursor-pointer transition-all duration-300 shadow-xl`}
                      onClick={() => goDetail(sym)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-2xl font-bold mb-2">{sym}</div>
                          <div className={`text-sm ${textSecondaryClass} flex items-center space-x-2`}>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isDark ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}>
                              {q.exchange || "NSE"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-3xl font-bold mb-1 ${isPos ? "text-emerald-400" : "text-rose-400"
                            }`}>
                            {q.price != null
                              ? Number(q.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "--"}
                          </div>
                          <div className={`text-sm font-semibold flex items-center justify-end space-x-2 ${isPos ? "text-emerald-400" : "text-rose-400"
                            }`}>
                            {q.change != null && (
                              <>
                                <span>
                                  {isPos ? "+" : ""}{Number(q.change).toFixed(2)}
                                </span>
                                <span>({Number(q.pct_change || 0).toFixed(2)}%)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {whatsappList.includes(sym) && (
                            <FaWhatsapp
                              className="text-green-400 text-xl cursor-default"
                              title="Added to WhatsApp Alerts"
                            />
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromWatchlist(sym);
                          }}
                          className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all shadow-lg ${isDark
                            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-400/30'
                            : 'bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200'
                            }`}
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>



      {/* SCRIPT DETAILS MODAL */}
      <ScriptDetailsModal
        symbol={selectedSymbol}
        quote={selectedQuote}
        hasPosition={!!portfolioMap[selectedSymbol?.toUpperCase()]}
        onClose={() => {
          setSelectedSymbol(null);
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
          if (modalPollRef.current) {
            clearInterval(modalPollRef.current);
            modalPollRef.current = null;
          }
          previewThenSell(sym, 1, "intraday");
        }}
      />

      {/* SELL CONFIRMATION MODAL */}
      {sellConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${glassClass} p-8 rounded-3xl shadow-2xl text-center max-w-md w-full`}>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className={`mb-6 ${textClass} font-semibold text-lg`}>
              {sellConfirmMsg ||
                `You have 0 qty of ${sellSymbol}. Do you still want to sell first?`}
            </p>
            <div className="flex justify-center gap-4">
              <button
                className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg ${isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                onClick={() => setSellConfirmOpen(false)}
              >
                NO
              </button>
              <button
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-rose-500/50 transition-all"
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
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
