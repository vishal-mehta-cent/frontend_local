// frontend/src/utils/format.js
export const formatINR = (value, { decimals = 2 } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const moneyINR = (value, { decimals = 2 } = {}) =>
  `₹${formatINR(value, { decimals })}`;
