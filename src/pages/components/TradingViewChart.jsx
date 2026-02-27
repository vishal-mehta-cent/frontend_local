import React from "react";

export default function TradingViewChart({ symbol }) {
  const tvSymbol = `${symbol}.NS`; // NSE specific

  return (
    <iframe
      title="TV Chart"
      src={`https://s.tradingview.com/widgetembed/?symbol=NSE:${tvSymbol}&interval=5&hidesidetoolbar=1&theme=light`}
      width="100%"
      height="400"
      frameBorder="0"
      allowTransparency={true}
      scrolling="no"
      allowFullScreen
    />
  );
}
