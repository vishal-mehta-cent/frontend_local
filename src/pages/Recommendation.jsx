// -------------------- FULL FILE: Recommendations.jsx --------------------

import React, { useState, useEffect, useMemo, useRef, startTransition } from "react";
import "./Recommendations.css";
import SignalCard from "../components/SignalCard";
import BackButton from "../components/BackButton";

export default function Recommendations() {
  const [rows, setRows] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const [segment, setSegment] = useState("Equity");
  const [selectedScreener, setSelectedScreener] = useState("All");
  const [screenerList, setScreenerList] = useState([]);

  const [selectedAlertType, setSelectedAlertType] = useState("All");
  const [alertTypeList, setAlertTypeList] = useState([]);

  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  const [activeType, setActiveType] = useState("Intraday");
  const [subIntraday, setSubIntraday] = useState("All");
  const [priceCloseFilter, setPriceCloseFilter] = useState("All");

  // ⭐ NEW: store frozen closed prices here
  const [closedPriceMap, setClosedPriceMap] = useState({});

  const API =
    (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
      .toString()
      .replace(/\/+$/, "");

  const toNum = (v) => {
    if (v === null || v === undefined) return undefined;
    const n = Number.parseFloat(typeof v === "string" ? v.replace(/[, ]/g, "") : v);
    return Number.isFinite(n) ? n : undefined;
  };

  const normalizeDate = (raw) => {
    if (!raw) return "";

    let s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    s = s.split(" ")[0];

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [m, d, y] = s.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(s)) {
      let [m, d, y] = s.split("/");
      y = "20" + y;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
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

  // Pickers
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
    toNum(getField(r, ["signal_price", "close_price", "Signal_price", "Signal Price"]));

  const pickCurrentPrice = (r) => toNum(r.currentPrice);

  const pickStoploss = (r) => toNum(getField(r, ["stoploss", "Stoploss", "fno_stoploss", "FNO_stoploss"]));

  const pickTarget = (r) => toNum(getField(r, ["target", "Target", "fno_target", "FNO_target"]));

  const pickSupport = (r) => toNum(getField(r, ["support", "Support", "sup", "SUP"]));

  const pickResistance = (r) => toNum(getField(r, ["resistance", "Resistance", "res", "RES"]));

  const pickAlertType = (r) => getField(r, ["signal_type", "Signal_type"]) || "N/A";

  const pickDescription = (r) =>
    getField(r, ["Alert_description", "description", "Description"]) || "";

  const pickScript = (r) => {
    let s = getField(r, ["script", "Script", "symbol", "Symbol"]);
    return s ? String(s).trim() : "N/A";
  };

  const pickScreener = (r) => getField(r, ["screener", "Screener"]) || "Unknown";

  const pickRawDate = (r) =>
    getField(r, ["raw_datetime", "Date", "date", "signal_date"]);

  const pickTime = (row) => {
    const raw = getField(row, ["raw_datetime", "Date", "date", "signal_date"]);
    if (!raw) return "--:--";
    const match = raw.match(/(\d{1,2}):(\d{2})/);
    if (!match) return "--:--";

    let hour = parseInt(match[1], 10);
    let minute = match[2];

    const ampm = hour >= 12 ? "PM" : "AM";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;

    return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  };

  const pickStrategy = (r) => {
    let raw = getField(r, ["Strategy", "strategy"]) || "";
    raw = String(raw).trim();

    if (raw === "Intraday") return "intraday";
    if (raw === "Intraday - Fast Alerts") return "intraday-fast";
    if (raw === "Shortterm") return "short-term";
    if (raw === "BTST") return "btst";

    return raw.toLowerCase();
  };

  const pickAlertText = (r) => getField(r, ["alert", "ALERT", "Alert"]) || "";

  const pickUserActions = (r) => getField(r, ["user_actions"]) || "";
  // 🔥 Fetch LIVE PRICE from Zerodha for active signals
  async function fetchLivePrice(script) {
    try {
      const res = await fetch(`${API}/quotes/price?symbol=${encodeURIComponent(script)}`);
      const json = await res.json();
      return Number(json?.price || json?.ltp || json?.last_price || json?.currentPrice);
    } catch (e) {
      console.error("Live price error for:", script, e);
      return null;
    }
  }

  // ⭐ FROZEN-CLOSED-PRICE LOGIC ADDED INTO NORMALIZE() ⭐
  const normalize = (row) => {
    const script = pickScript(row);

    const sigPrice = pickSignalPrice(row);
    let live = pickCurrentPrice(row);

    // If backend didn't provide live price → fetch from Zerodha
    if (!row.outcome) {
      live = row.__liveFetched || live;

      if (!live || live === sigPrice) {
        // mark script so that we will fetch live price later
        row.__needLive = true;
      }
    }

    const sup = pickSupport(row) || 0;
    const st = pickStoploss(row) || 0;
    const t = pickTarget(row) || 0;
    const res = pickResistance(row) || 0;

    const strategy = pickStrategy(row);
    const rawDate = pickRawDate(row);
    const dateVal = normalizeDate(rawDate);
    const timeVal = pickTime(row);

    let outcome = null;

    // ⭐ Detect close condition first
    const hitTarget = t > 0 && live >= t;
    const hitStop = st > 0 && live <= st;

    if (hitTarget) outcome = "PROFIT";
    else if (hitStop) outcome = "LOSS";

    const ID = `${script}-${dateVal}-${timeVal}-${strategy}`;

    // ⭐ If closed & no frozen price exists → freeze it NOW
    if (outcome && closedPriceMap[ID] === undefined) {
      setClosedPriceMap((prev) => ({
        ...prev,
        [ID]: live, // freeze exact live price at hit
      }));
    }

    // ⭐ If closed → use frozen price
    let finalPrice = live;
    if (outcome && closedPriceMap[ID] !== undefined) {
      finalPrice = closedPriceMap[ID];
    }

    return {
      id: ID,
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
      currentPrice: finalPrice, // ⭐ USE FROZEN PRICE FOR CLOSED SIGNALS
      outcome,
      dateVal,
      timeVal,
      alertText: pickAlertText(row),
      userActions: pickUserActions(row),
    };
  };

  // Fetch CSV + keep backend alive
  useEffect(() => {
    let alive = true;

    const fetchOnce = async () => {
      try {
        const res = await fetch(`${API}/recommendations/data?ts=${Date.now()}`, {
          cache: "no-store",
        });

        const json = await res.json();
        if (!alive) return;

        const normalized = (Array.isArray(json) ? json : []).map(normalize);

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

        startTransition(() => {
          setScreenerList(uniqueScreeners);
          setAlertTypeList(uniqueAlertTypes);

          setRows(ordered);
          setInitialLoading(false);
        });
      } catch (e) {
        console.error("Fetch failed:", e);
        setInitialLoading(false);
      }
    };

    fetchOnce();
    const id = setInterval(fetchOnce, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [closedPriceMap]); // ⭐ VERY IMPORTANT — updates UI when frozen prices change


  // Filtering
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchDate = r.dateVal === selectedDate;

      const matchScreener =
        selectedScreener === "All" ||
        (r.screener || "").toLowerCase() === selectedScreener.toLowerCase();

      const matchAlert =
        selectedAlertType === "All" ||
        (r.alertType || "").toLowerCase() === selectedAlertType.toLowerCase();

      let matchStrategy = true;
      if (activeType === "Intraday") {
        matchStrategy = ["intraday", "intraday-fast"].includes(r.strategy);
      } else if (activeType === "BTST") {
        matchStrategy = r.strategy === "btst";
      } else if (activeType === "Short-term") {
        matchStrategy = r.strategy === "short-term";
      }

      let matchSub = true;
      if (activeType === "Intraday") {
        if (subIntraday === "Intraday") matchSub = r.strategy === "intraday";
        else if (subIntraday === "Intraday - Fast Alerts")
          matchSub = r.strategy === "intraday-fast-alerts";
      }

      const matchPriceClose =
        priceCloseFilter === "All" ||
        (r.priceCloseTo || "").toLowerCase().includes(priceCloseFilter.toLowerCase());

      return matchDate && matchScreener && matchAlert && matchStrategy && matchSub && matchPriceClose;
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

  const activeSignals = useMemo(() => {
    const allActive = filteredRows.filter((r) => !r.outcome);
    return allActive.slice(0, 10);
  }, [filteredRows]);

  const closedSignals = useMemo(
    () => filteredRows.filter((r) => r.outcome),
    [filteredRows]
  );

  const renderSignalLayout = () => (
    <div className="intraday-section">
      <div className="filters-row date-row-centered">


        <div className="filter-item">
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {activeType === "Intraday" && (
          <div className="filter-item">
            <label>Intraday Type:</label>
            <select value={subIntraday} onChange={(e) => setSubIntraday(e.target.value)}>
              <option>All</option>
              <option>Intraday</option>
              <option>Intraday - Fast Alerts</option>
            </select>
          </div>
        )}

        <div className="filter-item">
          <label>Segment:</label>
          <select value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option>Equity</option>
            <option>F&O</option>
          </select>
        </div>

      </div>

      <div className="filters-row filters-row-legend">
        <div className="filter-item">
          <label>Alert Type:</label>
          <select
            value={selectedAlertType}
            onChange={(e) => setSelectedAlertType(e.target.value)}
          >
            {alertTypeList.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Screener:</label>
          <select
            value={selectedScreener}
            onChange={(e) => setSelectedScreener(e.target.value)}
          >
            {screenerList.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Price Close To:</label>
          <select
            value={priceCloseFilter}
            onChange={(e) => setPriceCloseFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Resistance">Resistance</option>
            <option value="Support">Support</option>
            <option value="Breakout">Breakout</option>
            <option value="Bearish">Bearish</option>
            <option value="Bullish">Bullish</option>
          </select>
        </div>

      </div>
      <div className="legend-row">
        <div className="legend-box">
          <h4>Accromance</h4>
          <p><strong>RES</strong> = Resistance | <strong>SUP</strong> = Support</p>
          <p><strong>T</strong> = Target | <strong>ST</strong> = Stoploss</p>
          <p>▲ = Current Price | ● = Signal Price</p>

        </div>
      </div>

      <div className="signals-section">
        <div className="legend-row">
        </div>

        <div className="signals-columns">
          <div className="signals-column">
            <h3 className="section-title active-title">Active Signals</h3>
            <p><strong>%</strong> = Confidence</p>
            {initialLoading ? (
              <p>Loading data...</p>
            ) : (
              <div className="active-signals-container">
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
                      />

                    ))
                  ) : (
                    <p>No active signals.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="signals-column">
            <h3 className="section-title closed-title">Closed Signals</h3>
            <p><strong>%</strong> = Gain</p>
            <div className="closed-signals-container">
              <div className="signal-grid">
                {closedSignals.length > 0 ? (
                  closedSignals.map((sig) => {
                    const isProfit = sig.outcome === "PROFIT";
                    const color = isProfit ? "#00C853" : "#E53935";

                    return (
                      <div
                        className="closed-card-wrapper"
                        style={{
                          backgroundColor: sig.outcome === "PROFIT" ? "#e6ffe6" : "#ffe5e5",
                        }}
                        key={sig.id}
                      >

                        {/* Outcome Badge */}

                        {/* ----- NEW: P&L % positioned under script ----- */}
                        {(() => {
                          const sp = Number(sig.signalPrice);
                          const cp = Number(sig.currentPrice);
                          const type = String(sig.alertType).toLowerCase();

                          let pnl = 0;
                          if (type === "buy") pnl = (cp / sp - 1) * 100;
                          else if (type === "sell") pnl = (1 - cp / sp) * 100;

                          const pnlColor = pnl >= 0 ? "#00C853" : "#E53935";

                          return (
                            <div
                              style={{
                                width: "100%",
                                textAlign: "right",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: pnlColor,
                                paddingRight: "10px",
                                marginTop: "4px",
                                marginBottom: "-6px",  // tightly fits without enlarging card height
                              }}
                            >
                            </div>
                          );
                        })()}

                        {/* Main Signal Card */}
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
                        />

                      </div>


                    );
                  })
                ) : (
                  <p>No closed signals.</p>
                )}
              </div>{/* signal-grid */}
            </div>{/* closed-signals-container */}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="recommendations-container">
      <BackButton to="/menu" />
      <h2 className="text-center text-xl font-bold text-blue-600">
        RECOMMENDATIONS
      </h2>

      <div className="recommendation-buttons">
        {["Intraday", "BTST", "Short-term"].map((type) => (
          <button
            key={type}
            className={`rec-btn ${activeType === type ? "active" : ""}`}
            onClick={() => {
              setActiveType(type);
              setSubIntraday("All");
            }}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="recommendation-content">{renderSignalLayout()}</div>
    </div>
  );
}
