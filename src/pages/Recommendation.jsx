// -------------------- FULL FILE: Recommendations.jsx --------------------

import React, { useState, useEffect, useMemo, useRef, startTransition } from "react";
import "./Recommendations.css";
import SignalCard from "../components/SignalCard";
import BackButton from "../components/BackButton";


// ---------------------------------------------------------
// ⭐ SEMICIRCLE ACCURACY GAUGE (PURE SVG) — UPDATED
//    NOW SHOWS: 
//    1️⃣ Percent (0.00%)
//    2️⃣ BUY/SELL CLOSED SIGNAL COUNT
// ---------------------------------------------------------
// ---------------------------------------------------------
// ⭐ SEMICIRCLE ACCURACY GAUGE (0% → 100% SUPPORT)
// ---------------------------------------------------------
// ---------------------------------------------------------
// ⭐ SEMICIRCLE ACCURACY GAUGE (0% → 100%)
//    ZONES:
//    <50%  = RED
//    50–75 = YELLOW
//    >75%  = GREEN
// ---------------------------------------------------------
const AccuracyGauge = ({ value, label }) => {

  // Clamp correctly between 0% → 100%
  const v = Math.max(0, Math.min(100, value));

  // Convert accuracy to needle angle:
  // 0% = 180° (far left)
  // 50% = 90° (middle)
  // 100% = 0° (right)
  const angle = 180 - (v / 100) * 180;

  const needleX = 90 + 60 * Math.cos((Math.PI / 180) * angle);
  const needleY = 100 - 60 * Math.sin((Math.PI / 180) * angle);

  return (
    <svg width="180" height="150" viewBox="0 0 180 150">

      {/* RED zone — 0% to 50% */}
      <path
        d="M10 100 A80 80 0 0 1 65 20"
        fill="none"
        stroke="#d9534f"
        strokeWidth="16"
      />

      {/* YELLOW zone — 50% to 75% */}
      <path
        d="M65 20 A80 80 0 0 1 115 20"
        fill="none"
        stroke="#f0ad4e"
        strokeWidth="16"
      />

      {/* GREEN zone — 75% to 100% */}
      <path
        d="M115 20 A80 80 0 0 1 170 100"
        fill="none"
        stroke="#5cb85c"
        strokeWidth="16"
      />

      {/* Needle Line */}
      <line
        x1="90"
        y1="100"
        x2={needleX}
        y2={needleY}
        stroke="black"
        strokeWidth="3"
      />

      {/* Needle Center Dot */}
      <circle cx="90" cy="100" r="5" fill="black" />

      {/* Accuracy % */}
      <text
        x="90"
        y="122"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#000"
      >
        {value.toFixed(2)}%
      </text>

      {/* Label: BUY Signals: X / SELL Signals: X */}
      <text
        x="90"
        y="142"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
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

  const pickStoploss = (r) =>
    toNum(getField(r, ["stoploss", "Stoploss", "fno_stoploss", "FNO_stoploss"]));

  const pickTarget = (r) =>
    toNum(getField(r, ["target", "Target", "fno_target", "FNO_target"]));

  const pickSupport = (r) => toNum(getField(r, ["support", "Support", "sup", "SUP"]));

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

  const pickScreener = (r) => getField(r, ["screener", "Screener"]) || "Unknown";

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
    raw = String(raw).trim();

    if (raw === "Intraday") return "intraday";
    if (raw === "Intraday - Fast Alerts") return "intraday-fast";
    if (raw === "Shortterm") return "short-term";
    if (raw === "BTST") return "btst";

    return raw.toLowerCase();
  };

  const pickAlertText = (r) => getField(r, ["alert", "ALERT", "Alert"]) || "";

  const pickUserActions = (r) => getField(r, ["user_actions"]) || "";

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
  // NORMALIZE FUNCTION
  // ----------------------------------------------------
  const normalize = (row) => {
    const script = pickScript(row);

    const sigPrice = pickSignalPrice(row);
    const live = pickCurrentPrice(row);

    const sup = pickSupport(row);
    const st = pickStoploss(row);
    const t = pickTarget(row);
    const res = pickResistance(row);

    const strategy = pickStrategy(row);
    const rawDate = pickRawDate(row);
    const dateVal = normalizeDate(rawDate);
    const timeVal = pickTime(row);
    const alertText = pickAlertText(row);
    const userActions = pickUserActions(row);

    const backendOutcome =
      row.outcome ? String(row.outcome).toUpperCase() : null;

    let outcome = backendOutcome;

    if (!outcome) {
      const hitTarget = t > 0 && live >= t;
      const hitStop = st > 0 && live <= st;

      if (hitTarget) outcome = "PROFIT";
      else if (hitStop) outcome = "LOSS";
    }

    const isClosedFinal = !!outcome;

    const rawdt = rawDate || `${dateVal} ${timeVal}`;
    const ID = `${script}-${rawdt}-${strategy}`.replace(/\s+/g, "");

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
      currentPrice: live,
      outcome,
      isClosed: isClosedFinal,
      dateVal,
      timeVal,
      alertText,
      userActions,
    };
  };

  // ----------------------------------------------------
  // FETCH CSV DATA EVERY 5 SECONDS
  // ----------------------------------------------------
  useEffect(() => {
    let alive = true;

const fetchOnce = async () => {
  try {
    const res = await fetch(
      `${API}/recommendations/data?ts=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error("Backend returned status:", res.status);
      return;
    }

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

    const uniqueScreeners = [
      "All",
      ...new Set(ordered.map((r) => r.screener)),
    ];
    const uniqueAlertTypes = [
      "All",
      ...new Set(ordered.map((r) => r.alertType)),
    ];

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
  }, [closedPriceMap]);

  // -------------------------------------------------------
  // FILTERING
  // -------------------------------------------------------
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
    const allActive = filteredRows.filter((r) => !r.outcome);
    return allActive.slice(0, 30); // SHOW 30 ACTIVE SIGNALS
  }, [filteredRows]);

  const closedSignals = useMemo(
    () => filteredRows.filter((r) => r.outcome),
    [filteredRows]
  );

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

  // -------------------------------------------------------
  // SIGNALS LAYOUT
  // -------------------------------------------------------
  const renderSignalLayout = () => (
    <div className="intraday-section">

      {/* ---------------- DATE ROW ---------------- */}
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
            <select
              value={subIntraday}
              onChange={(e) => setSubIntraday(e.target.value)}
            >
              <option>All</option>
              <option>Intraday</option>
              <option>Intraday - Fast Alerts</option>
            </select>
          </div>
        )}

        <div className="filter-item">
          <label>Segment:</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            <option>Equity</option>
            <option>F&O</option>
          </select>
        </div>
      </div>

      {/* ---------------- DROPDOWN FILTERS ---------------- */}
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

      {/* ---------------- LEGEND ---------------- */}
      <div className="legend-row">
        <div className="legend-box">
          <h4>Accromance</h4>
          <p>
            <strong>RES</strong> = Resistance | <strong>SUP</strong> = Support
          </p>
          <p>
            <strong>T</strong> = Target | <strong>ST</strong> = Stoploss
          </p>
          <p>▲ = Current Price | ● = Signal Price</p>
        </div>
      </div>

      {/* ---------------- SIGNALS SECTION ---------------- */}
      <div className="signals-section">
        <div className="signals-columns">

          {/* ====================================================
                  ACTIVE SIGNALS
              ==================================================== */}
          <div className="signals-column">
            <h3 className="section-title active-title">Active Signals</h3>

            {/* BUY / SELL COUNTS */}

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
                <div style={{
                  width: "100%",
                  textAlign: "left",
                  marginBottom: "4px",
                  paddingLeft: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333"
                }}>
                  % = Confidence
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
                      />
                    ))
                  ) : (
                    <p>No active signals.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ====================================================
                  CLOSED SIGNALS
              ==================================================== */}
          <div className="signals-column">
            <h3 className="section-title closed-title">Closed Signals</h3>

            {/* ⭐ Updated TWO Speedometers with BUY / SELL counts ⭐ */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "70px",
                margin: "10px 0 30px 0",
                alignItems: "center",
              }}
            >
              {/* BUY Speedometer */}
              <div style={{ textAlign: "center" }}>
                <AccuracyGauge
                  value={buyClosedAccuracy}
                  label={`BUY Signals: ${buyClosedCount}`}
                />
              </div>

              {/* SELL Speedometer */}
              <div style={{ textAlign: "center" }}>
                <AccuracyGauge
                  value={sellClosedAccuracy}
                  label={`SELL Signals: ${sellClosedCount}`}
                />
              </div>
            </div>
            {/* CLOSED SIGNALS GRID */}
            <div className="closed-signals-container">
              <div style={{
                width: "100%",
                textAlign: "left",
                marginBottom: "4px",
                paddingLeft: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                % = Gain
              </div>
              <div className="signal-grid">
                {closedSignals.length > 0 ? (
                  closedSignals.map((sig) => {
                    const isProfit = sig.outcome === "PROFIT";

                    return (
                      <div
                        className="closed-card-wrapper"
                        key={sig.id}
                        style={{
                          backgroundColor: isProfit ? "#e6ffe6" : "#ffe5e5",
                        }}
                      >
                        {/* PNL Section */}
                        {(() => {
                          const sp = Number(sig.signalPrice);
                          const cp = Number(sig.currentPrice);
                          const side = String(sig.alertType).toLowerCase();

                          let pnl = 0;
                          if (side === "buy") pnl = (cp / sp - 1) * 100;
                          else pnl = (1 - cp / sp) * 100;

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
                                marginBottom: "-6px",
                              }}
                            ></div>
                          );
                        })()}

                        {/* SIGNAL CARD INSIDE CLOSED */}
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
              </div>
            </div>
          </div>
          {/* END CLOSED SIGNALS COLUMN */}
        </div>
        {/* end signals-columns */}
      </div>
      {/* end signals-section */}
    </div>
    /* end intraday-section */
  );

  // -------------------------------------------------------
  // MAIN PAGE RETURN
  // -------------------------------------------------------
  return (
    <div className="recommendations-container">
      <BackButton to="/menu" />

      <h2 className="text-center text-xl font-bold text-blue-600">
        RECOMMENDATIONS
      </h2>

      {/* MAIN CATEGORY BUTTONS */}
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

      {/* MAIN CONTENT */}
      <div className="recommendation-content">{renderSignalLayout()}</div>
    </div>
  );
}
