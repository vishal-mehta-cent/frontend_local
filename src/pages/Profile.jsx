import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { Sun, Moon, User, UserCircle, Wallet, CreditCard, Settings, History, LogOut, ChevronRight, TrendingUp, Award, Shield, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

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
  } catch { }
  return { ok: res.ok, status: res.status, data };
}

// ---------- Stripe inner form (kept as-is; not used on this page) ----------
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
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  // existing state (kept)
  const [funds, setFunds] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userEmail = `${username.toLowerCase().replace(/ /g, "")}@gmail.com`;

  // NEW earlier: toggle for the Payment panel (kept but unused now)
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);

  // fetch funds (unchanged; just not displayed)
  useEffect(() => {
    fetch(`${API}/funds/available/${username}`)
      .then((res) => res.json())
      .then((data) => setFunds(data.total_funds || 0))
      .catch(() => setFunds(0));
  }, [username]);

  // ===== Payment state/handlers (kept exactly as your code) =====
  // INR / Razorpay
  const [amountInr, setAmountInr] = useState(199);
  const [loadingRzp, setLoadingRzp] = useState(false);

  // Direct UPI QR
  const [upiVpa, setUpiVpa] = useState("yourmerchant@icici");
  const [upiName, setUpiName] = useState("NeuroCrest");
  const [upiAmount, setUpiAmount] = useState(199);
  const [upiQR, setUpiQR] = useState(null);
  const [loadingUpi, setLoadingUpi] = useState(false);

  // Stripe / Intl
  const [intlCurrency, setIntlCurrency] = useState("USD");
  const [intlAmountMinor, setIntlAmountMinor] = useState(1999); // $19.99 -> 1999
  const [clientSecret, setClientSecret] = useState(null);
  const [publishableKey, setPublishableKey] = useState(null);
  const [loadingStripeInit, setLoadingStripeInit] = useState(false);
  const [stripeInitError, setStripeInitError] = useState("");

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // Actions (kept)
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
        modal: { ondismiss: () => { } },
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
        } catch { }
        throw new Error(msg);
      }

      // Frontend cleanup: remove local notes saved for this user
      try {
        const prefix = `notes:${username}:`;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) localStorage.removeItem(k);
        }
      } catch { }

      alert("✅ Account restored successfully");
      // go to menu/trade and refresh UI
      nav("/menu");
    } catch (e) {
      alert(e?.message || "Reset failed");
    }
  };


  // ================= UI =================
  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}
    >
      {/* Enhanced Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${glassClass} rounded-2xl p-4 mb-8 flex items-center shadow-2xl`}>
          {/* Left: Back */}
          <div className="flex-1">
            <BackButton
              to="/menu"
              className={isDark ? "text-slate-200 hover:text-white" : "text-slate-600"}
            />
          </div>

          {/* Center: ACCOUNT */}
          <div className="flex-1 flex items-center justify-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ACCOUNT
            </h2>
          </div>

          {/* Right: Reset */}
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={handleResetAccount}
              className="px-4 py-2 rounded-full border border-red-500/20
                 bg-red-500/10 text-red-500 font-semibold
                 hover:bg-red-500/20 hover:shadow-lg transition-all"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Premium Profile Card */}
        <div className={`${glassClass} rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden`}>
          {/* Reset Button (top-right inside profile card) */}



          {/* Decorative Gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl pointer-events-none"></div>

          {/* Avatar Section */}
          <div className="relative flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse"></div>
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 p-1 shadow-2xl">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              </div>
              {/* Status Badge */}
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full border-4 border-slate-800 shadow-lg"></div>
            </div>

            <h3 className="font-bold text-2xl mt-4 mb-1">{username}</h3>
            <p className={`text-sm ${textSecondaryClass} flex items-center space-x-1`}>
              <Award className="w-4 h-4" />
              <span>Premium Member</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className={`${glassClass} rounded-xl p-4 text-center ${cardHoverClass} transition-all`}>
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Active</p>
              <p className="text-lg font-bold">24/7</p>
            </div>
            <div className={`${glassClass} rounded-xl p-4 text-center ${cardHoverClass} transition-all`}>
              <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Security</p>
              <p className="text-lg font-bold">High</p>
            </div>
            <div className={`${glassClass} rounded-xl p-4 text-center ${cardHoverClass} transition-all`}>
              <Sparkles className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Status</p>
              <p className="text-lg font-bold">Pro</p>
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-3">
          <button
            onClick={() => nav("/profile/details")}
            className={`w-full ${glassClass} ${cardHoverClass} p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all">
                <UserCircle className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">Profile</p>
                <p className={`text-xs ${textSecondaryClass}`}>View & edit your profile</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => nav("/profile/funds")}
            className={`w-full ${glassClass} ${cardHoverClass} p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all">
                <Wallet className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">Funds</p>
                <p className={`text-xs ${textSecondaryClass}`}>Manage your wallet</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => nav("/payments")}
            className={`w-full ${glassClass} ${cardHoverClass} p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all">
                <CreditCard className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">Payment</p>
                <p className={`text-xs ${textSecondaryClass}`}>Payment methods & history</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => nav("/settings")}
            className={`w-full ${glassClass} ${cardHoverClass} p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-500/20 to-gray-500/20 group-hover:from-slate-500/30 group-hover:to-gray-500/30 transition-all">
                <Settings className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">Settings</p>
                <p className={`text-xs ${textSecondaryClass}`}>App preferences & config</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => nav("/history")}
            className={`w-full ${glassClass} ${cardHoverClass} p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02]`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                <History className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">History</p>
                <p className={`text-xs ${textSecondaryClass}`}>Transaction history</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full ${glassClass} hover:bg-red-500/10 p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02] border-red-500/20`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 group-hover:from-red-500/30 group-hover:to-rose-500/30 transition-all">
                <LogOut className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base text-red-400">Logout</p>
                <p className={`text-xs ${textSecondaryClass}`}>Sign out of your account</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Enhanced Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className={`${glassClass} rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl transform transition-all scale-100`}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="font-bold text-xl mb-2">Logout</h3>
            <p className={`${textSecondaryClass} mb-6`}>Are you sure you want to logout from your account?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-6 py-3 ${glassClass} ${cardHoverClass} rounded-xl font-medium transition-all hover:scale-105`}
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
