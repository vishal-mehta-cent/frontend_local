// ============================================================
//                 FINAL UPDATED SIGNALCARD.JSX
//     (Correct BUY/SELL PNL Logic + Live>Signal Color Rule)
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
  closeTime,   // ⭐ ADD THIS
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

  const extractTimeFromDate = (d) => {
    if (!d) return "--:--";

    // Matches: 12/08/2025 09:15 OR 2025-12-08 09:15
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
    timeVal && timeVal !== "--:--"
      ? formatTime(timeVal)
      : extractTimeFromDate(rawDate);


  // ---------------- CURRENT PRICE ----------------
  const sp = Number(signalPrice);
  // Closed cards receive frozen price from backend
  const cp = Number(currentPrice);

  // Format close_time from CSV (contains both date + time)
  const formatCloseDateTime = (ct) => {
    if (!ct) return "";

    // Normalize string (replace multiple slashes/spaces)
    let norm = ct.replace(/-/g, "/").trim();  // allow 12-03-2025 or 12/03/2025
    norm = norm.replace(/\s+/g, " ");         // collapse multiple spaces

    // Extract date/time using robust regex:
    const regex = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/;
    const m = norm.match(regex);

    if (!m) return ct; // fallback

    let [_, dd, mm, yyyy, hh, min, sec, ampm] = m;

    dd = parseInt(dd);
    mm = parseInt(mm) - 1;     // Month index
    yyyy = yyyy.length === 2 ? Number("20" + yyyy) : Number(yyyy);
    hh = parseInt(hh);
    min = parseInt(min);

    // Handle AM/PM
    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === "PM" && hh < 12) hh += 12;
      if (ampm === "AM" && hh === 12) hh = 0;
    }

    const d = new Date(yyyy, mm, dd, hh, min);

    if (isNaN(d)) return ct;

    // ----- OUTPUT FORMAT -----
    const outDay = d.getDate();
    const outMonth = d.getMonth() + 1;

    let outHour = d.getHours();
    let outMinutes = String(d.getMinutes()).padStart(2, "0");

    let outAMPM = outHour >= 12 ? "PM" : "AM";
    if (outHour > 12) outHour -= 12;
    if (outHour === 0) outHour = 12;

    return `${outDay}/${outMonth} | ${outHour}:${outMinutes} ${outAMPM}`;
  };



  const formattedCloseDT = formatCloseDateTime(closeTime);




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

  // ⭐ For closed signals LIVE = closePrice
  const liveOrClosePos = positions.LIVE;

  const fillLeft = Math.min(positions.SIGNAL, liveOrClosePos);
  const fillWidth = Math.abs(positions.SIGNAL - liveOrClosePos);

  const isValid = (v) => v !== null && !isNaN(Number(v));

  // ============================================================
  // ⭐ LIVE VS SIGNAL COLOR RULE (FINAL)
  // ============================================================
  /*const lineColor = isClosed ? "#999" : (cp > sp ? "#00C853" : "#E53935");*/
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

      {/* ---------------- HEADER ---------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto auto auto",
          alignItems: "center",
          gap: "8px",
        }}
      >

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: "13px",
            marginTop: "-10px"   // ⭐ move label upward 1–2 steps
          }}
        >
          <span
            style={{
              fontSize: "8px",
              color: "#666",
              marginBottom: "1px",   // ⭐ reduce gap between label & time
            }}
          >
            Signal Time
          </span>

          <span style={{ fontWeight: "600", fontSize: "13px" }}>
            {formattedTime}
          </span>

          {/* DATE (FROM CSV) */}
          {rawDate && (
            <span
              style={{
                fontSize: "10px",
                color: "#444",
                marginTop: "2px",
              }}
            >
              <strong>Signal Date:-</strong>{" "}
              {(() => {
                const [, m, d] = rawDate.split("-");
                return `${m}/${d}`;
              })()}
            </span>
          )}

        </div>


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
      {/* ⭐ ONLY SHOW CLOSE DATE/TIME IF CLOSED SIGNAL */}
      {isClosed && formattedCloseDT && (
        <div
          style={{
            marginTop: "-4px",
            marginLeft: "5px",
            fontSize: "11px",
            color: "#444",
            fontWeight: "600",
          }}
        >
          Close Time: {formattedCloseDT}
        </div>
      )}

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
