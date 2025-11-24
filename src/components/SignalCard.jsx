import React from "react";

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
  // ----------------- TIME FORMAT -----------------
  const formatTime = (t) => {
    if (!t) return "--:--";

    // If already cleaned (09:27)
    if (/^\d{1,2}:\d{2}/.test(t)) {
      return t.replace(/AM|PM/i, "").trim();
    }

    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
    }

    return "--:--";
  };

  const formattedTime = formatTime(timeVal);

  // ----------------- CLOSED SIGNAL LOGIC -----------------
  let closedPrice = currentPrice;
  if (isClosed) {
    closedPrice = currentPrice; // freeze
  }

  const displayPrice = isClosed ? closedPrice : currentPrice;

  // ----------------- RAW VALUES -----------------
  const rawVals = [sup, st, signalPrice, t, res, displayPrice]
    .map(Number)
    .filter((v) => !isNaN(v) && v !== 0);

  const minRaw = Math.min(...rawVals);
  const maxRaw = Math.max(...rawVals);
  const diffRaw = maxRaw - minRaw;

  // ----------------- SCALING -----------------
  let scaleMin, scaleMax;
  if (diffRaw < 15) {
    const center = (minRaw + maxRaw) / 2;
    scaleMin = center - 7.5;
    scaleMax = center + 7.5;
  } else {
    const pad = diffRaw * 0.15;
    scaleMin = minRaw - pad;
    scaleMax = maxRaw + pad;
  }

  // Fix if signalPrice <= stoploss
  if (
    signalPrice !== undefined &&
    st !== undefined &&
    !isNaN(signalPrice) &&
    !isNaN(st) &&
    signalPrice <= st
  ) {
    const adjust = Math.max(Math.abs(st * 0.01), 0.5);
    signalPrice = st + adjust;
  }

  const getPos = (val) =>
    ((val - scaleMin) / (scaleMax - scaleMin)) * 100;

  const isProfit = displayPrice > signalPrice;
  const color = isProfit ? "#00C853" : "#E53935";

  // ----------------- MARKER POSITIONS -----------------
  const markers = [
    { key: "SUP", value: Number(sup) },
    { key: "ST", value: Number(st) },
    { key: "SIGNAL", value: Number(signalPrice) },
    { key: "LIVE", value: Number(displayPrice) },
    { key: "T", value: Number(t) },
    { key: "RES", value: Number(res) },
  ].filter((m) => !isNaN(m.value));

  let positions = markers.map((m) => ({
    key: m.key,
    pos: getPos(m.value),
  }));

  positions.sort((a, b) => a.pos - b.pos);

  const MIN_GAP = 12;
  const SAFE_OFFSET = 4;

  // spacing pass 1
  for (let i = 1; i < positions.length; i++) {
    if (positions[i].pos - positions[i - 1].pos < MIN_GAP) {
      positions[i].pos = positions[i - 1].pos + MIN_GAP;
    }
  }

  // right clamp
  let overflowRight = positions[positions.length - 1].pos - (100 - SAFE_OFFSET);
  if (overflowRight > 0) {
    for (let i = 0; i < positions.length; i++) {
      positions[i].pos -= overflowRight;
    }
  }

  // left clamp
  let overflowLeft = SAFE_OFFSET - positions[0].pos;
  if (overflowLeft > 0) {
    for (let i = 0; i < positions.length; i++) {
      positions[i].pos += overflowLeft;
    }
  }

  // spacing pass 2
  for (let i = 1; i < positions.length; i++) {
    if (positions[i].pos - positions[i - 1].pos < MIN_GAP) {
      positions[i].pos = positions[i - 1].pos + MIN_GAP;
    }
  }

  positions = positions.map((p) => ({
    key: p.key,
    pos: Math.max(SAFE_OFFSET, Math.min(100 - SAFE_OFFSET, p.pos)),
  }));

  let finalPos = {};
  positions.forEach((p) => {
    finalPos[p.key] = p.pos;
  });

  const clampText = (pos) => {
    const leftLimit = SAFE_OFFSET + 2;
    const rightLimit = 100 - SAFE_OFFSET - 2;
    return Math.max(leftLimit, Math.min(rightLimit, pos));
  };

  ["SUP", "ST", "T", "RES", "SIGNAL", "LIVE"].forEach((k) => {
    if (finalPos[k] !== undefined) finalPos[k] = clampText(finalPos[k]);
  });

  // ----------------- FILL BAR (ALWAYS VISIBLE) -----------------
  const fillLeft = Math.min(finalPos["SIGNAL"], finalPos["LIVE"]);
  const fillWidth = Math.abs(finalPos["SIGNAL"] - finalPos["LIVE"]);

  // ----------------- RENDER -----------------
  return (
    <div
      className="signal-card-advanced clean-line-layout"
      style={{
        opacity: isClosed ? 0.55 : 1,
        filter: isClosed ? "grayscale(70%)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="signal-header"
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto 1fr auto",
          alignItems: "center",
          width: "100%",
        }}
      >
        <span className="signal-time">{formattedTime}</span>

        <span
          className="alert-badge"
          style={{
            backgroundColor:
              alertType?.toLowerCase() === "buy"
                ? "#00C853"
                : alertType?.toLowerCase() === "sell"
                  ? "#E53935"
                  : "#9E9E9E",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
            marginLeft: "6px",
          }}
        >
          {isClosed ? "CLOSED" : alertType?.toUpperCase() || "--"}
        </span>

        <span
          className="signal-script"
          style={{
            textAlign: "center",
            fontWeight: "700",
            color: "#2962ff",
            fontSize: "15px",
            width: "100%",
          }}
        >
          {script || "N/A"}
        </span>

        <span className="signal-confidence">
          {confidence !== null ? `${confidence}%` : "--"}
        </span>
      </div>

      {/* Price line */}
      <div className="indicator-container">
        <div className="indicator-line"></div>

        {/* ⭐ ALWAYS VISIBLE — even for CLOSED ⭐ */}
        <div
          className="indicator-fill"
          style={{
            left: `${fillLeft}%`,
            width: `${fillWidth}%`,
            backgroundColor: color,
          }}
        ></div>

        {/* SUP */}
        <div className="marker" style={{ left: `${finalPos["SUP"]}%` }}>
          <div className="shape square"></div>
          <div className="label-top">SUP</div>
          <div className="label-bottom">{sup?.toFixed(2) || "--"}</div>
        </div>

        {/* ST */}
        <div className="marker" style={{ left: `${finalPos["ST"]}%` }}>
          <div className="shape line"></div>
          <div className="label-top">ST</div>
          <div className="label-bottom">{st?.toFixed(2) || "--"}</div>
        </div>

        {/* Signal Price */}
        <div className="marker" style={{ left: `${finalPos["SIGNAL"]}%` }}>
          <div className="shape circle"></div>
          <div className="price-bubble">{signalPrice?.toFixed(2) || "--"}</div>
        </div>

        {/* LIVE — Always visible */}
        <div className="marker" style={{ left: `${finalPos["LIVE"]}%` }}>
          <div className="shape triangle"></div>
          <div className="price-bubble price-bubble-live">
            {displayPrice?.toFixed(2) || "--"}
          </div>
        </div>

        {/* T */}
        <div className="marker" style={{ left: `${finalPos["T"]}%` }}>
          <div className="shape line"></div>
          <div className="label-top">T</div>
          <div className="label-bottom">{t?.toFixed(2) || "--"}</div>
        </div>

        {/* RES */}
        <div className="marker" style={{ left: `${finalPos["RES"]}%` }}>
          <div className="shape square"></div>
          <div className="label-top">RES</div>
          <div className="label-bottom">{res?.toFixed(2) || "--"}</div>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          background: "#FFF8C4",
          border: "2px solid #F4D03F",
          borderRadius: "8px",
          padding: "10px 12px",
          marginTop: "10px",
          fontSize: "13px",
          lineHeight: "1.4",
        }}
      >
        <div style={{ marginBottom: "6px" }}>
          <strong>Alert:</strong> {alertText || "--"}
        </div>

        <div>
          <strong>Description:</strong> {userActions || "--"}
        </div>
      </div>
    </div>
  );
}
