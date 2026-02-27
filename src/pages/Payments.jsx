import React, { useState, useEffect, useMemo } from "react";
import { Check, X, Loader, Smartphone, CreditCard, Info, ArrowLeft } from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

function clearSubscriptionGateCache() {
  try {
    localStorage.removeItem("nc_sub_cache_v1"); // RequireSubscription daily cache
    localStorage.removeItem("nc_sub_gate_v1");  // optional (if used elsewhere)
  } catch { }
}


const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    trial: "3 Days Free Trial",
    desc: "Try NeuroCrest for3 Days",
    strike: null,
    period: "Only for 3 Days",
    features: [
      { text: "Full Trading App access(Interactive Charts)", included: true },
      { text: "Portfolio Performance Monitoring", included: true },
      { text: "Trade Tracer", included: true },
      { text: "Report Download", included: true },

      // ❌ force cross
      { text: "Alerts on Chart and Recommendations", included: false },
      { text: "WhatsApp/Email Alerts", included: false },
    ],

  },
  {
    id: "monthly",
    name: "Monthly",
    price: 149,
    strike: 500,
    desc: "Introductory monthly access",
    period: "Per month",
    features: [
      { text: "Full Trading App access(Interactive Charts)", included: true },
      { text: "Portfolio Performance Monitoring", included: true },
      { text: "Trade Tracer", included: true },
      { text: "Report Download", included: true },

      // ❌ force cross
      { text: "Alerts on Chart and Recommendations", included: false },
      { text: "WhatsApp/Email Alerts", included: false },
    ],
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: 399,
    strike: 1500,
    desc: "Best value for consistency",
    period: "Per quarter",
    features: [
      { text: "Full Trading App access(Interactive Charts)", included: true },
      { text: "Portfolio Performance Monitoring", included: true },
      { text: "Trade Tracer", included: true },
      { text: "Report Download", included: true },

      // ❌ force cross
      { text: "Alerts on Chart and Recommendations", included: false },
      { text: "WhatsApp/Email Alerts", included: false },
    ],
  },
  {
    id: "halfyearly",
    name: "Half-yearly",
    price: 699,
    strike: 3000,
    desc: "Great value for 6 months",
    period: "Per 6 months",
    features: [
      { text: "Full Trading App access(Interactive Charts)", included: true },
      { text: "Portfolio Performance Monitoring", included: true },
      { text: "Trade Tracer", included: true },
      { text: "Report Download", included: true },

      // ❌ force cross
      { text: "Alerts on Chart and Recommendations", included: false },
      { text: "WhatsApp/Email Alerts", included: false },
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: 999,
    strike: 6000,
    desc: "Maximum savings for long-term users",
    period: "Per year",
    features: [
      { text: "Full Trading App access(Interactive Charts)", included: true },
      { text: "Portfolio Performance Monitoring", included: true },
      { text: "Trade Tracer", included: true },
      { text: "Report Download", included: true },

      // ❌ force cross
      { text: "Alerts on Chart and Recommendations", included: false },
      { text: "WhatsApp/Email Alerts", included: false },
    ],
  },
];
const X_FEATURES = new Set([
  "Alerts on Chart and Recommendations",
  "WhatsApp/Email Alerts",
]);

// ✅ NEW: UTR help references (Images should be placed in: /public/utr/)
const UTR_HELP_APPS = [
  {
    id: "gpay",
    label: "GPay",
    title: "Google Pay (GPay)",
    img: "/utr/gpay.png",
    steps: [
      "Open Google Pay",
      "Tap on your recent payment (or go to Activity)",
      "Open the transaction details page",
      "Copy the “ UPI Transaction ID” shown there",
    ],
  },
  {
    id: "phonepe",
    label: "PhonePe",
    title: "PhonePe",
    img: "/utr/phonepe.png",
    steps: [
      "Open PhonePe",
      "Go to History / Transaction History",
      "Open the payment you made",
      "Copy the “ Transaction ID / UPI Ref No.” from details",
    ],
  },
  {
    id: "paytm",
    label: "Paytm",
    title: "Paytm",
    img: "/utr/paytm.png",
    steps: [
      "Open Paytm",
      "Go to Balance & History / Passbook / Payment History",
      "Open the payment you made",
      "Copy the “ Transaction ID” from details",
    ],
  },
];

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.detail || "Request failed");
  return out;
}

