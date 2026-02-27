// frontend/src/pages/TradeSuccess.jsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TradeSuccess() {
  const location = useLocation();
  const nav = useNavigate();
  const { symbol, action } = location.state || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      nav("/trade");
    }, 5000);
    return () => clearTimeout(timer);
  }, [nav]);

  if (!symbol || !action) {
    return (
      <div className="h-screen flex items-center justify-center text-center text-red-600 font-bold text-xl">
        ❌ Invalid Access
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-white">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-xl font-bold text-green-700">
        {symbol} {action} successful!
      </h1>
    </div>
  );
}
