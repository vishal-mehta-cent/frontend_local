// frontend/src/pages/Sell.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BackButton from "../components/BackButton";
import { TrendingDown, DollarSign, Target, Shield, AlertCircle, CheckCircle2, Layers, Package } from "lucide-react";
import { useTheme } from "../context/ThemeContext";


const API = import.meta.env.VITE_BACKEND_BASE_URL || "https://paper-trading-backend.onrender.com"; // backend API base

function parseHHMMToMinutes(val, fallbackMinutes) {
  try {
    const s = String(val || "").trim();
    if (!s) return fallbackMinutes;
    const [h, m] = s.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return fallbackMinutes;
    if (h < 0 || h > 23 || m < 0 || m > 59) return fallbackMinutes;
    return h * 60 + m;
  } catch {
    return fallbackMinutes;
  }
}

function isMarketOpenUTC() {
  const nowUTC = new Date();
  const minutes = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();

  // ✅ from Vite env (fallbacks match your current Sell.jsx values)
  const OPEN = parseHHMMToMinutes(import.meta.env.VITE_MARKET_OPEN_TIME_UTC, 3 * 60 + 30);
  const CLOSE = parseHHMMToMinutes(import.meta.env.VITE_MARKET_CLOSE_TIME_UTC, 12 * 60 + 50);

  return minutes >= OPEN && minutes <= CLOSE;
}


