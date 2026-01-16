// ✅ frontend/src/pages/Profile.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import {
  User,
  Wallet,
  CreditCard,
  Lock,
  LogOut,
  Shield,
  Sparkles,
  Pencil,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

import { loadStripe } from "@stripe/stripe-js";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

// ---------- small helpers ----------
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

// ---------- Stripe inner form (kept; not used on this page) ----------
function StripeCheckoutForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const handlePay = useCallback(async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      const text = error.message || "Payment failed. Please try again.";
      setMsg(text);
      onError?.(text, error);
    } else if (paymentIntent) {
      if (paymentIntent.status === "succeeded") {
        setMsg("✅ Payment successful.");
        onSuccess?.(paymentIntent);
      } else if (paymentIntent.status === "processing") {
        setMsg("⏳ Payment processing. You'll be notified once complete.");
      } else {
        setMsg(`ℹ️ Status: ${paymentIntent.status}`);
      }
    }
    setSubmitting(false);
  }, [elements, onError, onSuccess, stripe]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1f4a] via-[#143a8b] to-[#081633] text-white">
      <div className="space-y-3">
        <PaymentElement />
        {msg && (
          <div className="text-sm text-gray-700 bg-gray-100 rounded px-3 py-2">
            {msg}
          </div>
        )}
        <button
          type="button"
          onClick={handlePay}
          disabled={!stripe || !elements || submitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Processing…" : "Pay"}
        </button>
      </div>
    </div>
  );
}

