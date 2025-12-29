// frontend/src/components/ScriptDetailsModal.jsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";


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
}) {
  // ✅ HOOKS MUST ALWAYS RUN
  const navigate = useNavigate();
  const loc = useLocation();
  const [showConfirmSellFirst, setShowConfirmSellFirst] = useState(false);

  // ✅ SAFE early return AFTER hooks
  if (!symbol) return null;

  const sym = (symbol || quote?.symbol || "").toString().toUpperCase();
// 🔥 FORCE-HIDE sell-first confirmation on route change

  // =============================
  // ADD TO WHATSAPP ALERT
  // =============================
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

  // =============================
  // ADD NOTES
  // =============================
  const handleAddNotes = () => {
  navigate(`/notes/${sym}`, {
    state: {
      symbol: sym,
      from: "/trade"
    }
  });
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

  // =============================
  // SELL PREVIEW API
  // =============================
  const previewSell = async () => {
    const username =
      localStorage.getItem("userId") ||
      localStorage.getItem("username");

    console.log("SELL PREVIEW USER:", username);

    if (!username) {
      throw new Error("User not logged in");
    }

    const res = await fetch(`${API}/orders/sell/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  username,
  script: sym,
  qty: 1,
  exchange: "NSE",
  segment: "intraday",
  allow_short: false, // 🔥 REQUIRED
}),
    });

    const data = await res.json();
    console.log("SELL PREVIEW RESPONSE:", res.status, data);

    if (!res.ok) {
      return { needs_confirmation: true };
    }


    return data;
  };

  // =============================
  // SELL CLICK HANDLER
  // =============================
const handleSellClick = async () => {
  try {
    // =====================================================
    // ✅ 1. FIRST: Check portfolio holdings
    // =====================================================
    const position = await fetchPortfolioPosition(sym);

    // =====================================================
    // ✅ 2. If user already owns stock → DIRECT SELL
    //     (NO sell-first confirmation)
    // =====================================================
    if (position && Number(position.qty) > 0) {
      // 🔴 IMPORTANT: close modal FIRST
      onClose && onClose();

      // ⏱ navigate after modal unmount
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

    // =====================================================
    // ❌ 3. ONLY if NO portfolio → call SELL PREVIEW
    // =====================================================
    const preview = await previewSell();

    if (preview.needs_confirmation) {
      setShowConfirmSellFirst(true);
      return;
    }

    // =====================================================
    // 4. Fallback (rare case)
    // =====================================================
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


  // =============================
  // CONFIRM SELL FIRST
  // =============================
const confirmSellFirst = async () => {
  // =====================================================
  // Close confirmation modal
  // =====================================================
  setShowConfirmSellFirst(false);

  const position = await fetchPortfolioPosition(sym);

  // 🔴 IMPORTANT: close ScriptDetailsModal FIRST
  onClose && onClose();

  // ⏱ navigate after modal unmount
  setTimeout(() => {
    navigate(`/sell/${sym}`, {
      state: position
        ? {
            fromPortfolio: true,
            qty: Math.abs(position.qty),
            segment: position.segment || "delivery",
            stoploss: position.stoploss ?? "",
            target: position.target ?? "",
            allowShort: true, // ✅ SELL FIRST allowed
          }
        : {
            allowShort: true,
          },
    });
  }, 0);
};


  const target = typeof document !== "undefined" ? document.body : null;

  const body = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white w-full max-w-md md:rounded-xl rounded-t-2xl md:h-auto h-[70%] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{sym}</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="text-gray-700 text-sm mb-4 space-y-1">
          <div>
            Price: ₹
            {quote?.price != null
              ? Number(quote.price).toLocaleString("en-IN")
              : "--"}
          </div>
          <div>
            Change:{" "}
            {Number.isFinite(quote?.change)
              ? Number(quote.change).toFixed(2)
              : "--"} (
            {Number.isFinite(quote?.pct_change)
              ? Number(quote.pct_change).toFixed(2)
              : "--"}
            %)
          </div>
          <div>
            Day&apos;s Range: ₹{quote?.dayLow ?? "--"} - ₹{quote?.dayHigh ?? "--"}
          </div>
        </div>

        <div className="flex space-x-3 mb-4">
          <button
            onClick={onAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add to Watchlist
          </button>

          <button
            onClick={onBuy}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Buy
          </button>

          <button
            onClick={handleSellClick}
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Sell
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("open-chart", {
                  detail: { symbol: sym },
                })
              );
              onClose && onClose();
            }}
            className="bg-gray-200 px-3 py-2 rounded-lg"
          >
            📈 View Chart
          </button>

          <button
            onClick={handleAddNotes}
            className="bg-gray-200 px-3 py-2 rounded-lg"
          >
            📝 Add Notes
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              addToWhatsappAlert();
            }}
            style={{
              border: "2px solid #25D366",
              padding: "6px 10px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#25D366",
              fontWeight: "600",
              background: "white",
            }}
          >
            <FaWhatsapp size={18} /> Alert
          </button>
        </div>

        {showConfirmSellFirst && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-lg">
              <p className="text-center text-gray-800 mb-5">
                You didn&apos;t buy <b>{sym}</b>.
                <br />
                Do you still want to sell first?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowConfirmSellFirst(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200"
                >
                  NO
                </button>
                <button
                  onClick={confirmSellFirst}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return target ? createPortal(body, target) : body;
}
