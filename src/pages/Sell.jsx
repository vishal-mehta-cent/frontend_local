// frontend/src/pages/Sell.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BackButton from "../components/BackButton";
import {
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  AlertCircle,
  CheckCircle2,
  Layers,
  Package,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com"; // backend API base

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

  // ✅ MATCH Buy.jsx fallbacks:
  // 09:15 IST = 03:45 UTC
  const OPEN = parseHHMMToMinutes(
    import.meta.env.VITE_MARKET_OPEN_TIME_UTC,
    3 * 60 + 45
  );

  // 15:30 IST = 10:00 UTC
  const CLOSE = parseHHMMToMinutes(
    import.meta.env.VITE_MARKET_CLOSE_TIME_UTC,
    10 * 60
  );

  return minutes >= OPEN && minutes <= CLOSE;
}

export default function Sell() {
  const { symbol } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};
  // ✅ NEW: where to go back after ADD/EXIT/MODIFY (same pattern as Buy.jsx)
  const returnTo = prefill.returnTo || "";      // "/orders" or "/portfolio"
  const returnTab = prefill.returnTab || "";    // e.g. "positions"

  // ✅ MUST come first
  const [confirmedShort, setConfirmedShort] = useState(false);

  // Mode flags
  const isModify = Boolean(prefill.modifyId || prefill.fromModify);
  const isAdd = Boolean(prefill.fromAdd);
  const isPositionModify = Boolean(prefill.fromPosition);

  // ✅ define isExit BEFORE allowShort
  const isExit = Boolean(
    prefill.fromExit ||
    prefill.exit === true ||
    prefill.action === "EXIT" ||
    prefill.mode === "EXIT"
  );

  const isAddMode = isAdd && isPositionModify;

  // ✅ IMPORTANT: qty must be editable on EXIT
  const isPureModify = isPositionModify && !isAdd && !isExit;

  // ✅ NOW it’s safe
  const isAddToExistingShort = Boolean(prefill?.fromAdd && prefill?.fromPosition && prefill?.short_first);
  const allowShort = Boolean(!isExit && (isAddToExistingShort || (confirmedShort && !prefill.skipSellFirstCheck)));
  const isSellFirstModify = isModify && Boolean(prefill?.short_first);



  // Prefill inputs if passed
  const [qty, setQty] = useState(prefill.qty || "");
  const [price, setPrice] = useState(prefill.price || "");
  const [exchange, setExchange] = useState(prefill.exchange || "NSE");
  const [segment, setSegment] = useState(
    (prefill.segment || "intraday").toLowerCase()
  );

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
  const displaySymbol = (symbol || "").replace(/-/g, "-"); // non-breaking hyphen


  const [orderMode, setOrderMode] = useState(prefill.orderMode || "MARKET");
  useEffect(() => {
    if (!isExit) return;

    setErrorMsg("");
    setConfirmedShort(false);

    setOrderMode("MARKET");
    setPrice("");
    userEditedPrice.current = false;

    setStoploss("");
    setTarget("");
  }, [isExit]);



  const [submitting, setSubmitting] = useState(false);

  // ✅ MATCH Buy.jsx username style (with safe fallback)
  const username =
    localStorage.getItem("username") || localStorage.getItem("user_id");

  const userEditedPrice = useRef(false);
  const didInitFnoQty = useRef(false);
  const [marketOpen, setMarketOpen] = useState(true);

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

  // ✅ Same quick qty presets as Buy.jsx (UI only)
  const quickPresets = [1, 5, 10, 25, 50, 100];

  // ✅ UI-only live extras (does NOT affect order logic)
  const [prevPrice, setPrevPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [dayHigh, setDayHigh] = useState(null);
  const [dayLow, setDayLow] = useState(null);

  useEffect(() => {
    if (!symbol) return;

    fetch(`${API}/market/instrument-info?symbol=${encodeURIComponent(symbol)}`)

      .then((res) => res.json())
      .then((data) => {
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

  // ✅ F&O: backend stores quantity, UI input expects lots
  // If prefill.qty looks like an actual quantity (multiple of lotSize), convert to lots once.
  useEffect(() => {
    if (!isFNO) return;
    if (didInitFnoQty.current) return;
    if (!lotSize || lotSize <= 1) return;

    const q = Number(prefill?.qty);
    if (!Number.isFinite(q) || q <= 0) {
      didInitFnoQty.current = true;
      return;
    }

    // Treat as quantity only when it is a clean multiple of lot size
    if (q >= lotSize && q % lotSize === 0) {
      setQty(String(q / lotSize));
    }

    didInitFnoQty.current = true;
  }, [isFNO, lotSize]);

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

  // -------- Live price polling --------
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch(`${API}/quotes?symbols=${encodeURIComponent(symbol)}`)
;
        const data = await res.json();
        if (!cancelled && data && data[0]) {
          const live = Number(data[0].price);
          if (Number.isFinite(live)) {
            setPrevPrice(livePrice);
            setLivePrice(live);

            // ✅ Read extra fields if backend sends them (same as Buy.jsx)
            const high = Number(data[0].dayHigh);
            const low = Number(data[0].dayLow);
            const change = Number(data[0].change);
            const changePct = Number(data[0].pct_change);

            if (Number.isFinite(high)) setDayHigh(high);
            if (Number.isFinite(low)) setDayLow(low);
            if (Number.isFinite(change)) setPriceChange(change);
            if (Number.isFinite(changePct)) setPriceChangePercent(changePct);

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
  }, [symbol, orderMode, price, livePrice]);

  const goBack = (triggered = false) => {
    // Priority-1: explicit return target (Orders/Portfolio/etc.)
    if (returnTo) {
      if (returnTo === "/orders") {
        nav("/orders", {
          state: {
            refresh: true,
            tab: returnTab || (triggered ? "positions" : "open"),
          },
        });
        return;
      }

      nav(returnTo, { state: { refresh: true } });
      return;
    }

    // Priority-2: fallback behaviour (same as Buy.jsx)
    if (prefill.fromAdd === true && prefill.fromPosition === true) {
      nav("/portfolio", { state: { refresh: true } });
      return;
    }

    nav("/orders", { state: { refresh: true, tab: triggered ? "positions" : "open" } });
  };


  // -------- Submit (MATCH Buy.jsx structure + endpoints) --------
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessText("");

    // ✅ MATCH Buy.jsx: intraday not allowed when market closed
    if (!marketOpen && segment === "intraday") {
      setErrorMsg(
        "❌ Intraday is not applicable when market is close, Please use delivery."
      );
      setSubmitting(false);
      return;
    }

    try {
      // ✅ MATCH Buy.jsx: LIMIT not allowed after market close
      if (!marketOpen && orderMode === "LIMIT") {
        throw new Error("❌ Limit orders are not allowed after market close.");
      }

      const qtyNum = isFNO ? Number(lotQty) : Number(qty);
      // ✅ MOST IMPORTANT: EXIT must use backend exit endpoint
      if (isExit) {
        if (!username) {
          nav("/login");
          return;
        }

        const qtyNum = isFNO ? Number(lotQty) : Number(qty);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
          throw new Error("❌ Please enter a valid quantity (> 0).");
        }
        const exitPayload = {
          username,
          script: symbol.toUpperCase(),
          order_type: "SELL",

          // ✅ Full exit: let backend decide owned_total
          qty: qtyNum,

          exchange: (exchange || "NSE").toUpperCase(),
          segment: (segment || prefill.segment || "intraday").toLowerCase(),
          price: null,
          stoploss: null,
          target: null,
          allow_short: false,
        };



        const res = await fetch(`${API}/orders/exit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(exitPayload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : data?.detail?.message || data?.message || "Exit failed";
          throw new Error(msg);
        }

        setSuccessText("Exit Successful ✅");
        setSuccessModal(true);

        setTimeout(() => {
          setSuccessModal(false);
          goBack(true); // exit executed -> positions
        }, 1200);

        return;
      }


      // ✅ MATCH Buy.jsx: Open order modify (LIMIT → MARKET)
      if (isModify && prefill.modifyId && orderMode === "MARKET") {
        // 1) First update the order row with the new segment (and other fields)
        const updatePayload = {
          username,
          script: symbol,
          order_type: "SELL", // ✅ FIX (was BUY)
          qty: qtyNum,

          // keep existing limit trigger if present (don’t overwrite with blank)
          price: Number(prefill.price || prefill.trigger_price || price || 0),

          exchange,
          segment, // ✅ delivery / intraday
          stoploss: stoploss !== "" ? Number(stoploss) : null,
          target: target !== "" ? Number(target) : null,

          // ✅ backend supports this (OrderData.allow_short)
          allow_short: allowShort,
        };

        const up = await fetch(`${API}/orders/${prefill.modifyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const upJson = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upJson?.detail || "Failed to update order before convert");

        // 2) Now convert to market and execute
        const res = await fetch(`${API}/orders/convert-to-market/${prefill.modifyId}`, {
          method: "POST",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          const detail = String(json?.detail || json?.message || "");

          // ✅ If it says Open order not found, most likely already triggered & moved to Positions
          if (res.status === 404 && detail.toLowerCase().includes("open order not found")) {
            setSuccessText(`Order already executed ✅ (segment: ${segment})`);
            setSuccessModal(true);

            setTimeout(() => {
              setSuccessModal(false);
              goBack(true); // executed => positions
            }, 1200);

            return;
          }


          throw new Error(detail || "Convert-to-market failed");
        }

        // ✅ Success
        setSuccessText("Order executed at Market price ✅");
        setSuccessModal(true);

        setTimeout(() => {
          setSuccessModal(false);
          goBack(true); // executed => positions
        }, 1200);


        return;
      }



      // ✅ MATCH Buy.jsx: redirect to login if missing username
      if (!username) {
        nav("/login");
        return;
      }

      if (!symbol) throw new Error("❌ Invalid symbol.");
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
        allow_short: allowShort, // keep SELL-FIRST flow
      };
      // ✅ EXIT: do not send SL/TG and never allow short
      if (isExit) {
        payload.stoploss = null;
        payload.target = null;
        payload.allow_short = false;
      }

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
        (allowShort || isSellFirstModify) === true &&
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
      // ✅ SELL validation: Stoploss & Target (skip for EXIT)
      if (!isExit) {
        const entryPrice =
          orderMode === "LIMIT" ? Number(payload.price) : Number(livePrice);

        if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
          throw new Error("❌ Unable to determine entry price.");
        }

        // STOPLOSS: must be ABOVE entry for SELL
        if (stoploss !== "") {
          const sl = Number(stoploss);
          if (!Number.isFinite(sl)) throw new Error("❌ Invalid stoploss value.");
          if (sl <= entryPrice) {
            throw new Error("❌ Stoploss must be higher than entry price for SELL.");
          }
        }

        // TARGET: must be BELOW entry for SELL
        if (target !== "") {
          const tg = Number(target);
          if (!Number.isFinite(tg)) throw new Error("❌ Invalid target value.");
          if (tg >= entryPrice) {
            throw new Error("❌ Target must be less than entry price for SELL.");
          }
        }
      }

      // ✅ MATCH Buy.jsx: quantity check for position modify
      if (isPositionModify && Number(qty) <= 0) {
        setErrorMsg("❌ Quantity must be greater than zero");
        setSubmitting(false);
        return;
      }

      // ✅ MATCH Buy.jsx: position modify path
      if (isPositionModify && !isAdd && !isExit) {
        await handleModifyPosition();
        return;
      }

      // ✅ MOST IMPORTANT FIX:
      // MATCH Buy.jsx endpoints:
      // - Modify → PUT /orders/{id}
      // - Else → POST /orders
      // (NO /orders/add)
      let res;
      if (isModify && prefill.modifyId) {
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const det = data?.detail;

        // ✅ SELL FIRST confirmation (keep your existing backend flow)
        if (det?.code === "NEEDS_CONFIRM_SHORT") {
          if (isExit) {
            throw new Error("❌ EXIT failed: position not found / already closed.");
          }
          setErrorMsg(det.message);
          setConfirmedShort(true);
          setSubmitting(false);
          return;
        }


        const msg =
          typeof det === "string" ? det : det?.message || "Order failed";
        throw new Error(msg);
      }

      // ✅ Success text (same mapping style)
      if (isAdd) {
        setSuccessText("Added to Position ✅");
      } else if (isModify) {
        setSuccessText("Modify Successful ✅");
      } else if (orderMode === "LIMIT") {
        setSuccessText("Order Successful ✅");
      } else {
        setSuccessText("Sell Successful ✅");
      }

      setSuccessModal(true);


      setTimeout(() => {
        setSuccessModal(false);
        goBack(Boolean(data?.triggered));
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
      // ✅ Anchor datetime MUST be present for modify to work correctly
      const anchor =
        prefill?.positionDatetime ||
        prefill?.position_datetime ||
        prefill?.datetime ||
        "";

      if (!anchor) {
        throw new Error(
          "Missing position datetime for Modify. Please open Modify from the Positions card."
        );
      }

      // ✅ Build payload WITHOUT sending nulls that cause FastAPI 422
      const payload = {
        username,
        script: String(symbol || "").toUpperCase(),

        // Only include new_qty for FNO; otherwise OMIT the key
        ...(isFNO ? { new_qty: Number(lotQty) } : {}),

        // stoploss/target: send only if user typed something, else omit
        ...(stoploss !== "" && stoploss !== null && stoploss !== undefined
          ? { stoploss: Number(stoploss) }
          : {}),
        ...(target !== "" && target !== null && target !== undefined
          ? { target: Number(target) }
          : {}),

        // ✅ keep these if your backend model accepts them (safe if extra="ignore")
        ...(orderMode ? { price_type: orderMode } : {}),
        ...(orderMode === "LIMIT" && price !== "" && price !== null && price !== undefined
          ? { limit_price: Number(price) }
          : {}),

        // ✅ segment + short_first + anchor
        segment: String(segment || prefill?.segment || "intraday").toLowerCase(),
        short_first: Boolean(prefill?.short_first),
        position_datetime: anchor,
      };

      const res = await fetch(`${API}/orders/positions/modify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // ✅ Parse response safely (FastAPI sometimes returns non-JSON on error)
      let data = {};
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.message ||
            data?.message ||
            `Error modifying position (${res.status})`;
        throw new Error(msg);
      }

      setSuccessText("Position modified successfully!");
      setSuccessModal(true);

      // ✅ redirect back to positions after success
      setTimeout(() => {
        setSuccessModal(false);
        goBack(true);
      }, 1500);
    } catch (err) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : err?.detail?.message || "Server error";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };


  const priceDirection =
    livePrice && prevPrice
      ? livePrice > prevPrice
        ? "up"
        : livePrice < prevPrice
          ? "down"
          : "same"
      : "same";

  const dayRange =
    Number.isFinite(dayHigh) &&
      Number.isFinite(dayLow) &&
      Number.isFinite(livePrice) &&
      dayHigh !== dayLow
      ? ((livePrice - dayLow) / (dayHigh - dayLow)) * 100
      : 50;

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}
    >
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
        <div className={`${glassClass} rounded-2xl p-4 mb-6 shadow-2xl`}>
          <div className="grid grid-cols-3 items-center">
            {/* Left */}
            <div className="justify-self-start">
              <BackButton to={returnTo || (isAddMode ? "/portfolio" : "/orders")} />
            </div>

            {/* Center (ALWAYS centered) */}
            <div className="justify-self-center text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <TrendingDown className="w-6 h-6 text-red-400 animate-pulse" />
                  {marketOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                  )}
                </div>

                <div className="text-center">
                  <h2 className="whitespace-nowrap font-bold text-lg bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    {isExit
                      ? `EXIT ${displaySymbol}`
                      : isAdd
                        ? `ADD ${displaySymbol}`
                        : isModify
                          ? `MODIFY ${displaySymbol}`
                          : `SELL ${displaySymbol}`}
                  </h2>

                  <p className={`text-xs ${textSecondaryClass}`}>
                    {marketOpen ? "Market Open" : "Market Closed"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="justify-self-end">
              {!isModify && !isAdd && !isPositionModify && !isExit && (
                <button
                  type="button"
                  onClick={() =>
                    nav(`/buy/${symbol}`, {
                      state: {
                        ...prefill,
                        qty,
                        exchange,
                        segment,
                        stoploss,
                        target,
                        orderMode,
                        price,
                      },
                    })
                  }
                  className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg border transition-all
            ${isDark
                      ? "bg-emerald-500/15 border-emerald-400/25 text-emerald-100 hover:bg-emerald-500/25"
                      : "bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200"
                    }`}
                >
                  BUY
                </button>
              )}
            </div>
          </div>
        </div>


        {/* Error Message */}
        {errorMsg && (
          <div
            className={`${glassClass} rounded-2xl p-4 mb-6 border-red-500/50 shadow-lg`}
          >
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
            <div className={`${glassClass} rounded-2xl p-5`}>
              <div className="text-center space-y-4">
                <p className={`text-sm ${textSecondaryClass} flex items-center justify-center space-x-2`}>
                  <BarChart3 className="w-4 h-4" />
                  <span>Live Price</span>
                </p>

                <div className="flex items-center justify-center space-x-3">
                  <div
                    className={`text-4xl font-bold ${priceDirection === "up"
                      ? "text-green-400"
                      : priceDirection === "down"
                        ? "text-red-400"
                        : isDark
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                  >
                    ₹{livePrice != null ? livePrice.toFixed(2) : "--"}
                  </div>

                  {priceDirection === "up" && (
                    <ArrowUpRight className="w-6 h-6 text-green-400 animate-bounce" />
                  )}
                  {priceDirection === "down" && (
                    <ArrowDownRight className="w-6 h-6 text-red-400 animate-bounce" />
                  )}
                </div>

                {/* Change badge */}
                <div className="flex items-center justify-center">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${priceChange >= 0
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                      }`}
                  >
                    {priceChange >= 0 ? "+" : ""}
                    {Number.isFinite(priceChange) ? priceChange.toFixed(2) : "0.00"} (
                    {priceChangePercent >= 0 ? "+" : ""}
                    {Number.isFinite(priceChangePercent) ? priceChangePercent.toFixed(2) : "0.00"}%)
                  </span>
                </div>

                {/* Day range line */}
                {dayHigh != null && dayLow != null && (
                  <div className="space-y-2">
                    <div className={`flex justify-between text-xs ${textSecondaryClass}`}>
                      <span>Day Low: ₹{dayLow}</span>
                      <span>Day High: ₹{dayHigh}</span>
                    </div>

                    <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-40" />
                      <div
                        className="absolute top-0 h-full w-4 bg-white shadow-lg transition-all duration-300"
                        style={{ left: `${dayRange}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isPositionModify && setOrderMode("MARKET")}
              disabled={isPositionModify || isExit}
              className={`py-4 rounded-xl font-semibold transition-all ${orderMode === "MARKET"
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/50"
                : `${glassClass} ${cardHoverClass} ${isPositionModify ? "opacity-50 cursor-not-allowed" : ""}`
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                <span>Market</span>
              </div>
            </button>

            <button
              onClick={() => !isPositionModify && marketOpen && setOrderMode("LIMIT")}
              disabled={!marketOpen || isPositionModify || isExit}
              className={`py-4 rounded-xl font-semibold transition-all ${orderMode === "LIMIT"
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/50"
                : `${glassClass} ${cardHoverClass} ${(!marketOpen || isPositionModify) ? "opacity-50 cursor-not-allowed" : ""}`
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Target className="w-5 h-5" />
                <span>Limit</span>
              </div>
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
              {!isPureModify && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {quickPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQty(String(preset))}
                      className={`px-3 py-1 ${glassClass} rounded-lg text-xs font-semibold ${cardHoverClass} transition-all hover:scale-105 ${Number(qty) === preset ? "ring-2 ring-red-500/70" : ""
                        }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              )}
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
              className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${orderMode === "MARKET" || isPureModify || !marketOpen || isExit ? "cursor-not-allowed opacity-50" : ""}
`}
              disabled={orderMode === "MARKET" || !marketOpen || isPositionModify || isExit}
            />
          </div>

          {/* Segment Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isPositionModify && setSegment("intraday")}
              disabled={isPositionModify || isExit}
              className={`py-4 rounded-xl font-semibold transition-all ${segment === "intraday"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                : `${glassClass} ${cardHoverClass}`
                } ${isPositionModify ? "cursor-not-allowed" : ""}`}
            >
              Intraday
            </button>

            <button
              onClick={() => !isPositionModify && setSegment("delivery")}
              disabled={isPositionModify || isExit}
              className={`py-4 rounded-xl font-semibold transition-all ${segment === "delivery"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                : `${glassClass} ${cardHoverClass}`
                } ${isPositionModify ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Delivery
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
                disabled={isAddMode || isExit}
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
                disabled={isAddMode || isExit}
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
          {submitting ? "Processing…" : isExit ? "EXIT" : isAdd ? "Add to Position" : isModify ? "Save Changes" : "SELL"}
        </button>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className={`${glassClass} rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl`}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CheckCircle2 className="w-10 h-10 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400">{successText || "Order saved"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