export default function Profile({ username, logout }) {
  const nav = useNavigate();
  const { isDark } = useTheme();

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  const headerClass = isDark
    ? "bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-r from-blue-600 to-cyan-600";

  // existing state (kept)
  const [funds, setFunds] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const safeUser = String(username || "");
  const userEmail = `${safeUser.toLowerCase().replace(/ /g, "")}@gmail.com`;

  // fetch funds (unchanged; just not displayed)
  useEffect(() => {
    if (!username) return;
    fetch(`${API}/funds/available/${username}`)
      .then((res) => res.json())
      .then((data) => setFunds(data.total_funds || 0))
      .catch(() => setFunds(0));
  }, [username]);

  // ===== Payment state/handlers (kept exactly as your code) =====
  const [amountInr, setAmountInr] = useState(199);
  const [loadingRzp, setLoadingRzp] = useState(false);

  const [upiVpa, setUpiVpa] = useState("yourmerchant@icici");
  const [upiName, setUpiName] = useState("NeuroCrest");
  const [upiAmount, setUpiAmount] = useState(199);
  const [upiQR, setUpiQR] = useState(null);
  const [loadingUpi, setLoadingUpi] = useState(false);

  const [intlCurrency, setIntlCurrency] = useState("USD");
  const [intlAmountMinor, setIntlAmountMinor] = useState(1999);
  const [clientSecret, setClientSecret] = useState(null);
  const [publishableKey, setPublishableKey] = useState(null);
  const [loadingStripeInit, setLoadingStripeInit] = useState(false);
  const [stripeInitError, setStripeInitError] = useState("");

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const startRazorpay = async () => {
    setLoadingRzp(true);
    try {
      const receipt = `order_${Date.now()}`;
      const { ok, data } = await postJSON(`${API}/payments/razorpay/order`, {
        amount_inr: Number(amountInr),
        receipt,
        customer_name: username,
        customer_email: userEmail,
        customer_phone: "",
      });
      if (!ok) throw new Error(data?.detail || "Failed to create order");

      if (!window.Razorpay) {
        alert(
          "Razorpay SDK not found. Add <script src='https://checkout.razorpay.com/v1/checkout.js'></script> in index.html"
        );
        return;
      }

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "NeuroCrest",
        description: `Add Funds • ${receipt}`,
        order_id: data.order_id,
        prefill: data.prefill || {},
        method: { upi: true, netbanking: true, card: true, wallet: true },
        upi: { flow: "intent" },
        handler: function () {
          alert("Payment processing. Confirmation will appear shortly.");
        },
        modal: { ondismiss: () => {} },
      });
      rzp.open();
    } catch (e) {
      alert(e?.message || "Could not start Razorpay");
    } finally {
      setLoadingRzp(false);
    }
  };

  const genUpiQr = async () => {
    setLoadingUpi(true);
    try {
      const tr = `upi_${Date.now()}`;
      const { ok, data } = await postJSON(`${API}/payments/upi/qr`, {
        pa: upiVpa,
        pn: upiName,
        amount_inr: Number(upiAmount),
        tr,
        tn: "NeuroCrest Add Funds",
      });
      if (!ok) throw new Error(data?.detail || "Failed to create UPI QR");
      setUpiQR(data);
    } catch (e) {
      alert(e?.message || "Could not generate UPI QR");
    } finally {
      setLoadingUpi(false);
    }
  };

  const initStripe = async () => {
    setLoadingStripeInit(true);
    setStripeInitError("");
    try {
      const receipt = `intl_${Date.now()}`;
      const { ok, data } = await postJSON(`${API}/payments/stripe/intent`, {
        amount_minor: Number(intlAmountMinor),
        currency: intlCurrency,
        receipt,
        customer_email: userEmail,
      });
      if (!ok) throw new Error(data?.detail || "Stripe init failed");
      setClientSecret(data.clientSecret);
      setPublishableKey(data.publishableKey);
    } catch (e) {
      setStripeInitError(e?.message || "Failed to initialize Stripe");
    } finally {
      setLoadingStripeInit(false);
    }
  };

  const handleResetAccount = async () => {
    if (!username) return;

    const ok = window.confirm(
      "Reset account? This will delete your trades, portfolio, watchlist and funds. Profile/login will remain."
    );
    if (!ok) return;

    try {
      const res = await fetch(
        `${API}/users/${encodeURIComponent(username)}/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: "RESET", delete_files: true }),
        }
      );

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.detail) msg = j.detail;
        } catch {}
        throw new Error(msg);
      }

      const out = await res.json().catch(() => null);
      console.log("RESET RESPONSE:", out);
      alert(
        `✅ Reset done\nDBs: ${out?.dbs_touched?.length || 0}\nDeleted: ${JSON.stringify(
          out?.deleted_rows || {}
        )}`
      );

      // Frontend cleanup
      try {
        const prefix = `notes:${username}:`;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) localStorage.removeItem(k);
        }
      } catch {}

      nav("/menu");
    } catch (e) {
      alert(e?.message || "Reset failed");
    }
  };

  // ✅ Menu-style tiles (right side)
  const tiles = [
    {
      label: "Reset",
      note: "Restore account (delete trades & data)",
      icon: <Sparkles size={28} />,
      color: "from-red-500 to-rose-500",
      onClick: handleResetAccount,
    },
    {
      label: "Funds",
      note: "Manage your wallet",
      icon: <Wallet size={28} />,
      color: "from-emerald-400 to-teal-500",
      onClick: () => nav("/profile/funds"),
    },
    {
      label: "Payment",
      note: "Payment methods & history",
      icon: <CreditCard size={28} />,
      color: "from-blue-400 to-cyan-500",
      onClick: () => nav("/payments"),
    },
    {
      label: "Password / Email",
      note: "Change password or email",
      icon: <Lock size={28} />,
      color: "from-slate-400 to-gray-500",
      onClick: () => nav("/settings"),
    },
    {
      label: "Logout",
      note: "Sign out of your account",
      icon: <LogOut size={28} />,
      color: "from-red-500 to-rose-500",
      onClick: () => setShowLogoutConfirm(true),
    },
  ];

  // ================= UI =================
  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}
    >
      {/* Background glow blobs (same as Menu) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-blue-500/20" : "bg-blue-400/20"
          }`}
        ></div>
        <div
          className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-cyan-500/20" : "bg-cyan-400/20"
          }`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-blue-400/10" : "bg-blue-300/15"
          }`}
        ></div>
      </div>

      {/* Content Container */}
