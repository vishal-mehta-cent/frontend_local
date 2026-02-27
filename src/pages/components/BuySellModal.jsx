import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const API = "http://localhost:8000";

// helpers
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v) => {
  const n = toNum(v);
  return n === null ? "—" : `₹${n.toFixed(2)}`;
};
const pct = (v) => {
  const n = toNum(v);
  return n === null ? "—" : `${n.toFixed(2)}%`;
};

export default function BuySellModal({
  open,
  onClose,
  username,
  symbol,
  side = "BUY",            // "BUY" | "SELL"
  defaultSegment = "intraday",
}) {
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(""); // empty = market BUY (executes now)
  const [segment, setSegment] = useState(defaultSegment);
  const [quote, setQuote] = useState(null);
  const pollRef = useRef(null);

  // fetch quotes while visible
  useEffect(() => {
    if (!open || !symbol) return;
    const fetchQuote = async () => {
      try {
        const res = await fetch(`${API}/quotes?symbols=${encodeURIComponent(symbol)}`);
        const arr = await res.json();
        setQuote((arr && arr[0]) || null);
      } catch {}
    };
    fetchQuote();
    pollRef.current = setInterval(fetchQuote, 2000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [open, symbol]);

  if (!open || !symbol) return null;

  const live = toNum(quote?.price);
  const chg = toNum(quote?.change) ?? 0;
  const pctc = toNum(quote?.pct_change);
  const up = (chg ?? 0) >= 0;

  const nQty = Math.max(1, Number(qty || 1));
  const userPrice = price === "" ? null : Number(price);
  const px = userPrice ?? live ?? 0;
  const total = px * nQty;

  const submit = async () => {
    try {
      if (!username) {
        window.alert("Please login first.");
        return;
      }
      const body = {
        username,
        script: symbol,
        order_type: side,
        qty: nQty,
        price: price === "" ? 0 : Number(price), // backend: BUY w/ 0 => execute at live
        segment,
        exchange: "NSE",
      };
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Order failed");

      if (data.message === "EXECUTED") {
        window.alert(`${side === "BUY" ? "Buy" : "Sell"} successfully.`);
      } else if (data.message === "PLACED") {
        window.alert("Order successfully placed.");
      } else {
        window.alert("Order processed.");
      }
      onClose?.();
    } catch (e) {
      window.alert(e.message || "Order failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-gray-800 dark:text-white">
            {symbol} — {side}
          </div>
          <X
            size={22}
            className="text-gray-500 hover:text-red-500 cursor-pointer"
            onClick={onClose}
          />
        </div>

        {/* Live quote */}
        <div className="text-center">
          <div className="text-2xl font-bold">{money(live)}</div>
          <div className={up ? "text-green-600" : "text-red-500"}>
            {(chg ?? 0) >= 0 ? "+" : ""}
            {toNum(chg) === null ? "—" : chg.toFixed(2)} (
            {toNum(pctc) === null ? "—" : `${pctc.toFixed(2)}%`})
          </div>
          {/* Day's range if your backend provides: open / price (simple proxy) */}
          {quote?.open != null && live != null && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Open: {money(quote.open)}</span>
                <span>Live: {money(live)}</span>
              </div>
              <div className="relative h-1 bg-gray-300 rounded">
                {/* simple position marker, avoids division by zero */}
                <div
                  className="absolute top-0 h-1 bg-blue-500 rounded"
                  style={{ left: 0, width: "50%" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500">Segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white outline-none"
            >
              <option value="intraday">Intraday</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Quantity</label>
              <div className="mt-1 flex">
                <button
                  className="px-3 rounded-l-lg bg-gray-100 dark:bg-gray-700"
                  onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
                >
                  −
                </button>
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full text-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white outline-none"
                />
                <button
                  className="px-3 rounded-r-lg bg-gray-100 dark:bg-gray-700"
                  onClick={() => setQty((q) => Number(q || 0) + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Price (optional)</label>
              <input
                value={price}
                onChange={(e) => {
                  const raw = e.target.value;
                  const cleaned = raw.replace(/[^\d.]/g, "");
                  setPrice(cleaned);
                }}
                placeholder={side === "BUY" ? "0 = market" : "Trigger price"}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm mt-1">
            <div className="text-gray-500">
              Est. {side === "BUY" ? "Cost" : "Value"}
            </div>
            <div className="font-semibold">{money(total)}</div>
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            className={`w-full mt-2 py-2 rounded-lg font-semibold ${
              side === "BUY"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            {side === "BUY" ? "Place Buy" : "Place Sell"}
          </button>

          <p className="text-[11px] text-gray-500 mt-1">
            • Intraday: Open positions at 3:45pm IST are squared-off at live price. <br />
            • Delivery: Untriggered day orders may be canceled at EOD (funds refunded).
          </p>
        </div>
      </div>
    </div>
  );
}
