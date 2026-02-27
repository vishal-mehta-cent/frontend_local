// frontend/src/utils/time.js

// Parse many common timestamp formats as UTC safely, then format in IST.
export function formatToIST(input, opts = {}) {
    if (!input) return "-";

    const s = String(input).trim();

    let d;

    // Case A: ISO with timezone info (Z or +05:30 etc.)
    // Example: 2026-01-17T06:41:52Z
    if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
        d = new Date(s);
    } else {
        // Case B: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" (no timezone)
        // We will treat it as UTC (this is what your online DB/backend is effectively doing)
        const m = s.match(
            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
        );

        if (m) {
            const yyyy = Number(m[1]);
            const MM = Number(m[2]);
            const dd = Number(m[3]);
            const hh = Number(m[4]);
            const mm = Number(m[5]);
            const ss = Number(m[6] || 0);

            d = new Date(Date.UTC(yyyy, MM - 1, dd, hh, mm, ss));
        } else {
            // fallback: let JS try
            d = new Date(s);
        }
    }

    if (Number.isNaN(d.getTime())) return "-";

    const formatOptions = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // change to false if you want 24-hr
        ...opts,
    };

    return new Intl.DateTimeFormat("en-IN", formatOptions).format(d);
}

// ✅ Same as formatToIST but returns "YYYY-MM-DD HH:mm:ss" in IST
export function formatToIST_YMDHMS(input) {
    if (!input) return "-";

    const s = String(input).trim();
    let d;

    // ISO with timezone info
    if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
        d = new Date(s);
    } else {
        // "YYYY-MM-DD HH:MM:SS" OR "YYYY-MM-DDTHH:MM:SS" (no timezone) → treat as UTC
        const m = s.match(
            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
        );

        if (m) {
            const yyyy = Number(m[1]);
            const MM = Number(m[2]);
            const dd = Number(m[3]);
            const hh = Number(m[4]);
            const mm = Number(m[5]);
            const ss = Number(m[6] || 0);
            d = new Date(Date.UTC(yyyy, MM - 1, dd, hh, mm, ss));
        } else {
            d = new Date(s);
        }
    }

    if (Number.isNaN(d.getTime())) return "-";

    // Build parts in IST and then return YYYY-MM-DD HH:mm:ss
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
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