export default function Sell() {
  const { symbol } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};


  // ✅ MUST come first
  const [confirmedShort, setConfirmedShort] = useState(false);

  // ✅ SAFE derived value
  const allowShort = Boolean(
    confirmedShort && !prefill.skipSellFirstCheck
  );




  // Mode flags
  const isModify = Boolean(prefill.modifyId || prefill.fromModify);
  const isAdd = Boolean(prefill.fromAdd);
  const isPositionModify = Boolean(prefill.fromPosition);
  const isAddMode = isAdd && isPositionModify; // 🔥 KEY
  const isPureModify = isPositionModify && !isAdd;

  // Prefill inputs if passed
  const [qty, setQty] = useState(prefill.qty || "");
  const [price, setPrice] = useState(prefill.price || "");
  const [exchange, setExchange] = useState(prefill.exchange || "NSE");
  const [segment, setSegment] = useState(prefill.segment || "intraday");
  const [stoploss, setStoploss] = useState(prefill.stoploss || "");
  const [target, setTarget] = useState(prefill.target || "");

  const [errorMsg, setErrorMsg] = useState("");
  const [successModal, setSuccessModal] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [livePrice, setLivePrice] = useState(null);
  // 🔥 FNO states
  const [isFNO, setIsFNO] = useState(false);
  const [lotSize, setLotSize] = useState(1);
  const [lotQty, setLotQty] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);


  const [orderMode, setOrderMode] = useState(prefill.orderMode || "MARKET");
  const [submitting, setSubmitting] = useState(false);


  const username = localStorage.getItem("user_id") || localStorage.getItem("username");
  const userEditedPrice = useRef(false);
  const [marketOpen, setMarketOpen] = useState(true);

  const isModifyMode = isModify && isPositionModify;
  const { isDark } = useTheme();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-red-900 to-slate-900"
    : "bg-gradient-to-br from-red-50 via-rose-50 to-red-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";



  // -------- Check market time on mount --------
  // -------- Check market time on mount --------
  useEffect(() => {
    // Get current UTC time
    const nowUTC = new Date();
    const hours = nowUTC.getUTCHours();
    const minutes = nowUTC.getUTCMinutes();

    // ---- Define UTC market hours ----
    // For example: Indian market 09:15–15:30 IST = 03:45–10:00 UTC
    const nowMinutes = hours * 60 + minutes;

    // ✅ use env (fallbacks should match isMarketOpenUTC() fallbacks)
    const openMinutes = parseHHMMToMinutes(import.meta.env.VITE_MARKET_OPEN_TIME_UTC, 3 * 60 + 30);
    const closeMinutes = parseHHMMToMinutes(import.meta.env.VITE_MARKET_CLOSE_TIME_UTC, 12 * 60 + 50);

    const isMarketOpen = nowMinutes >= openMinutes && nowMinutes <= closeMinutes;

    // Check only when not modifying/adding
    if (!isMarketOpen && !isModify && !isAdd) {
      const confirmProceed = window.confirm(
        "⚠️ Market (UTC 03:30–10:30) is closed. Do you still want to place a SELL order?"
      );
      if (!confirmProceed) {
        nav(`/script/${symbol}`);
      }
    }
  }, [nav, symbol, isModify, isAdd]);


  // -------- Live price polling --------
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch(`${API}/quotes?symbols=${symbol}`);
        const data = await res.json();
        if (!cancelled && data && data[0]) {
          const live = Number(data[0].price);
          if (Number.isFinite(live)) {
            setLivePrice(live);

            if (orderMode === "LIMIT" && !price && !userEditedPrice.current) {
              setPrice(live.toFixed(2));
            }
          }
        }
      } catch { }
    };

    fetchLive();
    const id = setInterval(fetchLive, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, orderMode]);
  useEffect(() => {
    if (!symbol) return;

    fetch(`${API}/market/instrument-info?symbol=${symbol}`)
      .then(res => res.json())
      .then(data => {
        if (data.is_fno === true) {
          setIsFNO(true);
          setLotSize(Number(data.lot_size) || 1);
        } else {
          setIsFNO(false);
          setLotSize(1);
        }
      })
      .catch(() => {
        setIsFNO(false);
        setLotSize(1);
      });
  }, [symbol]);

  useEffect(() => {
    if (!isFNO || !livePrice || !lotSize) return;

    const enteredQty = Number(qty);

    // Qty not entered → no investment
    if (!enteredQty || enteredQty <= 0) {
      setLotQty(0);
      setTotalInvestment(0);
      return;
    }

    const lots = enteredQty * lotSize;
    setLotQty(lots);
    setTotalInvestment(lots * livePrice);
  }, [qty, lotSize, livePrice, isFNO]);

  useEffect(() => {
    const checkMarket = () => {
      const open = isMarketOpenUTC();
      setMarketOpen(open);

      if (!open && orderMode === "LIMIT") {
        setOrderMode("MARKET");
        setPrice("");
      }
    };

    checkMarket();
    const id = setInterval(checkMarket, 30_000);
    return () => clearInterval(id);
  }, [orderMode]);
  // -------- Submit --------
  const handleSubmit = async () => {
    // ✅ OPEN ORDER MODIFY: LIMIT → MARKET (SELL)
    if (isModify && prefill.modifyId && orderMode === "MARKET") {
      const res = await fetch(
        `${API}/orders/convert-to-market/${prefill.modifyId}`,
        { method: "POST" }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to convert to market order");
      }

      setSuccessText("Order executed at Market price ✅");
      setSuccessModal(true);

      const cameFromPortfolio =
        prefill.fromAdd === true && prefill.fromPosition === true;

      if (cameFromPortfolio) {
        nav("/portfolio", { state: { refresh: true } });
      } else {
        nav("/orders", { state: { refresh: true, tab: "positions" } });
      }


      setSubmitting(false);
      return;
    }

    if (submitting) return;
    setErrorMsg("");

    // ✅ EXIT FROM POSITIONS (handled separately)
    if (isPositionModify && !isAdd) {
      await handleModifyPosition();
      return;
    }

    setSubmitting(true);



    try {
      if (!username) throw new Error("❌ Please login again.");
      if (!symbol) throw new Error("❌ Invalid symbol.");

      const qtyNum = isFNO ? Number(lotQty) : Number(qty);
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        throw new Error("❌ Please enter a valid quantity (> 0).");
      }

      const payload = {
        username,
        script: symbol.toUpperCase(),
        order_type: "SELL",
        qty: qtyNum,
        exchange,
        segment,
        price: orderMode === "LIMIT" ? Number(price) : null,
        stoploss: stoploss !== "" ? Number(stoploss) : null,
        target: target !== "" ? Number(target) : null,
        allow_short: allowShort,          // ✅ allow SELL FIRST
      };

      if (orderMode === "LIMIT") {
        const px = Number(price);
        if (!Number.isFinite(px) || px <= 0) {
          throw new Error("❌ Please enter a valid limit price.");
        }
        payload.price = px;
      }

      // ================================
      // ✅ SELL FIRST + LIMIT validation
      // Limit price must be ABOVE live price
      // ================================
      if (
        orderMode === "LIMIT" &&
        allowShort === true &&
        Number.isFinite(livePrice)
      ) {
        const limitPx = Number(payload.price);
        const livePx = Number(livePrice);

        if (limitPx <= livePx) {
          throw new Error(
            "❌ Limit price must be greater than live price for SELL FIRST."
          );
        }
      }

      // ================================
      // ✅ SELL validation: Stoploss & Target
      // ================================
      const entryPrice =
        orderMode === "LIMIT"
          ? Number(payload.price)
          : Number(livePrice);

      if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
        throw new Error("❌ Unable to determine entry price.");
      }

      // STOPLOSS: must be ABOVE entry for SELL
      if (stoploss !== "") {
        const sl = Number(stoploss);
        if (!Number.isFinite(sl)) {
          throw new Error("❌ Invalid stoploss value.");
        }
        if (sl <= entryPrice) {
          throw new Error("❌ Stoploss must be higher than entry price for SELL.");
        }
      }

      // TARGET: must be BELOW entry for SELL
      if (target !== "") {
        const tg = Number(target);
        if (!Number.isFinite(tg)) {
          throw new Error("❌ Invalid target value.");
        }
        if (tg >= entryPrice) {
          throw new Error("❌ Target must be less than entry price for SELL.");
        }
      }


      let res, data;

      if (isAdd) {
        res = await fetch(`${API}/orders/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (isModify) {
        res = await fetch(`${API}/orders/${prefill.modifyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const det = data?.detail;

        // ✅ SELL FIRST confirmation
        if (det?.code === "NEEDS_CONFIRM_SHORT") {
          setErrorMsg(det.message);
          setConfirmedShort(true);   // 🔥 THIS IS THE KEY
          setSubmitting(false);
          return;
        }

        const msg =
          typeof det === "string"
            ? det
            : det?.message || "Order failed";

        throw new Error(msg);
      }


      // ✅ Success message mapping:
      if (isAdd) {
        setSuccessText("Added to Position ✅");
      } else if (isModify) {
        setSuccessText("Modify Successful ✅");
      } else if (orderMode === "LIMIT") {
        // LIMIT: generic order confirmation
        setSuccessText("Order Successful ✅");
      } else {
        // MARKET: explicit Sell confirmation
        setSuccessText("Sell Successful ✅");
      }

      setSuccessModal(true);

      setTimeout(() => {
        setSuccessModal(false);
        // ✅ LIMIT orders (including SELL FIRST) must always go to Open Trades
        if (orderMode === "LIMIT") {
          nav("/orders", { state: { refresh: true, tab: "open" } });
          return;
        }

        // MARKET orders behave normally
        if (data.triggered) {
          nav("/orders", { state: { refresh: true, tab: "positions" } });
        } else {
          nav("/orders", { state: { refresh: true, tab: "open" } });
        }
      }, 1500);
    } catch (e) {
      setErrorMsg(e.message || "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModifyPosition = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        username,
        script: symbol,
        new_qty: isFNO ? Number(lotQty) : Number(qty),               // ✅ REPLACE QTY
        stoploss: stoploss ? Number(stoploss) : null,
        target: target ? Number(target) : null,
        price_type: orderMode,
        limit_price: orderMode === "LIMIT" ? Number(price) : null,
      };

      const res = await fetch(`${API}/orders/positions/modify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.message ||
            data?.message ||
            "Error modifying position";

        throw new Error(msg);
      }


      setSuccessText("Position modified successfully!");
      setSuccessModal(true);

      setTimeout(() => {
        setSuccessModal(false);
        nav("/orders", { state: { refresh: true, tab: "positions" } });
      }, 1500);
    } catch (err) {
      const msg =
        typeof err.message === "string"
          ? err.message
          : err?.message?.message ||
          err?.detail?.message ||
          "Server error";

      setErrorMsg(msg);
    }
    finally {
      setSubmitting(false);
    }
  };


  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}>
      <button
        onClick={() => nav("/orders")}
        className={`${glassClass} px-3 py-2 rounded-xl ${cardHoverClass}`}
      >
        Back
      </button>

      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-red-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <div className={`${glassClass} rounded-2xl p-4 mb-6 flex items-center justify-between shadow-2xl`}>
          <BackButton to="/orders" />
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h2 className="font-bold text-lg bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
              {isAdd ? `ADD ${symbol}` : isModify ? `MODIFY ${symbol}` : `SELL ${symbol}`}
            </h2>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className={`${glassClass} rounded-2xl p-4 mb-6 border-red-500/50 shadow-lg`}>
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{String(errorMsg)}</p>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className={`${glassClass} rounded-3xl p-6 mb-6 shadow-2xl space-y-6 flex-1`}>
          {/* Live Price Card */}
          {isFNO ? (
            <div className={`${glassClass} rounded-2xl p-5 space-y-4`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${textSecondaryClass}`}>Live Price</span>
                <span className="text-xl font-bold text-red-400">
                  ₹{livePrice != null ? livePrice.toFixed(2) : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${textSecondaryClass}`}>Total Investment</span>
                <span className="text-xl font-bold text-blue-400">
                  {totalInvestment > 0 ? `₹${totalInvestment.toFixed(2)}` : "--"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className={`text-xs ${textSecondaryClass} mb-2 flex items-center space-x-1`}>
                    <Package className="w-4 h-4" />
                    <span>Quantity (Lots)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    disabled={isPureModify}
                    onChange={(e) => setQty(e.target.value)}
                    className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${isPureModify ? "cursor-not-allowed opacity-50" : ""
                      }`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondaryClass} mb-2 flex items-center space-x-1`}>
                    <Layers className="w-4 h-4" />
                    <span>Total Lots</span>
                  </label>
                  <input
                    type="number"
                    value={lotQty}
                    disabled
                    className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} text-center cursor-not-allowed opacity-50`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={`${glassClass} rounded-2xl p-5 text-center`}>
              <p className={`text-sm ${textSecondaryClass} mb-1`}>Live Price</p>
              <p className="text-2xl font-bold text-red-400">
                {livePrice != null ? `₹${livePrice.toFixed(2)}` : "--"}
              </p>
            </div>
          )}

          {/* Order Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isPureModify && setOrderMode("MARKET")}
              disabled={isPureModify}
              className={`py-4 rounded-xl font-semibold transition-all ${orderMode === "MARKET"
                  ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/50"
                  : `${glassClass} ${cardHoverClass} ${isPureModify ? "opacity-50 cursor-not-allowed" : ""}`
                }`}
            >
              Market
            </button>
            <button
              onClick={() => !isPureModify && setOrderMode("LIMIT")}
              disabled={isPureModify}
              className={`py-4 rounded-xl font-semibold transition-all ${orderMode === "LIMIT"
                  ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/50"
                  : `${glassClass} ${cardHoverClass} ${isPureModify ? "opacity-50 cursor-not-allowed" : ""}`
                }`}
            >
              Limit
            </button>
          </div>

          {/* Quantity Input for Non-FNO */}
          {!isFNO && (
            <div>
              <label className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}>
                <Package className="w-4 h-4" />
                <span>Quantity</span>
              </label>
              <input
                type="number"
                value={qty}
                disabled={isPureModify}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Enter quantity"
                className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${isPureModify ? "cursor-not-allowed opacity-50" : ""
                  }`}
              />
            </div>
          )}

          {/* Limit Price Input */}
          <div>
            <label className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}>
              <DollarSign className="w-4 h-4" />
              <span>Limit Price</span>
            </label>
            <input
              type="number"
              value={orderMode === "LIMIT" ? price : ""}
              onChange={(e) => {
                setPrice(e.target.value);
                userEditedPrice.current = true;
              }}
              placeholder={orderMode === "LIMIT" ? "Enter Limit Price" : "Disabled for Market orders"}
              className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${(orderMode === "MARKET" || isPureModify || !marketOpen) ? "cursor-not-allowed opacity-50" : ""
                }`}
              disabled={orderMode === "MARKET" || isPureModify || !marketOpen}
            />
          </div>

          {/* Segment Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (isPureModify) return;
                setSegment("intraday");
              }}
              className={`py-4 rounded-xl font-semibold transition-all ${segment === "intraday"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${glassClass} ${cardHoverClass}`
                }`}
            >
              Intraday
            </button>
            <button
              onClick={() => {
                if (isPureModify) return;
                setSegment("delivery");
              }}
              className={`py-4 rounded-xl font-semibold transition-all ${segment === "delivery"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${glassClass} ${cardHoverClass}`
                }`}
            >
              Delivery
            </button>
          </div>

          {/* Exchange Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (isAddMode || isModifyMode) return;
                setExchange("NSE");
              }}
              className={`py-4 rounded-xl font-semibold transition-all ${exchange === "NSE"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${glassClass} ${cardHoverClass}`
                }`}
            >
              NSE
            </button>
            <button
              onClick={() => {
                if (isAddMode || isModifyMode) return;
                setExchange("BSE");
              }}
              className={`py-4 rounded-xl font-semibold transition-all ${exchange === "BSE"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : `${glassClass} ${cardHoverClass}`
                }`}
            >
              BSE
            </button>
          </div>

          {/* Stoploss & Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}>
                <Shield className="w-4 h-4" />
                <span>Stoploss</span>
              </label>
              <input
                type="number"
                value={stoploss}
                onChange={(e) => setStoploss(e.target.value)}
                disabled={isAddMode}
                placeholder="Optional"
                className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${isAddMode ? "cursor-not-allowed opacity-50" : ""
                  }`}
              />
            </div>
            <div>
              <label className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}>
                <Target className="w-4 h-4" />
                <span>Target</span>
              </label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={isAddMode}
                placeholder="Optional"
                className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${isAddMode ? "cursor-not-allowed opacity-50" : ""
                  }`}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-2xl text-white text-lg font-bold shadow-2xl transition-all ${submitting
              ? "bg-gradient-to-r from-red-400 to-rose-400 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 hover:shadow-red-500/50 hover:scale-[1.02]"
            }`}
        >
          {submitting ? "Processing…" : isAdd ? "Add to Position" : isModify ? "Save Changes" : "SELL"}
        </button>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className={`${glassClass} rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl`}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400">{successText || "Order saved"}</p>
          </div>
        </div>
      )}
    </div>
  );

}
