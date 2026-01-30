import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

// ✅ Daily cache key (one check per day at 7:00 AM IST)
const SUB_CACHE_KEY = "nc_sub_cache_v1";

// ---------- IST helpers (no external libs) ----------
function getISTParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Convert an IST "wall clock" time to UTC epoch ms (IST = UTC+5:30)
function istWallToUtcMs(y, m, d, hh, mm, ss) {
  const utcAssumingIST = Date.UTC(y, m - 1, d, hh, mm, ss);
  return utcAssumingIST - (5 * 60 + 30) * 60 * 1000;
}

// Next 7:00 AM IST as epoch ms
function getNext7amISTEpochMs(now = new Date()) {
  const ist = getISTParts(now);

  const today7Utc = istWallToUtcMs(ist.year, ist.month, ist.day, 7, 0, 0);
  const nowMs = now.getTime();

  if (nowMs < today7Utc) return today7Utc;

  // next day
  const tomorrow = new Date(nowMs + 24 * 60 * 60 * 1000);
  const t = getISTParts(tomorrow);
  return istWallToUtcMs(t.year, t.month, t.day, 7, 0, 0);
}

function safeReadCache() {
  try {
    const raw = localStorage.getItem(SUB_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWriteCache(obj) {
  try {
    localStorage.setItem(SUB_CACHE_KEY, JSON.stringify(obj));
  } catch { }
}

function shouldRecheckNow(now = new Date()) {
  const c = safeReadCache();
  if (!c || typeof c.nextCheckAtMs !== "number") return true;

  const nowMs = now.getTime();

  // ✅ If subscription expired, force recheck immediately
  if (typeof c.expiresAtMs === "number" && nowMs >= c.expiresAtMs) return true;

  return nowMs >= c.nextCheckAtMs;
}

// ---------- network ----------
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
    const u = localStorage.getItem("username") || localStorage.getItem("user") || "";
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

  // prevent duplicate check calls
  const inFlightRef = useRef(false);

  useEffect(() => {
    let dead = false;

    const applyLockState = (isLocked) => {
      if (dead) return;
      setLocked(!!isLocked);

      try {
        if (isLocked) localStorage.setItem("force_payment", "1");
        else localStorage.removeItem("force_payment");
      } catch { }
    };

    const handleRedirects = (isActive, isLocked) => {
      // ✅ Locked => force to /payments from any protected page
      if (isLocked && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
        try { localStorage.setItem("payment_expired_notice", "1"); } catch { }
        nav("/payments", { replace: true });
        return true;
      }

      // ✅ Not active (edge) => keep same behavior: protected pages -> /payments
      if (!isActive && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
        nav("/payments", { replace: true });
        return true;
      }

      return false;
    };

    const runDailyCheckIfNeeded = async () => {
      // ✅ If not logged in: send to login for protected pages
      if (!userId) {
        try { localStorage.removeItem("force_payment"); } catch { }
        applyLockState(false);

        if (!allowList.has(loc.pathname)) {
          nav("/login", { replace: true, state: { from: loc.pathname } });
        }

        if (!dead) setLoading(false);
        return;
      }

      // ✅ First: try cached result (no network call on every page)
      const cache = safeReadCache();

      // If cache exists and nextCheckAtMs is in future => use cached decision
      if (cache && !shouldRecheckNow(new Date())) {
        const isActive = !!cache.isActive;
        const isLocked = !!cache.isLocked;

        applyLockState(isLocked);
        handleRedirects(isActive, isLocked);

        if (!dead) setLoading(false);
        return;
      }

      // ✅ If we should recheck (only at/after 7:00 AM IST), do ONE backend call
      if (inFlightRef.current) {
        // another tab/render is already checking; fall back to cache
        const c2 = safeReadCache();
        const isActive = !!c2?.isActive;
        const isLocked = !!c2?.isLocked;
        applyLockState(isLocked);
        handleRedirects(isActive, isLocked);
        if (!dead) setLoading(false);
        return;
      }

      inFlightRef.current = true;

      try {
        const sub = await getJSON(
          `${API}/payments/subscription/${encodeURIComponent(userId)}`
        );

        const isActive = !!sub?.active;
        const freeTrialStatus = sub?.free_trial_status || null;

        // 🔒 Locked only when NO active plan AND free trial is expired/unavailable
        const isLocked =
          !isActive &&
          (freeTrialStatus === "expired" || freeTrialStatus === "unavailable");

        // ✅ cache for the rest of the day until next 7 AM IST
        const nowMs = Date.now();
        const next7am = getNext7amISTEpochMs(new Date(nowMs));

        // backend gives seconds epoch
        const expiresAtMs =
          sub?.expires_at ? Math.floor(Number(sub.expires_at) * 1000) : null;

        // ✅ recheck at the earlier of (expiry) or (next 7 AM)
        let nextCheckAtMs = next7am;
        if (expiresAtMs && expiresAtMs > nowMs) {
          nextCheckAtMs = Math.min(next7am, expiresAtMs + 2000);
        }

        // ✅ if locked, recheck sooner (optional)
        if (isLocked) {
          nextCheckAtMs = Math.min(nextCheckAtMs, nowMs + 60 * 1000);
        }

        safeWriteCache({
          userId,
          checkedAtMs: nowMs,
          nextCheckAtMs,
          expiresAtMs,
          isActive,
          isLocked,
          freeTrialStatus,
        });


        applyLockState(isLocked);
        handleRedirects(isActive, isLocked);
      } catch {
        // ✅ If API fails: DO NOT recheck every page. Use cache if exists; else lock protected pages.
        const c = safeReadCache();
        const hasCache = !!c && c.userId === userId;

        const isActive = hasCache ? !!c.isActive : false;
        const isLocked = hasCache ? !!c.isLocked : true;

        applyLockState(isLocked);

        if (!allowList.has(loc.pathname)) {
          nav("/payments", { replace: true });
        }

        // write a nextCheckAt so we don't hammer backend on every page if it's down
        if (!hasCache) {
          const nowMs = Date.now();
          safeWriteCache({
            userId,
            checkedAtMs: nowMs,
            nextCheckAtMs: getNext7amISTEpochMs(new Date(nowMs)),
            isActive: false,
            isLocked: true,
            freeTrialStatus: null,
          });
        }
      } finally {
        inFlightRef.current = false;
        if (!dead) setLoading(false);
      }
    };

    runDailyCheckIfNeeded();

    // ✅ Schedule the NEXT daily refresh while app is open
    // This does NOT run per page; it runs once at next 7 AM IST.
    const now = new Date();
    const nextMs = getNext7amISTEpochMs(now);
    const delay = Math.max(1000, nextMs - now.getTime());

    const timer = setTimeout(() => {
      // force recheck at 7 AM IST by setting nextCheckAtMs to past
      const c = safeReadCache();
      if (c && c.userId === userId) {
        safeWriteCache({ ...c, nextCheckAtMs: Date.now() - 1000 });
      }
      // trigger check by re-running effect logic via small state update
      // (simplest: just call the function again)
      // eslint-disable-next-line no-inner-declarations
      const rerun = async () => {
        if (dead) return;
        setLoading(true);
        await runDailyCheckIfNeeded();
      };
      rerun();
    }, delay);

    return () => {
      dead = true;
      clearTimeout(timer);
    };
    // ❗ IMPORTANT:
    // We keep loc.pathname so redirects still happen,
    // but the backend call happens only if daily recheck is due.
  }, [userId, loc.pathname, nav, allowList]);

  // Prevent a flash of protected pages while redirecting
  if (loading) return null;
  if (locked && !allowList.has(loc.pathname)) return null;

  return children;
}
