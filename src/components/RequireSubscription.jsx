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
  } catch {}
}

function shouldRecheckNow(now = new Date()) {
  const c = safeReadCache();
  if (!c || typeof c.nextCheckAtMs !== "number") return true;
  return now.getTime() >= c.nextCheckAtMs;
}

// ---------- network ----------
async function getJSON(url, signal) {
  const res = await fetch(url, { signal });
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.detail || "Request failed");
  return out;
}

// Read userId safely
function readUserId() {
  return String(localStorage.getItem("username") || localStorage.getItem("user") || "")
    .trim()
    .toLowerCase();
}

export default function RequireSubscription({ children }) {
  const nav = useNavigate();
  const loc = useLocation();

  // ✅ Always read latest userId on route change (works in same tab too)
  const userId = useMemo(() => readUserId(), [loc.pathname]);

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

  // Prevent out-of-order async updates
  const runIdRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const myRunId = ++runIdRef.current;

    const controller = new AbortController();
    const signal = controller.signal;

    const applyLockState = (isLocked) => {
      if (!alive) return;
      if (myRunId !== runIdRef.current) return;

      setLocked(!!isLocked);

      try {
        if (isLocked) localStorage.setItem("force_payment", "1");
        else localStorage.removeItem("force_payment");
      } catch {}
    };

    const handleRedirects = (isActive, isLocked) => {
      // ✅ Locked => force to /payments from any protected page
      if (isLocked && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
        try { localStorage.setItem("payment_expired_notice", "1"); } catch {}
        nav("/payments", { replace: true });
        return true;
      }

      // ✅ Not active => protected pages -> /payments
      if (!isActive && loc.pathname !== "/payments" && !allowList.has(loc.pathname)) {
        nav("/payments", { replace: true });
        return true;
      }

      return false;
    };

    const runDailyCheckIfNeeded = async () => {
      // Always start in loading on every route change
      if (!alive || myRunId !== runIdRef.current) return;
      setLoading(true);

      // ✅ If not logged in: unlock and send to login for protected pages
      if (!userId) {
        try { localStorage.removeItem("force_payment"); } catch {}
        applyLockState(false);

        if (!allowList.has(loc.pathname)) {
          nav("/login", { replace: true, state: { from: loc.pathname } });
        }

        if (alive && myRunId === runIdRef.current) setLoading(false);
        return;
      }

      // ✅ 1) Use cache if valid + not time to recheck
      const cache = safeReadCache();
      const cacheOk = !!cache && cache.userId === userId;

      if (cacheOk && !shouldRecheckNow(new Date())) {
        const isActive = !!cache.isActive || cache.freeTrialStatus === "active";
        const isLocked = !!cache.isLocked;

        applyLockState(isLocked);
        handleRedirects(isActive, isLocked);

        if (alive && myRunId === runIdRef.current) setLoading(false);
        return;
      }

      // ✅ 2) Otherwise fetch backend (abortable)
      try {
        const sub = await getJSON(
          `${API}/payments/subscription/${encodeURIComponent(userId)}`,
          signal
        );

        const freeTrialStatus = sub?.free_trial_status || null;

        // ✅ Treat FREE TRIAL ACTIVE as ACTIVE access
        const isActive = !!sub?.active || freeTrialStatus === "active";

        // 🔒 Locked only when NO active plan AND free trial expired/unavailable
        const isLocked =
          !isActive &&
          (freeTrialStatus === "expired" || freeTrialStatus === "unavailable");

        const nowMs = Date.now();
        const nextCheckAtMs = isLocked
          ? nowMs + 60 * 1000
          : getNext7amISTEpochMs(new Date(nowMs));

        safeWriteCache({
          userId,
          checkedAtMs: nowMs,
          nextCheckAtMs,
          isActive,
          isLocked,
          freeTrialStatus,
        });

        applyLockState(isLocked);
        handleRedirects(isActive, isLocked);
      } catch (e) {
        // If aborted due to route change, just exit (new effect will run)
        if (e?.name === "AbortError") return;

        // ✅ On failure: use cache if valid; else lock protected pages temporarily
        const c = safeReadCache();
        const ok = !!c && c.userId === userId;

        if (ok) {
          const isActive = !!c.isActive || c.freeTrialStatus === "active";
          const isLocked = !!c.isLocked;
          applyLockState(isLocked);
          handleRedirects(isActive, isLocked);
        } else {
          const nowMs = Date.now();
          safeWriteCache({
            userId,
            checkedAtMs: nowMs,
            nextCheckAtMs: nowMs + 60 * 1000, // retry in 60s
            isActive: false,
            isLocked: true,
            freeTrialStatus: null,
          });

          applyLockState(true);

          if (!allowList.has(loc.pathname)) {
            nav("/payments", { replace: true });
          }
        }
      } finally {
        if (alive && myRunId === runIdRef.current) setLoading(false);
      }
    };

    runDailyCheckIfNeeded();

    // ✅ Schedule next refresh at 7 AM IST while app is open
    const nextMs = getNext7amISTEpochMs(new Date());
    const delay = Math.max(1000, nextMs - Date.now());

    const timer = setTimeout(() => {
      const c = safeReadCache();
      if (c && c.userId === userId) {
        safeWriteCache({ ...c, nextCheckAtMs: Date.now() - 1000 });
      }
      runDailyCheckIfNeeded();
    }, delay);

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [userId, loc.pathname, nav, allowList]);

  // ✅ Better UX than blank (optional)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (locked && !allowList.has(loc.pathname)) return null;

  return children;
}
