import React, { useState, useEffect } from "react";
import { CreditCard, User, Mail, Phone, QrCode, CheckCircle, Loader, Sun, Moon, Smartphone } from "lucide-react";
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
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-50";
  const glassClass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/20"
    : "bg-white/70 backdrop-blur-xl border border-white/30";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const inputClass = isDark
    ? "bg-white/5 border-white/20 text-white placeholder-slate-400"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [amountInr, setAmountInr] = useState(1);
  const [upiQR, setUpiQR] = useState(null);
  const [transactionRef, setTransactionRef] = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!transactionRef) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/payments/upi/status/${transactionRef}`);

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
    <div className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden transition-colors duration-300`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/profile" />
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-10 h-10 flex items-center justify-center rounded-full ${glassClass} hover:scale-110 transition-all shadow-lg`}
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Payments
            </h1>
          </div>
          <p className={textSecondaryClass}>Secure UPI payment gateway</p>
        </div>

        <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8 mb-6`}>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Customer Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`text-xs uppercase tracking-wide ${textSecondaryClass} mb-2 block`}>
                Name / Username
              </label>
              <input
                className={`border ${inputClass} rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Enter name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className={`text-xs uppercase tracking-wide ${textSecondaryClass} mb-2 block`}>
                Email
              </label>
              <input
                className={`border ${inputClass} rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className={`text-xs uppercase tracking-wide ${textSecondaryClass} mb-2 block`}>
                Phone
              </label>
              <input
                className={`border ${inputClass} rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8`}>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-500" />
            UPI QR Payment
          </h3>

          <div className="mb-6">
            <label className={`text-sm font-semibold ${textSecondaryClass} mb-2 block`}>
              Payment Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              className={`border ${inputClass} rounded-xl px-6 py-4 w-full text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              value={amountInr}
              onChange={(e) => setAmountInr(e.target.value)}
            />
          </div>

          <button
            onClick={generateQR}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-2xl font-semibold hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/50 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating QR...
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                Generate QR Code
              </>
            )}
          </button>

          {upiQR && !paymentDone && (
            <div className="flex flex-col items-center mt-8 space-y-4 animate-fade-in">
              <div className="p-4 bg-white rounded-2xl shadow-xl">
                <img
                  src={`data:image/png;base64,${upiQR.qr_b64}`}
                  alt="UPI QR"
                  className="w-64 h-64 rounded-xl"
                />
              </div>

              <a
                href={upiQR.upi_uri}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Open in UPI App
              </a>

              <div className={`text-center ${textSecondaryClass} flex items-center gap-2`}>
                <Loader className="w-4 h-4 animate-spin" />
                Waiting for payment confirmation...
              </div>
            </div>
          )}

          {paymentDone && (
            <div className="text-center mt-8 space-y-3 animate-fade-in">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto animate-bounce" />
              <p className="text-3xl font-bold text-green-500">Payment Successful!</p>
              <p className={textSecondaryClass}>Thank you for your payment of ₹{amountInr}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
