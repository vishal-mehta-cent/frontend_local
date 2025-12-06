// ============================================================
//                 FINAL MERGED SIGNALCARD.JSX
//          (All logic merged from BOTH versions)
// ============================================================

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

    const time24 = convertTo24(rawTime);
    const fullDT = `${rawDate} ${time24}`;

    navigate(
      `/chart/${script}?strategy=${strategy}&dt=${encodeURIComponent(
        fullDT
      )}&fromReco=1`
    );
  };

  // --------------------------------------------------------
  // FORMAT TIME
  // --------------------------------------------------------
  const formatTime = (t) => {
    if (!t) return "--:--";
    if (/^\d{1,2}:\d{2}/.test(t)) return t.replace(/AM|PM/i, "").trim();

    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
    return "--:--";
  };

  const formattedTime = formatTime(timeVal);

  // ---------------- CURRENT PRICE ----------------
  const displayPrice = currentPrice;

  // ============================================================
  //                PRICE RANGE CALCULATIONS
  // ============================================================
  const rawVals = [sup, st, signalPrice, t, res, displayPrice]
    .map(Number)
    .filter((v) => !isNaN(v) && v !== 0);

  const minRaw = Math.min(...rawVals);
  const maxRaw = Math.max(...rawVals);
  const diffRaw = maxRaw - minRaw;

  let scaleMin, scaleMax;

  if (diffRaw < 15) {
    const c = (minRaw + maxRaw) / 2;
    scaleMin = c - 7.5;
    scaleMax = c + 7.5;
  } else {
    const pad = diffRaw * 0.15;
    scaleMin = minRaw - pad;
    scaleMax = maxRaw + pad;
  }

  // Ensure SIGNAL > ST
  if (signalPrice <= st) {
    const adjust = Math.max(Math.abs(st * 0.01), 0.5);
    signalPrice = st + adjust;
  }

  const getPos = (v) => ((v - scaleMin) / (scaleMax - scaleMin)) * 100;

  // ============================================================
  //                   MARKER POSITIONS
  // ============================================================
  let positions = {
    SUP: !isNaN(Number(sup)) ? getPos(Number(sup)) : null,
    ST: !isNaN(Number(st)) ? getPos(Number(st)) : 0,
    SIGNAL: getPos(Number(signalPrice)),
    LIVE: getPos(Number(displayPrice)),
    T: !isNaN(Number(t)) ? getPos(Number(t)) : 100,
    RES: !isNaN(Number(res)) ? getPos(Number(res)) : null,
  };

  Object.keys(positions).forEach((k) => {
    if (positions[k] != null) {
      positions[k] = Math.max(0, Math.min(100, positions[k]));
    }
  });

  const fillLeft = Math.min(positions["SIGNAL"], positions["LIVE"]);
  const fillWidth = Math.abs(positions["SIGNAL"] - positions["LIVE"]);

  const pnlColor =
    isClosed && Number(displayPrice) >= Number(signalPrice)
      ? "#00C853"
      : "#E53935";

  const isValidNumber = (v) =>
    v !== null && v !== undefined && !isNaN(Number(v));

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
            background:
              alertType?.toLowerCase() === "buy"
                ? "#00C853"
                : alertType?.toLowerCase() === "sell"
                ? "#E53935"
                : "#9E9E9E",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            border: "none",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
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
          (() => {
            const sp = Number(signalPrice);
            const cp = Number(displayPrice);
            const side = alertType?.toLowerCase();

            let pnl = 0;
            if (side === "buy") pnl = cp / sp - 1;
            else pnl = 1 - cp / sp;

            return (
              <span style={{ fontWeight: 700, color: pnl > 0 ? "#00C853" : "#E53935" }}>
                {pnl > 0 ? "PROFIT" : "LOSS"}
              </span>
            );
          })()
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
          {(() => {
            const sp = Number(signalPrice);
            const cp = Number(displayPrice);
            const side = alertType?.toLowerCase();

            let pnl = side === "buy" ? cp / sp - 1 : 1 - cp / sp;
            return <span>({(pnl * 100).toFixed(2)}%)</span>;
          })()}
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
        {!isNaN(Number(res)) && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ width: "12px", height: "12px", background: "#ff4800", borderRadius: "3px" }} />
            <span>RES: {Number(res).toFixed(2)}</span>
          </div>
        )}

        {!isNaN(Number(sup)) && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ width: "12px", height: "12px", background: "#a200ff", borderRadius: "3px" }} />
            <span>SUP: {Number(sup).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* ---------------- PRICE INDICATOR LINE ---------------- */}
      <div className="indicator-container">
        <div className="indicator-line" />

        <div
          className="indicator-fill"
          style={{
            left: `${fillLeft}%`,
            width: `${fillWidth}%`,
            backgroundColor:
              displayPrice > signalPrice ? "#00C853" : "#E53935",
          }}
        />

        {/* SUP (no bubble) */}
        {!isNaN(Number(sup)) && (
          <Marker type="SUP" pos={positions["SUP"]} squareOnly />
        )}

        {/* ST */}
        {isValidNumber(st) && (
          <Marker pos={positions["ST"]} label="ST" value={Number(st)} line />
        )}

        {/* SIGNAL */}
        <Marker pos={positions["SIGNAL"]} circle value={signalPrice} bubble />

        {/* LIVE */}
        <Marker pos={positions["LIVE"]} triangle value={displayPrice} bubble />

        {/* T */}
        {isValidNumber(t) && (
          <Marker pos={positions["T"]} label="T" value={Number(t)} line />
        )}

        {/* RES (no bubble) */}
        {!isNaN(Number(res)) && (
          <Marker type="RES" pos={positions["RES"]} squareOnly />
        )}
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
    <div className="marker" style={{ left: `${pos}%` }}>
      {triangle && <div className="shape triangle"></div>}
      {circle && <div className="shape circle"></div>}
      {line && <div className="shape line"></div>}

      {squareOnly && (
        <div className="shape square" style={{ backgroundColor: color }}></div>
      )}

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