<div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

  {/* ✅ GLOBAL HEADER (Back left + PROFILE centered on SAME LINE) */}
  
    <div className="px-8 py-5">
      <div className="grid grid-cols-3 items-center">
        {/* Left */}
        <div className="justify-self-start">
          <BackButton to="/menu" className="text-white/90 hover:text-white" />
        </div>

        {/* Center */}
        <div className="justify-self-center flex items-center gap-2">
          
          <h2 className="text-2xl font-bold text-white tracking-tight">PROFILE</h2>
        </div>

        {/* Right empty (so title stays centered) */}
        <div className="justify-self-end" />
      </div>
    </div>
 

        
        {/* ✅ 2 column layout (left profile, right tiles) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ================= LEFT: Profile Card ================= */}
          <div className={`${glassClass} rounded-3xl shadow-2xl overflow-hidden`}>
            {/* Header (Menu style) */}
            

              
           

            {/* Body */}
            <div className="p-10 relative overflow-hidden">
              
              {/* Edit */}
                <div className="justify-self-end">
                  <button
                    type="button"
                    onClick={() => nav("/profile/details")}
                    title="Edit profile"
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg
                      ${
                        isDark
                          ? "bg-white/10 hover:bg-white/20 border border-white/20"
                          : "bg-white/20 hover:bg-white/30 border border-white/30"
                      }`}
                  >
                    <Pencil className="w-5 h-5 text-white" />
                  </button>
                </div>
                  <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl pointer-events-none"></div>

              <div className="relative flex flex-col items-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse"></div>

                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 p-1 shadow-2xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <User className="w-14 h-14 text-white" />
                    </div>
                  </div>

                  <div className="absolute bottom-2 right-2 w-7 h-7 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full border-4 border-slate-800 shadow-lg"></div>
                </div>

                <h3 className="font-bold text-3xl mt-6">{username}</h3>
                <p className={`mt-2 text-sm ${textSecondaryClass}`}>
                  Manage your account settings and wallet
                </p>
              </div>
            </div>
          </div>

          {/* ================= RIGHT: Menu-style tiles ================= */}
          <div className={`${glassClass} rounded-3xl shadow-2xl overflow-hidden`}>
            

            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {tiles.map((t) => {
                  const enabledBg = isDark
                    ? "bg-gradient-to-br from-white/5 to-white/0"
                    : "bg-gradient-to-br from-white to-slate-50";

                  const borderClass = isDark
                    ? "border-white/10 hover:border-white/20"
                    : "border-white hover:border-slate-200";

                  return (
                    <button
                      key={t.label}
                      onClick={t.onClick}
                      className={`group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 border-2 overflow-hidden
                        cursor-pointer hover:scale-105 hover:-translate-y-1 active:scale-95 shadow-lg hover:shadow-2xl
                        ${enabledBg} ${borderClass}
                      `}
                      title={t.label}
                    >
                      {/* Hover glow */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${t.color} ${
                          isDark ? "opacity-10" : "opacity-5"
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      ></div>

                      {/* Icon container (Menu style) */}
                      <div
                        className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                          bg-gradient-to-br ${t.color} group-hover:scale-110 group-hover:rotate-3 shadow-lg`}
                      >
                        <div className="text-white transition-transform duration-300 group-hover:scale-110">
                          {t.icon}
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Label */}
                      <div className="mt-4 text-center relative z-10">
                        <div
                          className={`text-sm font-bold ${
                            t.label === "Reset" || t.label === "Logout"
                              ? "text-red-300"
                              : isDark
                              ? "text-white"
                              : "text-slate-800"
                          }`}
                        >
                          {t.label}
                        </div>

                        <div className={`mt-1 text-xs ${textSecondaryClass}`}>
                          {t.note}
                        </div>
                      </div>

                      {/* Bottom accent */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                      ></div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className={`${glassClass} rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl`}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="font-bold text-xl mb-2">Logout</h3>
            <p className={`${textSecondaryClass} mb-6`}>
              Are you sure you want to logout from your account?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-6 py-3 ${glassClass} rounded-xl font-medium transition-all hover:scale-105`}
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-red-500/50 hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