async function getJSON(url) {
  const res = await fetch(url);
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.detail || "Request failed");
  return out;
}

function makeTR() {
  const a = Date.now().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const b = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (`NC${a}${b}`).slice(0, 16);
}

export default function Payments({ username }) {
  const nav = useNavigate();
  const location = useLocation();

  const userId = useMemo(() => {
    const u =
      username ||
      localStorage.getItem("username") ||
      localStorage.getItem("user") ||
      "";
    return String(u || "").trim().toLowerCase();
  }, [username]);

  const [view, setView] = useState("PLANS");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upiQR, setUpiQR] = useState(null);
  const [tr, setTr] = useState(null);

  const [utr, setUtr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | "submitted" | "success"
  const [openedUPI, setOpenedUPI] = useState(true);


  const [sub, setSub] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const isLoggedIn = !!userId;

  // ✅ NEW: UTR help state
  const [helpApp, setHelpApp] = useState("gpay");
  const [imgOk, setImgOk] = useState({ gpay: true, phonepe: true, paytm: true });

  const safeSub = sub || {};
  const currentPlanId = safeSub.active ? safeSub.plan_id : null;
  const freeTrialStatus = safeSub.free_trial_status || null; // "active" | "expired" | "unavailable" | null

  // 🔒 Lock ONLY when there is NO active plan AND free-trial is expired/unavailable
  // (If free trial is still active, user is NOT locked.)
  const locked = useMemo(() => {
    if (!isLoggedIn) return false;
    if (subLoading) return false;
    return (
      !safeSub?.active &&
      (freeTrialStatus === "expired" || freeTrialStatus === "unavailable")
    );
  }, [isLoggedIn, subLoading, safeSub?.active, freeTrialStatus]);

  const [showLockModal, setShowLockModal] = useState(false);
  const lockTitle = "Payment required";
  const lockMessage =
    "Your plan has expired and your access is paused. Please purchase a plan to continue using NeuroCrest.";
  const lockFooter =
    "After payment confirmation, all pages will be unlocked automatically.";


  const refreshSubscription = async () => {
    if (!userId) {
      setSub(null);
      setSubLoading(false);
      return;
    }
    setSubLoading(true);
    try {
      const data = await getJSON(`${API}/payments/subscription/${encodeURIComponent(userId)}`);
      setSub(data);

      // ✅ if backend says user is active, remove daily cache so app unlocks instantly
      if (data?.active) clearSubscriptionGateCache();

    } catch (e) {
      console.error("subscription error:", e?.message);
      setSub(null);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  // 🔒 When locked, force user to stay on /payments and block browser-back.
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.removeItem("force_payment");
      return;
    }

    if (!locked) {
      localStorage.removeItem("force_payment");
      return;
    }

    localStorage.setItem("force_payment", "1");

    // If user somehow comes on another path, redirect to /payments
    if (location?.pathname && location.pathname !== "/payments") {
      nav("/payments", { replace: true });
    }

    // Trap browser back: push a state, and when back is pressed, re-push + show popup
    try {
      window.history.pushState({ paymentLock: true }, "", window.location.href);
    } catch { }

    const onPopState = () => {
      setShowLockModal(true);
      try {
        window.history.pushState({ paymentLock: true }, "", window.location.href);
      } catch { }
      if (location?.pathname && location.pathname !== "/payments") {
        nav("/payments", { replace: true });
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isLoggedIn, locked, location?.pathname, nav]);


  // If we arrived here due to an auto-redirect, show the popup once
  useEffect(() => {
    if (!locked) return;
    const flag = localStorage.getItem("payment_expired_notice");
    if (flag === "1") {
      localStorage.removeItem("payment_expired_notice");
      setShowLockModal(true);
    }
  }, [locked]);


  useEffect(() => {
    if (userId) localStorage.setItem("username", userId);
  }, [userId]);

  const queuedPlanIds = useMemo(() => {
    const ids = new Set();
    const arr = Array.isArray(safeSub.queued) ? safeSub.queued : [];
    for (const p of arr) ids.add(p.plan_id);
    return ids;
  }, [safeSub.queued]);

  const upcomingPlanId = safeSub?.upcoming?.plan_id || null;

  const plansWithStatus = useMemo(() => {
    return PLANS.map((p) => ({
      ...p,
      current: currentPlanId === p.id,
      isQueued: queuedPlanIds.has(p.id) && currentPlanId !== p.id,
    }));
  }, [currentPlanId, queuedPlanIds]);

  // ✅ Always show FREE card; show status as "Your current plan" or "Expired"
  const visiblePlans = useMemo(() => {
    return plansWithStatus;
  }, [plansWithStatus]);

  // Poll status (ONLY becomes success after user verifies with UTR)
  useEffect(() => {
    if (!tr) return;

    const timer = setInterval(async () => {
      try {
        const data = await getJSON(`${API}/payments/upi/status/${tr}`);
        if (data.status === "success") {
          setSuccess(true);
          setPaymentStatus("success");
          clearInterval(timer);
          await refreshSubscription();

          // ✅ unlock + go to menu
          localStorage.removeItem("force_payment");
                
          window.location.replace("/menu");

        }

      } catch { }
    }, 2500);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tr]);

  const startPayment = async (plan) => {
    if (!userId) {
      alert("Username not found. Please login again.");
      return;
    }

    if (currentPlanId === plan.id) return;
    if (queuedPlanIds.has(plan.id)) return;

    setSelectedPlan(plan);
    setView("QR");
    setSuccess(false);
    setUpiQR(null);
    setUtr("");
    setVerifying(false);
    setPaymentStatus(null);
   setOpenedUPI(true);


    // ✅ reset help defaults for new payment screen
    setHelpApp("gpay");
    setImgOk({ gpay: true, phonepe: true, paytm: true });

    const transactionRef = makeTR();
    setTr(transactionRef);

    const data = await postJSON(`${API}/payments/upi/init`, {
      user_id: userId,
      pa: "neurocrest.app@oksbi",
      pn: "NEUROCREST",
      amount_inr: plan.price,
      tr: transactionRef,
      tn: `NeuroCrest ${plan.name} Plan`,
      plan_id: plan.id,
    });

    setUpiQR(data);
  };

  const verifyWithUTR = async () => {
    if (!tr) return;

    const u = String(utr || "").trim();

    const isUpiTxn = /^\d{10,18}$/.test(u);
    const isAppTxn = /^(?=.*\d)[A-Za-z0-9]{8,25}$/.test(u);

    if (!isUpiTxn && !isAppTxn) {
      alert("Invalid UTR. Enter UPI Transaction ID (10-18 digits) or App Transaction ID (8-25 alphanumeric with at least 1 number).");
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch(`${API}/payments/upi/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tr, utr: u }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.detail || "Payment verification failed");
        return;
      }

      setPaymentStatus(data.status || null);

      if (data.status === "success") {
        alert("Payment confirmed ✅");
        setSuccess(true);
        await refreshSubscription();

        // ✅ unlock + go to menu
        localStorage.removeItem("force_payment");
        clearSubscriptionGateCache();
        window.location.replace("/menu");

        return;
      }


      if (data.status === "submitted") {
        alert("UTR submitted ✅. (If AUTO_CONFIRM_UPI=false, it may stay submitted)");
        return;
      }

      alert("Unexpected response: " + JSON.stringify(data));
    } catch (e) {
      alert(e?.message || "Network error");
    } finally {
      setVerifying(false);
    }
  };

 const handleBack = () => {
  if (locked) {
    setShowLockModal(true);
    return;
  }

  if (view === "QR") {
    setView("PLANS");
    setSelectedPlan(null);
    setUpiQR(null);
    setTr(null);
    setUtr("");
    setVerifying(false);
    setSuccess(false);
    setPaymentStatus(null);
    setOpenedUPI(false);
    setHelpApp("gpay");
    setImgOk({ gpay: true, phonepe: true, paytm: true });
    return;
  }
   clearSubscriptionGateCache();
localStorage.removeItem("force_payment");
  // ✅ Universal safe back: always go to menu
  nav("/menu", { replace: true });
};


  const primaryBtn =
    "w-full py-3 rounded-xl font-semibold text-white " +
    "bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 " +
    "hover:from-sky-400 hover:via-cyan-300 hover:to-sky-400 " +
    "shadow-[0_10px_30px_rgba(34,211,238,0.45)] " +
    "hover:shadow-[0_15px_40px_rgba(34,211,238,0.6)] " +
    "active:scale-[0.98] transition-all";

  const disabledBtn =
    "w-full py-3 rounded-xl font-semibold text-white/70 " +
    "bg-white/20 cursor-not-allowed";

  return (
    <>
      <div className="min-h-screen text-white bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#020617] px-2 sm:px-4 py-10">
        <div className="w-full max-w-none mx-auto">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-medium text-white bg-black/40 hover:bg-black/60 px-3 py-2 rounded-xl border border-white/20 shadow-lg backdrop-blur-md transition"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          {view === "PLANS" && (
            <>
              {!isLoggedIn && (
                <div className="text-center mt-5 mb-6">
                  <p className="text-sm text-slate-300 mb-3">
                    Create your account to start your free trial and activate a plan.
                  </p>

                  <button
                    onClick={() => {
                      localStorage.setItem("post_login_redirect", "/payments");
                      nav("/login");
                    }}
                    className="px-10 py-3 rounded-full font-bold text-black bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]
                 hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    Get Started
                  </button>
                </div>
              )}

              <h1 className="text-3xl font-bold text-center mb-2">Upgrade your plan</h1>
              <div className="text-center text-xs sm:text-sm text-amber-200/90 mt-2 mb-4">
                <span className="font-semibold">All payments are  non-refundable.</span>{" "}
              </div>

              <div className="text-center text-sm text-slate-300 mb-2">
                {subLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading your current plan...
                  </span>
                ) : safeSub?.active ? (
                  <span>
                    Current plan: <b className="text-cyan-200">{safeSub.plan_id}</b>{" "}
                    (expires in <b className="text-cyan-200">{safeSub.time_left_label || `${safeSub.days_left} days`}</b>)
                  </span>
                ) : (
                  <span>No active plan.</span>
                )}
              </div>

              {!subLoading && upcomingPlanId ? (
                <div className="text-center text-xs text-slate-300 mb-8">
                  Next plan: <b className="text-cyan-200">{safeSub.upcoming.plan_id}</b>{" "}
                  (starts in <b className="text-cyan-200">{safeSub.upcoming.starts_in_days}</b> days)
                </div>
              ) : (
                <div className="mb-8" />
              )}

              <div className="flex gap-6 overflow-x-auto overflow-y-visible pb-6 pt-8 flex-nowrap px-2">
                {visiblePlans.map((plan) => {
                  const isCurrent = plan.current;
                  const isQueued = plan.isQueued;
                  const disabled = isCurrent || isQueued || (plan.id === "free");

                  const isExpiredFree = plan.id === "free" && (freeTrialStatus === "expired" || freeTrialStatus === "unavailable");

                  const saveAmt = plan.strike ? (plan.strike - plan.price) : 0;
                  const offPct = plan.strike ? Math.round((saveAmt / plan.strike) * 100) : 0;

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl p-6 flex flex-col
                      bg-white/10 backdrop-blur-2xl
                      border border-white/20
                      shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                      transition-all duration-300
                      hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)]
                      ${isCurrent ? "ring-2 ring-cyan-400/60 shadow-cyan-500/30" : "hover:ring-1 hover:ring-white/30"}
                    `}
                      style={{ width: 340, minWidth: 340 }}
                    >
                      {plan.trial && (
                        <div className="absolute top-3 left-6 z-20">
                          <span className="whitespace-nowrap px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-black">
                            {plan.trial}
                          </span>
                        </div>
                      )}

                      {isQueued && (
                        <div className="absolute top-3 right-6 z-20">
                          <span className="whitespace-nowrap px-3 py-1 text-xs font-semibold rounded-full bg-amber-300/20 border border-amber-300/40 text-amber-200">
                            Queued
                          </span>
                        </div>
                      )}

                      <div className="pt-6">
                        <h2 className="text-xl font-semibold mb-1">{plan.name}</h2>
                        <p className="text-sm text-slate-300 mb-4">{plan.desc}</p>

                        <div className="flex items-end gap-3 mb-1">
                          <div className="text-4xl font-extrabold tracking-tight">
                            ₹{plan.price.toLocaleString("en-IN")}
                          </div>
                          {plan.strike ? (
                            <div className="text-sm text-slate-300 line-through pb-1">
                              ₹{plan.strike.toLocaleString("en-IN")}
                            </div>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-300 mb-6">
                          {plan.period} <span className="opacity-70">(inclusive of GST)</span>
                        </p>

                        <button
                          disabled={!isLoggedIn || disabled}
                          onClick={() => {
                            if (!isLoggedIn) return;
                            startPayment(plan);
                          }}
                          className={`mb-6 ${(!isLoggedIn || disabled) ? disabledBtn : primaryBtn}`}
                        >
                          {!isLoggedIn
                            ? "Login to choose plan"
                            : isCurrent
                              ? "Your current plan"
                              : isExpiredFree
                                ? "Expired"
                                : isQueued
                                  ? "Queued"
                                  : `Get ${plan.name}`}
                        </button>

                        <ul className="space-y-3 text-sm text-slate-200">
                          {plan.features.map((f, i) => {
                            const text = typeof f === "string" ? f : (f?.text || "");

                            // ✅ if string: show ❌ only when text is in X_FEATURES
                            // ✅ if object: use included true/false
                            const included =
                              typeof f === "string" ? !X_FEATURES.has(text) : !!f?.included;

                            return (
                              <li key={i} className="flex gap-2">
                                {included ? (
                                  <Check className="w-4 h-4 text-green-400 mt-0.5" />
                                ) : (
                                  <X className="w-4 h-4 text-red-400 mt-0.5" />
                                )}
                                <span>{text}</span>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3">
                          <div className="text-xs font-extrabold text-amber-200 flex items-center gap-2">
                            <span>⚠️</span> Important
                          </div>

                          <div className="mt-1 text-xs text-slate-200/85 leading-relaxed">
                            To activate alerts &amp; recommendations contact support:{" "}
                            <a
                              href="tel:9426001601"
                              className="underline text-cyan-200 hover:text-cyan-100"
                            >
                              9426001601
                            </a>
                            {" "}and email:{" "}
                            <a
                              href="mailto:neurocrest.app@gmail.com"
                              className="underline text-cyan-200 hover:text-cyan-100"
                            >
                              neurocrest.app@gmail.com
                            </a>
                          </div>
                        </div>



                        {plan.id !== "free" && (
                          <>
                            <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-3">
                              <div className="text-xs font-semibold text-slate-100">
                                Upcoming features (Coming soon)
                              </div>
                              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                <li className="flex gap-2">
                                  <Check className="w-3.5 h-3.5 text-green-400 mt-0.5" />
                                  On Demand Script Insights(chat Bot)
                                </li>
                                <li className="flex gap-2">
                                  <Check className="w-3.5 h-3.5 text-green-400 mt-0.5" />
                                  IPO Tracking/Intelligence
                                </li>
                                <li className="flex gap-2">
                                  <Check className="w-3.5 h-3.5 text-green-400 mt-0.5" />
                                  Event based Alerts
                                </li>
                              </ul>
                            </div>

                            <div className="mt-4 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/12 via-white/6 to-transparent p-4 nc-shimmer">
                              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-400/25 blur-3xl" />

                              <div className="absolute top-0 right-0">
                                <div className="absolute -right-10 top-4 rotate-45">
                                  <div className="px-6 py-1 text-[10px] font-extrabold tracking-widest uppercase
                      bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 text-black
                      shadow-[0_12px_25px_rgba(251,191,36,0.25)]">
                                    Limited
                                  </div>
                                </div>
                              </div>

                              <div className="relative flex items-start gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center
                    shadow-[0_12px_25px_rgba(251,191,36,0.25)]">
                                  <span className="text-black text-lg">⚡</span>
                                </div>

                                <div className="flex-1">
                                  <div className="text-sm font-extrabold text-amber-200">
                                    Introductory Offer
                                  </div>

                                  <div className="mt-1 text-xs text-slate-200/80">
                                    Early user pricing — grab it before it ends.
                                  </div>

                                  {plan.strike ? (
                                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full relative overflow-hidden
                        bg-gradient-to-r from-amber-300/20 via-orange-300/15 to-amber-300/20
                        border border-amber-300/35 text-amber-200 shadow-[0_10px_25px_rgba(251,191,36,0.12)]">
                                      <span className="text-[11px] font-extrabold">
                                        SAVE ₹{saveAmt.toLocaleString("en-IN")}
                                      </span>
                                      <span className="w-1 h-1 rounded-full bg-amber-300/70" />
                                      <span className="text-[11px] font-extrabold">
                                        {offPct}% OFF
                                      </span>

                                      <span className="absolute -inset-y-6 -left-10 w-16 rotate-12 bg-white/15 blur-md animate-[nc-shimmer_2.6s_ease-in-out_infinite]" />
                                    </div>
                                  ) : null}

                                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300/70" />
                                      Price may increase later.
                                    </div>
                                    {plan.strike ? (
                                      <div className="text-slate-400">
                                        MRP ₹{plan.strike.toLocaleString("en-IN")}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 h-[1px] w-full bg-gradient-to-r from-transparent via-amber-300/35 to-transparent" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 max-w-[1700px] mx-auto">
                <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
                  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-400/15 blur-3xl" />

                  <div className="absolute top-0 right-0">
                    <div className="absolute -right-12 top-6 rotate-45">
                      <div className="px-10 py-1 text-[10px] font-extrabold tracking-widest uppercase
                        bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 text-black
                        shadow-[0_12px_25px_rgba(251,191,36,0.25)]">
                        Premium Offer
                      </div>
                    </div>
                  </div>

                  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Info className="w-6 h-6 text-cyan-300" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-extrabold">
                          Want advanced access?
                        </h3>
                        <p className="text-sm text-slate-200/85 mt-1">
                          Upgrade to premium offerings — real-time alerts, recommendations, and custom algo support.
                        </p>
                      </div>
                    </div>

                    <div className="relative flex flex-wrap gap-3">
                      <a
                        href="tel:9426001601"
                        className="px-5 py-2.5 rounded-xl font-bold text-black
                     bg-gradient-to-r from-[#22d3ee] to-[#1ea7ff]
                     hover:scale-[1.02] transition shadow-[0_12px_30px_rgba(34,211,238,0.25)]"
                      >
                        Call: 9426001601
                      </a>

                      <a
                        href="https://wa.me/919426001601"
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 rounded-xl font-bold text-black
                     bg-gradient-to-r from-[#22c55e] to-[#86efac]
                     hover:scale-[1.02] transition shadow-[0_12px_30px_rgba(34,197,94,0.25)]"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="relative mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-500 flex items-center justify-center">
                          <span className="text-black text-lg">📈</span>
                        </div>
                        <div className="font-bold text-slate-100">Chart Alerts</div>
                      </div>
                      <div className="text-sm text-slate-200/80 mt-2 leading-relaxed">
                        AI/Algo generated real-time alerts directly on the chart.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center">
                          <span className="text-black text-lg">🧠</span>
                        </div>
                        <div className="font-bold text-slate-100">Recommendations</div>
                      </div>
                      <div className="text-sm text-slate-200/80 mt-2 leading-relaxed">
                        Intraday, BTST & short-term calls based on researched quant strategies.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-300 to-green-500 flex items-center justify-center">
                          <span className="text-black text-lg">💬</span>
                        </div>
                        <div className="font-bold text-slate-100">WhatsApp Alerts</div>
                      </div>
                      <div className="text-sm text-slate-200/80 mt-2 leading-relaxed">
                        Real-time WhatsApp alerts for recommendations / chart alerts.
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                      <div className="text-sm font-extrabold text-amber-200 flex items-center gap-2">
                        <span>⚠️</span> Important disclaimer
                      </div>
                      <p className="text-xs text-slate-200/80 mt-2 leading-relaxed">
                        Please note that we are not a SEBI registered organization yet. We do not share insider tips and we do not speculate.
                        Any insights/recommendations are based on researched strategies and advanced technical analysis.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                      <div className="text-sm font-extrabold text-cyan-200 flex items-center gap-2">
                        <span>⚙️</span> Convert your strategy into an Algo
                      </div>
                      <p className="text-xs text-slate-200/80 mt-2 leading-relaxed">
                        Want your strategy automated with real-time alerts just for you?
                        Ad-hoc development and enabling alerts/recommendations is priced separately.
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-4 text-[11px] text-slate-300">
                    *Pricing for advanced alerts/recommendations and any custom development is separate from these introductory plans.
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "QR" && selectedPlan && (
            <div className="max-w-xl mx-auto mt-10">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <CreditCard className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                  <h2 className="text-2xl font-bold">{selectedPlan.name} Plan Payment</h2>
                  <p className="text-slate-300">₹{selectedPlan.price.toLocaleString("en-IN")}</p>
                </div>

                {upiQR && !success && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl">
                      <img src={`data:image/png;base64,${upiQR.qr_b64}`} alt="UPI QR" className="w-64 h-64" />
                    </div>

                    

                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Loader className="w-4 h-4 animate-spin" />
                      Waiting for payment confirmation...
                    </div>

                    <div className="w-full mt-4 bg-white/5 border border-white/15 rounded-2xl p-4">
                      <div className="text-sm font-semibold mb-2">After payment, Enter UPI Transaction ID</div>

                      <input
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="UTR / Reference (letters/numbers)"
                        className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/20 outline-none text-white placeholder:text-white/40"
                      />

                      <button
                        onClick={verifyWithUTR}
                        disabled={!openedUPI || verifying || paymentStatus === "submitted" || success}
                        className={`mt-3 ${(!openedUPI || verifying || paymentStatus === "submitted" || success) ? disabledBtn : primaryBtn}`}
                      >
                        {!openedUPI
                          ? "Open UPI App first"
                          : verifying
                            ? "Verifying..."
                            : paymentStatus === "submitted"
                              ? "Submitted"
                              : "Verify Payment"}
                      </button>

                      {paymentStatus === "submitted" && (
                        <div className="text-xs text-amber-200 mt-2">
                          UTR submitted. Waiting for verification…
                        </div>
                      )}

                      <div className="text-xs text-slate-400 mt-2">
                        QR will disappear only after verification
                      </div>
                    </div>

                    {/* ✅ NEW: How to find Transaction ID section (GPay / PhonePe / Paytm) */}
                    <div className="w-full mt-4 bg-white/5 border border-white/15 rounded-2xl p-4">
                      <div className="text-sm font-semibold mb-2">
                        How to find Transaction ID (UTR) after payment
                      </div>

                      <div className="text-xs text-slate-300 mb-3 leading-relaxed">
                        Different UPI apps show UTR / Transaction ID at different places. Select your app below and follow the guide.
                      </div>

                      <div className="flex gap-2 flex-wrap mb-4">
                        {UTR_HELP_APPS.map((a) => {
                          const active = helpApp === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setHelpApp(a.id)}
                              className={
                                "px-3 py-2 rounded-xl text-xs font-bold border transition " +
                                (active
                                  ? "bg-cyan-300/20 border-cyan-200/40 text-cyan-100"
                                  : "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10")
                              }
                            >
                              {a.label}
                            </button>
                          );
                        })}
                      </div>

                      {UTR_HELP_APPS.map((a) => {
                        if (a.id !== helpApp) return null;

                        return (
                          <div key={a.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-sm font-bold text-slate-100 mb-2">
                              {a.title}
                            </div>

                            <ol className="list-decimal ml-5 text-xs text-slate-200/90 space-y-1">
                              {a.steps.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ol>

                            <div className="mt-3">
                              {imgOk[a.id] ? (
                                <img
                                  src={a.img}
                                  alt={`${a.title} Transaction ID guide`}
                                  className="w-full rounded-xl border border-white/10 bg-white/5"
                                  onError={() => setImgOk((p) => ({ ...p, [a.id]: false }))}
                                />
                              ) : (
                                <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
                                  <div className="text-xs font-extrabold text-amber-200 mb-1">Image not found</div>
                                  <div className="text-xs text-slate-200/80 leading-relaxed">
                                    Please add the image file here:{" "}
                                    <span className="font-semibold text-cyan-200">{a.img}</span>
                                    <br />
                                    Example: create folder <span className="font-semibold">public/utr</span> and put
                                    <span className="font-semibold"> {a.id}.png</span> inside it (as shown above).
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 text-[11px] text-slate-300">
                              Tip: Sometimes apps label it as <b>UTR</b>, <b>UPI Transaction ID</b>, <b>Reference ID</b>, or <b>RRN</b>.
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {success && (
                  <div className="text-center mt-6">
                    <h3 className="text-3xl font-bold text-green-400">Payment Successful 🎉</h3>
                    <p className="text-slate-300 mt-2">Plan has been added to your schedule.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔒 Payment lock modal */}
      {showLockModal ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl">
            <div className="text-lg font-bold text-white">{lockTitle}</div>
            <div className="mt-2 text-sm text-slate-200 leading-relaxed">{lockMessage}</div>
            <div className="mt-3 text-xs text-slate-300">{lockFooter}</div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/15 transition"
              >
                Stay on Payments
              </button>

              <a
                href="tel:9426001601"
                className="flex-1 text-center py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] to-[#22c55e] text-black hover:opacity-90 transition"
              >
                Call Support
              </a>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
}
