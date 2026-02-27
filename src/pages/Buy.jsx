import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";
import {
  TrendingUp,
  DollarSign,
  Target,
  Shield,
  AlertCircle,
  CheckCircle2,
  Zap,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
} from "lucide-react";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com";

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

export default function Buy() {
  const { symbol } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};
  // ✅ NEW: where to go back after ADD/EXIT/MODIFY
  const returnTo = prefill.returnTo || "";      // "/orders" or "/portfolio"
  const returnTab = prefill.returnTab || "";    // e.g. "positions"


  const isModify = Boolean(prefill.modifyId || prefill.fromModify);
  const isAdd = Boolean(prefill.fromAdd);
  const isPositionModify = Boolean(prefill.fromPosition);
  const isInactive = Boolean(prefill?.inactive);





  // ✅ NEW: EXIT mode (support multiple keys, but you should pass fromExit:true)
  const isExit = Boolean(
    prefill.fromExit ||
    prefill.exit === true ||
    prefill.action === "EXIT" ||
    prefill.mode === "EXIT"
  );

  const isAddMode = isAdd && isPositionModify;

  // ✅ IMPORTANT: qty must be editable on EXIT, so exclude exit from "pure modify"
  const isPureModify = isPositionModify && !isAdd && !isExit;

  const { isDark } = useTheme();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  const quickPresets = [1, 5, 10, 25, 50, 100];

  // UI-only live extras (does NOT affect order logic)
  const [prevPrice, setPrevPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [dayHigh, setDayHigh] = useState(null);
  const [dayLow, setDayLow] = useState(null);

  const [qty, setQty] = useState(prefill.qty || "");
  const [price, setPrice] = useState(prefill.price || "");
  const [exchange, setExchange] = useState(prefill.exchange || "NSE");
  const [segment, setSegment] = useState(prefill.segment || "intraday");
  const [stoploss, setStoploss] = useState(prefill.stoploss || "");
  const [target, setTarget] = useState(prefill.target || "");

  const [isFNO, setIsFNO] = useState(false);
  const [lotSize, setLotSize] = useState(1);
  const [lotQty, setLotQty] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);

  const [errorMsg, setErrorMsg] = useState("");
  const [successModal, setSuccessModal] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [livePrice, setLivePrice] = useState(null);

  const [orderMode, setOrderMode] = useState(prefill.orderMode || "MARKET");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const username = localStorage.getItem("username");

  const userEditedPrice = useRef(false);
  const didInitFnoQty = useRef(false);
  const [marketOpen, setMarketOpen] = useState(true);
  const displaySymbol = (symbol || "").replace(/-/g, "-"); // non-breaking hyphen


  // ✅ NEW: On EXIT, force Market + lock trade controls
  const lockTradeControls = Boolean(isExit);

  useEffect(() => {
    if (!lockTradeControls) return;
    setOrderMode("MARKET");
    setPrice("");
    userEditedPrice.current = false;
  }, [lockTradeControls]);

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
      .catch((err) => {
        console.error("Instrument info fetch error:", err);
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

            const high = Number(data[0].dayHigh);
            const low = Number(data[0].dayLow);
            const change = Number(data[0].change);
            const changePct = Number(data[0].pct_change);

            if (Number.isFinite(high)) setDayHigh(high);
            if (Number.isFinite(low)) setDayLow(low);
            if (Number.isFinite(change)) setPriceChange(change);
            if (Number.isFinite(changePct))
              setPriceChangePercent(changePct);

            if (
              orderMode === "LIMIT" &&
              !price &&
              !userEditedPrice.current &&
              !lockTradeControls
            ) {
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
  }, [symbol, orderMode, price, livePrice, lockTradeControls]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessText("");

    if (!marketOpen && segment === "intraday") {
      setErrorMsg(
        "❌ Intraday is not applicable when market is close, Please use delivery."
      );
      setSubmitting(false);
      return;
    }

    try {
      if (!marketOpen && orderMode === "LIMIT") {
        throw new Error("❌ Limit orders are not allowed after market close.");
      }

      const qtyNum = isFNO ? Number(lotQty) : Number(qty);

      if (isModify && prefill.modifyId && orderMode === "MARKET") {
        // 1) First update the OPEN order row with the new segment (and other fields)
        const updatePayload = {
          username,
          script: symbol,
          order_type: "BUY",
          qty: qtyNum,
          // keep existing limit price as stored trigger (important) – don't overwrite it with blank
          price: Number(prefill.price || prefill.trigger_price || price || 0),
          exchange,
          segment, // ✅ this is what you changed (delivery/intraday)
          stoploss: Number(stoploss || 0),
          target: Number(target || 0),
          is_short: 0,
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

          // ✅ If it says Open order not found, it most likely already triggered & moved to Positions
          if (res.status === 404 && detail.toLowerCase().includes("open order not found")) {
            setSuccessText("Order already executed ✅ (updated to Delivery)");
            setSuccessModal(true);

            setTimeout(() => {
              setSuccessModal(false);
              nav("/orders", { state: { refresh: true, tab: "positions" } });
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
          nav("/orders", { state: { refresh: true, tab: "positions" } });
        }, 1200);

        return;


      }


      if (!symbol) throw new Error("❌ Invalid symbol.");
      // ✅ EXIT (Buy-to-cover for SHORT positions)
      if (isExit) {
        const exitPayload = {
          username,
          script: symbol.toUpperCase(),
          order_type: "BUY",                 // ✅ REQUIRED
          qty: qtyNum,
          exchange: (exchange || "NSE").toUpperCase(),
          segment: (segment || prefill.segment || "intraday").toLowerCase(),

          // safe optional fields
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

          // ✅ respect returnTo (same as your existing logic)
          if (returnTo === "/portfolio") {
            nav("/portfolio", { state: { refresh: true } });
            return;
          }

          nav("/orders", { state: { refresh: true, tab: "positions" } });
        }, 1200);

        return; // ✅ IMPORTANT: stop here, don't create/modify orders
      }


      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        throw new Error("❌ Please enter a valid quantity (> 0).");
      }

      const payload = {
        username,
        script: symbol.toUpperCase(),
        order_type: "BUY",
        qty: qtyNum,
        exchange,
        segment,
        price: orderMode === "LIMIT" ? Number(price) : null,
        stoploss: stoploss !== "" ? Number(stoploss) : null,
        target: target !== "" ? Number(target) : null,

      };

      if (orderMode === "LIMIT") {
        const px = Number(price);
        if (!Number.isFinite(px) || px <= 0) {
          throw new Error("❌ Please enter a valid limit price.");
        }
        payload.price = px;
      }

      if (isPositionModify && Number(qty) <= 0) {
        setErrorMsg("❌ Quantity must be greater than zero");
        setSubmitting(false);
        return;
      }

      // ✅ IMPORTANT: don't treat EXIT as "modify position"
      if (isPositionModify && !isAdd && !isExit) {
        await handleModifyPosition();
        return;
      }

      let res, data;

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

      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.message ||
            data?.message ||
            "Order failed";
        throw new Error(msg);
      }

      if (isExit) {
        setSuccessText("Exit Successful ✅");
      } else if (isAdd) {
        setSuccessText("Added to Position ✅");
      } else if (isModify) {
        setSuccessText("Modify Successful ✅");
      } else if (orderMode === "LIMIT") {
        setSuccessText("Order Successful ✅");
      } else {
        setSuccessText("Buy Successful ✅");
      }

      setSuccessModal(true);

      setTimeout(() => {
        setSuccessModal(false);

        // ✅ NEW: respect returnTo
        if (returnTo === "/portfolio") {
          nav("/portfolio", { state: { refresh: true } });
          return;
        }

        if (returnTo === "/orders") {
          // ✅ If you came from OpenTrades tab, returnTab will be "open"
          // ✅ If order triggered (executed), always go Positions
          const tabToGo =
            (data && data.triggered) ? "positions" : (returnTab || "open");

          nav("/orders", { state: { refresh: true, tab: tabToGo } });
          return;
        }


        // ✅ fallback (old behavior)
        if (data && data.triggered) {
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

      // ✅ Build payload WITHOUT sending nulls (avoids FastAPI 422)
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

        // keep if backend accepts; safe if extra="ignore"
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

      // ✅ Parse response safely (sometimes error bodies are not JSON)
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

      setTimeout(() => {
        if (returnTo === "/portfolio") {
          nav("/portfolio", { state: { refresh: true } });
          return;
        }
        if (returnTo === "/orders") {
          nav("/orders", { state: { refresh: true, tab: "positions" } });
          return;
        }
        // fallback
        nav("/orders", { state: { refresh: true, tab: "positions" } });
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


  const handlePriceChange = (e) => {
    setPrice(e.target.value);
    userEditedPrice.current = true;
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
    dayHigh && dayLow && livePrice && dayHigh !== dayLow
      ? ((livePrice - dayLow) / (dayHigh - dayLow)) * 100
      : 50;

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}
    >
      {/* soft blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/15 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-3 z-40">
          <div className={`${glassClass} rounded-2xl p-4 mb-6 shadow-2xl`}>
            <div className="grid grid-cols-3 items-center">
              {/* Left */}
              <div className="justify-self-start">
                <BackButton
                  to={returnTo || "/orders"}
                  state={
                    returnTo === "/orders"
                      ? { tab: returnTab || "positions", refresh: true }
                      : { refresh: true }
                  }
                />
              </div>

              {/* Center (ALWAYS centered) */}
              <div className="justify-self-center text-center">
                <div className="flex items-center justify-center space-x-3">
                  <div className="relative">
                    <TrendingUp className="w-6 h-6 text-green-400 animate-pulse" />
                    {marketOpen && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                    )}
                  </div>

                  <div className="text-center">
                    <h2 className="whitespace-nowrap font-bold text-xl bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      {isExit
                        ? `EXIT ${displaySymbol}`
                        : isAdd
                          ? `ADD ${displaySymbol}`
                          : isModify
                            ? `MODIFY ${displaySymbol}`
                            : `BUY ${displaySymbol}`}
                    </h2>

                    <p className={`text-xs ${textSecondaryClass}`}>
                      {marketOpen ? "Market Open" : "Market Closed"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="justify-self-end">
                {!isExit && !isModify && !isPositionModify && (
                  <button
                    type="button"
                    onClick={() =>
                      nav(`/sell/${symbol}`, {
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
                        ? "bg-rose-500/15 border-rose-400/25 text-rose-100 hover:bg-rose-500/25"
                        : "bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200"
                      }`}
                  >
                    SELL
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div
            className={`${glassClass} rounded-2xl p-4 mb-6 border border-red-500/40 shadow-lg`}
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{String(errorMsg)}</p>
            </div>
          </div>
        )}

        {/* Live Price Card */}
        <div className={`${glassClass} rounded-3xl p-6 mb-6 shadow-2xl`}>
          <div className="text-center space-y-4">
            <p
              className={`text-sm ${textSecondaryClass} flex items-center justify-center space-x-2`}
            >
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

            <div className="flex items-center justify-center">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${priceChange >= 0
                  ? "bg-green-500/20 text-green-300"
                  : "bg-red-500/20 text-red-300"
                  }`}
              >
                {priceChange >= 0 ? "+" : ""}
                {Number.isFinite(priceChange) ? priceChange.toFixed(2) : "0.00"}{" "}
                ({priceChangePercent >= 0 ? "+" : ""}
                {Number.isFinite(priceChangePercent)
                  ? priceChangePercent.toFixed(2)
                  : "0.00"}
                %)
              </span>
            </div>

            {dayHigh != null && dayLow != null && (
              <div className="space-y-2">
                <div
                  className={`flex justify-between text-xs ${textSecondaryClass}`}
                >
                  <span>Day Low: ₹{dayLow}</span>
                  <span>Day High: ₹{dayHigh}</span>
                </div>

                <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-40" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-xl ring-2 ring-white/40 transition-all duration-300"
                    style={{ left: `calc(${dayRange}% - 8px)` }}
                  />

                </div>
              </div>
            )}
          </div>

          {isFNO && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className={`${glassClass} rounded-xl p-3 text-center`}>
                <p className={`text-xs ${textSecondaryClass} mb-1`}>Lot Size</p>
                <p className="text-lg font-bold text-cyan-300">{lotSize}</p>
              </div>
              <div className={`${glassClass} rounded-xl p-3 text-center`}>
                <p className={`text-xs ${textSecondaryClass} mb-1`}>
                  Total Investment
                </p>
                <p className="text-lg font-bold text-blue-300">
                  {totalInvestment > 0
                    ? `₹${totalInvestment.toLocaleString()}`
                    : "--"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div
          className={`${glassClass} rounded-3xl p-6 mb-6 shadow-2xl space-y-6 flex-1`}
        >
          {/* Order Type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isPureModify && !lockTradeControls && setOrderMode("MARKET")}
              disabled={isPureModify || lockTradeControls}
              className={`py-4 rounded-xl font-semibold transition-all transform ${orderMode === "MARKET"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/40"
                : `${glassClass} ${cardHoverClass}`
                } ${isPureModify || lockTradeControls
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105"
                }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Market</span>
              </div>
            </button>

            <button
              onClick={() => !isPureModify && !lockTradeControls && marketOpen && setOrderMode("LIMIT")}
              disabled={!marketOpen || isPureModify || lockTradeControls}
              className={`py-4 rounded-xl font-semibold transition-all transform ${orderMode === "LIMIT"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/40"
                : `${glassClass} ${cardHoverClass}`
                } ${!marketOpen || isPureModify || lockTradeControls
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105"
                }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Limit</span>
              </div>
            </button>
          </div>

          {/* Quantity */}
          <div>
            <label
              className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}
            >
              <Package className="w-4 h-4" />
              <span>Quantity {isFNO && "(Lots)"}</span>
            </label>

            <input
              type="number"
              value={qty}
              disabled={isPureModify}
              onChange={(e) => setQty(e.target.value)}
              className={`w-full px-4 py-3 ${glassClass} rounded-xl
                ${textClass}
                placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-green-500/50
                ${isPureModify ? "cursor-not-allowed opacity-50" : ""}
              `}
            />

            {!isPureModify && (
              <div className="flex flex-wrap gap-2 mt-3">
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setQty(String(preset))}
                    className={`px-3 py-1 ${glassClass} rounded-lg text-xs font-semibold ${cardHoverClass} transition-all hover:scale-105 ${Number(qty) === preset ? "ring-2 ring-green-500/70" : ""
                      }`}
                    type="button"
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            )}

            {isFNO && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className={`${glassClass} rounded-xl p-3 text-center`}>
                  <p className={`text-xs ${textSecondaryClass}`}>Total Qty</p>
                  <p className="text-lg font-bold">{lotQty || 0}</p>
                </div>
                <div className={`${glassClass} rounded-xl p-3 text-center`}>
                  <p className={`text-xs ${textSecondaryClass}`}>Lots</p>
                  <p className="text-lg font-bold">{qty || 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Limit Price */}
          <div>
            <label
              className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Limit Price</span>
            </label>

            <input
              type="number"
              value={orderMode === "LIMIT" ? price : ""}
              onChange={handlePriceChange}
              disabled={orderMode === "MARKET" || !marketOpen || isPureModify || lockTradeControls}
              placeholder={
                lockTradeControls
                  ? "Disabled in EXIT"
                  : !marketOpen
                    ? "Limit orders disabled after market close"
                    : "Enter limit price"
              }
              className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-all ${orderMode === "MARKET" || !marketOpen || isPureModify || lockTradeControls
                ? "cursor-not-allowed opacity-50"
                : ""
                }`}
            />
          </div>

          {/* Segment */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isPureModify && !lockTradeControls && setSegment("intraday")}
              disabled={isPureModify || lockTradeControls}
              className={`py-4 rounded-xl font-semibold transition-all transform ${segment === "intraday"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                : `${glassClass} ${cardHoverClass}`
                } ${isPureModify || lockTradeControls ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            >
              Intraday
            </button>

            <button
              onClick={() => !isPureModify && !lockTradeControls && setSegment("delivery")}
              disabled={isPureModify || lockTradeControls}
              className={`py-4 rounded-xl font-semibold transition-all transform ${segment === "delivery"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                : `${glassClass} ${cardHoverClass}`
                } ${isPureModify || lockTradeControls ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            >
              Delivery
            </button>
          </div>

          {/* SL & Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}
              >
                <Shield className="w-4 h-4" />
                <span>Stoploss</span>
              </label>
              <input
                type="number"
                value={stoploss}
                onChange={(e) => setStoploss(e.target.value)}
                disabled={isAddMode}
                placeholder="Optional"
                className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-all ${isAddMode ? "cursor-not-allowed opacity-50" : ""
                  }`}
              />
            </div>

            <div>
              <label
                className={`text-sm ${textSecondaryClass} mb-2 flex items-center space-x-1`}
              >
                <Target className="w-4 h-4" />
                <span>Target</span>
              </label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={isAddMode}
                placeholder="Optional"
                className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-all ${isAddMode ? "cursor-not-allowed opacity-50" : ""
                  }`}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-4 rounded-2xl text-white text-lg font-bold shadow-2xl transition-all transform ${submitting
              ? "bg-gray-600 cursor-not-allowed opacity-60 scale-95"
              : "bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95"
              }`}
          >
            <div className="flex items-center justify-center space-x-2">
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>
                    {isExit
                      ? "EXIT"
                      : isAdd
                        ? "Add to Position"
                        : isModify
                          ? "Save Changes"
                          : "BUY"}
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Success Modal */}
        {successModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div
              className={`${glassClass} rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl`}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-400 animate-pulse" />
              </div>

              <p className="text-xl font-bold text-green-400 mb-2">
                {successText || "Order saved"}
              </p>

              <p className={`text-sm ${textSecondaryClass}`}>
                Redirecting you now...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
