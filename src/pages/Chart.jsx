// src/pages/Chart.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from "react";
import { FaWhatsapp } from "react-icons/fa";
import {
  CandlestickChart,
  BarChart2,
  SlidersHorizontal
} from "lucide-react";



import { useParams, useNavigate } from "react-router-dom";
import { createChart, CrosshairMode } from "lightweight-charts";
import {
  Pencil, Info, Move3D, Minus, ArrowRight,
  GripVertical, Crosshair, LineChart,
  PencilRuler, AlignHorizontalJustifyStart, AlignHorizontalSpaceAround,
  AlignVerticalJustifyStart, Moon, Sun, Sparkles, TrendingUp, Zap, Bell,
  ArrowUpRight, ArrowDownRight,
  Search, X
} from "lucide-react";

const TF_SECONDS = {
  "1m": 60,
  "2m": 120,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

function candleBucket(ts, tf) {
  const sec = TF_SECONDS[tf] || 60;
  return Math.floor(ts / sec) * sec;
}


// Convert CSV date ("2025-11-21 12:29:00+05:30") → UNIX seconds
function parseISTDateToUnix(dstr) {
  try {
    return Math.floor(new Date(dstr).getTime() / 1000);
  } catch {
    return null;
  }
}

// Find nearest candle timestamp for better alignment
function findNearestCandleTime(candles, targetTime) {
  if (!Array.isArray(candles) || !candles.length) return targetTime;
  let nearest = candles[0].time;
  let minDiff = Math.abs(targetTime - nearest);

  for (const c of candles) {
    const diff = Math.abs(c.time - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = c.time;
    }
  }
  return nearest;
}

function snapToCandleStart(candles, ts, tf) {
  const tfSec = TF_SECONDS[tf] || 60;
  if (!Array.isArray(candles) || candles.length === 0) return ts;

  // candles are sorted by time
  // We want the candle where: candle.time < = ts <= candle.time + tfSec
  // (handles "close time" timestamps like 14:11 which belong to candle starting 14:09)
  let lo = 0, hi = candles.length - 1;
  let ans = candles[0].time;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = candles[mid].time;

    if (t <= ts) {
      ans = t;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // If ts is inside [ans, ans + tfSec] snap to ans
  if (ts >= ans && ts <= ans + tfSec) return ans;

  // fallback: nearest (rare)
  return findNearestCandleTime(candles, ts);
}



const RayIcon = ArrowRight;

const API =
  (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
    .trim()
    .replace(/\/+$/, "");

const HEADER_H = 96; // 2-row sticky header height

const TF_MIN = { "1m": 1, "2m": 2, "5m": 5, "15m": 15, "1h": 60, "1d": 1440 };

// ✅ PREMIUM ALERT MODAL (Option-1) — inside Chart.jsx (no new file needed)
function AlertModal({ open, title, message, onClose, isDark, glassClass }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-5 ${isDark ? "bg-[#0b1220] border border-white/10" : "bg-white border border-black/10"
          }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={`text-[17px] font-semibold tracking-tight ${isDark ? "text-blue-300" : "text-blue-700"
                }`}
              style={{ fontFamily: "'Segoe UI', Inter, system-ui" }}

            >
              {title || "Alert"}
            </div>

            <div
              className={`mt-3 text-[14.5px] leading-[1.7] whitespace-pre-line ${isDark ? "text-slate-300" : "text-slate-600"
                }`}
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {message}
            </div>

          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-xl grid place-items-center ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"
              } transition`}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}




/* ----------------------- math helpers ----------------------- */
const SMA = (arr, p) => {
  const out = Array(arr.length).fill(undefined);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i] ?? 0;
    if (i >= p) sum -= arr[i - p] ?? 0;
    if (i >= p - 1) out[i] = sum / p;
  }
  return out;
};
const EMA = (arr, p) => {
  const out = Array(arr.length).fill(undefined);
  const k = 2 / (p + 1);
  let prev;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v == null) continue;
    prev = prev == null ? v : (v - prev) * k + prev;
    out[i] = prev;
  }
  return out;
};

/* ----------------------- indicator builders ----------------------- */
const typical = (c) => (c.high + c.low + c.close) / 3;

function ATR(candles, period = 14) {
  const TR = [];
  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const highLow = cur.high - cur.low;
    const highClose = prev ? Math.abs(cur.high - prev.close) : 0;
    const lowClose = prev ? Math.abs(cur.low - prev.close) : 0;
    TR.push(Math.max(highLow, highClose, lowClose));
  }
  const out = Array(candles.length).fill(undefined);
  const alpha = 1 / period;
  let prev;
  for (let i = 0; i < TR.length; i++) {
    prev = prev == null ? TR[i] : prev + alpha * (TR[i] - prev);
    out[i] = prev;
  }
  return out;
}

function Supertrend(candles, period = 10, multiplier = 3) {
  const atr = ATR(candles, period);
  const basicU = candles.map((c, i) =>
    atr[i] != null ? (c.high + c.low) / 2 + multiplier * atr[i] : undefined
  );
  const basicL = candles.map((c, i) =>
    atr[i] != null ? (c.high + c.low) / 2 - multiplier * atr[i] : undefined
  );

  const finalU = Array(candles.length).fill(undefined);
  const finalL = Array(candles.length).fill(undefined);
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      finalU[i] = basicU[i];
      finalL[i] = basicL[i];
    } else {
      finalU[i] =
        basicU[i] < finalU[i - 1] || candles[i - 1].close > finalU[i - 1]
          ? basicU[i]
          : finalU[i - 1];
      finalL[i] =
        basicL[i] > finalL[i - 1] || candles[i - 1].close < finalL[i - 1]
          ? basicL[i]
          : finalL[i - 1];
    }
  }

  const trend = Array(candles.length).fill(undefined);
  let upTrend = true;
  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    if (i === 0) {
      trend[i] = finalL[i];
      upTrend = true;
    } else {
      const prevUp = upTrend;
      const test = prevUp ? finalL[i] : finalU[i];
      const nextUp = close > test ? true : close < test ? false : prevUp;
      upTrend = nextUp;
      trend[i] = upTrend ? finalL[i] : finalU[i];
    }
  }
  return { trend, up: finalL, down: finalU };
}

function RSI(closes, period = 14) {
  const out = Array(closes.length).fill(undefined);
  let gain = 0, loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    if (i <= period) {
      if (ch > 0) gain += ch; else loss -= Math.min(ch, 0);
      if (i === period) {
        const rs = loss === 0 ? 100 : gain / loss;
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      gain = (gain * (period - 1) + Math.max(ch, 0)) / period;
      loss = (loss * (period - 1) + Math.max(-ch, 0)) / period;
      const rs = loss === 0 ? 100 : gain / loss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

function StochRSI(closes, rsiPeriod = 14, stochPeriod = 14, dPeriod = 3) {
  const rsi = RSI(closes, rsiPeriod);
  const k = Array(closes.length).fill(undefined);
  for (let i = 0; i < closes.length; i++) {
    const s = Math.max(0, i - stochPeriod + 1);
    const win = rsi.slice(s, i + 1).filter(v => v != null);
    if (win.length < stochPeriod) continue;
    const min = Math.min(...win);
    const max = Math.max(...win);
    k[i] = max === min ? 50 : ((rsi[i] - min) / (max - min)) * 100;
  }
  const d = SMA(k, dPeriod);
  return { k, d };
}

function CCI(candles, period = 20) {
  const tp = candles.map(typical);
  const sma = SMA(tp, period);
  const out = Array(candles.length).fill(undefined);
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    const s = i - period + 1;
    const win = tp.slice(s, i + 1);
    const meanDev =
      win.reduce((acc, v) => acc + Math.abs(v - (sma[i] ?? 0)), 0) / period;
    out[i] = meanDev === 0 ? 0 : (tp[i] - (sma[i] ?? 0)) / (0.015 * meanDev);
  }
  return out;
}

function ADX(candles, period = 14) {
  const len = candles.length;
  const plusDM = Array(len).fill(0);
  const minusDM = Array(len).fill(0);
  const TR = Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const highLow = candles[i].high - candles[i].low;
    const highClose = Math.abs(candles[i].high - candles[i - 1].close);
    const lowClose = Math.abs(candles[i].low - candles[i - 1].close);
    TR[i] = Math.max(highLow, highClose, lowClose);
  }

  const smooth = (arr, p) => {
    const out = Array(len).fill(undefined);
    let prev;
    for (let i = 0; i < len; i++) {
      const v = arr[i];
      if (i === 0) { out[i] = undefined; continue; }
      if (i < p) { out[i] = undefined; continue; }
      if (i === p) {
        let sum = 0;
        for (let j = 1; j <= p; j++) sum += arr[j];
        prev = sum;
        out[i] = prev;
      } else {
        prev = prev - prev / p + v;
        out[i] = prev;
      }
    }
    return out;
  };

  const TRs = smooth(TR, period);
  const plusDMs = smooth(plusDM, period);
  const minusDMs = smooth(minusDM, period);

  const plusDI = Array(len).fill(undefined);
  const minusDI = Array(len).fill(undefined);
  for (let i = 0; i < len; i++) {
    if (!TRs[i]) continue;
    plusDI[i] = 100 * (plusDMs[i] / TRs[i]);
    minusDI[i] = 100 * (minusDMs[i] / TRs[i]);
  }

  const DX = Array(len).fill(undefined);
  for (let i = 0; i < len; i++) {
    if (plusDI[i] == null || minusDI[i] == null) continue;
    DX[i] = (100 * Math.abs(plusDI[i] - minusDI[i])) / (plusDI[i] + minusDI[i]);
  }
  const adx = EMA(DX.filter(v => v != null), period);
  const fullADX = Array(len).fill(undefined);
  let k = 0;
  for (let i = 0; i < len; i++) {
    if (DX[i] != null) fullADX[i] = adx[k++];
  }
  return { plusDI, minusDI, adx: fullADX };
}

function Bollinger(closes, period = 20, mult = 2) {
  const ma = SMA(closes, period);
  const upper = Array(closes.length).fill(undefined);
  const lower = Array(closes.length).fill(undefined);
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || ma[i] == null) continue;
    const s = i - period + 1;
    const win = closes.slice(s, i + 1);
    const mean = ma[i];
    const variance = win.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  const pctB = closes.map((c, i) =>
    upper[i] != null && lower[i] != null ? ((c - lower[i]) / (upper[i] - lower[i])) : undefined
  );
  const width = upper.map((u, i) =>
    u != null && lower[i] != null && ma[i] != null ? (u - lower[i]) / (ma[i] || 1) : undefined
  );
  return { ma, upper, lower, pctB, width };
}

function Aroon(candles, period = 25) {
  const up = Array(candles.length).fill(undefined);
  const down = Array(candles.length).fill(undefined);
  const osc = Array(candles.length).fill(undefined);
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    const s = i - period + 1;
    let maxH = -Infinity, maxIdx = s;
    let minL = Infinity, minIdx = s;
    for (let j = s; j <= i; j++) {
      if (candles[j].high >= maxH) { maxH = candles[j].high; maxIdx = j; }
      if (candles[j].low <= minL) { minL = candles[j].low; minIdx = j; }
    }
    up[i] = ((period - (i - maxIdx)) / period) * 100;
    down[i] = ((period - (i - minIdx)) / period) * 100;
    osc[i] = (up[i] ?? 0) - (down[i] ?? 0);
  }
  return { up, down, osc };
}

function BOP(candles) {
  return candles.map(c =>
    c.high !== c.low ? (c.close - c.open) / (c.high - c.low) : 0
  );
}

function ADLine(candles) {
  let cum = 0;
  const out = [];
  for (const c of candles) {
    const vol = c.volume ?? 1;
    const mfm =
      c.high === c.low ? 0 : ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low);
    cum += mfm * vol;
    out.push(cum);
  }
  return out;
}

function AO_AC(candles) {
  const med = candles.map(c => (c.high + c.low) / 2);
  const sma5 = SMA(med, 5);
  const sma34 = SMA(med, 34);
  const ao = med.map((_, i) =>
    sma5[i] != null && sma34[i] != null ? sma5[i] - sma34[i] : undefined
  );
  const aoSMA5 = SMA(ao, 5);
  const ac = ao.map((v, i) =>
    v != null && aoSMA5[i] != null ? v - aoSMA5[i] : undefined
  );
  return { ao, ac };
}

function highLow52w(candles, bars = 252) {
  const hi = Array(candles.length).fill(undefined);
  const lo = Array(candles.length).fill(undefined);
  for (let i = 0; i < candles.length; i++) {
    const s = Math.max(0, i - bars + 1);
    let H = -Infinity, L = Infinity;
    for (let j = s; j <= i; j++) {
      if (candles[j].high > H) H = candles[j].high;
      if (candles[j].low < L) L = candles[j].low;
    }
    hi[i] = H; lo[i] = L;
  }
  return { hi, lo };
}

function AvgPrice(candles, period = 14) {
  const base = candles.map(c => (c.high + c.low + c.close) / 3);
  return EMA(base, period);
}

/* ---------------- transforms for extra chart types ---------------- */
function toHeikinAshi(ohlc) {
  const out = [];
  let prevOpen, prevClose;
  for (let i = 0; i < ohlc.length; i++) {
    const c = ohlc[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: c.volume });
    prevOpen = haOpen; prevClose = haClose;
  }
  return out;
}
function toHLCBars(ohlc) {
  const mid = (h, l) => (h + l) / 2;
  return ohlc.map(c => ({ time: c.time, open: mid(c.high, c.low), high: c.high, low: c.low, close: mid(c.high, c.low), volume: c.volume }));
}

/* ----------------------- Indicators list ----------------------- */
const INDICATORS = [
  { key: "hi52", label: "52 Week High/Low", where: "main" },
  { key: "avgprice", label: "Average Price", where: "main" },
  { key: "bbands", label: "Bollinger Bands", where: "main" },
  { key: "bb_pctb", label: "Bollinger %B", where: "osc" },
  { key: "bb_width", label: "Bollinger Width", where: "osc" },
  { key: "adx", label: "ADX (+DI/−DI)", where: "osc" },
  { key: "aroon", label: "Aroon (Up/Down/OSC)", where: "osc" },
  { key: "adline", label: "Accumulation/Distribution", where: "osc" },
  { key: "bop", label: "Balance of Power", where: "osc" },
  { key: "cci", label: "CCI", where: "osc" },
  { key: "rsi_stoch", label: "Stoch RSI", where: "osc" },
  { key: "ao", label: "Awesome Oscillator", where: "osc" },
  { key: "ac", label: "Accelerator Oscillator", where: "osc" },
  { key: "supertrend", label: "Supertrend", where: "main" },
];

/* ----------------------- Drawing tools config ----------------------- */
const DRAW_TOOLS = [
  {
    group: "Lines",
    items: [
      { key: "trend", label: "Trend Line", icon: PencilRuler, hotkey: "Alt+T" },
      { key: "ray", label: "Ray", icon: RayIcon },
      { key: "info", label: "Info Line", icon: Info },
      { key: "extended", label: "Extended Line", icon: Move3D },
      { key: "hline", label: "Horizontal Line", icon: AlignHorizontalJustifyStart, hotkey: "Alt+H" },
      { key: "hray", label: "Horizontal Ray", icon: AlignHorizontalSpaceAround, hotkey: "Alt+J" },
      { key: "vline", label: "Vertical Line", icon: AlignVerticalJustifyStart, hotkey: "Alt+V" },
      { key: "cross", label: "Cross Line", icon: Crosshair, hotkey: "Alt+C" },
    ],
  },
];

/* ---------------- Chart type menu (TV-like) ---------------- */
const CHART_GROUPS = [
  {
    title: "Bars / Candles",
    items: [
      { key: "bars", label: "Bars", type: "bar", supported: true },
      { key: "candles", label: "Candles", type: "candlestick", supported: true },
      { key: "hollow", label: "Hollow candles", type: "hollow", supported: true },
      { key: "vcandles", label: "Volume candles", type: "vcandles", supported: false },
      { key: "hlc", label: "HLC bars", type: "hlc", supported: true },
    ],
  },
  {
    title: "Lines",
    items: [
      { key: "line", label: "Line", type: "line", supported: true },
      { key: "linemk", label: "Line with markers", type: "linemk", supported: true },
      { key: "step", label: "Step line", type: "step", supported: true },
    ],
  },
  {
    title: "Areas / Columns / HL",
    items: [
      { key: "area", label: "Area", type: "area", supported: true },
      { key: "baseline", label: "Baseline", type: "baseline", supported: true },
      { key: "columns", label: "Columns", type: "hist", supported: true },
      { key: "highlow", label: "High-low", type: "highlow", supported: true },
    ],
  },
  {
    title: "Price-transforms",
    items: [
      { key: "heikin", label: "Heikin Ashi", type: "heikin", supported: true },
      { key: "renko", label: "Renko", type: "renko", supported: false },
      { key: "linebreak", label: "Line break", type: "linebreak", supported: false },
      { key: "kagi", label: "Kagi", type: "kagi", supported: false },
      { key: "pnf", label: "Point & figure", type: "pnf", supported: false },
    ],
  },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

/* basic distance from a point to a segment */
function pointToSegDist(px, py, x1, y1, x2, y2) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const len = C * C + D * D;
  let t = len ? dot / len : -1;
  t = Math.max(0, Math.min(1, t));
  const xx = x1 + C * t;
  const yy = y1 + D * t;
  return Math.hypot(px - xx, py - yy);
}

function startLiveFeed(symbol, onTick) {
  const WS_BASE =
    import.meta.env.VITE_BACKEND_WS_URL ||
    "wss://backend-app-k52v.onrender.com";

  let ws;

  function connect() {
    ws = new WebSocket(`${WS_BASE}/market/ticks?symbol=${encodeURIComponent(symbol)}`);

    ws.onopen = () => {
      console.log("🟢 WS connected:", symbol);
    };

    ws.onmessage = (ev) => {
      try {
        const js = JSON.parse(ev.data);

        // ✅ FIX: use ltp, not price
        if (typeof js.ltp === "number") {
          onTick(js);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    ws.onerror = (e) => {
      console.error("🔴 WS error", e);
    };

    ws.onclose = () => {
      console.warn("🟠 WS closed, reconnecting in 2s…");
      setTimeout(connect, 2000);
    };
  }

  connect();

  // ✅ IMPORTANT: return a proper close handle
  return {
    close: () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    },
  };
}


/* ---------- IST helpers ---------- */
const IST_OFFSET_SEC = 5.5 * 3600;
function fmtISTFromUnixSec(sec, withDate = false) {
  if (typeof sec !== "number" || !isFinite(sec)) return "";
  const d = new Date((sec + IST_OFFSET_SEC) * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (!withDate) return `${hh}:${mm}`;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mon}/${dd} ${hh}:${mm}`;
}

export default function ChartPage() {
  const cleanupFns = useRef([]).current;
  const [desc1, setDesc1] = useState("");
  const [desc2, setDesc2] = useState("");
  const [desc3, setDesc3] = useState("");
  const [desc4, setDesc4] = useState("");

  const [features, setFeatures] = useState({
  allow_generate_signals: false,
  allow_chart_recommendation: false,
  allow_recommendation_page: false,
});


  const [latestSignals, setLatestSignals] = useState([]);
  const [latestReco, setLatestReco] = useState([]);
  const [latestRecoDesc, setLatestRecoDesc] = useState([]);




  const [signalData, setSignalData] = useState(null);
  // NEW STATES
  const [generateMode, setGenerateMode] = useState(false);
  // ⭐ Freeze chart camera when navigating from Recommendation page
  const [freezeChartAtSignal, setFreezeChartAtSignal] = useState(false);

  const [recoMode, setRecoMode] = useState(false);
  // 🔒 Lock Recommendations button if user doesn't have access
  const [recoLocked, setRecoLocked] = useState(false);

  const [isDark, setIsDark] = useState(false);
  // ✅ Premium popup state (replaces alert())
  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
  });

  const showPopup = useCallback((title, message) => {
    setPopup({ open: true, title: title || "Alert", message: message || "" });
  }, []);

  const closePopup = useCallback(() => {
    setPopup((p) => ({ ...p, open: false }));
  }, []);

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-50";
  const glassClass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/20"
    : "bg-white/70 backdrop-blur-xl border border-white/30";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";



  // 🔁 auto-follow latest candle
  const [autoFollow, setAutoFollow] = useState(true);
  const autoFollowRef = useRef(true);

  const pauseAutoFollow = useCallback(() => {
    if (!autoFollowRef.current) return;
    autoFollowRef.current = false;
    setAutoFollow(false);

    // stop auto-shifting chart on new bars
    try {
      if (mainChart.current) {
        mainChart.current.applyOptions({
          timeScale: { shiftVisibleRangeOnNewBar: false },
        });
      }
    } catch (e) {
      console.warn("pauseAutoFollow failed", e);
    }
  }, []);

  const resumeAutoFollow = useCallback(() => {
    autoFollowRef.current = true;
    setAutoFollow(true);

    try {
      if (mainChart.current) {
        mainChart.current.applyOptions({
          timeScale: { shiftVisibleRangeOnNewBar: true },
        });
        mainChart.current.timeScale().scrollToRealTime();
      }
    } catch (e) {
      console.warn("resumeAutoFollow failed", e);
    }
  }, []);




  const { symbol: rawSym } = useParams();

  const params = new URLSearchParams(window.location.search);
  const fromReco = params.get("fromReco") === "1";


  // ------------------------------------------------------
  // ⭐ READ PARAMS PASSED FROM SignalCard.jsx
  // ------------------------------------------------------
  const urlParams = new URLSearchParams(window.location.search);

  const jumpStrategy = urlParams.get("strategy") || null;   // intraday, btst, short-term
  const jumpDT = urlParams.get("dt") || null;               // datetime string

  // ⭐ If navigation came from recommendation, enable chart freeze
  useEffect(() => {
    if (jumpDT) {
      setFreezeChartAtSignal(true);
    }
  }, [jumpDT]);

  let jumpUnix = null;
  if (jumpDT) {
    try {
      jumpUnix = Math.floor(new Date(jumpDT).getTime() / 1000);
    } catch {
      jumpUnix = null;
    }
  }



  const symbol = useMemo(() => (rawSym || "").toUpperCase(), [rawSym]);
  const navigate = useNavigate();
  function openWhatsappPage() {
    navigate("/whatsapp", {
      state: { symbol },
    });
  }


  const [tf, setTf] = useState("1m");

  function openBuyPage() {
    navigate(`/buy/${symbol}`, {
      state: { symbol, from: "chart", tf, lastPrice },
    });
  }

  function openSellPage() {
    navigate(`/sell/${symbol}`, {
      state: { symbol, from: "chart", tf, lastPrice },
    });
  }

  // ✅ Always keep latest tf/symbol/candles (prevents old setInterval closures)


  // ---------------- SEARCH (instruments.csv via backend /search) ----------------
  const [openSearch, setOpenSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchItems, setSearchItems] = useState([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
  let alive = true;
  const u = localStorage.getItem("username") || "";
  if (!u) return;

  fetch(`${API}/features/access/${encodeURIComponent(u)}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r)))
    .then((j) => {
      if (!alive) return;
      setFeatures({
        allow_generate_signals: !!j.allow_generate_signals,
        allow_chart_recommendation: !!j.allow_chart_recommendation,
        allow_recommendation_page: !!j.allow_recommendation_page,
      });
      setRecoLocked(!j.allow_recommendation_page);

    })
    .catch(() => {
      if (!alive) return;
      setFeatures({
        allow_generate_signals: false,
        allow_chart_recommendation: false,
        allow_recommendation_page: false,
      });
    });

  return () => {
    alive = false;
  };
}, []);

  // 🔒 Check Recommendations page access (backend returns 403 when locked)



  // Focus input when modal opens
  useEffect(() => {
    if (openSearch) {
      setTimeout(() => searchInputRef.current?.focus?.(), 50);
    }
  }, [openSearch]);

  // ESC to close
  useEffect(() => {
    if (!openSearch) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpenSearch(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // Fetch scripts (debounced)
  useEffect(() => {
    if (!openSearch) return;

    const q = (searchQ || "").trim();
    const ctrl = new AbortController();

    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const url = q
          ? `${API}/search?q=${encodeURIComponent(q)}`
          : `${API}/search/scripts`; // initial list

        const res = await fetch(url, { signal: ctrl.signal });
        const js = await res.json();

        setSearchItems(Array.isArray(js) ? js : []);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("Search fetch error:", e);
          setSearchItems([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [openSearch, searchQ]);

  const onPickScript = (sym) => {
    const s = String(sym || "").toUpperCase();
    if (!s) return;
    setOpenSearch(false);
    setSearchQ("");
    setSearchItems([]);
    navigate(`/chart/${s}`);
  };

  // ------------------------------------------------------
  // ⭐ FORCE TIMEFRAME BASED ON jumpStrategy
  // ------------------------------------------------------
  // ⭐ FORCE TIMEFRAME BASED ON jumpStrategy (Supports intraday-fast)
  useEffect(() => {
    if (!jumpStrategy) return;

    const s = jumpStrategy.toLowerCase();

    // BOTH intraday + intraday-fast + intraday others
    if (s.includes("intra")) {
      setTf("15m");
      setTimeout(() => fetchReco("15m"), 300);  // load markers
      return;
    }

    // BTST
    if (s.includes("btst")) {
      setTf("15m");
      setTimeout(() => fetchReco("15m"), 300);
      return;
    }

    // Short-term
    if (s.includes("short")) {
      setTf("1d");
      setTimeout(() => fetchReco("1d"), 300);
      return;
    }
  }, [jumpStrategy]);


  const [lastPrice, setLastPrice] = useState(null);
  const liveTimerRef = useRef(null);
  const [status, setStatus] = useState("loading");

  const [openIndModal, setOpenIndModal] = useState(false);
  const [active, setActive] = useState(() =>
    Object.fromEntries(INDICATORS.map(i => [i.key, false]))
  );

  const mainRef = useRef(null);
  const overlayRef = useRef(null);
  const volumeRef = useRef(null);            // separate volume pane
  const oscRef = useRef(null);
  const mainChart = useRef(null);
  const volumeChart = useRef(null);
  const oscChart = useRef(null);
  const priceSeries = useRef(null);
  const liveCandleRef = useRef(null);
  const lastTickAtRef = useRef(0); // ms (for fallback polling)

  const livePriceLine = useRef(null);
  const volSeries = useRef(null);

  // ▶ INDICATORS — series managers
  const indSeriesMain = useRef({});
  const indSeriesOsc = useRef({});

  // ▶ Store the data we set on each indicator series for hit-testing
  const indDataMain = useRef({}); // { key: [{ series, data:[{time,value}]}] }
  const indDataOsc = useRef({});

  const tfSec = useMemo(() => TF_MIN[tf] * 60, [tf]);

  /* ---------- chart type state & anchored dropdown ---------- */
  const [chartType, setChartType] = useState({ type: "candlestick" });
  const [ctOpen, setCtOpen] = useState(false);
  const ctWrapRef = useRef(null);
  const ctMenuRef = useRef(null);
  const [ctPos, setCtPos] = useState({ top: 0, left: 0 });

  const updateCtPos = useCallback(() => {
    if (!ctWrapRef.current) return;
    const rect = ctWrapRef.current.getBoundingClientRect();
    const gap = 6;
    const menuW = 260;
    const vw = window.innerWidth;
    let left = rect.left;
    if (left + menuW + 8 > vw) left = Math.max(8, vw - menuW - 8);
    setCtPos({ top: rect.bottom + gap, left });
  }, []);


  useEffect(() => {
    const onDocClick = (e) => {
      if (!ctOpen) return;
      if (!ctWrapRef.current) return;
      const within =
        ctWrapRef.current.contains(e.target) ||
        (ctMenuRef.current && ctMenuRef.current.contains(e.target));
      if (!within) setCtOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [ctOpen]);

  useEffect(() => {
    if (!ctOpen) return;
    const recalc = () => updateCtPos();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    updateCtPos();
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [ctOpen, updateCtPos]);

  /* ---------------- Draw state ---------------- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [redrawTick, setRedrawTick] = useState(0);

  // drawings
  const drawingsRef = useRef([]);
  const draggingRef = useRef(false);

  // selection / toolbar
  const [selectedId, setSelectedId] = useState(null);
  const [tbPos, setTbPos] = useState({ x: 0, y: 0 });
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // indicator toolbar
  const [indTbOpen, setIndTbOpen] = useState(false);
  const [indTbPos, setIndTbPos] = useState({ x: 0, y: 0 });
  const [selectedIndicator, setSelectedIndicator] = useState(null); // {series}

  // freeze UI while toolbar is used
  const uiFreezeRef = useRef(false);
  const freezeUI = () => { uiFreezeRef.current = true; };
  const unfreezeUI = () => { uiFreezeRef.current = false; };

  const defaultStyle = { color: "#1d9bf0", width: 2, dash: "solid" };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setActiveTool(null);
        setToolbarOpen(false);
        setSelectedId(null);
        setIndTbOpen(false);
        setSelectedIndicator(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);




  // ---------------------------------------------------------
  // LOAD ALL SIGNALS (FINAL VERSION - FULL FIX)
  // ---------------------------------------------------------
  async function loadAllSignals(symbolArg, tfArg) {
  const tfNow = tfArg || tfRef.current;                 // ✅ latest timeframe
  const candlesNow = candlesRef.current || [];          // ✅ latest candles

    try {
      console.log("loadAllSignals called for TF:", tf);

      // --------------------------------------------------
      // 1) BLOCK OTHER TIMEFRAMES (NO SIGNALS)
      // --------------------------------------------------
      if (tf !== "2m" && tf !== "15m") {
        console.log("TF BLOCKED → clearing generate markers only");

        if (priceSeries.current) {
          priceSeries.current._genMarkers = []; // clear generate signals

          // keep recommendations only
          const reco = priceSeries.current._recoMarkers || [];
          priceSeries.current.setMarkers(reco);
        }

        setLatestSignals([]);
        return;
      }

      // --------------------------------------------------
      // 2) ALWAYS FETCH BOTH 2m + 15m FROM BACKEND
      // --------------------------------------------------
      const username = localStorage.getItem("username") || "default_user";

      const url =
        `${API}/market/all-signals?symbol=${symbol}&username=${encodeURIComponent(username)}`;

      console.log("Fetching URL:", url);

      const r = await fetch(url);
      if (!r.ok) {
        console.warn("Signal fetch failed");
        return;
      }

      const js = await r.json();
      console.log("Backend signals:", js);

      if (!js.signals || !Array.isArray(js.signals)) return;

      // --------------------------------------------------
      // 3) FILTER BASED ON CURRENT TF
      // --------------------------------------------------
  // 3) FILTER BASED ON CURRENT TF
let final = [];

if (tfNow === "2m") {
  final = js.signals.filter((s) => s.tf === "2m" || s.tf === "15m");
} else if (tfNow === "15m") {
  final = js.signals.filter((s) => s.tf === "15m");
}



      final.sort((a, b) => a.timestamp - b.timestamp);

      // --------------------------------------------------
      // 4) CONVERT TO MARKERS  ✅ FIX HERE
      // --------------------------------------------------
     const toSec = (ts) => {
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  // if backend ever sends ms, auto-fix it
  return n > 1e11 ? Math.floor(n / 1000) : Math.floor(n);
};

const markers = final
  .map((sig) => {
    const ts = toSec(sig.timestamp);
    if (!ts) return null;

    const snapped = snapToCandleStart(candlesNow, ts, tfNow);

    return {
      time: snapped,
      position: sig.signal === "BUY" ? "belowBar" : "aboveBar",
      shape: sig.signal === "BUY" ? "arrowUp" : "arrowDown",
      color: sig.signal === "BUY" ? "#16a34a" : "#dc2626",
      text: `${sig.signal} - ${sig.tf} | ${sig.close_price ?? ""}`,
    };
  })
  .filter(Boolean);



      // --------------------------------------------------
      // 5) APPLY ONLY TO 2m & 15m CHARTS
      // --------------------------------------------------
      if (priceSeries.current) {
        priceSeries.current._genMarkers = markers;

        const reco = priceSeries.current._recoMarkers || [];
        const merged = [...markers, ...reco]
          .filter((m) => m && m.time)
          .sort((a, b) => a.time - b.time);

        priceSeries.current.setMarkers(merged);
      }

      // --------------------------------------------------
      // 6) LAST 4 SIGNALS
      // --------------------------------------------------
      setLatestSignals(
        final
          .slice(-4)
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      );

      console.log(`✔ Applied ${markers.length} markers for TF=${tf}`);

    } catch (err) {
      console.error("Signal Load Error:", err);
    }
  }



  async function loadRecommendationDescriptions(symbol, tf) {
    try {
      let url = "";

      if (tf === "15m") {
        // ⭐ 15m gets both CSV files
        url = `${API}/market/reco-15m?symbol=${symbol}&ts=${Date.now()}`;
      } else if (tf === "1d") {
        // ⭐ 1d gets short-term CSV
        url = `${API}/market/reco-1d?symbol=${symbol}&ts=${Date.now()}`;
      } else {
        setLatestReco([]);
        return;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setLatestReco([]);
        return;
      }

      // Sort by descending time, take 4
      const rows = data
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, 4);

      setLatestReco(rows);

    } catch (err) {
      console.warn("Reco description failed:", err);
      setLatestReco([]);
    }
  }


  // ------------------------------------------------------
  // AUTO-ACTIVATE RECOMMENDATION WHEN COMING FROM RECO PAGE
  // ------------------------------------------------------
  useEffect(() => {
    if (fromReco === true || fromReco === "1") {
      if (!priceSeries.current) return;   // prevent chart crash


      console.log("🔥 Auto Recommendation Mode");
      recoModeRef.current = true;

      setRecoMode(true);
      localStorage.setItem("NC_recoMode_" + symbol, "true");

      // highlight button
      const btn = document.querySelector("#recoBtn");
      if (btn) {
        btn.style.background = "#2563eb";
        btn.style.color = "white";
        btn.style.borderColor = "#2563eb";
      }

      // run ASAP
      setTimeout(() => refreshRecommendations(), 800);

      // start auto loop
      if (recoRunRef.current) clearInterval(recoRunRef.current);
      recoRunRef.current = setInterval(refreshRecommendations, 20000);
    }
  }, [symbol, tf]);


  async function loadRecommendationsDescription(tf) {
    try {

      let url = "";
      if (tf === "15m") {
        url = `${API}/market/reco-load?symbol=ALL&tf=15m`;
      }
      else if (tf === "1d") {
        url = `${API}/market/reco-load?symbol=ALL&tf=1d`;
      } else {
        return;
      }

      const r = await fetch(url);
      const js = await r.json();
      if (!js.rows || !Array.isArray(js.rows)) return;

      // Sort by timestamp DESC
      const sorted = [...js.rows].sort(
        (a, b) => Number(b.timestamp) - Number(a.timestamp)
      );

      // Pick latest 4
      setLatestRecommendations(sorted.slice(0, 4));

    } catch (e) {
      console.log("Recommendation description load failed:", e);
    }
  }

  function zoomIn() {
    try {
      const ts = mainChart.current.timeScale();
      ts.setVisibleLogicalRange({
        from: ts.getVisibleLogicalRange().from + 5,
        to: ts.getVisibleLogicalRange().to - 5,
      });
    } catch (e) {
      console.warn("Zoom In error", e);
    }
  }

  function zoomOut() {
    try {
      const ts = mainChart.current.timeScale();
      ts.setVisibleLogicalRange({
        from: ts.getVisibleLogicalRange().from - 5,
        to: ts.getVisibleLogicalRange().to + 5,
      });
    } catch (e) {
      console.warn("Zoom Out error", e);
    }
  }

  // ✅ FINAL — Recommendation Date Formatter (MM/DD/YYYY, hh:mm:ss AM/PM)
  function formatRecoDate(d) {
    if (!d) return "--";

    try {
      let dateObj = null;

      // --------------------------------------------------
      // Case 1: UNIX timestamp (seconds)
      // --------------------------------------------------
      if (typeof d === "number") {
        dateObj = new Date(d * 1000);
      }

      // --------------------------------------------------
      // Case 2: String input
      // --------------------------------------------------
      else if (typeof d === "string") {
        const s = d.trim();

        // 🔹 ISO format (BEST + SAFE)
        // Example: 2025-12-11T09:30:00
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
          dateObj = new Date(s);
        }

        // 🔹 DD-MM-YYYY or MM-DD-YYYY HH:MM(:SS)
        else if (s.includes("-")) {
          const [datePart, timePart = "00:00:00"] = s.split(" ");
          const [p1, p2, p3] = datePart.split("-");

          if (p1 && p2 && p3) {
            const n1 = Number(p1);
            const n2 = Number(p2);

            // If first number > 12 → DD-MM-YYYY
            const day = n1 > 12 ? p1 : p2;
            const month = n1 > 12 ? p2 : p1;
            const year = p3;

            const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`;
            dateObj = new Date(iso);
          }
        }

        // 🔹 Fallback (browser readable)
        else {
          dateObj = new Date(s);
        }
      }

      // --------------------------------------------------
      // Validation
      // --------------------------------------------------
      if (!dateObj || isNaN(dateObj.getTime())) {
        console.warn("❌ Invalid reco date:", d);
        return "--";
      }

      // --------------------------------------------------
      // 🔒 FORCE EXACT FORMAT: MM/DD/YYYY, hh:mm:ss AM/PM
      // --------------------------------------------------
      return dateObj.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

    } catch (e) {
      console.warn("❌ Reco date parse failed:", d, e);
      return "--";
    }
  }



  /* ---------------- Fetch candles ---------------- */
  const [candles, setCandles] = useState([]);

  const tfRef = useRef("1m");
