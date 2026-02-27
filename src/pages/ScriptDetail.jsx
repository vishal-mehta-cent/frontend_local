// ✅ ScriptDetail.jsx - SELL pre-check with robust fallback + clear logs
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, FileText, ArrowRight } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import TradeModal from "./TradeModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip
);

const API = import.meta.env.VITE_BACKEND_BASE_URL || "https://paper-trading-backend.onrender.com";

const getUsername = (propUser) => propUser || localStorage.getItem("username") || "";

export default function ScriptDetail({ username }) {
  const { symbol } = useParams();
  const location = useLocation();
  const nav = useNavigate();

  const [quote, setQuote] = useState(
    location.state
      ? {
          price: location.state.livePrice || 0,
          change: location.state.change || 0,
          pct_change: location.state.changePercent || 0,
          open: location.state.open || 0,
          exchange: location.state.exchange || "NSE",
          dayHigh: location.state.dayHigh || null,
          dayLow: location.state.dayLow || null,
        }
      : null
  );
  const [hist, setHist] = useState([]);
  const [qty, setQty] = useState(1);
  const [buyPrice, setBuyPrice] = useState("");

  // BUY modal (unchanged)
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState("BUY");

  // Market-close confirm (BUY)
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // 👉 Short/No-ownership confirm
  const [showShortConfirm, setShowShortConfirm] = useState(false);
  const [shortConfirmMsg, setShortConfirmMsg] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [checkingSell, setCheckingSell] = useState(false);

  // ---- live quote poll
  useEffect(() => {
    const fetchQuote = () => {
      fetch(`${API}/quotes?symbols=${symbol}`)
        .then((r) => r.json())
        .then((arr) => {
          if (arr[0]) setQuote((prev) => ({ ...prev, ...arr[0] }));
        })
        .catch((err) => console.error("Quote fetch error:", err));
    };
    fetchQuote();
    const id = setInterval(fetchQuote, 2000);
    return () => clearInterval(id);
  }, [symbol]);

  // ---- historical
  useEffect(() => {
    fetch(`${API}/historical?symbol=${symbol}&period=1mo`)
      .then((r) => r.json())
      .then(setHist)
      .catch((err) => console.error("Hist fetch error:", err));
  }, [symbol]);

  if (!quote) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300 }}
        className="fixed inset-0 bg-white flex items-center justify-center"
      >
        Loading…
      </motion.div>
    );
  }

  const isMarketClosed = () => {
    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    return hrs > 15 || (hrs === 15 && mins >= 45);
  };

  // ---- BUY (unchanged)
  function handleBuyClick() {
    if (isMarketClosed()) {
      setPendingAction("BUY");
      setShowConfirm(true);
    } else {
      setTradeType("BUY");
      setShowTradeModal(true);
    }
  }

  // ---- SELL with robust pre-check + logs
  async function handleSellClick() {
    const u = getUsername(username);
    if (!u) {
      alert("Not logged in.");
      return;
    }

    try {
      setCheckingSell(true);

      const body = {
        username: u,
        script: symbol.toUpperCase(),
        order_type: "SELL",
        qty: Number(qty) || 1,
        segment: "intraday",      // change if you let user pick
        allow_short: false,       // we only ask; don't auto-short
      };

      console.log("[SELL preview] POST", `${API}/orders/sell/preview`, body);
      const res = await fetch(`${API}/orders/sell/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      console.log("[SELL preview] status:", res.status, "payload:", data);

      // If the server explicitly asks for confirmation (409 in other flows) or flags needs_confirmation
      const needsConfirm =
        data?.needs_confirmation === true ||
        data?.code === "NEEDS_CONFIRM_SHORT" ||
        res.status === 409;

      // If API responded OK but says owned_qty==0 → force the confirm
      const ownedZero = Number(data?.owned_qty || 0) === 0;

      if (res.ok) {
        if (!ownedZero) {
          // You own something → go sell directly
          nav(`/sell/${symbol}`, {
            state: {
              requestedQty: Number(qty) || 1,
              allow_short: false,
              preview: data,
            },
          });
          return;
        }
        // owned 0 → show confirm
        setPreviewData(data);
        setShortConfirmMsg(
          data?.message || `You have 0 qty of ${symbol}. Do you still want to sell first?`
        );
        setShowShortConfirm(true);
        return;
      }

      // Not ok:
      if (needsConfirm || ownedZero) {
        setPreviewData(data);
        setShortConfirmMsg(
          data?.message || `You have 0 qty of ${symbol}. Do you still want to sell first?`
        );
        setShowShortConfirm(true);
        return;
      }

      const detail = data?.detail || data?.message || "Sell preview failed";
      alert(typeof detail === "string" ? detail : "Sell preview failed.");
    } catch (err) {
      console.error("SELL preview error:", err);
      alert("Unable to check holdings right now. Please try again.");
    } finally {
      setCheckingSell(false);
    }
  }

  const dataLine = {
    labels: hist.map((d) => new Date(d.date)),
    datasets: [
      {
        label: `${symbol} Close`,
        data: hist.map((d) => d.close),
        fill: false,
        tension: 0.2,
      },
    ],
  };

  const options = {
    scales: {
      x: { type: "time", time: { unit: "day" } },
      y: { beginAtZero: false },
    },
    plugins: { tooltip: { mode: "index", intersect: false } },
  };

  const current = quote.price || 0;
  const dayHigh = quote.dayHigh || current;
  const dayLow = quote.dayLow || current;
  const buy = parseFloat(buyPrice) || 0;

  const pointerPos =
    dayHigh !== dayLow ? ((buy - dayLow) / (dayHigh - dayLow)) * 100 : 0;

  const pointerStyle = { left: `${Math.min(100, Math.max(0, pointerPos))}%` };

  return (
    <>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300 }}
        className="fixed inset-0 bg-white overflow-auto p-4"
      >
        <div className="text-center mb-4">
          <h1 className="text-2xl font-serif">{symbol}</h1>
          <p className="text-sm text-gray-500">{quote.exchange}</p>
        </div>

        <div className="flex items-baseline justify-center space-x-4 mb-6">
          <span className="text-4xl font-bold">{quote.price?.toLocaleString()}</span>
          <span className={quote.change >= 0 ? "text-green-600" : "text-red-600"}>
            {quote.change >= 0 ? "+" : ""}
            {quote.change?.toFixed(2)} ({quote.pct_change?.toFixed(2)}%)
          </span>
        </div>

        {/* Qty & Buttons */}
        <div className="flex flex-col items-center space-y-3 mb-6">
          <input
            type="number"
            placeholder="Qty"
            value={qty}
            min={1}
            onChange={(e) => setQty(+e.target.value)}
            className="w-32 text-center border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Your Buy Price"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className="w-40 text-center border p-2 rounded"
          />
          <div className="flex space-x-4">
            <button
              onClick={handleBuyClick}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              BUY
            </button>
            <button
              disabled={checkingSell}
              onClick={handleSellClick}
              className={`${checkingSell ? "opacity-70 cursor-wait" : ""} bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700`}
            >
              {checkingSell ? "Checking…" : "SELL"}
            </button>
          </div>
        </div>

        <div
          className="flex justify-center items-center mb-6 text-gray-800 cursor-pointer space-x-1"
          onClick={() => nav(`/chart/${symbol}`)}
        >
          <span>View Chart</span>
          <ArrowRight size={16} />
        </div>

        <div className="mb-8">
          <Line data={dataLine} options={options} />
        </div>

        <div className="mb-10">
          <p className="font-medium text-center mb-2">Day Range</p>
          <div className="flex justify-between text-xs text-gray-500 px-4 mb-1">
            <span>
              ₹{quote.dayLow} - ₹ {quote.dayHigh}
            </span>
          </div>
          <div className="relative h-1 bg-gray-300 mx-4 rounded">
            <div className="absolute top-0 h-1 bg-blue-500 rounded" style={{ width: "100%" }} />
            <div
              className="absolute top-[-6px] w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-gray-500"
              style={pointerStyle}
            />
          </div>
          <p className="text-center mt-2 text-sm text-gray-500">
            Your Buy Price: ₹{buy ? buy.toFixed(2) : "--"}
          </p>
        </div>

        <div className="flex justify-around mb-10">
          <button
            onClick={() => nav(`/alert/${symbol}`)}
            className="flex flex-col items-center text-gray-600"
          >
            <Bell size={24} />
            <span className="text-xs mt-1">Set Alert</span>
          </button>
          <button
            onClick={() => nav(`/notes/${symbol}`)}
            className="flex flex-col items-center text-gray-600"
          >
            <FileText size={24} />
            <span className="text-xs mt-1">Add Notes</span>
          </button>
        </div>
      </motion.div>

      {/* BUY Trade Modal */}
      {showTradeModal && (
        <TradeModal
          symbol={symbol}
          type={tradeType}
          onClose={() => setShowTradeModal(false)}
        />
      )}

      {/* Market closed confirm (BUY) */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="mb-4 text-gray-800 font-semibold">
              Market is closed. Do you still want to {pendingAction}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => {
                  setShowConfirm(false);
                  setPendingAction(null);
                }}
              >
                NO
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setShowConfirm(false);
                  if (pendingAction === "BUY") {
                    setTradeType("BUY");
                    setShowTradeModal(true);
                  }
                }}
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👉 No-ownership / short-sell confirm */}
      {showShortConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm">
            <p className="mb-4 text-gray-800 font-semibold">
              {shortConfirmMsg || `You have 0 qty of ${symbol}. Do you still want to sell first?`}
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => setShowShortConfirm(false)}
              >
                NO
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setShowShortConfirm(false);
                  nav(`/sell/${symbol}`, {
                    state: {
                      requestedQty: Number(qty) || 1,
                      allow_short: true,   // user agreed to sell-first
                      preview: previewData,
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
    </>
  );
}
