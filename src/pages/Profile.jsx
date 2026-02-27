// ✅ frontend/src/pages/Profile.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
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
  Camera,
  Settings,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

import { loadStripe } from "@stripe/stripe-js";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Home, Sun, Moon, Clock } from "lucide-react";

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
  const { isDark, toggle } = useTheme();

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
  const [hoveredTile, setHoveredTile] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetResult, setResetResult] = useState({ open: false, title: "", message: "" });

  const safeUser = String(username || "");
  const userEmail = `${safeUser.toLowerCase().replace(/ /g, "")}@gmail.com`;

  // =========================
  // ✅ Avatar (Camera/Gallery/No profile + Initials)
  // =========================
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [showAvatarOptions, setShowAvatarOptions] = useState(false);

  const avatarKey = useMemo(
    () => `avatar:${String(username || "guest")}`,
    [username]
  );


  const [avatarDataUrl, setAvatarDataUrl] = useState(() => {
    try {
      return localStorage.getItem(avatarKey) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      const v = localStorage.getItem(avatarKey) || "";
      setAvatarDataUrl(v);
    } catch {
      setAvatarDataUrl("");
    }
  }, [avatarKey]);

  const getInitials = (name) => {
    const cleaned = String(name || "")
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-zA-Z ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "?";
    const parts = cleaned.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  };

  const initials = useMemo(() => getInitials(username), [username]);

  const openAvatarOptions = () => setShowAvatarOptions(true);
  const closeAvatarOptions = () => setShowAvatarOptions(false);

  const pickFromGallery = () => {
    closeAvatarOptions();
    galleryInputRef.current?.click();
  };

  const takeFromCamera = () => {
    closeAvatarOptions();
    cameraInputRef.current?.click();
  };

  const clearAvatar = () => {
    closeAvatarOptions();
    setAvatarDataUrl("");
    try {
      localStorage.removeItem(avatarKey);
    } catch { }
  };
  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);


  const onAvatarSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (accept is not enough)
    const okTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!okTypes.includes(file.type)) {
      alert("Only JPG or PNG images are allowed.");
      e.target.value = "";
      return;
    }

    // Optional: size limit (3MB)
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("Image too large. Please upload up to 3MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatarDataUrl(result);
      try {
        localStorage.setItem(avatarKey, result);
      } catch { }
    };
    reader.readAsDataURL(file);

    // allow re-select same file again
    e.target.value = "";
  };

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

      const out = await res.json().catch(() => null);
      console.log("RESET RESPONSE:", out);

      // Frontend cleanup
      try {
        const prefix = `notes:${username}:`;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) localStorage.removeItem(k);
        }
      } catch { }

      // ✅ show Chart-style result modal
      setResetResult({
        open: true,
        title: "Reset done",
        message: `✅ Reset done`,
      });
    } catch (e) {
      setResetResult({
        open: true,
        title: "Reset failed",
        message: e?.message || "Reset failed",
      });
    }
  };


  // ✅ Menu-style tiles (right side)
  const tiles = [
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
      label: "History",
      note: "All trades & activity",
      icon: <Clock size={28} />,
      color: "from-purple-400 to-fuchsia-500",
      onClick: () => nav("/history"),
    },

    {
      label: "Settings",
      note: "Account & security",
      icon: <Settings size={28} />,
      color: "from-slate-400 to-gray-500",
      onClick: () => nav("/settings"),
    },

  ];

  const dangerTiles = [
    {
      label: "Reset",
      note: "Restore account (delete trades & data)",
      icon: <Sparkles size={28} />,
      color: "from-red-500 to-rose-500",
      onClick: handleResetAccount,
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
          className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-blue-500/20" : "bg-blue-400/20"
            }`}
        ></div>
        <div
          className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-cyan-500/20" : "bg-cyan-400/20"
            }`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-blue-400/10" : "bg-blue-300/15"
            }`}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-none mx-auto px-2 sm:px-3 lg:px-4 py-6">
        {/* ✅ GLOBAL HEADER (Back left + PROFILE centered on SAME LINE) */}
        <div className="px-2 sm:px-4 py-5">
          <div className="grid grid-cols-3 items-center">
            {/* Left */}
            <BackButton
              to="/menu"
              className={
                isDark
                  ? "text-white/90 hover:text-white"
                  : "text-slate-900 hover:text-slate-700"
              }
            />

            {/* Center Title */}
            <h2 className="justify-self-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              PROFILE
            </h2>

            {/* Right: Home + Theme Toggle */}
            <div className="justify-self-end flex items-center gap-3">
              {/* Home Button */}
              <button
                type="button"
                onClick={() => nav("/trade")}
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95
          ${isDark
                    ? "bg-white/10 border border-white/20 text-white"
                    : "bg-white/70 border border-white text-slate-900"
                  }`}
                title="Home"
              >
                <Home className="w-5 h-5" />
              </button>

              {/* Light/Dark Toggle */}
              <button
                type="button"
                onClick={toggle}
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95
          ${isDark
                    ? "bg-white/10 border border-white/20 text-white"
                    : "bg-white/70 border border-white text-slate-900"
                  }`}
                title={isDark ? "Light mode" : "Dark mode"}
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 2 column layout (left profile, right tiles) */}
        <div className="grid grid-cols-1 gap-6 items-stretch">
          {/* ================= LEFT: Profile Card ================= */}
          <div
            className={`${glassClass} rounded-3xl shadow-2xl overflow-hidden w-full`}
          >
            {/* Body */}
            <div className="p-10 pb-24 relative overflow-hidden">
              {/* Edit */}


              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl pointer-events-none"></div>

              <div className="relative flex flex-col items-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse"></div>

                  {/* Hidden input: Gallery */}
                  {/* Hidden input: Gallery */}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={onAvatarSelected}
                    className="absolute -left-[9999px] w-px h-px opacity-0"
                  />

                  {/* Hidden input: Camera (Live photo) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onAvatarSelected}
                    className="absolute -left-[9999px] w-px h-px opacity-0"
                  />


                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 p-1 shadow-2xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden">
                      {avatarDataUrl ? (
                        <img
                          src={avatarDataUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-white font-extrabold text-4xl select-none">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Camera button → open 3 options */}
                  <button
                    type="button"
                    onClick={openAvatarOptions}
                    title="Change photo"
                    className={`absolute bottom-2 right-2 w-10 h-10 rounded-full grid place-items-center shadow-lg transition-all hover:scale-110 active:scale-95
                      ${isDark
                        ? "bg-white/10 border border-white/20 text-white"
                        : "bg-white/80 border border-white text-slate-900"
                      }`}
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-bold text-3xl mt-6">{username}</h3>
                <p className={`mt-2 text-sm ${textSecondaryClass}`}>
                  Manage your account settings and wallet
                </p>
              </div>

              {/* ✅ Reset (left) + Logout (right) at TRUE bottom of the card */}
              <div className="absolute bottom-1 left-8 right-8 flex justify-between items-center z-20">
                {/* Reset - left */}
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}

                  className={`px-5 py-3 rounded-2xl font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95
                    ${isDark
                      ? "bg-white/10 border border-white/20 text-white"
                      : "bg-white/70 border border-white text-slate-900"
                    }
                  `}
                  title="Reset"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    Reset
                  </span>
                </button>

                {/* Logout - right */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="px-5 py-3 rounded-2xl font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95
                    bg-gradient-to-r from-red-500 to-rose-500 text-white"
                  title="Logout"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </span>
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {tiles.map((t, idx) => {
                  const isHovered = hoveredTile === idx;

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
                      onMouseEnter={() => setHoveredTile(idx)}
                      onMouseLeave={() => setHoveredTile(null)}
                      className={`group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 border-2 overflow-hidden
            cursor-pointer hover:scale-105 hover:-translate-y-1 active:scale-95 shadow-lg hover:shadow-2xl
            ${enabledBg} ${borderClass}
          `}
                      title={t.label}
                    >
                      {/* ✅ Menu-like hover glow (LIGHT ONLY, not full color) */}
                      {isHovered && (
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${t.color} ${isDark ? "opacity-10" : "opacity-5"
                            } transition-opacity duration-300`}
                        />
                      )}

                      {/* Icon container */}
                      <div
                        className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
              bg-gradient-to-br ${t.color} group-hover:scale-110 group-hover:rotate-3 shadow-lg
              ${isHovered ? "shadow-2xl" : ""}
            `}
                      >
                        <div className="text-white transition-transform duration-300 group-hover:scale-110">
                          {t.icon}
                        </div>

                        {/* Shine Effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Label */}
                      <div className="mt-4 text-center relative z-10">
                        <div
                          className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"
                            }`}
                        >
                          {t.label}
                        </div>
                        <div className={`mt-1 text-xs ${textSecondaryClass}`}>
                          {t.note}
                        </div>
                      </div>

                      {/* Bottom accent line */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Avatar Options Modal */}
      {/* ✅ Avatar Options Modal (NeuroCrest glass UI) */}
      {showAvatarOptions && (
        <div
          className="fixed inset-0 z-[10060] flex items-center justify-center px-3"
          onMouseDown={closeAvatarOptions}
        >
          {/* Backdrop with glow */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDark
              ? "bg-white/5 border border-white/10"
              : "bg-white/60 border border-white/40"
              }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Top glow strip */}
            <div className="absolute inset-x-0 -top-10 h-32 bg-gradient-to-r from-blue-500/30 via-cyan-500/25 to-blue-500/30 blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">


                  <div>
                    <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Profile Photo
                    </div>
                    <div className={`text-sm mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      Choose an option
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAvatarOptions}
                className={`w-10 h-10 rounded-xl grid place-items-center transition shadow-md hover:rotate-90 duration-300 active:scale-95  ${isDark
                  ? "bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                  : "bg-white/70 hover:bg-white border border-white text-slate-900"
                  }`}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Options */}
            <div className="px-6 pb-6">
              <div className="grid gap-3">
                {/* Camera (only on mobile) */}
                {isMobile && (
                  <button
                    type="button"
                    onClick={takeFromCamera}
                    className={`group w-full rounded-2xl px-5 py-4 flex items-center justify-between transition-all shadow-lg hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] ${isDark
                      ? "bg-white/5 border border-white/10 hover:border-white/20"
                      : "bg-white/70 border border-white hover:border-slate-200"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 grid place-items-center shadow-lg group-hover:scale-105 transition">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          Camera
                        </div>
                        <div className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          Live photo capture
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                      Open
                    </span>
                  </button>
                )}


                {/* Gallery */}
                <button
                  type="button"
                  onClick={pickFromGallery}
                  className={`group w-full rounded-2xl px-5 py-4 flex items-center justify-between transition-all shadow-lg hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] ${isDark
                    ? "bg-white/5 border border-white/10 hover:border-white/20"
                    : "bg-white/70 border border-white hover:border-slate-200"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center shadow-lg group-hover:scale-105 transition">
                      <span className="text-white text-lg">🖼️</span>
                    </div>
                    <div className="text-left">
                      <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Gallery
                      </div>
                      <div className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        Upload JPG/PNG
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                    Choose
                  </span>
                </button>

                {/* No profile */}
                <button
                  type="button"
                  onClick={clearAvatar}
                  className={`group w-full rounded-2xl px-5 py-4 flex items-center justify-between transition-all shadow-lg hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] ${isDark
                    ? "bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15"
                    : "bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 grid place-items-center shadow-lg group-hover:scale-105 transition">
                      <span className="text-white text-lg">⛔</span>
                    </div>
                    <div className="text-left">
                      <div className={`font-bold ${isDark ? "text-rose-100" : "text-rose-700"}`}>
                        No Profile
                      </div>
                      <div className={`text-xs mt-0.5 ${isDark ? "text-rose-200/80" : "text-rose-700/80"}`}>
                        Show initials only
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? "text-rose-200" : "text-rose-700"}`}>
                    Remove
                  </span>
                </button>
              </div>


            </div>
          </div>
        </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl p-5 ${isDark
              ? "bg-[#0b1220] border border-white/10"
              : "bg-white border border-black/10"
              }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`text-[17px] font-semibold tracking-tight ${isDark ? "text-blue-300" : "text-blue-700"
                    }`}
                  style={{ fontFamily: "'Segoe UI', Inter, system-ui" }}
                >
                  Reset Account
                </div>

                <div
                  className={`mt-3 text-[14.5px] leading-[1.7] whitespace-pre-line ${isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  Reset account? This will delete your trades, portfolio, watchlist and funds.
                  Your subscription/plan will NOT be reset.
                </div>
              </div>

              <button
                onClick={() => setShowResetConfirm(false)}
                className={`w-9 h-9 rounded-xl grid place-items-center ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"
                  } transition`}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className={`px-5 py-2 rounded-xl font-semibold transition ${isDark
                  ? "bg-white/10 hover:bg-white/15 text-white"
                  : "bg-black/5 hover:bg-black/10 text-slate-800"
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  setShowResetConfirm(false);
                  await handleResetAccount();
                }}
                className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {resetResult.open && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl p-5 ${isDark
              ? "bg-[#0b1220] border border-white/10"
              : "bg-white border border-black/10"
              }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`text-[17px] font-semibold tracking-tight ${isDark ? "text-blue-300" : "text-blue-700"
                    }`}
                  style={{ fontFamily: "'Segoe UI', Inter, system-ui" }}
                >
                  {resetResult.title}
                </div>

                <div
                  className={`mt-3 text-[14.5px] leading-[1.7] whitespace-pre-line ${isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {resetResult.message}
                </div>
              </div>

              <button
                onClick={() => setResetResult({ open: false, title: "", message: "" })}
                className={`w-9 h-9 rounded-xl grid place-items-center ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"
                  } transition`}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  setResetResult({ open: false, title: "", message: "" });
                  nav("/menu");
                }}
                className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Logout Modal */}
      {/* Logout Modal (Chart.jsx style) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl p-5 ${isDark
              ? "bg-[#0b1220] border border-white/10"
              : "bg-white border border-black/10"
              }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`text-[17px] font-semibold tracking-tight ${isDark ? "text-blue-300" : "text-blue-700"
                    }`}
                  style={{ fontFamily: "'Segoe UI', Inter, system-ui" }}
                >
                  Logout
                </div>

                <div
                  className={`mt-3 text-[14.5px] leading-[1.7] whitespace-pre-line ${isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  Are you sure you want to logout from your account?
                </div>
              </div>

              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`w-9 h-9 rounded-xl grid place-items-center ${isDark
                  ? "bg-white/10 hover:bg-white/15"
                  : "bg-black/5 hover:bg-black/10"
                  } transition`}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-5 py-2 rounded-xl font-semibold transition ${isDark
                  ? "bg-white/10 hover:bg-white/15 text-white"
                  : "bg-black/5 hover:bg-black/10 text-slate-800"
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={logout}
                className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 transition"
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