useEffect(() => { tfRef.current = tf; }, [tf]);

const symbolRef = useRef("");
useEffect(() => { symbolRef.current = symbol; }, [symbol]);

const candlesRef = useRef([]);
useEffect(() => { candlesRef.current = candles; }, [candles]);

const prevClose = useMemo(() => {
  if (!candles || candles.length < 2) return null;
  return Number(candles[candles.length - 2]?.close ?? null);
}, [candles]);

const isUp = useMemo(() => {
  if (lastPrice == null || prevClose == null) return null;
  return Number(lastPrice) >= Number(prevClose);
}, [lastPrice, prevClose]);


  const mapDataForType = (t, rows) => {
    if (!rows || !rows.length) return [];
    if (t === "heikin") return toHeikinAshi(rows);
    if (t === "hlc" || t === "highlow") return toHLCBars(rows);
    return rows;
  };

  /* ---------- incremental load helpers (LEFT scroll) ---------- */
  const earliestRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);

  const applySeriesData = useCallback((t, rows) => {
    const dataToUse = mapDataForType(t, rows);

    // ALWAYS call before updating candles
    applyUnifiedMarkers();

    if (["hist", "line", "linemk", "step", "area", "baseline"].includes(t)) {
      applyUnifiedMarkers();
    } else {
      priceSeries.current?.setData(
        dataToUse.map(d => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    }


    //---------------------------------------------------------
    // ⭐ AUTO-SCROLL TO ACTIVE SIGNAL TIME (if query params exist)
    //---------------------------------------------------------
    try {
      const url = new URL(window.location.href);
      const dt = url.searchParams.get("dt");      // raw IST datetime
      const strat = url.searchParams.get("strategy");

      if (dt) {
        // Convert "2025-11-17 20:00" → UNIX seconds
        const ts = parseISTDateToUnix(dt.replace("%20", " ").replace("T", " "));
        if (ts) {
          const nearest = findNearestCandleTime(dataToUse, ts);

          const tsObj = mainChart.current?.timeScale();
          if (tsObj && typeof nearest === "number") {
            setTimeout(() => {
              try {
                tsObj.scrollToPosition(0, false);
                tsObj.setVisibleRange({ from: nearest - 2000, to: nearest + 2000 });
                mainChart.current.timeScale().applyOptions({
                  barSpacing: 8    // ← same spacing as normal chart (adjust if needed)
                });

              } catch (e) {
                console.warn("Scroll failed:", e);
              }
            }, 120);
          }
        }
      }
    } catch (err) {
      console.warn("Auto-scroll error:", err);
    }

    // ALWAYS call after updating
    applyUnifiedMarkers();



    // --- Volume bars on separate pane (time-synced with main) ---
    if (volSeries.current) {
      volSeries.current.setData(
        dataToUse.map((d, i) => ({
          time: d.time,
          value: d.volume ?? 0,
          color:
            d.close >= (dataToUse[i - 1]?.close ?? d.open)
              ? "rgba(16, 185, 129, 0.7)"
              : "rgba(239, 68, 68, 0.7)",
        }))
      );
    }

    // Keep both panes synced
    const main = mainChart.current;
    const vol = volumeChart.current;
    if (main && vol) {
      try {
        const lr = main.timeScale().getVisibleLogicalRange();
        if (lr && lr.from && lr.to)
          vol.timeScale().setVisibleLogicalRange(lr);
      } catch { }
    }
  }, []);

  const tryFetchOlder = useCallback(async (oldest) => {
    const qs = [
      `before=${oldest}`,
      `to=${oldest}`,
      `end=${oldest}`
    ];
    for (const q of qs) {
      const url = `${API}/market/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${tf}&limit=500&${q}`;
      const r = await fetch(url);
      if (r.ok) return r.json();
    }
    throw new Error("older fetch failed");
  }, [symbol, tf]);

  const loadMoreLeft = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const oldest = earliestRef.current;
    if (!oldest) return;

    try {
      loadingMoreRef.current = true;
      setIsFetchingOlder(true);

      const chart = mainChart.current;
      const ts = chart?.timeScale();
      const logicalRangeBefore = ts?.getVisibleLogicalRange();

      const older = await tryFetchOlder(oldest - 1);

      if (Array.isArray(older) && older.length) {
        const mergedMap = new Map();
        [...older, ...candles].forEach(c => mergedMap.set(c.time, c));
        const merged = Array.from(mergedMap.values()).sort((a, b) => a.time - b.time);
        setCandles(merged);
        earliestRef.current = merged[0]?.time ?? earliestRef.current;

        const t = chartType.type;
        applySeriesData(t, merged);

        if (logicalRangeBefore && typeof logicalRangeBefore.from === "number" && typeof logicalRangeBefore.to === "number") {
          const barsAdded = older.length;
          const newRange = {
            from: logicalRangeBefore.from + barsAdded,
            to: logicalRangeBefore.to + barsAdded,
          };
          requestAnimationFrame(() => ts?.setVisibleLogicalRange(newRange));
        }
      }
    } catch {
      // ignore fetch errors
    } finally {
      loadingMoreRef.current = false;
      setIsFetchingOlder(false);
    }
  }, [candles, chartType.type, applySeriesData, tryFetchOlder]);

  /* ---------------- Build charts ---------------- */
  useEffect(() => {
    if (mainChart.current) { try { mainChart.current.remove(); } catch { } mainChart.current = null; }
    if (volumeChart.current) { try { volumeChart.current.remove(); } catch { } volumeChart.current = null; }
    if (oscChart.current) { try { oscChart.current.remove(); } catch { } oscChart.current = null; }

    const main = createChart(mainRef.current, {
      width: mainRef.current.clientWidth,
      height: Math.max(320, Math.floor((window.innerHeight - HEADER_H) * 0.6)),
      layout: { textColor: "#222", background: { type: "Solid", color: "#ffffff" } },
      grid: { vertLines: { color: "rgba(42,46,57,0.1)" }, horzLines: { color: "rgba(42,46,57,0.1)" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (t, tickMarkType) => {
          if (typeof t !== "number") return "";
          const d = new Date((t + 5.5 * 3600) * 1000);
          const hh = d.getUTCHours().toString().padStart(2, "0");
          const mm = d.getUTCMinutes().toString().padStart(2, "0");
          const istHour = d.getUTCHours();
          const istMinute = d.getUTCMinutes();
          if ((istHour === 9 && istMinute < 25) || (tickMarkType === 0)) {
            const day = d.getUTCDate().toString().padStart(2, "0");
            const month = d.toLocaleString("en-GB", { month: "short" });
            return `${month} ${day}`;
          }
          return `${hh}:${mm}`;
        },
        rightOffset: 5,
        barSpacing: 7,
        fixLeftEdge: false,
        allowShiftVisibleRangeOnWhitespaceReplacement: true,
        shiftVisibleRangeOnNewBar: true,
        minimumVisibleBarCount: 5,
        visible: true,
      },
      handleScroll: {
  mouseWheel: true,
  pressedMouseMove: true,
  horzTouchDrag: true,
  vertTouchDrag: false,
},

      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
      localization: {
        timeFormatter: (t) => typeof t === "number" ? fmtISTFromUnixSec(t, true) : "",
      },
    });

    let series;
    const t = chartType.type;
    if (t === "candlestick" || t === "heikin" || t === "hollow") {
      const opts =
        t === "hollow"
          ? {
            upColor: "rgba(0,0,0,0)",
            downColor: "#dc2626",
            borderUpColor: "#16a34a",
            borderDownColor: "#dc2626",
            wickUpColor: "#16a34a",
            wickDownColor: "#dc2626",
          }
          : {
            upColor: "#16a34a", downColor: "#dc2626",
            borderUpColor: "#16a34a", borderDownColor: "#dc2626",
            wickUpColor: "#16a34a", wickDownColor: "#dc2626",
          };
      series = main.addCandlestickSeries(opts);
    } else if (t === "bar" || t === "hlc" || t === "highlow") {
      series = main.addBarSeries({});
    } else if (t === "line" || t === "linemk" || t === "step") {
      series = main.addLineSeries({ lineWidth: 2, lineType: t === "step" ? 1 : 0 });
    } else if (t === "area") {
      series = main.addAreaSeries({});
    } else if (t === "baseline") {
      series = main.addBaselineSeries({});
    } else {
      series = main.addHistogramSeries({ base: 0 });
    }

    // Volume chart below, time-synced
    const vol = createChart(volumeRef.current, {
      width: volumeRef.current.clientWidth,
      height: Math.max(120, Math.floor((window.innerHeight - HEADER_H) * 0.18)),

      layout: {
        textColor: "#222",
        background: { type: "Solid", color: "#ffffff" },
      },

      grid: {
        vertLines: { color: "rgba(42,46,57,0.08)" },
        horzLines: { color: "rgba(42,46,57,0.08)" },
      },

      rightPriceScale: {
        borderVisible: false,
      },

      // 🔑 IMPORTANT FIX — SAME DATE LOGIC AS CANDLE CHART
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,

        tickMarkFormatter: (t, tickMarkType) => {
          if (typeof t !== "number") return "";

          // Convert UNIX → IST
          const d = new Date((t + 5.5 * 3600) * 1000);
          const hh = d.getUTCHours().toString().padStart(2, "0");
          const mm = d.getUTCMinutes().toString().padStart(2, "0");

          const istHour = d.getUTCHours();
          const istMinute = d.getUTCMinutes();

          // Show DATE at session start / higher TF
          if ((istHour === 9 && istMinute < 25) || tickMarkType === 0) {
            const day = d.getUTCDate().toString().padStart(2, "0");
            const month = d.toLocaleString("en-GB", { month: "short" });
            return `${month} ${day}`;
          }

          // Otherwise show time
          return `${hh}:${mm}`;
        },
      },

      crosshair: {
        mode: CrosshairMode.Normal,
      },

      // 🔒 Keep localization SIMPLE (avoid double formatting)
      localization: {
        timeFormatter: (t) => {
          if (typeof t !== "number") return "";
          const d = new Date((t + 5.5 * 3600) * 1000);
          return d.toLocaleString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
      },
    });

    const volHist = vol.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      base: 0,
    });

    const osc = createChart(oscRef.current, {
      width: oscRef.current.clientWidth,
      height: Math.max(180, Math.floor((window.innerHeight - HEADER_H) * 0.22) - 8),
      layout: { textColor: "#222", background: { type: "Solid", color: "#ffffff" } },
      grid: { vertLines: { color: "rgba(42,46,57,0.1)" }, horzLines: { color: "rgba(42,46,57,0.1)" } },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (t) => typeof t === "number" ? fmtISTFromUnixSec(t) : "",
      },
      crosshair: { mode: CrosshairMode.Normal },
      localization: {
        timeFormatter: (t) => typeof t === "number" ? fmtISTFromUnixSec(t, true) : "",
      },
    });

    mainChart.current = main;
    volumeChart.current = vol;
    oscChart.current = osc;
    priceSeries.current = series;
    priceSeries.current._genMarkers = [];
    priceSeries.current._recoMarkers = [];

    // LIVE MOVING PRICE LINE (Zerodha style)
    livePriceLine.current = priceSeries.current.createPriceLine({
      price: 0,
      color: "#dc2626",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "LTP"
    });

    volSeries.current = volHist;

    if (Array.isArray(candles) && candles.length) {
      applySeriesData(t, candles);
      requestAnimationFrame(() => main.timeScale().scrollToPosition(-10, false));
    }

    // keep panes in sync
    const sync = () => {
      const lr = main.timeScale().getVisibleLogicalRange();
      if (!lr || lr.from == null || lr.to == null) return;
      try { vol.timeScale().setVisibleLogicalRange(lr); } catch { }
      try { osc.timeScale().setVisibleLogicalRange(lr); } catch { }
    };
    main.timeScale().subscribeVisibleLogicalRangeChange(sync);
    vol.timeScale().subscribeVisibleLogicalRangeChange(sync);
    osc.timeScale().subscribeVisibleLogicalRangeChange(sync);

    // need-more detector (scroll-left)
    const onNeedMore = () => {
      const ts = main.timeScale();
      const lr = ts.getVisibleLogicalRange();
      if (!lr || !priceSeries.current) return;

      // 🔁 If user has scrolled away from the latest bars, stop auto-follow
      try {
        const lastIndex = candles.length - 1;
        if (lastIndex > 0 && typeof lr.to === "number") {
          // if right edge is more than 2 bars away from last bar -> user is exploring history
          if (lr.to < lastIndex - 2) {
            pauseAutoFollow();
          }
        }
      } catch { }

      try {
        const info = priceSeries.current.barsInLogicalRange(lr);
        const leftEdgeTime = ts.coordinateToTime(0);
        if (info && typeof info.barsBefore === "number") {
          if (info.barsBefore < 20) loadMoreLeft();
          return;
        }
        const first = earliestRef.current;
        if (typeof leftEdgeTime === "number" && typeof first === "number") {
          if (leftEdgeTime <= first + tfSec) loadMoreLeft();
        }
      } catch { }
    };


    main.timeScale().subscribeVisibleLogicalRangeChange(onNeedMore);
    main.timeScale().subscribeVisibleTimeRangeChange(onNeedMore);

    // debounced resize with freeze protection
    let resizeTimer = null;
    const handleResize = () => {
      if (uiFreezeRef.current) return;
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(() => {
        if (!mainChart.current || !oscChart.current || !volumeChart.current) return;
        mainChart.current.applyOptions({
          width: mainRef.current.clientWidth,
          height: Math.max(320, Math.floor((window.innerHeight - HEADER_H) * 0.6)),
        });
        volumeChart.current.applyOptions({
          width: volumeRef.current.clientWidth,
          height: Math.max(120, Math.floor((window.innerHeight - HEADER_H) * 0.18)),
        });
        oscChart.current.applyOptions({
          width: oscRef.current.clientWidth,
          height: Math.max(180, Math.floor((window.innerHeight - HEADER_H) * 0.22) - 8),
        });
        setRedrawTick(t => t + 1);
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      try { main.timeScale().unsubscribeVisibleLogicalRangeChange(sync); } catch { }
      try { main.timeScale().unsubscribeVisibleLogicalRangeChange(onNeedMore); } catch { }
      try { main.timeScale().unsubscribeVisibleTimeRangeChange(onNeedMore); } catch { }
      window.removeEventListener("resize", handleResize);
    };
    // NOTE: don't include `candles` so we don't rebuild chart on every merge
  }, [symbol, tf, chartType, applySeriesData, loadMoreLeft, tfSec]);

  /* ---------------- Fetch candles ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const url = `${API}/market/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${tf}&limit=500`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("fetch failed");

        const data = await r.json();
        if (cancelled) return;

        if (Array.isArray(data) && data.length) {
          setCandles(data);
          applySeriesData(chartType.type, data);

          // 🔥 VERY IMPORTANT
          liveCandleRef.current = { ...data[data.length - 1] };
          setLastPrice(data[data.length - 1].close);
        } else {
          // Zerodha behavior → empty chart
          setCandles([]);
          applySeriesData(chartType.type, []);
          liveCandleRef.current = null;
        }

        setStatus("ready");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    // ========== LIVE PRICE UPDATE ========== //
    let ws = null;

    function handleTick(tick) {
  if (!priceSeries.current) return;

  const price = tick?.ltp;
  if (typeof price !== "number" || !isFinite(price)) return;

  // backend sends UNIX seconds
  const rawTs =
    typeof tick?.timestamp === "number" && isFinite(tick.timestamp)
      ? tick.timestamp
      : Math.floor(Date.now() / 1000);

  const ts = Math.floor(rawTs / tfSec) * tfSec;

  let c = liveCandleRef.current;

  // New candle
  if (!c || c.time !== ts) {
    c = {
      time: ts,
      open: price,
      high: price,
      low: price,
      close: price,
    };
  } else {
    c.high = Math.max(c.high, price);
    c.low = Math.min(c.low, price);
    c.close = price;
  }

  liveCandleRef.current = c;
  lastTickAtRef.current = Date.now();

  // ✅ Update last candle (this also moves series last-value line)
  priceSeries.current.update(c);

  // ✅ Header LTP
  setLastPrice(price);

  // ✅ Candle-color style for LTP line (same logic as candle color)
  const up = price >= c.open;
  const lineColor = up ? "#16a34a" : "#dc2626";

  // 1) built-in series last-value line color
  priceSeries.current.applyOptions({
    priceLineVisible: true,
    lastValueVisible: true,
    priceLineColor: lineColor,
  });

  // 2) custom "LTP" dotted price line
  livePriceLine.current?.applyOptions({
    price,
    color: lineColor,
    axisLabelColor: lineColor,
    axisLabelTextColor: "#ffffff",
  });
}

// Start websocket after initial load
    ws = startLiveFeed(symbol, handleTick);

    cleanupFns.push(() => ws?.close());

    return () => {
      cancelled = true;
      cleanupFns.forEach(fn => fn && fn());
    };
  }, [symbol, tf, tfSec, chartType, applySeriesData]);

  // LIVE PRICE UPDATER (fallback ONLY)
// ✅ IMPORTANT: don't fight the WebSocket.
// We poll /ohlc only if WS hasn't delivered a tick recently.
useEffect(() => {
  if (!priceSeries.current) return;

  const timer = setInterval(async () => {
    // If WS is healthy, do nothing (prevents candle/LTP mismatch)
    if (Date.now() - (lastTickAtRef.current || 0) < 2500) return;

    try {
      const res = await fetch(
        `${API}/market/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${tf}&limit=2`
      );
      const js = await res.json();
      if (!Array.isArray(js) || js.length === 0) return;

      const live = js[js.length - 1];
      if (!live || typeof live.close !== "number") return;

      const price = live.close;
      const candleTime =
        typeof live.time === "number" && isFinite(live.time)
          ? live.time
          : Math.floor(Math.floor(Date.now() / 1000) / tfSec) * tfSec;

      let c = liveCandleRef.current;

      if (!c || c.time !== candleTime) {
        c = {
          time: candleTime,
          open: typeof live.open === "number" ? live.open : price,
          high: typeof live.high === "number" ? live.high : price,
          low: typeof live.low === "number" ? live.low : price,
          close: price,
        };
      } else {
        c.high = Math.max(c.high, price);
        c.low = Math.min(c.low, price);
        c.close = price;
      }

      liveCandleRef.current = c;

      priceSeries.current.update(c);
      setLastPrice(price);

      const up = price >= c.open;
      const lineColor = up ? "#16a34a" : "#dc2626";

      priceSeries.current.applyOptions({
        priceLineVisible: true,
        lastValueVisible: true,
        priceLineColor: lineColor,
      });

      livePriceLine.current?.applyOptions({
        price,
        color: lineColor,
        axisLabelColor: lineColor,
        axisLabelTextColor: "#ffffff",
      });

      volSeries.current?.update({
        time: c.time,
        value: typeof live.volume === "number" ? live.volume : 0,
        color: up ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)",
      });

      try {
        const tsScale = mainChart.current?.timeScale();
        if (tsScale && autoFollowRef.current) tsScale.scrollToRealTime();
      } catch {}
    } catch (e) {
      console.error("Live price fallback error:", e);
    }
  }, 1000);

  return () => clearInterval(timer);
}, [symbol, tf, tfSec]);


/* ---------------- Overlay drawing helpers ---------------- */
  const pickTool = (key) => {
    setActiveTool(key);
    setDrawerOpen(false);
    setSelectedId(null);
    setToolbarOpen(false);
    setIndTbOpen(false);
    setSelectedIndicator(null);
  };

  const toChartPoint = useCallback((evt) => {
    if (!mainChart.current || !priceSeries.current || !overlayRef.current) return null;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = clamp(evt.clientX - rect.left, 0, rect.width);
    const y = clamp(evt.clientY - rect.top, 0, rect.height);

    const ts = mainChart.current.timeScale();
    let time = null;
    try {
      const maybe = ts.coordinateToTime(x);
      if (typeof maybe === "number") time = maybe;
    } catch { }
    let price = null;
    try {
      const ps = priceSeries.current.coordinateToPrice(y);
      if (typeof ps === "number" && isFinite(ps)) price = ps;
    } catch { }
    return { time, price, px: { x, y }, client: { x: evt.clientX, y: evt.clientY } };
  }, []);

  // SAFE ensureXY:
  const ensureXY = (pt) => {
    const chart = mainChart.current;
    const series = priceSeries.current;
    if (!chart || !series) return pt.px ? { x: pt.px.x, y: pt.px.y } : null;

    let x = null;
    if (pt && typeof pt.time === "number") {
      try { x = chart.timeScale().timeToCoordinate(pt.time); } catch { }
    }
    let y = null;
    if (pt && typeof pt.price === "number") {
      try { y = series.priceToCoordinate(pt.price); } catch { }
    }
    if (x == null || y == null) return pt.px ? { x: pt.px.x, y: pt.px.y } : null;
    return { x, y };
  };

  const newId = () => Math.random().toString(36).slice(2, 10);

  const pushPoint = (pt) => {
    const arr = drawingsRef.current;
    const last = arr[arr.length - 1];
    if (!last || last.tool !== activeTool || last.done) {
      arr.push({
        id: newId(),
        tool: activeTool,
        points: [pt],
        done: false,
        style: { ...defaultStyle },
        locked: false,
      });
    } else {
      last.points.push(pt);
      if (["hline", "hray", "vline", "cross"].includes(activeTool)) last.done = true;
      if (["trend", "ray", "info", "extended"].includes(activeTool) && last.points.length >= 2) last.done = true;
      if (last.done && ["trend", "ray", "info", "extended", "hline", "hray", "vline", "cross"].includes(activeTool)) {
        setActiveTool(null);
      }
    }
    setRedrawTick(t => t + 1);
  };

  const hitTest = (x, y) => {
    const tol = 6;
    for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
      const d = drawingsRef.current[i];
      if (!d.done) continue;
      const P = d.points.map(ensureXY).filter(Boolean);
      if (!P.length) continue;
      if (d.tool === "vline") {
        const dx = Math.abs(x - P[0].x);
        if (dx <= tol) return d.id;
      } else if (d.tool === "hline" || d.tool === "hray") {
        const dy = Math.abs(y - P[0].y);
        if (dy <= tol) return d.id;
      } else if (d.tool === "cross") {
        const dx = Math.abs(x - P[0].x);
        const dy = Math.abs(y - P[0].y);
        if (dx <= tol || dy <= tol) return d.id;
      } else {
        if (P.length >= 2) {
          const a = P[0], b = P[1];
          const dd = pointToSegDist(x, y, a.x, a.y, b.x, b.y);
          if (dd <= tol) return d.id;
        }
      }
    }
    return null;
  };

  // --- Indicator hit-test on MAIN pane
  const hitTestIndicatorMain = (mouseX, mouseY) => {
    const chart = mainChart.current;
    if (!chart) return null;
    const ts = chart.timeScale();
    const priceToY = (series, price) => {
      try { return series.priceToCoordinate(price); } catch { return null; }
    };
    const timeToX = (time) => {
      try { return ts.timeToCoordinate(time); } catch { return null; }
    };
    const maxPx = 6;

    for (const arr of Object.values(indDataMain.current || {})) {
      for (const { series, data } of arr) {
        if (!series || !data?.length) continue;
        for (let i = 1; i < data.length; i++) {
          const a = data[i - 1], b = data[i];
          if (!a || !b || a.value == null || b.value == null) continue;
          const xa = timeToX(a.time), xb = timeToX(b.time);
          const ya = priceToY(series, a.value), yb = priceToY(series, b.value);
          if (xa == null || xb == null || ya == null || yb == null) continue;
          const dpx = Math.abs((yb - ya) * mouseX - (xb - xa) * mouseY + (xb * ya - yb * xa)) / Math.hypot(yb - ya, xb - xa);
          if (dpx <= maxPx) return { series };
        }
      }
    }
    return null;
  };

  const updateToolbarPos = useCallback((d) => {
    if (!d) return setToolbarOpen(false);
    const P = d.points.map(ensureXY).filter(Boolean);
    if (!P.length) return setToolbarOpen(false);
    let x, y;
    if (d.tool === "vline") { x = P[0].x; y = P[0].y ?? 20; }
    else if (d.tool === "hline" || d.tool === "hray" || d.tool === "cross") { x = P[0].x ?? 20; y = (P[0].y ?? 20) + 20; }
    else if (P.length >= 2) { x = (P[0].x + P[1].x) / 2; y = (P[0].y + P[1].y) / 2; }
    else { x = P[0].x; y = P[0].y; }
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return setToolbarOpen(false);
    setTbPos({ x: rect.left + x, y: rect.top + y + 12 });
    setToolbarOpen(true);
  }, []);

  const onPointerDown = (e) => {
    if (!overlayRef.current) return;
    const p = toChartPoint(e);
    if (!p) return;

    // If not in draw mode, try picking drawings or indicators
    if (!activeTool) {
      // Drawings first
      const id = hitTest(p.px.x, p.px.y);
      if (id) {
        const d = drawingsRef.current.find(x => x.id === id);
        setSelectedId(id);
        setSelectedIndicator(null);
        setIndTbOpen(false);
        updateToolbarPos(d);
        return;
      }

      // Indicators on main pane
      const hitInd = hitTestIndicatorMain(p.px.x, p.px.y);
      if (hitInd?.series) {
        setSelectedId(null);
        setSelectedIndicator(hitInd.series);
        setToolbarOpen(false);
        setIndTbOpen(true);
        setIndTbPos({ x: p.client.x, y: p.client.y });
        return;
      }

      // nothing picked
      setSelectedId(null);
      setSelectedIndicator(null);
      setToolbarOpen(false);
      setIndTbOpen(false);
      return;
    }

    // drawing mode
    pushPoint(p);
    draggingRef.current = true;
  };

  const onPointerMove = (e) => {
    if (!activeTool) return;
    const d = drawingsRef.current[drawingsRef.current.length - 1];
    if (!d || d.tool !== activeTool || d.done) return;
    const p = toChartPoint(e);
    if (!p) return;
    if (d.points.length === 1 || draggingRef.current) {
      d.points[1] = p;
      setRedrawTick(t => t + 1);
    }
  };

  const onPointerUp = () => {
    if (!activeTool) return;
    const d = drawingsRef.current[drawingsRef.current.length - 1];
    if (d && d.tool === activeTool && !d.done && d.points.length >= 2) {
      d.done = true;
      setSelectedId(d.id);
      updateToolbarPos(d);
      setRedrawTick(t => t + 1);
    }
    draggingRef.current = false;
  };

  const clearLast = () => { drawingsRef.current.pop(); setSelectedId(null); setToolbarOpen(false); setRedrawTick(t => t + 1); };
  const clearAll = () => { drawingsRef.current = []; setSelectedId(null); setToolbarOpen(false); setRedrawTick(t => t + 1); };

  /* ---------------- Left toolbar ---------------- */
  const LeftRail = () => (
    <div className="fixed left-2 z-[9993] select-none" style={{ top: HEADER_H + 16 }}>

      <div className="bg-white/95 border rounded-xl shadow-lg p-1 flex flex-col gap-1">
        <button
          className={`w-9 h-9 grid place-items-center rounded-md hover:bg-gray-100 ${drawerOpen ? "bg-gray-100" : ""}`}
          title="Draw Tools"
          onClick={() => setDrawerOpen(o => !o)}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 grid place-items-center rounded-md hover:bg-gray-100" title="Undo last" onClick={clearLast}>
          <Minus className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 grid place-items-center rounded-md hover:bg-gray-100" title="Clear drawings" onClick={clearAll}>
          <GripVertical className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {drawerOpen && (
        <div className="absolute left-11 top-0 bg-white/95 border rounded-xl shadow-xl p-2 w-[260px]">
          <div className="mb-2">
            <div className="px-2 pb-1 text=[11px] uppercase tracking-wide text-gray-500">Lines</div>
            {DRAW_TOOLS[0].items.map((it) => {
              const Icon = it.icon || LineChart;
              const activeCls = activeTool === it.key ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50";
              return (
                <button
                  key={it.key}
                  onClick={() => pickTool(it.key)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm border rounded-md ${activeCls}`}
                  title={it.label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{it.label}</span>
                  {it.hotkey && <span className="text-[10px] text-gray-500">{it.hotkey}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* --------------- Chart Type dropdown --------------- */
  const ChartTypeDropdown = () => {
    const currentLabel = (() => {
      for (const g of CHART_GROUPS) for (const it of g.items) if (it.supported && it.type === chartType.type) return it.label;
      return "Candles";
    })();
    const pickType = (it) => { if (!it.supported) return; setChartType({ type: it.type }); setCtOpen(false); };
    return (
      <div ref={ctWrapRef} className="relative">
        <button
          onClick={() => { setCtOpen(o => !o); setTimeout(updateCtPos, 0); }}
          className={`w-9 h-9 flex items-center justify-center rounded-lg
              ${glassClass} hover:scale-105 transition-transform`}
          title={currentLabel}
        >
          <CandlestickChart className="w-5 h-5" />
        </button>


        {ctOpen && (
          <div ref={ctMenuRef} style={{ position: "fixed", top: ctPos.top, left: ctPos.left }} className="z-[10000] w-64 bg-white border rounded-lg shadow-lg p-1">
            {CHART_GROUPS.map((grp, gi) => (
              <div key={gi} className="py-1">
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500">{grp.title}</div>
                {grp.items.map((it) => {
                  const disabled = !it.supported;
                  const active = !disabled && it.type === chartType.type;
                  return (
                    <button key={it.key} disabled={disabled} onClick={() => pickType(it)}
                      className={`w-full flex itemsCENTER gap-2 px-2 py-1.5 rounded text-sm ${disabled ? "opacity-40 cursor-not-allowed" : active ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}>
                      <LineChart className="w-4 h-4" />
                      <span className="flex-1 text-left">{it.label}</span>
                    </button>
                  );
                })}
                {gi < CHART_GROUPS.length - 1 && <div className="my-1 border-t" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ---------------- Overlay SVG (draws the lines) ---------------- */
  const OverlaySVG = () => {
    const chart = mainChart.current;
    const series = priceSeries.current;
    if (!overlayRef.current) return null;

    const w = overlayRef.current.clientWidth || 0;
    const h = overlayRef.current.clientHeight || 0;

    const timeToXSafe = (t) => {
      if (!chart || typeof t !== "number") return null;
      try { return chart.timeScale().timeToCoordinate(t); } catch { return null; }
    };
    const priceToYSafe = (p) => {
      if (!series || typeof p !== "number") return null;
      try { return series.priceToCoordinate(p); } catch { return null; }
    };

    const addLine = (x1, y1, x2, y2, style, dashed = false) => {
      let dashArr = "0";
      if (style?.dash === "dash") dashArr = "6 4";
      if (style?.dash === "dot") dashArr = "2 5";
      return (
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={style?.color || "#0ea5e9"} strokeWidth={style?.width || 2}
          strokeDasharray={dashArr} />
      );
    };

    const items = [];
    const ensureXYLocal = (pt) => {
      const x = timeToXSafe(pt.time);
      const y = priceToYSafe(pt.price);
      if (x == null || y == null) return pt.px ? { x: pt.px.x, y: pt.px.y } : null;
      return { x, y };
    };

    for (const dr of drawingsRef.current) {
      const P = dr.points.map(ensureXYLocal).filter(Boolean);
      if (!P.length) continue;

      const style = dr.style || defaultStyle;
      const isSel = dr.id === selectedId;

      if (dr.tool === "trend" && P.length >= 2) items.push(addLine(P[0].x, P[0].y, P[1].x, P[1].y, style));
      if (dr.tool === "ray" && P.length >= 2) {
        const a = P[0], b = P[1];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) < 1e-6) items.push(addLine(a.x, 0, a.x, h, style));
        else {
          const m = dy / dx;
          const y0 = a.y - m * (a.x - 0);
          const yW = a.y + m * (w - a.x);
          items.push(addLine(0, y0, w, yW, style));
        }
      }
      if (dr.tool === "extended" && P.length >= 2) {
        const a = P[0], b = P[1];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) < 1e-6) items.push(addLine(a.x, 0, a.x, h, style));
        else {
          const m = dy / dx;
          const y0 = a.y - m * (a.x - 0);
          const yW = a.y + m * (w - a.x);
          items.push(addLine(0, y0, w, yW, style));
        }
      }
      if (dr.tool === "hline") { const y = P[0].y; items.push(addLine(0, y, w, y, style)); }
      if (dr.tool === "hray" && P.length >= 2) {
        const y = P[0].y; const x2 = P[1].x >= P[0].x ? w : 0; items.push(addLine(P[0].x, y, x2, y, style));
      }
      if (dr.tool === "vline") { const x = P[0].x; items.push(addLine(x, 0, x, h, style)); }
      if (dr.tool === "cross") {
        const x = P[0].x, y = P[0].y;
        items.push(addLine(0, y, w, y, style, true));
        items.push(addLine(x, 0, x, h, style, true));
      }

      if (!dr.done && P.length === 1 && activeTool) {
        items.push(<circle cx={P[0].x} cy={P[0].y} r={3} fill={style.color || "#0ea5e9"} />);
      }
      if (isSel && P.length >= 2) {
        items.push(<circle cx={P[0].x} cy={P[0].y} r={4} fill="#fff" stroke="#3b82f6" strokeWidth="2" />);
        items.push(<circle cx={P[1].x} cy={P[1].y} r={4} fill="#fff" stroke="#3b82f6" strokeWidth="2" />);
      }
    }

    return <svg width={w} height={h} style={{ display: "block" }}>{items.map((el, i) => React.cloneElement(el, { key: i }))}</svg>;
  };

  /* ▶ INDICATORS: create/update series when toggled or data changes */
  const removeAllIndicatorSeries = useCallback(() => {
    Object.values(indSeriesMain.current).flat().forEach(s => { try { s.remove(); } catch { } });
    Object.values(indSeriesOsc.current).flat().forEach(s => { try { s.remove(); } catch { } });
    indSeriesMain.current = {};
    indSeriesOsc.current = {};
    indDataMain.current = {};
    indDataOsc.current = {};
  }, []);

  const updateIndicators = useCallback(() => {
    if (!mainChart.current || !oscChart.current || !candles.length) return;

    // 1) clear all existing indicator series
    Object.values(indSeriesMain.current).flat().forEach(s => {
      try { mainChart.current?.removeSeries(s); } catch { }
    });

    Object.values(indSeriesOsc.current).flat().forEach(s => {
      try { mainChart.current?.removeSeries(s); } catch { }
    });

    indSeriesMain.current = {};
    indSeriesOsc.current = {};
    indDataMain.current = {};
    indDataOsc.current = {};

    const main = mainChart.current;
    const osc = oscChart.current;

    const closes = candles.map(c => c.close);
    const times = candles.map(c => c.time);

    const addMainLine = (color = "#0ea5e9", width = 1) =>
      main.addLineSeries({
        color,
        lineWidth: width,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });

    // 🔥 FORCE ALL OSC INDICATORS TO MAIN CHART
    const addOscLine = (color, width, scaleId) =>
      mainChart.current.addLineSeries({
        color,
        lineWidth: width,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        priceScaleId: scaleId,   // 🔥 KEY FIX
      });

    const addOscHist = (color, scaleId) =>
      mainChart.current.addHistogramSeries({
        color,
        base: 0,
        priceLineVisible: false,
        priceScaleId: scaleId,   // 🔥 KEY FIX
      });



    const pushMain = (key, series, data) => {
      indSeriesMain.current[key] = (indSeriesMain.current[key] || []).concat(series);
      indDataMain.current[key] = (indDataMain.current[key] || []).concat({ series, data });
    };

    const pushOsc = (key, series, data) => {
      indSeriesOsc.current[key] = (indSeriesOsc.current[key] || []).concat(series);
      indDataOsc.current[key] = (indDataOsc.current[key] || []).concat({ series, data });
    };

    const toSeriesData = (values) =>
      times
        .map((t, i) =>
          values[i] == null || !isFinite(values[i])
            ? null
            : { time: t, value: values[i] }
        )
        .filter(Boolean);

    // ---------- 52 Week High / Low (MAIN) ----------
    if (active.hi52) {
      const { hi, lo } = highLow52w(candles, 252);
      const sHi = addMainLine("#f59e0b", 1);
      const sLo = addMainLine("#10b981", 1);
      const dHi = toSeriesData(hi);
      const dLo = toSeriesData(lo);
      sHi.setData(dHi);
      sLo.setData(dLo);
      pushMain("hi52", sHi, dHi);
      pushMain("hi52", sLo, dLo);
    }

    // ---------- Average Price (MAIN) ----------
    if (active.avgprice) {
      const avg = AvgPrice(candles, 14);
      const s = addMainLine("#3b82f6", 1);
      const d = toSeriesData(avg);
      s.setData(d);
      pushMain("avgprice", s, d);
    }

    // Prepare Bollinger only once if any BB-related indicator is active
    let bb = null;
    const getBB = () => {
      if (!bb) bb = Bollinger(closes, 20, 2);
      return bb;
    };

    // ---------- Bollinger Bands (MAIN) ----------
    if (active.bbands) {
      const { ma, upper, lower } = getBB();
      const midS = addMainLine("#0ea5e9", 1);
      const upS = addMainLine("rgba(148,163,184,0.9)", 1);
      const loS = addMainLine("rgba(148,163,184,0.9)", 1);

      const dMid = toSeriesData(ma);
      const dUp = toSeriesData(upper);
      const dLo = toSeriesData(lower);

      midS.setData(dMid);
      upS.setData(dUp);
      loS.setData(dLo);

      pushMain("bbands", midS, dMid);
      pushMain("bbands", upS, dUp);
      pushMain("bbands", loS, dLo);
    }

    // ---------- Bollinger %B (OSC) ----------
    if (active.bb_pctb) {
      const { pctB } = getBB();
      const scale = "scale_pctb";
      const s = addOscLine("#6366f1", 1, scale);
      const d = toSeriesData(pctB);
      s.setData(d);
      pushOsc("bb_pctb", s, d);
    }


    // ---------- Bollinger Width (OSC) ----------
    if (active.bb_width) {
      const { width } = getBB();
      const scale = "scale_bbw";
      const s = addOscLine("#f97316", 1, scale);
      const d = toSeriesData(width);
      s.setData(d);
      pushOsc("bb_width", s, d);
    }


    // ---------- ADX (+DI / −DI / ADX) (OSC) ----------
    if (active.adx) {
      const { plusDI, minusDI, adx } = ADX(candles, 14);

      const scale = "scale_adx";

      const sPlus = addOscLine("#22c55e", 1, scale);
      const sMinus = addOscLine("#ef4444", 1, scale);
      const sAdx = addOscLine("#0ea5e9", 1, scale);

      const dPlus = toSeriesData(plusDI).filter(p => Number.isFinite(p.value));
      const dMinus = toSeriesData(minusDI).filter(p => Number.isFinite(p.value));
      const dAdx = toSeriesData(adx).filter(p => Number.isFinite(p.value));

      sPlus.setData(dPlus);
      sMinus.setData(dMinus);
      sAdx.setData(dAdx);

      pushOsc("adx", sPlus, dPlus);
      pushOsc("adx", sMinus, dMinus);
      pushOsc("adx", sAdx, dAdx);
    }



    // ---------- Aroon Up / Down / Osc (OSC) ----------
    if (active.aroon) {
      const { up, down, osc } = Aroon(candles, 25);
      const scale = "scale_aroon";

      const sUp = addOscLine("#22c55e", 1, scale);
      const sDown = addOscLine("#ef4444", 1, scale);
      const sOsc = addOscLine("#0ea5e9", 1, scale);

      sUp.setData(toSeriesData(up));
      sDown.setData(toSeriesData(down));
      sOsc.setData(toSeriesData(osc));

      pushOsc("aroon", sUp);
      pushOsc("aroon", sDown);
      pushOsc("aroon", sOsc);
    }


    // ---------- Accumulation / Distribution Line (OSC) ----------
    // ---------- Accumulation / Distribution Line (OSC) ----------
    if (active.adline) {
      const vals = ADLine(candles);

      const scale = "scale_adline"; // 🔥 separate hidden scale (prevents candle compression)

      const s = addOscLine("#0ea5e9", 1, scale);
      const d = toSeriesData(vals);

      s.setData(d);
      pushOsc("adline", s, d);
    }


    // ---------- Balance of Power (OSC, histogram) ----------
    if (active.bop) {
      const vals = BOP(candles);
      const scale = "scale_bop"; // 🔥 separate hidden scale

      const s = addOscHist("#64748b", scale);
      const d = toSeriesData(vals);

      s.setData(d);
      pushOsc("bop", s, d);
    }


    // ---------- CCI (OSC) ----------
    if (active.cci) {
      const vals = CCI(candles, 20);
      const scale = "scale_cci";
      const s = addOscLine("#22c55e", 1, scale);
      s.setData(toSeriesData(vals));
      pushOsc("cci", s);
    }


    // ---------- Stoch RSI (K & D) (OSC) ----------
    if (active.rsi_stoch) {
      const { k, d } = StochRSI(closes, 14, 14, 3);
      const scale = "scale_stoch";

      const sK = addOscLine("#0ea5e9", 1, scale);
      const sD = addOscLine("#f97316", 1, scale);

      sK.setData(toSeriesData(k));
      sD.setData(toSeriesData(d));

      pushOsc("rsi_stoch", sK);
      pushOsc("rsi_stoch", sD);
    }


    // ---------- Awesome Oscillator (OSC, histogram) ----------
    if (active.ao) {
      const { ao } = AO_AC(candles);
      const scale = "scale_ao"; // 🔥 separate hidden scale

      const s = addOscHist("#0ea5e9", scale);
      const d = toSeriesData(ao);

      s.setData(d);
      pushOsc("ao", s, d);
    }



    // ---------- Accelerator Oscillator (OSC, histogram) ----------
    if (active.ac) {
      const { ac } = AO_AC(candles);
      const scale = "scale_ac"; // 🔥 separate hidden scale

      const s = addOscHist("#22c55e", scale);
      const d = toSeriesData(ac);

      s.setData(d);
      pushOsc("ac", s, d);
    }


    // ---------- Supertrend (MAIN) ----------
    if (active.supertrend) {
      const { trend } = Supertrend(candles, 10, 3);
      const s = addMainLine("#16a34a", 2);
      const d = toSeriesData(trend);
      s.setData(d);
      pushMain("supertrend", s, d);
    }
  }, [candles, active, mainChart, oscChart]);

  // Rebuild indicators when data or active flags change
  useEffect(() => {
    updateIndicators();
  }, [updateIndicators]);



  useEffect(() => { updateIndicators(); }, [updateIndicators, chartType, redrawTick]);
  useEffect(() => () => removeAllIndicatorSeries(), [removeAllIndicatorSeries]);

  /* ---------------- Floating edit toolbar for drawings ---------------- */
  const SelectedToolbar = () => {
    if (!toolbarOpen || !selectedId) return null;
    const d = drawingsRef.current.find(x => x.id === selectedId);
    if (!d) return null;
    const style = d.style || defaultStyle;

    const onColor = (e) => { d.style.color = e.target.value; setRedrawTick(t => t + 1); };
    const onWidth = (e) => { d.style.width = Number(e.target.value); setRedrawTick(t => t + 1); };
    const onDash = (e) => { d.style.dash = e.target.value; setRedrawTick(t => t + 1); };
    const onLock = () => { d.locked = !d.locked; setRedrawTick(t => t + 1); };
    const onDelete = () => {
      drawingsRef.current = drawingsRef.current.filter(x => x.id !== d.id);
      setSelectedId(null);
      setToolbarOpen(false);
      setRedrawTick(t => t + 1);
    };
    const onExitDraw = () => { setActiveTool(null); setToolbarOpen(false); };

    return (
      <div
        className="fixed z-[9994] bg-white/95 border rounded-xl shadow-lg px-2 py-1 flex items-center gap-2"
        style={{ left: tbPos.x, top: tbPos.y }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={freezeUI}
        onMouseLeave={unfreezeUI}
      >
        <input type="color" value={style.color} onChange={onColor} className="w-8 h-8 p-0 border rounded" title="Color" />
        <select value={style.width} onChange={onWidth} className="text-xs border rounded px-2 py-1" title="Stroke width">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}px</option>)}
        </select>
        <select value={style.dash} onChange={onDash} className="text-xs border rounded px-2 py-1" title="Line style">
          <option value="solid">Solid</option>
          <option value="dash">Dashed</option>
          <option value="dot">Dotted</option>
        </select>
        <button onClick={onLock} className={`text-xs px-2 py-1 rounded border ${d.locked ? "bg-gray-200" : "hover:bg-gray-100"}`} title={d.locked ? "Unlock" : "Lock"}>
          {d.locked ? "Unlock" : "Lock"}
        </button>
        <button onClick={onDelete} className="text-xs px-2 py-1 rounded border hover:bg-gray-100" title="Delete">🗑</button>
        <button onClick={onExitDraw} className="text-xs px-2 py-1 rounded border hover:bg-gray-100" title="Exit draw mode">…</button>
      </div>
    );
  };

  /* ---------------- Indicator Toolbar (for overlay indicators) ---------------- */
  const IndicatorToolbar = () => {
    if (!indTbOpen || !selectedIndicator) return null;

    const onColor = (e) => {
      const v = e.target.value;
      selectedIndicator.applyOptions({ color: v });
    };
    const onWidth = (e) => {
      const v = Number(e.target.value);
      selectedIndicator.applyOptions({ lineWidth: v });
    };
    const onDash = (e) => {
      const v = e.target.value;
      selectedIndicator.applyOptions({
        lineStyle: v === "dash" ? 2 : v === "dot" ? 3 : 0,
      });
    };
    const onClose = () => setIndTbOpen(false);

    // ✅ Robust delete: always removes the selected series from the chart AND state
    const onDeleteIndicator = () => {
      const s = selectedIndicator;
      if (!s) return;

      let deletedKeys = new Set();

      // 🔥 MAIN PANE
      for (const [key, arr] of Object.entries(indSeriesMain.current)) {
        if (arr.includes(s)) {
          // delete ALL series of this indicator
          arr.forEach(series => {
            try { mainChart.current?.removeSeries(series); } catch { }
          });

          delete indSeriesMain.current[key];
          delete indDataMain.current[key];
          deletedKeys.add(key);
        }
      }

      // 🔥 OSC PANE
      for (const [key, arr] of Object.entries(indSeriesOsc.current)) {
        if (arr.includes(s)) {
          arr.forEach(series => {
            try { oscChart.current?.removeSeries(series); } catch { }
          });

          delete indSeriesOsc.current[key];
          delete indDataOsc.current[key];
          deletedKeys.add(key);
        }
      }

      // 🔥 AUTO-UNTICK CHECKBOX
      if (deletedKeys.size) {
        setActive(prev => {
          const next = { ...prev };
          deletedKeys.forEach(k => (next[k] = false));
          return next;
        });
      }

      setSelectedIndicator(null);
      setIndTbOpen(false);
    };


    return (
      <div
        className="fixed z-[9994] bg-white/95 border rounded-xl shadow-lg px-2 py-1 flex items-center gap-2"
        style={{ left: indTbPos.x, top: indTbPos.y }}
        onMouseEnter={freezeUI}
        onMouseLeave={unfreezeUI}
      >
        <input type="color" defaultValue="#3b82f6" onChange={onColor} className="w-8 h-8 p-0 border rounded" title="Color" />
        <select defaultValue={2} onChange={onWidth} className="text-xs border rounded px-2 py-1" title="Stroke width">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}px</option>)}
        </select>
        <select defaultValue="solid" onChange={onDash} className="text-xs border rounded px-2 py-1" title="Line style">
          <option value="solid">Solid</option>
          <option value="dash">Dashed</option>
          <option value="dot">Dotted</option>
        </select>
        <button onClick={onDeleteIndicator} className="text-xs px-2 py-1 rounded border hover:bg-gray-100" title="Delete indicator">🗑</button>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded border hover:bg-gray-100">Close</button>
      </div>
    );
  };

  /* ---------- NEW: make indicator clicks work even when overlay is passthrough ---------- */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handleMouseDown = (e) => {
      // only when NOT drawing and not using drawing toolbar
      if (activeTool || toolbarOpen || drawerOpen) return;
      if (!mainChart.current) return;
      const rect = el.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const y = clamp(e.clientY - rect.top, 0, rect.height);
      const hitInd = hitTestIndicatorMain(x, y);
      if (hitInd?.series) {
        setSelectedId(null);
        setSelectedIndicator(hitInd.series);
        setIndTbOpen(true);
        setToolbarOpen(false);
        setIndTbPos({ x: e.clientX, y: e.clientY });
      } else {
        setIndTbOpen(false);
        setSelectedIndicator(null);
      }
    };
    el.addEventListener("mousedown", handleMouseDown);
    return () => el.removeEventListener("mousedown", handleMouseDown);
  }, [activeTool, toolbarOpen, drawerOpen]); // keep small deps



  // ---------------------------------------------------------
  // AUTO SIGNAL GENERATION CONTROLLER
  // ---------------------------------------------------------
  const autoRunRef = useRef(null);
  const isRunningRef = useRef(false);
  // ⭐ NEW — 20s loop controller for Recommendations
  const recoRunRef = useRef(null);

  // ⭐ track recommendation mode in ref (used when button clicked)
  const recoModeRef = useRef(false);

  // ---------------------------------------------------------
  // MERGE SIGNAL DATA (2m + 15m)
  // ---------------------------------------------------------
  function mergeSignals(sig2, sig15) {
    const final = [];

    [...sig2, ...sig15].forEach(s => final.push({
      time: Number(s.timestamp),
      position: s.signal === "BUY" ? "belowBar" : "aboveBar",
      shape: s.signal === "BUY" ? "arrowUp" : "arrowDown",
      color: s.signal === "BUY" ? "#16a34a" : "#dc2626",
      text: `${s.signal} || ${s.close_price}`
    }));

    return final.sort((a, b) => a.time - b.time);
  }


  // ---------------------------------------------------------
  // MAIN FUNCTION — NEW VERSION
  // ---------------------------------------------------------
  async function generateSignal() {
    console.log("=== GENERATE SIGNAL CLICKED ===");
    if (!features.allow_generate_signals) {
  showPopup("Locked", "Generate Signals is enabled only for approved users.");
  return;
}

    // -------------------------------------
    // ⭐ 1. OFF MODE (SECOND CLICK)
    // -------------------------------------
    if (isRunningRef.current) {
      clearInterval(autoRunRef.current);
      isRunningRef.current = false;
      setGenerateMode(false);

      localStorage.setItem("NC_generateMode_" + symbol, "true");

      const btn = document.querySelector("#genBtn");
      if (btn) {
        btn.style.background = "";
        btn.style.color = "";
        btn.style.borderColor = "";
      }

      showPopup("Stopped", "Auto generated signals stopped");

      return;
    }

    // -------------------------------------
    // ⭐ 2. VALIDATE TIMEFRAME
    // -------------------------------------
    if (!["2m", "15m"].includes(tf)) {
      showPopup("Invalid Timeframe", "Generate signals only for 2m and 15m");

      return;
    }

    // -------------------------------------
    // ⭐ 3. ON MODE (FIRST CLICK)
    // -------------------------------------
    showPopup(
      "Signal Generation",
      "• Signal generation started.\n" +
      "• Displaying signals shortly.\n" +
      "• Click again to stop continuous updates."
    );


    isRunningRef.current = true;
    setGenerateMode(true);
    localStorage.setItem("NC_generateMode_" + symbol, "true");

    const btn = document.querySelector("#genBtn");
    if (btn) {
      btn.style.background = "#16a34a";
      btn.style.color = "white";
      btn.style.borderColor = "#16a34a";
    }

    // run once immediately
    await runSignalOnce();

    // start 20-sec auto loop
    if (autoRunRef.current) clearInterval(autoRunRef.current);
    autoRunRef.current = setInterval(runSignalOnce, 20000);
  }




  // ---------------------------------------------------------
  // RUN SIGNAL ONCE (2m + 15m)
  // ---------------------------------------------------------
  async function runSignalOnce() {
    try {
      console.log("RUN SIGNAL ONCE");

      const username = localStorage.getItem("username") || "default_user";

      // regenerate signals on backend
      await fetch(`${API}/market/generate-signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          username, // 🔥 CRITICAL FIX
        }),
      });

      // load markers after generation
      await loadAllSignals(symbolRef.current, tfRef.current);


      console.log("✔ Updated signals for:", tf);

    } catch (err) {
      console.error("Signal error:", err);
    }
  }

useEffect(() => {
  // ✅ If user already started Generate Mode, switching TF should refresh markers
  if (!generateMode) return;

  // This will re-fetch + re-filter markers for the new tf
  loadAllSignals(symbol, tf);

}, [tf, symbol, generateMode]);

  // --------------------------------------------------
  // UNIVERSAL MARKER MERGER (STEP-4)
  // --------------------------------------------------
  function applyUnifiedMarkers() {
    if (!priceSeries.current) return;

    const gen = priceSeries.current._genMarkers || [];
    const reco = priceSeries.current._recoMarkers || [];

    // FIX: Merge + sort by time
    const merged = [...gen, ...reco]
      .filter(m => m && m.time)
      .sort((a, b) => a.time - b.time);

    try {
      priceSeries.current.setMarkers(merged);
    } catch (e) {
      console.error("❌ Marker apply error:", e, merged);
    }
  }




  // ---------------------------------------------------------
  // RECOMMENDATIONS FEATURE
  // ---------------------------------------------------------
  const [showRecoModal, setShowRecoModal] = useState(false);
  const [recoData, setRecoData] = useState([]);



  // ======================================================================
  // 🔵 OPEN RECOMMENDATIONS — CLICK HANDLER
  // ======================================================================
  async function openRecommendations() {
    console.log("📌 Recommendation button clicked");
        if (recoLocked) {
      showPopup("Locked", "Recommendations are available only for approved users.");
      return;
    }

    // -----------------------
    // 🌟 STOP MODE
    // -----------------------
    if (recoModeRef.current === true) {
      showPopup("Stopped", "Recommendation auto-refresh stopped");


      recoModeRef.current = false;
      setRecoMode(false);
      localStorage.setItem("NC_recoMode_" + symbol, "false");

      if (recoRunRef.current) clearInterval(recoRunRef.current);
      recoRunRef.current = null;

      const btn = document.querySelector("#recoBtn");
      if (btn) {
        btn.style.background = "";
        btn.style.color = "";
        btn.style.borderColor = "";
      }
      return;
    }

    // -----------------------
    // 🌟 VALIDATE TF
    // -----------------------
    if (!["15m", "1d"].includes(tf)) {
      showPopup("Invalid Timeframe", "Recommendation signals only available for 15m and 1d");

      return;
    }

    // -----------------------
    // 🌟 START MODE
    // -----------------------
    showPopup(
      "Recommendations",
      "• Recommendation Signals Started.\n" +
      "• Updating every 20 seconds.\n" +
      "• If no data exists for the script, nothing will show.\n" +
      "• Click again to stop."
    );


    recoModeRef.current = true;
    setRecoMode(true);
    localStorage.setItem("NC_recoMode_" + symbol, "true");

    const btn = document.querySelector("#recoBtn");
    if (btn) {
      btn.style.background = "#2563eb";
      btn.style.color = "white";
      btn.style.borderColor = "#2563eb";
    }

    // -----------------------
    // 🌟 START LOOP (20 sec)
    // -----------------------
    if (recoRunRef.current) clearInterval(recoRunRef.current);

    recoRunRef.current = setInterval(() => {
      console.log("🔄 Refreshing Recommendations (20s loop)");
      refreshRecommendations();
    }, 20000);

    // Run immediately ONCE
    await refreshRecommendations();
  }



  // ======================================================================
  // 🔵 REFRESH RECOMMENDATIONS — FETCH + APPLY MARKERS + UPDATE DESCRIPTION
  // ======================================================================
  async function refreshRecommendations() {
    try {
      const url = `${API}/market/reco-load?symbol=${symbol}&tf=${tf}`;
      const res = await fetch(url);
      const js = await res.json();

      // --------------------------
      // APPLY MARKERS
      // --------------------------
      if (Array.isArray(js.markers)) {
        priceSeries.current._recoMarkers = js.markers;
        applyUnifiedMarkers();
      }

      // --------------------------
      // DESCRIPTION
      // --------------------------
      const rows = Array.isArray(js.rows) ? js.rows : [];

      // ⭐ Ensure each row contains timestamp (needed for proper sorting)
      const cleaned = rows.map(r => ({
        Date: r.Date || "--",
        Alert_details: r.Alert_details || "--",
        screener: r.screener || "--",
        user_actions: r.user_actions || "--",
        timestamp: r.timestamp ? Number(r.timestamp) : 0   // 💥 FIX: important
      }));

      // sort latest 4
      const latest = cleaned
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, 4);

      console.log("📌 Recommendation Description Loaded:", latest);

      setLatestRecoDesc(latest);

    } catch (err) {
      console.error("❌ RECO refresh error:", err);
    }
  }


  /* --------------------------- UI --------------------------- */
  return (
  <div
    className={`h-[100dvh] ${bgClass} ${textClass} relative overflow-x-hidden overflow-y-scroll show-scrollbar transition-colors duration-300`}
    style={{ scrollbarGutter: "stable" }}
  >




      {/* Background Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      {/* Header (Sticky + 2 rows for mobile/tablet) */}
      <div className={`sticky top-0 z-[10020] ${glassClass} shadow-xl pointer-events-auto`}>

        {/* Row 1: Back + Symbol/TF/Price + Search/WA/Theme */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <button
            onClick={() => navigate(-1)}
            className={`text-xl px-3 py-1  ${glassClass} hover:scale-105 transition-transform`}
          >
            ←
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setOpenSearch(true)}
              className={`w-9 h-9 grid place-items-center rounded-lg ${glassClass} hover:scale-105 transition-transform relative z-[10030] pointer-events-auto`}
              title="Search Script"
            >
              <Search size={18} />
            </button>
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <div className="font-bold text-center truncate bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {symbol} • {tf.toUpperCase()}
            </div>

            {lastPrice != null && (
              <div
                className={`text-sm font-extrabold ${isUp == null
                  ? (isDark ? "text-slate-200" : "text-slate-700")
                  : isUp
                    ? "text-green-400"
                    : "text-rose-400"
                  }`}
                title={prevClose != null ? `Prev Close: ₹${Number(prevClose).toFixed(2)}` : ""}
              >
                ₹{Number(lastPrice).toLocaleString("en-IN")}
              </div>
            )}

          </div>

          <div className="flex items-center gap-2">




            <button
              onClick={() => setIsDark(!isDark)}
              className={`w-9 h-9 flex items-center justify-center rounded-full ${glassClass} hover:scale-110 transition-all`}
              title="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Controls (scrollable on small screens) */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap
                lg:justify-center lg:overflow-visible"
          >

            {["1m", "2m", "15m", "1h", "1d"].map((k) => (
              <button
                key={k}
                onClick={() => setTf(k)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 transition-all ${tf === k
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 scale-105"
                  : `${glassClass} hover:scale-105`
                  }`}
              >
                {k}
              </button>
            ))}

            <div className="shrink-0">
              <ChartTypeDropdown />
            </div>

            <button
              onClick={() => setOpenIndModal(true)}
              className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${glassClass} hover:scale-105 transition-transform`}
              title="Indicators"
            >
              <SlidersHorizontal size={18} />
            </button>

            <button
              onClick={openBuyPage}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold text-white
                 bg-gradient-to-r from-green-500 to-emerald-500
                 shadow-lg hover:shadow-green-500/40 hover:scale-105 transition-all
                 flex items-center gap-1 whitespace-nowrap"
              title={`Buy ${symbol}`}
            >
              <ArrowUpRight className="w-3 h-3" />
              BUY
            </button>

            <button
              onClick={openSellPage}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold text-white
                 bg-gradient-to-r from-red-500 to-rose-500
                 shadow-lg hover:shadow-red-500/40 hover:scale-105 transition-all
                 flex items-center gap-1 whitespace-nowrap"
              title={`Sell ${symbol}`}
            >
              <ArrowDownRight className="w-3 h-3" />
              SELL
            </button>

            <button
              id="genBtn"
              onClick={generateSignal}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg ${glassClass}
                  font-semibold whitespace-nowrap hover:scale-105 transition-all
                  flex items-center gap-1`}
            >
              <Zap className="w-3 h-3" />
              Generate Signal
            </button>

            <button
              id="recoBtn"
              onClick={openRecommendations}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg ${glassClass}
                  font-semibold whitespace-nowrap hover:scale-105 transition-all
                  flex items-center gap-1`}
            >
              <Sparkles className="w-3 h-3" />
              Recommendation
            </button>
            <button
              onClick={openWhatsappPage}
              title="Open WhatsApp Alerts"
              className="w-7 h-6 flex items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-green-500/50 hover:scale-110 transition-all"
            >
              <FaWhatsapp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= SEARCH MODAL ================= */}
      {openSearch && (
        <div
          className="fixed inset-0 z-[10060] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-3"
          onMouseDown={() => setOpenSearch(false)}
        >
          <div
            className={`w-full max-w-xl rounded-2xl shadow-2xl ${glassClass} p-4`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className={`flex-1 flex items-center gap-2 rounded-xl px-3 py-2 ${isDark ? "bg-white/10" : "bg-white/80"}`}>
                <Search className="w-4 h-4 opacity-70" />
                <input
                  ref={searchInputRef}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search script (e.g., TCS, RELIANCE...)"
                  className={`w-full bg-transparent outline-none text-sm ${isDark ? "text-white placeholder:text-slate-300" : "text-slate-900 placeholder:text-slate-500"}`}
                />
                {searchQ && (
                  <button
                    type="button"
                    onClick={() => setSearchQ("")}
                    className="w-8 h-8 grid place-items-center rounded-lg hover:bg-black/10"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpenSearch(false)}
                className={`w-10 h-10 grid place-items-center rounded-xl ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"}`}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 max-h-[55vh] overflow-auto">
              {searchLoading ? (
                <div className={`py-6 text-center text-sm ${textSecondaryClass}`}>Searching…</div>
              ) : searchItems.length === 0 ? (
                <div className={`py-6 text-center text-sm ${textSecondaryClass}`}>No results</div>
              ) : (
                <div className="space-y-2">
                  {searchItems.map((it, idx) => {
                    const sym = (it.symbol || it.tradingsymbol || it.name || it).toString();
                    const exch = it.exchange || it.exch || "";
                    return (
                      <button
                        key={`${sym}-${idx}`}
                        type="button"
                        onClick={() => onPickScript(sym)}
                        className={`w-full text-left px-3 py-2 rounded-xl ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-white/70 hover:bg-white"} transition`}
                      >
                        <div className="font-semibold text-sm">{sym}</div>
                        {exch ? <div className={`text-xs ${textSecondaryClass}`}>{exch}</div> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}




      {/* Left toolbar */}
      <LeftRail />

      {/* Main chart + overlay */}
      <div style={{ position: "relative" }} className="touch-pan-y">
        <div ref={mainRef} style={{ width: "100%", touchAction: "pan-y" }} />
        {/* Floating Zoom Buttons */}

        {/* Floating Centered Zoom Buttons */}
        <div
          className={`absolute z-[9999] flex flex-row gap-2 ${glassClass} rounded-full px-2 py-1 shadow-xl`}
          style={{
            top: "85%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <button
            onClick={zoomIn}
            className={`w-8 h-8 rounded-full ${glassClass} hover:scale-110 transition-all flex items-center justify-center font-bold text-blue-500`}
            title="Zoom In"
          >
            +
          </button>

          <button
            onClick={zoomOut}
            className={`w-8 h-8 rounded-full ${glassClass} hover:scale-110 transition-all flex items-center justify-center font-bold text-blue-500`}
            title="Zoom Out"
          >
            –
          </button>

          <button
            onClick={resumeAutoFollow}
            className={`w-8 h-8 rounded-full ${glassClass} hover:scale-110 transition-all flex items-center justify-center font-bold text-green-500`}
            title="Go Live"
          >
            &gt;&gt;
          </button>
        </div>




        {/* Floating Go Live Button */}

        {/* Floating Go Live Button — icon only */}




        <div
          ref={overlayRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            // allow chart scroll/pan when not interacting with tools
            pointerEvents: (activeTool || toolbarOpen || indTbOpen || drawerOpen) ? "auto" : "none",
            cursor: activeTool ? "crosshair" : "default",
            transition: "opacity 120ms ease"
          }}
        >
          <OverlaySVG key={redrawTick} />
        </div>

        {/* spinner while older data loads */}
        {isFetchingOlder && (
          <div className="absolute left-2 top-2 z-[9995] bg-white/90 border rounded-md px-2 py-1 text-xs shadow">
            Loading older candles…
          </div>
        )}
      </div>

      {/* Volume pane (separate, time-synced) */}
      <div className="mt-0 border-t touch-pan-y">
        <div ref={volumeRef} style={{ width: "100%", touchAction: "pan-y" }} />
      </div>

      {/* Alert Description Section */}
      <div className="mt-4 px-4 pb-4 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-blue-500 animate-pulse" />
          <h3 className={`text-lg font-bold ${textClass}`}>
            Alerts & Recommendations Details
          </h3>
        </div>

        <div className={`${glassClass} rounded-3xl p-6 shadow-2xl min-h-[80px]`}>

          {/* ================= RECOMMENDATIONS ================= */}
          {recoMode && (
            <>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20">
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                <div className="text-sm font-bold text-blue-400">
                  📘 Latest 4 Recommendation Signals
                </div>
              </div>

              {latestRecoDesc.length > 0 ? (
                <div className="space-y-4">
                  {latestRecoDesc.slice(0, 4).map((row, idx) => (
                    <div
                      key={`reco-${idx}`}
                      className={`${glassClass} rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-lg border-l-4 ${row.signal_type === "BUY" ? "border-green-500" : "border-red-500"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${row.signal_type === "BUY" ? "text-green-400" : "text-red-400"}`} />
                          <span className={`text-xs font-semibold ${textSecondaryClass}`}>
                            {formatRecoDate(row.Date)}
                          </span>
                        </div>

                        <div
                          className={`px-3 py-1 rounded-lg font-bold text-sm ${row.signal_type === "BUY"
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                            } shadow-lg`}
                        >
                          {[row.Strategy, row.signal_type, row.close_price]
                            .filter(v => v !== undefined && v !== null && v !== "")
                            .map((v, i) => (typeof v === "number" ? v.toFixed(2) : v))
                            .join(" | ")}
                        </div>
                      </div>

                      <div className={`text-sm space-y-2 ${textSecondaryClass}`}>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[120px]">Alert Details:</span>
                          <span>{row.Alert_details || "--"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[120px]">Screener:</span>
                          <span>{row.screener || "--"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[120px]">User Action:</span>
                          <span>{row.user_actions || "--"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${textSecondaryClass}`}>
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recommendations found</p>
                </div>
              )}
            </>
          )}

          {/* ================= GENERATED SIGNALS ================= */}
          {generateMode && (
            <>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20 mt-6">
                <Zap className="w-5 h-5 text-green-400 animate-pulse" />
                <div className="text-sm font-bold text-green-400">
                  ⚡ Latest 4 Generated Signals
                </div>
              </div>

              {latestSignals.length === 0 ? (
                <div className={`text-center py-8 ${textSecondaryClass}`}>
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Signals Displaying in few seconds</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {latestSignals.map((sig, idx) => (
                    <div
                      key={`gen-${idx}`}
                      className={`${glassClass} rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-lg border-l-4 ${sig.signal === "BUY" ? "border-green-500" : "border-red-500"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap className={`w-4 h-4 ${sig.signal === "BUY" ? "text-green-400" : "text-red-400"}`} />
                          <span className={`text-xs font-semibold ${textSecondaryClass}`}>
                            {new Date(sig.timestamp * 1000).toLocaleString("en-US")}
                          </span>
                        </div>

                        <div
                          className={`px-3 py-1 rounded-lg font-bold text-sm ${sig.signal === "BUY"
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                            } shadow-lg`}
                        >
                          {sig.signal} | {sig.tf} | {Number(sig.close_price).toFixed(2)}
                        </div>
                      </div>

                      <div className={`text-sm space-y-2 ${textSecondaryClass}`}>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[120px]">Alert Details:</span>
                          <span>{sig.alert_details || "--"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[120px]">Screener:</span>
                          <span>{sig.screener || "--"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[120px]">User Action:</span>
                          <span>{sig.user_action || "--"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>




      {/* Oscillator pane */}
      <div className="mt-2 border-t touch-pan-y">
         <div ref={oscRef} style={{ width: "100%", touchAction: "pan-y" }} />
      </div>

      {/* status */}
      <div className="fixed top-16 right-3 text-xs text-gray-500 pointer-events-none z-[9991]">
        {status === "loading" && "Loading…"}
        {status === "error" && <span className="text-red-600">Error loading data</span>}
      </div>

      {/* floating toolbars */}
      <SelectedToolbar />
      <IndicatorToolbar />

      {/* ✅ Premium Popup Modal (replaces alert()) */}
      <AlertModal
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        isDark={isDark}
        glassClass={glassClass}
      />


      {/* ---------------- RECOMMENDATION MODAL ---------------- */}
      {showRecoModal && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white w-[90vw] max-w-md rounded-xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">
                Recommendations ({tf.toUpperCase()})
              </h2>
              <button
                onClick={() => setShowRecoModal(false)}
                className="text-gray-600 hover:text-black"
              >
                ✕
              </button>
            </div>

            {recoData.length === 0 && (
              <div className="text-center py-4 text-gray-600">
                No recommendations found.
              </div>
            )}

            {recoData.map((r, i) => (
              <div
                key={i}
                className="border rounded-lg p-3 mb-2 bg-gray-50 shadow-sm"
              >
                <div className="flex justify-between font-semibold">
                  <span>{r.label}</span>
                  <span
                    className={
                      r.direction === "BUY" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {r.direction}
                  </span>
                </div>

                <div className="text-sm mt-1">
                  <div>Price: ₹{r.price}</div>
                  <div>Date: {r.date}</div>
                  <div>Time: {r.time}</div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowRecoModal(false)}
              className="mt-2 w-full py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Indicators modal */}
      {openIndModal && (
        <div className="fixed inset-0 bg-black/40 z-[9992] flex items-start justify-center pt-16">
          <div className="bg-white rounded-xl shadow-xl w-[92vw] max-w-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Indicators</div>
              <button
                onClick={() => setOpenIndModal(false)}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-auto">
              {INDICATORS.map((ind) => (
                <label
                  key={ind.key}
                  className="flex items-center gap-2 border rounded p-2"
                >
                  <input
                    type="checkbox"
                    checked={!!active[ind.key]}
                    onChange={(e) =>
                      setActive((prev) => ({
                        ...prev,
                        [ind.key]: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm">{ind.label}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {ind.where === "main" ? "Overlay" : "Osc"}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-3 text-right">
              <button
                onClick={() => setOpenIndModal(false)}
                className="text-sm px-3 py-1 rounded border hover:bg-gray-100"
              >
                Done
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Note: A/D requires volume. If your backend doesn’t send volume, we
              assume 1.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
