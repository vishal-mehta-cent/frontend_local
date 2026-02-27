// src/utils/subscriptionDailyGate.js
const KEY = "nc_sub_gate_v1";

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

  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function getNext7amISTEpochMs(now = new Date()) {
  const ist = getISTParts(now);

  // Build "today 07:00 IST" as a UTC timestamp by converting IST -> UTC (IST is UTC+5:30)
  // We’ll compute the UTC time corresponding to IST time.
  const toUTCms = (y, m, d, hh, mm, ss) => {
    // Treat this as IST local time -> subtract 5:30 to get UTC.
    const utc = Date.UTC(y, m - 1, d, hh, mm, ss);
    return utc - (5 * 60 + 30) * 60 * 1000;
  };

  const today7UTC = toUTCms(ist.year, ist.month, ist.day, 7, 0, 0);
  const nowUTC = now.getTime();

  if (nowUTC < today7UTC) return today7UTC;

  // else next day 7 AM IST
  // naive increment day via JS Date in UTC, then convert parts again safely
  const tomorrow = new Date(nowUTC + 24 * 60 * 60 * 1000);
  const t = getISTParts(tomorrow);
  return toUTCms(t.year, t.month, t.day, 7, 0, 0);
}

export function readGate() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeGate({ allowed, checkedAtMs, nextCheckAtMs }) {
  localStorage.setItem(KEY, JSON.stringify({ allowed, checkedAtMs, nextCheckAtMs }));
}

export function shouldRecheckNow(now = new Date()) {
  const gate = readGate();
  if (!gate || typeof gate.nextCheckAtMs !== "number") return true;
  return now.getTime() >= gate.nextCheckAtMs;
}
