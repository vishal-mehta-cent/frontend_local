import React, { useState, useEffect } from "react";

export default function TradeModal({ symbol, type, onClose }) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [segment, setSegment] = useState("intraday");
  const [stoploss, setStoploss] = useState("");
  const [target, setTarget] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successModal, setSuccessModal] = useState(false);
  const [livePrice, setLivePrice] = useState(null);

  // Fetch Live Price
  useEffect(() => {
    const fetchLive = () => {
      fetch(`http://127.0.0.1:8000/quotes?symbols=${symbol}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0]) {
            const live = parseFloat(data[0].price).toFixed(2);
            setLivePrice(live);
            if (!price) setPrice(live);
          }
        });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    return () => clearInterval(interval);
  }, [symbol, price]);

  const handleSubmit = () => {
    setErrorMsg("");

    if (!qty || !price || isNaN(qty) || isNaN(price) || +qty <= 0 || +price <= 0) {
      setErrorMsg("❌ Please enter valid quantity and price (numbers only).");
      return;
    }

    fetch(`http://127.0.0.1:8000/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: localStorage.getItem("username"),
        script: symbol,
        order_type: type,
        qty: parseInt(qty),
        price: parseFloat(price),
        exchange,
        segment,
        stoploss: stoploss ? parseFloat(stoploss) : null,
        target: target ? parseFloat(target) : null,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          setErrorMsg(err.detail || "Failed to place order");
        } else {
          playSuccessSound();
          setSuccessModal(true);
          setQty("");
          setPrice("");
          setTimeout(() => {
            setSuccessModal(false);
            onClose(); // close modal after success
          }, 2000);
        }
      })
      .catch(() => setErrorMsg("Server error"));
  };

  const playSuccessSound = () => {
    const audio = new Audio("/success.mp3");
    audio.play();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 text-xl font-bold"
        >
          ×
        </button>

        {/* Title */}
        <h2
          className={`text-2xl font-bold text-center ${
            type === "BUY" ? "text-green-600" : "text-red-600"
          }`}
        >
          {type} {symbol}
        </h2>

        {errorMsg && (
          <div className="text-red-700 bg-red-100 p-2 rounded mt-3 text-center">
            {errorMsg}
          </div>
        )}

        {/* Live Price */}
        <div className="text-sm text-center text-gray-700 mt-2">
          Live Price:{" "}
          <span
            className={`font-semibold ${
              type === "BUY" ? "text-green-600" : "text-red-600"
            }`}
          >
            ₹{livePrice || "--"}
          </span>
        </div>

        {/* Quantity */}
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Quantity"
          className="w-full px-4 py-3 border rounded-lg mt-3"
        />

        {/* Price */}
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Limit Price"
          className="w-full px-4 py-3 border rounded-lg mt-3"
        />

        {/* Segment */}
        <div className="flex mt-3">
          <button
            onClick={() => setSegment("intraday")}
            className={`w-1/2 py-2 rounded-l-lg ${
              segment === "intraday" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Intraday
          </button>
          <button
            onClick={() => setSegment("delivery")}
            className={`w-1/2 py-2 rounded-r-lg ${
              segment === "delivery" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Delivery
          </button>
        </div>

        {/* Exchange */}
        <div className="flex mt-3">
          <button
            onClick={() => setExchange("NSE")}
            className={`w-1/2 py-2 rounded-l-lg ${
              exchange === "NSE" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            NSE
          </button>
          <button
            onClick={() => setExchange("BSE")}
            className={`w-1/2 py-2 rounded-r-lg ${
              exchange === "BSE" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            BSE
          </button>
        </div>

        {/* Stoploss */}
        <input
          type="number"
          value={stoploss}
          onChange={(e) => setStoploss(e.target.value)}
          placeholder="Stoploss (optional)"
          className="w-full px-4 py-3 border rounded-lg mt-3"
        />

        {/* Target */}
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target (optional)"
          className="w-full px-4 py-3 border rounded-lg mt-3"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className={`mt-4 w-full py-3 ${
            type === "BUY" ? "bg-green-600" : "bg-red-600"
          } text-white text-lg font-semibold rounded-lg`}
        >
          {type}
        </button>

        {/* Success Tick */}
        {successModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl text-center shadow-lg">
              <div className="mb-3">
                <div className="animate-bounce text-green-600 text-6xl">✅</div>
              </div>
              <p className="text-lg font-semibold text-green-700">
                Order Successfully Placed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
