import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";
import { X, TrendingUp, FileText, BarChart3, AlertCircle } from "lucide-react";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "http://localhost:8000";

export default function ScriptDetailsModal({
  symbol,
  quote,
  onClose,
  onAdd,
  onBuy,
  onSell,
  hasPosition = false,
  isDark = true,
}) {
  const navigate = useNavigate();
  const loc = useLocation();
  const [showConfirmSellFirst, setShowConfirmSellFirst] = useState(false);

  if (!symbol) return null;

  const sym = (symbol || quote?.symbol || "").toString().toUpperCase();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  const addToWhatsappAlert = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/add-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: sym }),
      });

      const data = await res.json();

      if (data.status === "exists") {
        toast.info(`${sym} already exists in WhatsApp Alerts`);
        return;
      }

      if (data.status === "ok") {
        toast.success(`${sym} added to WhatsApp Alerts!`);
        setTimeout(() => navigate("/whatsapp"), 1200);
        return;
      }

      toast.error("Unable to add alert. Try again.");
    } catch {
      toast.error("Failed to add alert!");
    }
  };

  const handleAddNotes = () => {
    navigate(`/notes/${sym}`, { state: { symbol: sym } });
  };

  const fetchPortfolioPosition = async (symbol) => {
    const username =
      localStorage.getItem("username") ||
      localStorage.getItem("userId");

    if (!username) return null;

    try {
      const res = await fetch(`${API}/portfolio/${username}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data.open)) return null;

      const pos = data.open.find(
        (p) =>
          (p.symbol || p.script || "").toUpperCase() === symbol.toUpperCase()
      );

      return pos || null;
    } catch {
      return null;
    }
  };

  const previewSell = async (allowShort = false) => {
    const username =
      localStorage.getItem("userId") ||
      localStorage.getItem("username");

    console.log("SELL PREVIEW USER:", username);

    if (!username) throw new Error("User not logged in");

    const res = await fetch(`${API}/orders/sell/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        script: sym,
        order_type: "SELL",     // ✅ REQUIRED by backend
        qty: 1,
        allow_short: allowShort // ✅ helpful for SELL FIRST flow
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("SELL PREVIEW RESPONSE:", res.status, data);

    if (!res.ok) {
      // If backend uses structured detail, keep compatibility
      return { needs_confirmation: true, detail: data?.detail };
    }

    return data;
  };

  const handleBuyClick = () => {
    onClose && onClose();

    setTimeout(() => {
      navigate(`/buy/${encodeURIComponent(sym)}`, {
        state: {
          exchange: "NSE",
          segment: "intraday",
          orderMode: "MARKET",
          price: quote?.price ?? "",
        },
      });
    }, 0);
  };


  const handleSellClick = async () => {
    try {
      const position = await fetchPortfolioPosition(sym);

      if (position && Number(position.qty) > 0) {
        onClose && onClose();

        setTimeout(() => {
          navigate(`/sell/${sym}`, {
            state: {
              fromPortfolio: true,
              skipSellFirstCheck: true,
              qty: Math.abs(position.qty),
              segment: position.segment || "delivery",
              stoploss: position.stoploss ?? "",
              target: position.target ?? "",
              allowShort: false,
            },
          });
        }, 0);

        return;
      }

      const preview = await previewSell(false);

      if (preview.needs_confirmation) {
        setShowConfirmSellFirst(true);
        return;
      }

      onClose && onClose();

      setTimeout(() => {
        navigate(`/sell/${sym}`, {
          state: { allowShort: false },
        });
      }, 0);
    } catch (err) {
      console.error("SELL PREVIEW ERROR:", err);
      alert("Unable to check holdings right now. Please try again.");
    }
  };

  const confirmSellFirst = async () => {
    setShowConfirmSellFirst(false);

    const position = await fetchPortfolioPosition(sym);

    onClose && onClose();

    setTimeout(() => {
      navigate(`/sell/${sym}`, {
        state: position
          ? {
            fromPortfolio: true,
            qty: Math.abs(position.qty),
            segment: position.segment || "delivery",
            stoploss: position.stoploss ?? "",
            target: position.target ?? "",
            allowShort: true,
          }
          : {
            allowShort: true,
          },
      });
    }, 0);
  };

  const target = typeof document !== "undefined" ? document.body : null;

  const body = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn overflow-y-auto">
  <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6">


      <div
  className={`relative ${glassClass} w-full max-w-lg rounded-3xl shadow-2xl ${textClass} max-h-[90dvh] overflow-y-auto overscroll-contain`}
  style={{ WebkitOverflowScrolling: "touch" }}
>

        {/* Decorative gradient background */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl"></div>

        {/* Header */}
        <div className="relative z-10 p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {sym}
              </h2>
              <p className={`text-sm ${textSecondaryClass} mt-1`}>Stock Details</p>
            </div>
            <button
              onClick={onClose}
              className={`${glassClass} p-2 rounded-xl ${cardHoverClass} transition-all hover:rotate-90 duration-300`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Price Info Card */}
        <div className="relative z-10 p-6">
          <div className={`${glassClass} rounded-2xl p-5 space-y-3`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${textSecondaryClass}`}>Current Price</span>
              <span className="text-2xl font-bold">
                ₹{quote?.price != null ? Number(quote.price).toLocaleString("en-IN") : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className={`text-sm ${textSecondaryClass}`}>Change</span>
              <div className="text-right">
                <span className={`font-semibold ${Number(quote?.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number.isFinite(quote?.change) ? Number(quote.change).toFixed(2) : "--"}
                </span>
                <span className={`ml-2 text-sm ${Number(quote?.pct_change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({Number.isFinite(quote?.pct_change) ? Number(quote.pct_change).toFixed(2) : "--"}%)
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <span className={`text-sm ${textSecondaryClass}`}>Day's Range</span>
              <span className="text-sm font-medium">
                ₹{quote?.dayLow ?? "--"} - ₹{quote?.dayHigh ?? "--"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 px-6 pb-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={onAdd}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105"
            >
              Add to Watchlist
            </button>

            <button
              onClick={handleBuyClick}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-green-500/50 transition-all hover:scale-105"
            >
              Buy
            </button>


            <button
              onClick={handleSellClick}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-red-500/50 transition-all hover:scale-105"
            >
              Sell
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-chart", {
                    detail: { symbol: sym },
                  })
                );
                onClose && onClose();
              }}
              className={`${glassClass} ${cardHoverClass} px-3 py-3 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all hover:scale-105`}
            >
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-medium">View Chart</span>
            </button>

            <button
              onClick={handleAddNotes}
              className={`${glassClass} ${cardHoverClass} px-3 py-3 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all hover:scale-105`}
            >
              <FileText className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-medium">Add Notes</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                {/*addToWhatsappAlert();*/}
              }}
              className={`${glassClass} hover:bg-green-500/10 px-3 py-3 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all hover:scale-105 border-green-500/30`}
            >
              <FaWhatsapp className="w-5 h-5 text-green-400" />
              <span className="text-xs font-medium text-green-400">Alert</span>
            </button>
          </div>
        </div>

        {/* Sell First Confirmation Modal */}
        {showConfirmSellFirst && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 p-6 animate-fadeIn">
            <div className={`${glassClass} rounded-3xl p-8 max-w-sm w-full shadow-2xl`}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="font-bold text-xl mb-2 text-center">Sell First?</h3>
              <p className={`text-center ${textSecondaryClass} mb-6`}>
                You didn't buy <span className="font-bold text-blue-400">{sym}</span>.
                <br />
                Do you still want to sell first?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowConfirmSellFirst(false)}
                  className={`px-6 py-3 ${glassClass} ${cardHoverClass} rounded-xl font-medium transition-all hover:scale-105`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSellFirst}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-red-500/50 hover:scale-105"
                >
                  Yes, Sell
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );

  return target ? createPortal(body, target) : body;
}
