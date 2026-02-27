import React from 'react';

const PositionCard = ({ type, script, qty, price, livePrice, pnl, datetime }) => {
  const isBuy = type === 'BUY';
  const isGreen = isBuy ? (livePrice > price) : (livePrice < price);
  const pnlColor = isGreen ? 'text-green-600' : 'text-red-600';
  const borderColor = isBuy ? 'border-green-400' : 'border-red-400';

  return (
    <div className={`rounded-2xl border-l-4 shadow p-4 mb-3 ${borderColor} bg-white`}>
      <div className="flex justify-between items-center text-sm font-medium mb-1">
        <span className={`px-2 py-1 rounded ${isBuy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {type} • {qty} Qty
        </span>
        <span>{new Date(datetime).toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center text-xl font-bold">
        <div>{script}</div>
        <div>₹{price}</div>
      </div>
      <div className="flex justify-between items-center text-sm mt-2">
        <span className="text-gray-600">LTP: ₹{livePrice}</span>
        <span className={pnlColor}>PNL: ₹{pnl}</span>
      </div>
    </div>
  );
};

export default PositionCard;
