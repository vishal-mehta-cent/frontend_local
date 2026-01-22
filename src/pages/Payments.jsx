import React, { useState, useEffect, useMemo } from "react";
import { Check, Loader, Smartphone, CreditCard, Info, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

const PLANS = [
  { id: "free", name: "Free", price: 0, trial: "3 Days Free Trial", desc: "Try NeuroCrest for 3 days", strike: null, period: "Only for 3 days", features: ["Trading App (Watchlist, Orders, Portfolio, History + Real-time charts & tracking)"] },
  { id: "monthly", name: "Monthly", price: 1, strike: 500, desc: "Introductory monthly access", period: "Per month", features: ["Trading App (Watchlist, Orders, Portfolio, History + Real-time charts & tracking)"] },
  { id: "quarterly", name: "Quarterly", price: 399, strike: 1500, desc: "Best value for consistency", period: "Per quarter", features: ["Trading App (Watchlist, Orders, Portfolio, History + Real-time charts & tracking)"] },
  { id: "halfyearly", name: "Half-yearly", price: 699, strike: 3000, desc: "Great value for 6 months", period: "Per 6 months", features: ["Trading App (Watchlist, Orders, Portfolio, History + Real-time charts & tracking)"] },
  { id: "annual", name: "Annual", price: 999, strike: 6000, desc: "Maximum savings for long-term users", period: "Per year", features: ["Trading App (Watchlist, Orders, Portfolio, History + Real-time charts & tracking)"] },
];

async function postJSON(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
  const [openedUPI, setOpenedUPI] = useState(false);

  const [sub, setSub] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const isLoggedIn = !!userId;

  const safeSub = sub || {};
  const currentPlanId = safeSub.active ? safeSub.plan_id : null;
  const freeTrialStatus = safeSub.free_trial_status || null; // ✅ from backend

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

  // ✅ Hide FREE card after trial expired/unavailable. Paid plans always visible.
  const visiblePlans = useMemo(() => {
    return plansWithStatus.filter((p) => {
      if (p.id !== "free") return true;
      return !(freeTrialStatus === "expired" || freeTrialStatus === "unavailable");
    });
  }, [plansWithStatus, freeTrialStatus]);

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

          setTimeout(() => {
            setView("PLANS");
            setSelectedPlan(null);
            setUpiQR(null);
            setTr(null);
            setUtr("");
            setVerifying(false);
            setSuccess(false);
            setPaymentStatus(null);
            setOpenedUPI(false);
          }, 1200);
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
    setOpenedUPI(false);

    const transactionRef = makeTR();
    setTr(transactionRef);

    const data = await postJSON(`${API}/payments/upi/init`, {
      user_id: userId,
      pa: "9426817879.etb@icici",
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
      return;
    }
    if (window.history.length > 1) nav(-1);
    else nav("/menu");
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
  <span className="font-semibold">All payments are final and non-refundable.</span>{" "}
 
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
                  (expires in <b className="text-cyan-200">{safeSub.days_left}</b> days)
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
                const disabled = isCurrent || isQueued;

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
                            : isQueued
                              ? "Queued"
                              : `Get ${plan.name}`}
                      </button>

                      <ul className="space-y-3 text-sm text-slate-200">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <Check className="w-4 h-4 text-green-400 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {plan.id !== "free" && (
                        <>
                          <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-3">
                            <div className="text-xs font-semibold text-slate-100">
                              Upcoming features (Coming soon)
                            </div>
                            <div className="text-xs text-slate-300 mt-1">
                              Event based Alerts (News / Bulk deals etc.) • IPO Tracking • Portfolio Intelligence
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
                            <div className="text-xs font-semibold text-amber-200">
                              Introductory offer
                            </div>
                            <div className="text-xs text-amber-100/90 mt-1">
                              These are introductory offers only — grab it before they are gone.
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)] max-w-[1700px] mx-auto">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Info className="w-5 h-5 text-cyan-300" />
                </div>

                <div>
                  <h3 className="text-lg font-bold">Want advanced access?</h3>
                  <p className="text-sm text-slate-200 mt-1">
                    If you want access to our premium offerings, please contact us for:
                  </p>

                  <ul className="mt-4 space-y-2 text-sm text-slate-200">
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5" />
                      AI/Algo generated real-time alerts directly on the chart
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5" />
                      Trading recommendations for Intraday, BTST and Short-term trading based on highly researched quant strategies
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5" />
                      Real-time WhatsApp alerts for recommendations / chart alerts on your WhatsApp
                    </li>
                  </ul>

                  <div className="mt-5 text-sm text-slate-200">
                    <span className="font-semibold text-slate-100">
                      Please contact us:
                    </span>{" "}
                    <span className="text-cyan-200 font-semibold">
                      (9426817879)
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-slate-100">
                      Important disclaimer
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Please note that we are not a SEBI registered organization yet. We do not share any insider tips and we do not speculate.
                      Any insights/recommendations are purely based on our researched strategies and advanced technical analysis.
                      If you are curious and excited to learn trading for educational purposes, please reach out.
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-slate-100">
                      Want to convert your own strategy into an Algo?
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      If you want to convert your own strategy into an Algo and receive real-time alerts just for yourself, please contact us.
                      Costing for any ad-hoc development and enabling Alerts/Recommendations would be separate.
                    </p>
                  </div>

                  <div className="mt-3 text-xs text-slate-300">
                    *Please note: pricing for advanced alerts/recommendations and any custom development is separate from these introductory plans.
                  </div>
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

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (tr) {
                          await fetch(`${API}/payments/upi/opened`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tr }),
                          });
                        }
                      } catch { }
                      setOpenedUPI(true);
                      window.location.href = upiQR.upi_uri;
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-black font-semibold"
                  >
                    <Smartphone className="w-4 h-4" />
                    Click Here and Then Scan QR and fill Transaction ID
                  </button>

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
  );
}
