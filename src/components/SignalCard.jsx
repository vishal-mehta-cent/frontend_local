import React from "react";
import { useNavigate } from "react-router-dom";

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
}) {
  const navigate = useNavigate();

  // ============================================
  // 100% SAFE CLICK HANDLER (NO REDIRECT TO MENU)
  // ============================================
  const handleOrderClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }

    const type = alertType?.toLowerCase();

    if (type === "buy") {
      console.log("Navigating → /buy/" + script);
      navigate(`/buy/${script}`);
    }

    if (type === "sell") {
      console.log("Navigating → /sell/" + script);
      navigate(`/sell/${script}`);
    }
  };

  // ----------------- TIME FORMAT -----------------
  const formatTime = (t) => {
    if (!t) return "--:--";
    if (/^\d{1,2}:\d{2}/.test(t)) return t.replace(/AM|PM/i, "").trim();

    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
    return "--:--";
  };

  const formattedTime = formatTime(timeVal);

  // ----------------- FROZEN CLOSED PRICE -----------------
  const displayPrice = currentPrice;

  // ----------------- SCALE CALC -----------------
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

  // fix overlap
  if (signalPrice <= st) {
    const adjust = Math.max(Math.abs(st * 0.01), 0.5);
    signalPrice = st + adjust;
  }

  const getPos = (v) => ((v - scaleMin) / (scaleMax - scaleMin)) * 100;

  // ----------------- PROFIT / LOSS -----------------
  let pnlText = "";
  let pnlSmall = "";
  let pnlColor = "";

  if (isClosed) {
    const sp = Number(signalPrice);
    const cp = Number(displayPrice);
    const type = String(alertType).toLowerCase();

    let pnl = 0;
    if (type === "buy") pnl = (cp / sp - 1) * 100;
    else if (type === "sell") pnl = (1 - cp / sp) * 100;

    pnlText = pnl >= 0 ? "PROFIT" : "LOSS";
    pnlSmall = `(${pnl.toFixed(2)}%)`;
    pnlColor = pnl >= 0 ? "#00C853" : "#E53935";
  }

  const lineColor =
    displayPrice > signalPrice ? "#00C853" : "#E53935";

  // ----------------- MARKER POSITIONS -----------------
  const markers = [
    { key: "SUP", value: sup },
    { key: "ST", value: st },
    { key: "SIGNAL", value: signalPrice },
    { key: "LIVE", value: displayPrice },
    { key: "T", value: t },
    { key: "RES", value: res },
  ]
    .map((m) => ({ ...m, value: Number(m.value) }))
    .filter((m) => !isNaN(m.value));

  let positions = markers.map((m) => ({
    key: m.key,
    pos: getPos(m.value),
  }));

  positions.sort((a, b) => a.pos - b.pos);

  const MIN_GAP = 12;
  const SAFE = 4;

  for (let i = 1; i < positions.length; i++) {
    if (positions[i].pos - positions[i - 1].pos < MIN_GAP)
      positions[i].pos = positions[i - 1].pos + MIN_GAP;
  }

  const rightOverflow = positions[positions.length - 1].pos - (100 - SAFE);
  if (rightOverflow > 0)
    positions = positions.map((p) => ({ ...p, pos: p.pos - rightOverflow }));

  const leftOverflow = SAFE - positions[0].pos;
  if (leftOverflow > 0)
    positions = positions.map((p) => ({ ...p, pos: p.pos + leftOverflow }));

  let finalPos = {};
  positions.forEach((p) => {
    finalPos[p.key] = Math.max(SAFE, Math.min(100 - SAFE, p.pos));
  });

  const fillLeft = Math.min(finalPos["SIGNAL"], finalPos["LIVE"]);
  const fillWidth = Math.abs(finalPos["SIGNAL"] - finalPos["LIVE"]);

  // ===================================================================
  //                           RENDER
  // ===================================================================
  return (
    <div
      className="signal-card-advanced clean-line-layout"
      style={{
        opacity: isClosed ? 0.60 : 1,
        filter: isClosed ? "grayscale(0%)" : "none",
        position: "relative",
      }}
    >
      {/* ================= HEADER ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto 1fr auto",
          alignItems: "center",
          width: "100%",
          marginBottom: "0px",
        }}
      >
        <span>{formattedTime}</span>

        {/* BUY / SELL BUTTON CLICK PROTECTED */}
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
            marginLeft: "8px",
            cursor: "pointer",
            userSelect: "none",
            pointerEvents: "auto",
          }}
        >
          {isClosed ? "CLOSED" : alertType?.toUpperCase()}
        </button>

        <span
          style={{
            textAlign: "center",
            fontWeight: "700",
            fontSize: "15px",
            color: "#2962ff",
          }}
        >
          {script}
        </span>

        {isClosed ? (
          <span
            style={{
              fontWeight: "700",
              fontSize: "14px",
              color: pnlColor,
            }}
          >
            {pnlText}
          </span>
        ) : (
          !isNaN(confidence) && (
            <span style={{ fontWeight: "700" }}>
              {(Number(confidence) * 100).toFixed(2)}%
            </span>
          )
        )}
      </div>

      {isClosed && (
        <div
          style={{
            textAlign: "right",
            paddingRight: "8px",
            fontSize: "11px",
            fontWeight: "600",
            color: pnlColor,
            marginTop: "-5px",
            marginBottom: "4px",
          }}
        >
          {pnlSmall}
        </div>
      )}

      <div className="indicator-container">
        <div className="indicator-line"></div>

        <div
          className="indicator-fill"
          style={{
            left: `${fillLeft}%`,
            width: `${fillWidth}%`,
            backgroundColor: lineColor,
          }}
        ></div>

        <Marker pos={finalPos["SUP"]} label="SUP" value={sup} />
        <Marker pos={finalPos["ST"]} label="ST" value={st} line />
        <Marker pos={finalPos["SIGNAL"]} circle value={signalPrice} bubble />
        <Marker pos={finalPos["LIVE"]} triangle value={displayPrice} bubble />
        <Marker pos={finalPos["T"]} label="T" value={t} line />
        <Marker pos={finalPos["RES"]} label="RES" value={res} />
      </div>

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

// ---------------- MARKER COMPONENT ----------------
function Marker({ pos, label, value, triangle, circle, line, bubble }) {
  return (
    <div className="marker" style={{ left: `${pos}%` }}>
      {triangle && <div className="shape triangle"></div>}
      {circle && <div className="shape circle"></div>}
      {line && <div className="shape line"></div>}
      {!triangle && !circle && !line && <div className="shape square"></div>}

      {label && <div className="label-top">{label}</div>}

      {bubble ? (
        <div className="price-bubble">{value?.toFixed(2) || "--"}</div>
      ) : (
        <div className="label-bottom">{value?.toFixed(2) || "--"}</div>
      )}
    </div>
  );
}
