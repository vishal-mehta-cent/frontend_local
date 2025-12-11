// frontend/src/components/ScriptDetailsModal.jsx
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";

const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com";

export default function ScriptDetailsModal({
  symbol,
  quote,
  onClose,
  onAdd,
  onBuy,
  onSell,
  hasPosition = false,
}) {
  if (!symbol) return null;

  const navigate = useNavigate();
  const sym = (symbol || quote?.symbol || "").toString().toUpperCase();
  const loc = useLocation();

  const [showConfirmSellFirst, setShowConfirmSellFirst] = useState(false);

  // =============================
  // ADD TO WHATSAPP ALERT FUNCTION
  // =============================
  const addToWhatsappAlert = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/add-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: sym }),
      });

      const data = await res.json();

      // ⭐ DUPLICATE SCRIPT
      if (data.status === "exists") {
        toast.info(`${sym} already exists in WhatsApp Alerts`);
        return;
      }

      // ⭐ ADDED SUCCESSFULLY
      if (data.status === "ok") {
        toast.success(`${sym} added to WhatsApp Alerts!`);

        // Optional: auto redirect after toast
        setTimeout(() => {
          navigate("/whatsapp");
        }, 1200);

        return;
      }

      // ⭐ ANY OTHER ERROR
      toast.error("Unable to add alert. Try again.");

    } catch (e) {
      toast.error("Failed to add alert!");
    }
  };


  const handleAddNotes = () => {
    navigate(`/notes/${sym}`, { state: { symbol: sym } });
  };

  const handleSellClick = () => {
    if (!hasPosition) {
      setShowConfirmSellFirst(true);
    } else {
      onSell && onSell(false);
      onClose && onClose();
    }
  };

  const confirmSellFirst = () => {
    setShowConfirmSellFirst(false);
    onSell && onSell(true);
    onClose && onClose();
  };

  const target = typeof document !== "undefined" ? document.body : null;
  const body = (
    <div
      key={sym}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
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
            {Number.isFinite(quote?.change) ? Number(quote.change).toFixed(2) : "--"} (
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
                new CustomEvent("open-chart", { detail: { symbol: sym } })
              );
              onClose && onClose();
            }}
            className="bg-gray-200 px-3 py-2 rounded-lg"
          >
            📈 View Chart
          </button>

          {/* ❌ REMOVED "Set Alert" button */}

          <button
            onClick={handleAddNotes}
            className="bg-gray-200 px-3 py-2 rounded-lg"
          >
            📝 Add Notes
          </button>

          {/* ⭐ WhatsApp Alert button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToWhatsappAlert();
            }}

            style={{
              backgroundColor: "gray-200",
              border: "2px solid #25D366",
              padding: "6px 10px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#25D366",
              fontWeight: "600",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e6f9ee";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
            }}
          >
            <FaWhatsapp size={18} color="#25D366" /> Alert
          </button>

        </div>

        {showConfirmSellFirst && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-lg">
              <p className="text-center text-gray-800 mb-5">
                You didn&apos;t buy <span className="font-semibold">{sym}</span>.
                <br />
                Do you still want to sell first?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowConfirmSellFirst(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800"
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
