// src/components/ScriptTile.jsx
import React, { useEffect, useMemo, useState } from "react";

export const money = (v) =>
  typeof v === "number" && !Number.isNaN(v)
    ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";

/**
 * ScriptTile
 * Props:
 *  - symbol: string (required)
 *  - segment: "intraday" | "delivery"
 *  - side: "BUY" | "SELL"               // how to compute P&L
 *  - entryPrice: number                 // BUY entry or SELL entry (sell price)
 *  - qty?: number
 *  - executed?: boolean                 // true = compute P&L, false = show Δ to trigger
 *  - subtitleLeft?: string              // optional small text line under the left block
 *  - subtitleRight?: string             // optional small text under the right block
 *  - className?: string
 *  - onClick?: () => void
 */
export default function ScriptTile({
  symbol,
  segment = "intraday",
  side = "BUY",
  entryPrice = 0,
  qty,
  executed = true,
  subtitleLeft,
  subtitleRight,
  className = "",
  onClick,
}) {
  const [live, setLive] = useState(0);

  // live price polling
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const r = await fetch(
          `http://127.0.0.1:8000/quotes?symbols=${encodeURIComponent(symbol)}`
        );
        const j = await r.json();
        const px = (Array.isArray(j) && j[0]?.price) ? Number(j[0].price) : 0;
        if (mounted) setLive(px || 0);
      } catch {
        if (mounted) setLive(0);
      }
    }
    load();
    const id = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [symbol]);

  const { pnlPerShare, pct } = useMemo(() => {
    if (!executed) return { pnlPerShare: 0, pct: 0 };
    if (!entryPrice || !live) return { pnlPerShare: 0, pct: 0 };
    if (side === "BUY") {
      const diff = live - entryPrice;
      return { pnlPerShare: diff, pct: entryPrice ? (diff / entryPrice) * 100 : 0 };
    } else {
      const diff = entryPrice - live;
      return { pnlPerShare: diff, pct: entryPrice ? (diff / entryPrice) * 100 : 0 };
    }
  }, [executed, side, entryPrice, live]);

  const pnlColor =
    pnlPerShare > 0 ? "text-green-600" : pnlPerShare < 0 ? "text-red-600" : "text-gray-600";

  const rightTopText = executed
    ? `${pnlPerShare >= 0 ? "▲" : "▼"} ${money(pnlPerShare)}`
    : `Δ ${money((side === "BUY" ? live - entryPrice : entryPrice - live) || 0)}`;

  const rightBottomText = executed ? `${pct.toFixed(2)}%` : "to trigger";

  return (
    <div
      className={`border rounded-2xl bg-white shadow-sm hover:shadow-md transition p-3 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-lg font-extrabold tracking-wide">{(symbol || "").toUpperCase()}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-semibold px-2 py-[2px] capitalize">
                {segment}
              </span>
              <span className="text-sm font-semibold text-gray-700">
                Live: <span className="text-gray-900">{money(live)}</span>
              </span>
            </div>

            {/* tiny caption under left */}
            {subtitleLeft && (
              <div className="text-[11px] text-gray-500 mt-1">{subtitleLeft}</div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right">
          <div className={`text-lg font-bold ${pnlColor}`}>{rightTopText}</div>
          <div className={`text-xs ${pnlColor}`}>{rightBottomText}</div>
          {subtitleRight && (
            <div className="text-[11px] text-gray-500 mt-1">{subtitleRight}</div>
          )}
        </div>
      </div>

      {/* info line */}
      <div className="mt-2 text-[12px] text-gray-500">
        Side:{" "}
        <span className={side === "BUY" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
          {side}
        </span>{" "}
        • Entry: {money(entryPrice)} {qty ? <>• Qty: {qty}</> : null}
      </div>
    </div>
  );
}
