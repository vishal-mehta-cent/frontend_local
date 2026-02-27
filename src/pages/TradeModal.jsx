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

  // ✅ Fetch Live Price
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
            onClose();
          }, 2500);
        }
      })
      .catch(() => setErrorMsg("Server error"));
  };

  const playSuccessSound = () => {
    const audio = new Audio("/success.mp3");
    audio.play();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          ✕
        </button>

        <h2
          className={`text-2xl font-bold text-center mb-4 ${
            type === "BUY" ? "text-green-600" : "text-red-600"
          }`}
        >
          {type} {symbol}
        </h2>

        {errorMsg && (
          <div className="text-red-700 bg-red-100 p-2 rounded mb-3 text-center">
            {errorMsg}
          </div>
        )}

        <div className="text-sm text-center text-gray-700 mb-2">
          Live Price:{" "}
          <span className="font-semibold text-green-600">
            ₹{livePrice || "--"}
          </span>
        </div>

        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Quantity"
          className="w-full px-4 py-2 border rounded mb-3"
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="w-full px-4 py-2 border rounded mb-3"
        />

        <div className="flex justify-between mb-3">
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

        <div className="flex justify-between mb-3">
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

        <input
          type="number"
          value={stoploss}
          onChange={(e) => setStoploss(e.target.value)}
          placeholder="Stoploss (optional)"
          className="w-full px-4 py-2 border rounded mb-3"
        />
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target (optional)"
          className="w-full px-4 py-2 border rounded mb-3"
        />

        <button
          onClick={handleSubmit}
          className={`w-full py-3 text-lg font-semibold rounded-lg ${
            type === "BUY" ? "bg-green-600" : "bg-red-600"
          } text-white`}
        >
          {type}
        </button>

        {/* Success Modal inside */}
        {successModal && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center">
            <div className="animate-bounce text-green-600 text-6xl">✅</div>
            <p className="text-lg font-semibold text-green-700 mt-3">
              Order Successfully Placed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
