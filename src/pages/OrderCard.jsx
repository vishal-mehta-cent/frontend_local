import React from "react";

const OrderCard = ({
  type = "BUY", // "BUY" or "SELL"
  executedQty = 0,
  totalQty = 100,
  time = "09:03:32",
  scriptName = "RELIANCE",
  orderPrice = 1390.0,
  ltp = 1410.2,
  dayChange = -0.09,
  exchange = "NSE"
}) => {
  const isBuy = type === "BUY";
  const directionColor = isBuy ? "text-green-600" : "text-red-600";
  const ltpColor = dayChange >= 0 ? "text-green-600" : "text-red-600";
  const investment = (orderPrice * totalQty).toFixed(2);

  return (
    <div className="border shadow-sm rounded-2xl p-4 mb-4 bg-white w-full">
      <div className="flex justify-between items-center text-sm font-medium mb-1">
        <div className={`${directionColor} uppercase`}>
          {type} &nbsp; <span className="text-gray-600">{executedQty} / {totalQty} Qty</span>
        {o.datetime && (
          <span className="text-gray-500 dark:text-gray-300">
          {o.datetime.split(" ")[1]}
          </span>
        )}
        </div>
        <div className="text-gray-500">{time}</div>
      </div>

      <div className="flex justify-between items-center mb-2">
        <div className="text-xl font-semibold">{scriptName}</div>
        <div className="text-lg font-medium text-gray-800">₹{orderPrice.toFixed(2)}</div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <div>{exchange} | Total Investment ₹{investment}</div>
        <div className={ltpColor}>
          LTP ₹{ltp.toFixed(2)} {dayChange >= 0 ? "↑" : "↓"} ({dayChange.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
