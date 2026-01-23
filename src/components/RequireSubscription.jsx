import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

async function getJSON(url) {
  const res = await fetch(url);
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.detail || "Request failed");
  return out;
}

export default function RequireSubscription({ children }) {
  const nav = useNavigate();
  const loc = useLocation();

  const userId = useMemo(() => {
    const u =
      localStorage.getItem("username") ||
      localStorage.getItem("user") ||
      "";
    return String(u || "").trim().toLowerCase();
  }, []);

  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  // Pages that must remain accessible even when locked
  const allowList = useMemo(
    () =>
      new Set([
        "/",
        "/landing",
        "/login",
        "/register",
        "/payments",
      ]),
    []
  );

  useEffect(() => {
    let dead = false;

    const run = async () => {
      try {
        // If not logged in: send to login for protected pages
        if (!userId) {
          try { localStorage.removeItem("force_payment"); } catch {}
          if (!allowList.has(loc.pathname)) {
            nav("/login", { replace: true, state: { from: loc.pathname } });
          }
          if (!dead) setLocked(false);
          return;
        }

        const sub = await getJSON(
          `${API}/payments/subscription/${encodeURIComponent(userId)}`
        );

        const isActive = !!sub?.active;
        const freeTrialStatus = sub?.free_trial_status || null;

        // 🔒 Locked only when NO active plan AND free trial is expired/unavailable
        const isLocked =
          !isActive &&
          (freeTrialStatus === "expired" || freeTrialStatus === "unavailable");

        if (!dead) setLocked(isLocked);

        try {
          if (isLocked) localStorage.setItem("force_payment", "1");
          else localStorage.removeItem("force_payment");
        } catch {}

        // If locked => force to /payments from ANY other page (except allowList)
        if (isLocked && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
          try { localStorage.setItem("payment_expired_notice", "1"); } catch {}
          nav("/payments", { replace: true });
          return;
        }

        // If not active but not locked (edge) => keep same behavior (send to payments for protected pages)
        if (!isActive && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
          nav("/payments", { replace: true });
          return;
        }
      } catch {
        // If API fails, safest is to gate to payments for protected pages
        if (!allowList.has(loc.pathname)) nav("/payments", { replace: true });
        if (!dead) setLocked(true);
        try { localStorage.setItem("force_payment", "1"); } catch {}
      } finally {
        if (!dead) setLoading(false);
      }
    };

    run();
    return () => {
      dead = true;
    };
  }, [userId, loc.pathname, nav, allowList]);

  // Prevent a flash of protected pages while redirecting
  if (loading) return null;
  if (locked && !allowList.has(loc.pathname)) return null;

  return children;
}
