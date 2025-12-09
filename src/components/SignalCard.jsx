
import React from "react";
import { useNavigate } from "react-router-dom";
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
  isClosed = false,
  strategy,
  rawDate,
  rawTime,
}) {
  const navigate = useNavigate();

  // --------------------------------------------------------
  // BUY / SELL NAVIGATION
  // --------------------------------------------------------
  const handleOrderClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent?.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }

    const type = alertType?.toLowerCase();
    if (type === "buy") navigate(`/buy/${script}`);
    if (type === "sell") navigate(`/sell/${script}`);
  };

  // --------------------------------------------------------
  // OPEN CHART WITH EXACT DATETIME
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
      `/chart/${script}?strategy=${strategy}&dt=${encodeURIComponent(fullDT)}&fromReco=1`
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

  const formattedTime = formatTime(timeVal);

  // ---------------- CURRENT PRICE ----------------
  const sp = Number(signalPrice);
  const cp = Number(currentPrice);

  // ============================================================
  // ⭐ UNIVERSAL CORRECT PNL CALCULATION
  // ============================================================
  const side = alertType?.toLowerCase();

  let pnl = 0;
  if (side === "buy") pnl = ((cp / sp) - 1) * 100;
  else if (side === "sell") pnl = (1 - (cp / sp)) * 100;

  const isProfit = pnl > 0;
  const pnlColor = isProfit ? "#00C853" : "#E53935";

  // ============================================================
  // PRICE RANGE FOR MARKERS
  // ============================================================
  const rawVals = [sup, st, sp, t, res, cp]
    .map(Number)
    .filter((v) => !isNaN(v));

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
    if (positions[k] != null) {
      positions[k] = Math.max(0, Math.min(100, positions[k]));
    }
  });

  const fillLeft = Math.min(positions.SIGNAL, positions.LIVE);
  const fillWidth = Math.abs(positions.SIGNAL - positions.LIVE);

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
      className="signal-card-advanced clean-line-layout"
      style={{
        opacity: isClosed ? 0.6 : 1,
        filter: isClosed ? "grayscale(0%)" : "none",
      }}

    >
      {/* ---------------- HEADER ---------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto auto auto",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>{formattedTime}</span>

        <button
          onClick={handleOrderClick}
          style={{
            background: side === "buy" ? "#00C853" : "#E53935",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            border: "none",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {alertType?.toUpperCase()}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: "700",
            color: "#2962ff",
            cursor: "pointer",
          }}
        >
          {script}
          <span onClick={openChart}>
            <LineChart size={17} color="#2962ff" />
          </span>
        </div>

        {isClosed ? (
          <span style={{ fontWeight: 700, color: pnlColor }}>
            {isProfit ? "PROFIT" : "LOSS"}
          </span>
        ) : (
          !isNaN(confidence) && (
            <span style={{ fontWeight: "700" }}>
              {(Number(confidence) * 100).toFixed(2)}%
            </span>
          )
        )}
      </div>

      {/* ---------------- PNL % ---------------- */}
      {isClosed && (
        <div
          style={{
            textAlign: "right",
            paddingRight: "8px",
            fontSize: "11px",
            fontWeight: "600",
            color: pnlColor,
          }}
        >
          ({pnl.toFixed(2)}%)
        </div>
      )}

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
            <div style={{ width: 12, height: 12, background: "#ff4800", borderRadius: 3 }} />
            <span>RES: {Number(res).toFixed(2)}</span>
          </div>
        )}

        {isValid(sup) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 12, height: 12, background: "#a200ff", borderRadius: 3 }} />
            <span>SUP: {Number(sup).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* ---------------- PRICE INDICATOR LINE ---------------- */}
      <div className="indicator-container">
        {/* Base gray line */}
        <div className="indicator-line" />

        {/* Dynamic fill based ONLY on Live > Signal */}
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

      {/* ---------------- ALERT + DESCRIPTION ---------------- */}
      <div className="alert-description-box">
        <div>
          <strong>Alert:</strong> {alertText || "--"}
        </div>
        <div>
          <strong>Description:</strong> {userActions || "--"}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//                     MARKER COMPONENT
// ============================================================
function Marker({
  type,
  pos,
  label,
  value,
  triangle,
  circle,
  line,
  bubble,
  squareOnly,
}) {
  let color = "#444";
  if (type === "SUP") color = "#a200ff";
  if (type === "RES") color = "#ff4800";

  return (
    <div
      className="marker"
      style={{
        left: `${pos}%`,
        zIndex: triangle || circle ? 10 : 5,   // ⬅ LIVE & SIGNAL come to front
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
