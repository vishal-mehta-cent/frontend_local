// frontend/src/utils/time.js

const IS_DEPLOYED = import.meta.env.PROD; // local dev = false, Vercel/Render build = true
const DISPLAY_TZ = IS_DEPLOYED ? "UTC" : "Asia/Kolkata";
const NAIVE_IS_UTC = IS_DEPLOYED;

// Parse common timestamp formats safely.
// Local: naive timestamps are treated as local/IST-style values.
// Deployed: naive timestamps are treated as UTC.
function parseAppDate(input) {
  if (!input) return null;

  const s = String(input).trim();
  if (!s) return null;

  let d;

  // Has timezone already
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
    d = new Date(s);
  } else {
    const isoLike = s.includes("T") ? s : s.replace(" ", "T");

    const m = isoLike.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
    );

    if (m) {
      const yyyy = Number(m[1]);
      const MM = Number(m[2]);
      const dd = Number(m[3]);
      const hh = Number(m[4]);
      const mm = Number(m[5]);
      const ss = Number(m[6] || 0);

      d = NAIVE_IS_UTC
        ? new Date(Date.UTC(yyyy, MM - 1, dd, hh, mm, ss))
        : new Date(yyyy, MM - 1, dd, hh, mm, ss);
    } else {
      d = new Date(s);
    }
  }

  return Number.isNaN(d.getTime()) ? null : d;
}

// Legacy name kept so existing imports do not break.
// Local  -> shows IST
// Deploy -> shows UTC
export function formatToIST(input, opts = {}) {
  const d = parseAppDate(input);
  if (!d) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    ...opts,
  }).format(d);
}

// Legacy name kept so existing imports do not break.
// Local  -> YYYY-MM-DD HH:mm:ss in IST
// Deploy -> YYYY-MM-DD HH:mm:ss in UTC
export function formatToIST_YMDHMS(input) {
  const d = parseAppDate(input);
  if (!d) return "-";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
