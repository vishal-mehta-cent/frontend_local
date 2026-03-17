// ============================================================
//                 FINAL UPDATED SIGNALCARD.JSX
//   (BUY/SELL/CHART back -> Recommendations with filters)
// ============================================================

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LineChart } from "lucide-react";

export default function SignalCard({
  script,
  confidence,
  alertType,
  alertText,
  description,
  sup,
  st,
  t,
  res,
  signalPrice,
  currentPrice,
  timeVal,
  dateVal,
  userActions,
  fnoValidation,
  isClosed = false,
  strategy,
  rawDate,
  rawTime,
  closeTime, // ⭐ ADD THIS
  returnTo = null, // ✅ NEW (from Recommendations)
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ If returnTo not provided, fallback to current page (rare case)
  const finalReturnTo = returnTo || `${location.pathname}${location.search || ""}`;

  // --------------------------------------------------------
  // BUY / SELL NAVIGATION (with returnTo)
  // --------------------------------------------------------
  const handleOrderClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent?.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }

    const type = alertType?.toLowerCase();

    if (type === "buy") {
      navigate(`/buy/${script}`, { state: { returnTo: finalReturnTo } });
    }
    if (type === "sell") {
      navigate(`/sell/${script}`, { state: { returnTo: finalReturnTo } });
    }
  };

  // --------------------------------------------------------
  // OPEN CHART WITH EXACT DATETIME (with returnTo)
  // --------------------------------------------------------
  const openChart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const convertTo24 = (t) => {
      if (!t) return "00:00";
      let [time, modifier] = t.split(" ");
      let [hours, minutes] = time.split(":");
      hours = parseInt(hours, 10);

      if (modifier?.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    };

    const fullDT = `${rawDate} ${convertTo24(rawTime)}`;

    navigate(
      `/chart/${script}?strategy=${strategy}&dt=${encodeURIComponent(fullDT)}&fromReco=1`,
      { state: { returnTo: finalReturnTo } }
    );
  };

  // --------------------------------------------------------
  // FORMAT TIME
  // --------------------------------------------------------
  const formatTime = (t) => {
    if (!t) return "--:--";
    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (!match) return "--:--";
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  };

  const extractTimeFromDate = (d) => {
    if (!d) return "--:--";
    const m = String(d).match(/(\d{1,2}):(\d{2})/);
    if (!m) return "--:--";

    let hh = parseInt(m[1], 10);
    const mm = m[2];

    let ampm = hh >= 12 ? "PM" : "AM";
    if (hh > 12) hh -= 12;
    if (hh === 0) hh = 12;

    return `${hh.toString().padStart(2, "0")}:${mm} ${ampm}`;
  };

  const formattedTime =
    timeVal && timeVal !== "--:--" ? formatTime(timeVal) : extractTimeFromDate(rawDate);

  // ---------------- CURRENT PRICE ----------------
  const sp = Number(signalPrice);
  const cp = Number(currentPrice);

  // Format close_time from CSV (contains both date + time)
  const formatCloseDateTime = (ct) => {
    if (!ct) return "";

    const raw = String(ct).trim();
    if (!raw) return "";

    const normalized = raw.replace("T", " ").replace(/\s+/g, " ");

    let yyyy;
    let mm;
    let dd;
    let hh = 0;
    let min = 0;
    let ampm = null;

    // ✅ Handle ISO style first: YYYY-MM-DD HH:mm:ss or YYYY/MM/DD HH:mm:ss
    let m = normalized.match(
      /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?)?$/
    );

    if (m) {
      yyyy = Number(m[1]);
      mm = Number(m[2]);
      dd = Number(m[3]);
      hh = Number(m[4] || 0);
      min = Number(m[5] || 0);
      ampm = m[6] || null;
    } else {
      // ✅ Handle DD/MM/YYYY or MM/DD/YYYY
      m = normalized.match(
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?)?$/
      );

      if (!m) return raw;

      const first = Number(m[1]);
      const second = Number(m[2]);
      yyyy = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
      hh = Number(m[4] || 0);
      min = Number(m[5] || 0);
      ampm = m[6] || null;

      // If first part is > 12, it must be DD/MM/YYYY, otherwise default to MM/DD/YYYY
      if (first > 12) {
        dd = first;
        mm = second;
      } else {
        mm = first;
        dd = second;
      }
    }

    if (ampm) {
      const upper = String(ampm).toUpperCase();
      if (upper === "PM" && hh < 12) hh += 12;
      if (upper === "AM" && hh === 12) hh = 0;
    }

    const d = new Date(yyyy, mm - 1, dd, hh, min);
    if (Number.isNaN(d.getTime())) return raw;

    const outMonth = d.getMonth() + 1;
    const outDay = d.getDate();
    let outHour = d.getHours();
    const outMinutes = String(d.getMinutes()).padStart(2, "0");
    const outAMPM = outHour >= 12 ? "PM" : "AM";

    if (outHour > 12) outHour -= 12;
    if (outHour === 0) outHour = 12;

    return `${outMonth}/${outDay} | ${outHour}:${outMinutes} ${outAMPM}`;
  };

  const formattedCloseDT = formatCloseDateTime(closeTime);

  const formatFnoValidationValue = (value) => {
    const raw = String(value ?? "")
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

    if (!raw) return "No significant guidance";

    const lowered = raw.toLowerCase();
    if (lowered === "flat") return "No significant guidance";
    if (lowered === "no significant guidance") return "No significant guidance";

    const normalized = lowered
      .replace(/^suggest\s+/i, "")
      .replace(/\s+direction$/i, "")
      .trim();

    return normalized ? `Suggest ${normalized} Direction` : "No significant guidance";
  };

  const formattedFnoValidation = formatFnoValidationValue(fnoValidation);


  // ============================================================
  // ⭐ UNIVERSAL CORRECT PNL CALCULATION
  // ============================================================
  const side = alertType?.toLowerCase();

  let pnl = 0;
  if (side === "buy") pnl = (cp / sp - 1) * 100;
  else if (side === "sell") pnl = (1 - cp / sp) * 100;

  const isProfit = pnl > 0;
  const pnlColor = isProfit ? "#00C853" : "#E53935";

  // ============================================================
  // PRICE RANGE FOR MARKERS
  // ============================================================
  const rawVals = [sup, st, sp, t, res, cp].map(Number).filter((v) => !isNaN(v));

  const minRaw = Math.min(...rawVals);
  const maxRaw = Math.max(...rawVals);
  const diff = maxRaw - minRaw;
  const pad = diff < 15 ? 7.5 : diff * 0.15;

  const scaleMin = minRaw - pad;
  const scaleMax = maxRaw + pad;

  const getPos = (v) => ((v - scaleMin) / (scaleMax - scaleMin)) * 100;

  const positions = {
    SUP: sup ? getPos(Number(sup)) : null,
    ST: st ? getPos(Number(st)) : null,
    SIGNAL: getPos(sp),
    LIVE: getPos(cp),
    T: t ? getPos(Number(t)) : null,
    RES: res ? getPos(Number(res)) : null,
  };

  Object.keys(positions).forEach((k) => {
    if (positions[k] != null) positions[k] = Math.max(0, Math.min(100, positions[k]));
  });

  const liveOrClosePos = positions.LIVE;

  const fillLeft = Math.min(positions.SIGNAL, liveOrClosePos);
  const fillWidth = Math.abs(positions.SIGNAL - liveOrClosePos);

  const isValid = (v) => v !== null && !isNaN(Number(v));

  // ============================================================
  // ⭐ LIVE VS SIGNAL COLOR RULE (FINAL)
  // ============================================================
  const lineColor = cp > sp ? "#00C853" : "#E53935";

  // ============================================================
  //                     RENDER COMPONENT
  // ============================================================
  return (
    <div
      className={[
        "signal-card-advanced",
        "clean-line-layout",
        !isClosed && side === "buy" ? "signal-glow-buy" : "",
        !isClosed && side === "sell" ? "signal-glow-sell" : "",
      ].join(" ")}
      style={{
        opacity: isClosed ? 0.7 : 1,
        filter: isClosed ? "grayscale(0%)" : "none",
      }}
    >
      {/* ---------------- HEADER (2-ROW LAYOUT) ---------------- */}
      <div className="nc-card-head">
        {/* Row 1: time + BUY/SELL + script/chart + profit/confidence */}
        <div
          className="nc-card-head-row1"
          style={{
            display: "grid",
            gridTemplateColumns: "max-content max-content 1fr max-content",
            alignItems: "center",
            columnGap: "10px",
          }}
        >
          {/* Time */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: "13px",
              marginTop: "-8px",
            }}
          >
            <span style={{ fontSize: "8px", color: "#666", marginBottom: "1px" }}>
              Signal Time
            </span>
            <span style={{ fontWeight: "700", fontSize: "13px" }}>{formattedTime}</span>
          </div>

          {/* BUY / SELL */}
          <button
            onClick={handleOrderClick}
            style={{
              background: side === "buy" ? "#00C853" : "#E53935",
              color: "white",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "none",
              fontSize: "11px",
              fontWeight: "700",
              whiteSpace: "nowrap",
            }}
          >
            {alertType?.toUpperCase()}
          </button>

          {/* Script + chart */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontWeight: "800",
              color: "#2962ff",
              cursor: "pointer",
              minWidth: 0,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {script}
            </span>
            <span onClick={openChart} style={{ display: "inline-flex" }}>
              <LineChart size={17} color="#2962ff" />
            </span>
          </div>

          {/* Profit/LOSS + % (closed) OR Confidence (active) */}
          {isClosed ? (
            <div
              className="nc-pnl-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                lineHeight: 1.05,
                color: pnlColor,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 900, fontSize: "14px" }}>
                {isProfit ? "PROFIT" : "LOSS"}
              </span>
              <span style={{ marginTop: "6px", fontSize: "12px", fontWeight: 800 }}>
                ({pnl.toFixed(2)}%)
              </span>
            </div>
          ) : (
            !isNaN(confidence) && (
              <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                {(Number(confidence) * 100).toFixed(2)}%
              </span>
            )
          )}
        </div>

        {/* Row 2: Signal Date + Close Time (for closed) */}
        <div
          className="nc-card-head-row2"
          style={{
            marginTop: "2px",
             marginBottom: "20px", 
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            padding: "0 2px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#444",
          }}
        >
          
          {rawDate ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "baseline", whiteSpace: "nowrap" }}>
              <span style={{ opacity: 0.85 }}>Signal Date:</span>
              <span style={{ fontWeight: 800 }}>
                {(() => {
                  const [, m, d] = rawDate.split("-");
                  return `${m}/${d}`;
                })()}
              </span>
            </div>
          ) : (
            <span />
          )}

          {isClosed && formattedCloseDT ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "baseline", whiteSpace: "nowrap" }}>
              <span style={{ opacity: 0.85 }}>Close Time:</span>
              <span style={{ fontWeight: 800 }}>{formattedCloseDT}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------------- SUP / RES TOP ---------------- */}
      <div
        style={{
          display: "flex",
          gap: "18px",
          padding: "6px 5px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {isValid(res) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: "#ff4800",
                borderRadius: 3,
              }}
            />
            <span>RES: {Number(res).toFixed(2)}</span>
          </div>
        )}

        {isValid(sup) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: "#a200ff",
                borderRadius: 3,
              }}
            />
            <span>SUP: {Number(sup).toFixed(2)}</span>
          </div>
        )}
      </div>
      

      {/* Close time is now shown in the HEADER Row 2 (below Signal Date) */}

      {/* ---------------- PRICE INDICATOR LINE ---------------- */}
      <div className="indicator-container">
        <div className="indicator-line" />

        <div
          className="indicator-fill"
          style={{
            left: `${fillLeft}%`,
            width: `${fillWidth}%`,
            backgroundColor: lineColor,
          }}
        ></div>

        {isValid(sup) && <Marker type="SUP" pos={positions.SUP} squareOnly />}
        {isValid(st) && <Marker pos={positions.ST} label="ST" value={Number(st)} line />}
        <Marker pos={positions.SIGNAL} circle value={sp} bubble />
        <Marker pos={positions.LIVE} triangle value={cp} bubble />
        {isValid(t) && <Marker pos={positions.T} label="T" value={Number(t)} line />}
        {isValid(res) && <Marker type="RES" pos={positions.RES} squareOnly />}
      </div>

      {/* ---------------- ALERT + FNO VALIDATION ---------------- */}
      <div className="alert-description-box">
        <div>
          <strong>Alert:</strong> {alertText || "--"}
        </div>
        <div>
          <strong>FNO Validation:</strong> {formattedFnoValidation}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//                     MARKER COMPONENT
// ============================================================
function Marker({ type, pos, label, value, triangle, circle, line, bubble, squareOnly }) {
  let color = "#444";
  if (type === "SUP") color = "#a200ff";
  if (type === "RES") color = "#ff4800";

  return (
    <div
      className="marker"
      style={{
        left: `${pos}%`,
        zIndex: triangle || circle ? 10 : 5,
        position: "absolute",
      }}
    >
      {triangle && <div className="shape triangle"></div>}
      {circle && <div className="shape circle"></div>}
      {line && <div className="shape line"></div>}
      {squareOnly && <div className="shape square" style={{ backgroundColor: color }}></div>}
      {label && <div className="label-top">{label}</div>}

      {!squareOnly &&
        (bubble ? (
          <div className="price-bubble">{value?.toFixed(2) || "--"}</div>
        ) : (
          <div className="label-bottom">{value?.toFixed(2) || "--"}</div>
        ))}
    </div>
  );
}
