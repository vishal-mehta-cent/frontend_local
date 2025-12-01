// src/pages/Payments.jsx
import React, { useState, useEffect } from "react";
import BackButton from "../components/BackButton";

const API =
  (import.meta.env.VITE_BACKEND_BASE_URL &&
    import.meta.env.VITE_BACKEND_BASE_URL.trim()) ||
  "http://127.0.0.1:8000";

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function Payments() {
  // Customer details
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // UPI QR states
  const [amountInr, setAmountInr] = useState(1);
  const [upiQR, setUpiQR] = useState(null);
  const [transactionRef, setTransactionRef] = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------
  // Generate UPI QR
  // ----------------------------------------------------
  const generateQR = async () => {
    setLoading(true);
    setPaymentDone(false);

    try {
      const tr = `upi_${Date.now()}`;
      setTransactionRef(tr);

      const data = await postJSON(`${API}/payments/upi/init`, {
        pa: "9426817879.etb@icici",
        pn: "VISHAL H MEHTA",
        amount_inr: Number(amountInr),
        tr,
        tn: "NeuroCrest Payment",
      });

      setUpiQR(data);
    } catch {
      alert("Failed to generate QR");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Poll backend for status
  // ----------------------------------------------------
  useEffect(() => {
    if (!transactionRef) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/payments/upi/status/${transactionRef}`);

        // ❗ IMPORTANT FIX — avoid refresh “detail not found”
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "success") {
          clearInterval(interval);
          setPaymentDone(true);
          setUpiQR(null);
          setLoading(false);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [transactionRef]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">

        <BackButton to="/profile" />

        <h1 className="text-2xl font-bold">Payments</h1>

        {/* =======================================
            CUSTOMER DETAILS (visible always)
        ======================================= */}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h3 className="text-lg font-semibold">Customer Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Name / Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="border rounded px-3 py-2"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* =======================================
            ONLY UPI QR DIRECT PAYMENT
        ======================================= */}
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <h3 className="text-lg font-semibold">UPI QR (Direct)</h3>

          <label className="text-sm text-gray-600">Amount (₹)</label>
          <input
            type="number"
            min="1"
            className="border rounded px-3 py-2 w-full"
            value={amountInr}
            onChange={(e) => setAmountInr(e.target.value)}
          />

          <button
            onClick={generateQR}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate QR"}
          </button>

          {/* QR DISPLAY */}
          {upiQR && !paymentDone && (
            <div className="flex flex-col items-center mt-3 space-y-2">
              <img
                src={`data:image/png;base64,${upiQR.qr_b64}`}
                alt="UPI QR"
                className="w-48 h-48 border rounded"
              />

              <a href={upiQR.upi_uri} className="text-blue-600 underline">
                Open in UPI App
              </a>

              <p className="text-sm text-gray-500">
                Scan this QR to pay ₹{amountInr}. Waiting for confirmation…
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {paymentDone && (
            <div className="text-center text-green-600 space-y-1 mt-2">
              <p className="text-2xl font-bold">✅ Payment Received Successfully!</p>
              <p className="text-gray-600">Thank you for your payment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
