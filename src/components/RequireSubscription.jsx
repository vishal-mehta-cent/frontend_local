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
  const [active, setActive] = useState(false);

  // pages that must remain accessible
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
          if (!allowList.has(loc.pathname)) {
            nav("/login", { replace: true, state: { from: loc.pathname } });
          }
          if (!dead) setActive(false);
          return;
        }

        const sub = await getJSON(
          `${API}/payments/subscription/${encodeURIComponent(userId)}`
        );

        const isActive = !!sub?.active;

        if (!dead) setActive(isActive);

        // If no active plan => force to /payments from ANY other page
        if (!isActive && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
          nav("/payments", { replace: true });
        }
      } catch {
        // if API fails, safest is to gate to payments
        if (!allowList.has(loc.pathname)) nav("/payments", { replace: true });
        if (!dead) setActive(false);
      } finally {
        if (!dead) setLoading(false);
      }
    };

    run();
    return () => {
      dead = true;
    };
  }, [userId, loc.pathname, nav, allowList]);

  if (loading) return null; // or your loader UI
  return children;
}
