// src/context/SubscriptionGate.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getNext7amISTEpochMs, readGate, shouldRecheckNow, writeGate } from "../utils/subscriptionDailyGate";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

const Ctx = createContext(null);

export function useSubscriptionGate() {
  return useContext(Ctx);
}

export default function SubscriptionGateProvider({ username, children }) {
  const [allowed, setAllowed] = useState(() => {
    const gate = readGate();
    return gate?.allowed ?? null; // null = unknown until checked
  });

  async function runCheck() {
    // ✅ call your existing backend endpoint used by RequireSubscription
    // Replace this URL with whatever you use currently
    const res = await fetch(`${API}/payments/subscription-status?username=${encodeURIComponent(username)}`);
    const data = await res.json();

    const isAllowed = !!data?.active; // adapt to your actual response shape
    const nowMs = Date.now();
    const nextMs = getNext7amISTEpochMs(new Date(nowMs));

    writeGate({ allowed: isAllowed, checkedAtMs: nowMs, nextCheckAtMs: nextMs });
    setAllowed(isAllowed);
  }

  useEffect(() => {
    if (!username) return;

    const now = new Date();

    // ✅ Only check if we crossed daily boundary (>= nextCheckAtMs)
    if (shouldRecheckNow(now)) {
      runCheck().catch(() => {
        // If backend fails, keep previous cached value (or null if none)
        const gate = readGate();
        setAllowed(gate?.allowed ?? null);
      });
    } else {
      const gate = readGate();
      setAllowed(gate?.allowed ?? null);
    }

    // ✅ schedule next auto-check at 7 AM IST
    const nextMs = getNext7amISTEpochMs(now);
    const delay = Math.max(1000, nextMs - now.getTime());

    const t = setTimeout(() => {
      runCheck().catch(() => {});
    }, delay);

    return () => clearTimeout(t);
  }, [username]);

  const value = useMemo(() => ({ allowed, refreshNow: runCheck }), [allowed]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
