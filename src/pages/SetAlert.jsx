// ✅ SetAlert.jsx - Alert Setup Page
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function SetAlert() {
  const { symbol } = useParams();
  const [price, setPrice] = useState(0);
  const [direction, setDirection] = useState("above");
  const navigate = useNavigate();

  const handleSave = () => {
    alert(`Alert set for ${symbol} when price goes ${direction} ₹${price}`);
    setTimeout(() => navigate("/trade"), 2000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col p-4">
      <h1 className="text-xl font-semibold mb-4">Set Alert for {symbol}</h1>
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="border p-2 mb-2 rounded w-full"
        placeholder="Target Price"
      />
      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        className="border p-2 mb-4 rounded w-full"
      >
        <option value="above">Price goes above</option>
        <option value="below">Price goes below</option>
      </select>
      <button
        onClick={handleSave}
        className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Save Alert
      </button>
    </div>
  );
}