import React, { useEffect, useState } from "react";
import { User, Mail, Phone, Calendar, Save, X, CheckCircle, AlertCircle, Sun, Moon } from "lucide-react";
import BackButton from "../components/BackButton";

const API = import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

const toStr = (v) => (v === undefined || v === null ? "" : String(v).trim());

export default function ProfileDetail() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-50";
  const glassClass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/20"
    : "bg-white/70 backdrop-blur-xl border border-white/30";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const inputClass = isDark
    ? "bg-white/5 border-white/20 text-white placeholder-slate-400"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400";

  let lsUser = {};
  try {
    lsUser = JSON.parse(localStorage.getItem("nc_user") || "{}");
  } catch {}

  const [profile, setProfile] = useState({
    username: toStr(lsUser.username) || toStr(localStorage.getItem("username")),
    email: toStr(lsUser.email) || toStr(localStorage.getItem("email")),
    phone: toStr(lsUser.phone) || toStr(localStorage.getItem("phone")),
    full_name: toStr(lsUser.full_name) || toStr(localStorage.getItem("full_name")),
    created_at: toStr(lsUser.created_at) || toStr(localStorage.getItem("created_at")),
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    const u = profile.username;
    if (!u) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      setOk("");
      try {
        const res = await fetch(`${API}/users/${encodeURIComponent(u)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setProfile((p) => ({
              ...p,
              username: toStr(data.username) || p.username,
              email: toStr(data.email) || p.email,
              phone: toStr(data.phone) || p.phone,
              full_name: toStr(data.full_name) || p.full_name,
              created_at: toStr(data.created_at) || p.created_at,
            }));
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.username]);

  const emailValid = (e) => !!toStr(e) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toStr(e));
  const phoneValid = (p) => !!toStr(p) && /^[0-9+\-() ]{7,20}$/.test(toStr(p));

  const handleSave = async () => {
    setErr("");
    setOk("");

    const { username, email, phone } = profile;
    if (!username) return setErr("Missing username.");
    if (!emailValid(email)) return setErr("Please enter a valid email.");
    if (!phoneValid(phone)) return setErr("Please enter a valid phone number.");

    setSaving(true);
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.detail) msg = j.detail;
        } catch {}
        throw new Error(msg);
      }

      try {
        localStorage.setItem("email", email);
        localStorage.setItem("phone", phone);
        const before = JSON.parse(localStorage.getItem("nc_user") || "{}");
        localStorage.setItem("nc_user", JSON.stringify({ ...before, email, phone }));
      } catch {}

      setOk("Profile updated successfully.");
    } catch (e) {
      setErr(e?.message || "Failed to save profile.");
    }
    setSaving(false);
  };

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden transition-colors duration-300`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Profile Details
          </h1>
          <p className={textSecondaryClass}>Manage your account information</p>
        </div>

        {ok && (
          <div className={`mb-6 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in`}>
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-green-400 font-medium">{ok}</span>
          </div>
        )}

        {err && (
          <div className={`mb-6 rounded-2xl ${glassClass} px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in`}>
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 font-medium">{err}</span>
          </div>
        )}

        <div className={`${glassClass} rounded-3xl shadow-2xl p-6 sm:p-8 transition-all hover:shadow-blue-500/20`}>
          <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/10">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {(profile.full_name || profile.username || "U")[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
            </div>
            <div>
              <div className="text-2xl font-bold">{profile.full_name || profile.username || "—"}</div>
              <div className={`text-sm ${textSecondaryClass} flex items-center gap-2 mt-1`}>
                <User className="w-4 h-4" />
                {profile.username || "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-2xl ${glassClass} p-5 transition-all hover:scale-[1.02]`}>
              <label className={`text-xs uppercase tracking-wide ${textSecondaryClass} flex items-center gap-2 mb-3`}>
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                type="email"
                className={`w-full rounded-xl border ${inputClass} px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
              />
              {!emailValid(profile.email) && profile.email && (
                <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Invalid email format
                </div>
              )}
            </div>

            <div className={`rounded-2xl ${glassClass} p-5 transition-all hover:scale-[1.02]`}>
              <label className={`text-xs uppercase tracking-wide ${textSecondaryClass} flex items-center gap-2 mb-3`}>
                <Phone className="w-4 h-4" />
                Phone Number
              </label>
              <input
                type="text"
                className={`w-full rounded-xl border ${inputClass} px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
              {!phoneValid(profile.phone) && profile.phone && (
                <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Invalid phone format
                </div>
              )}
            </div>

            {profile.created_at && (
              <div className={`rounded-2xl ${glassClass} p-5 transition-all hover:scale-[1.02]`}>
                <div className={`text-xs uppercase tracking-wide ${textSecondaryClass} flex items-center gap-2 mb-3`}>
                  <Calendar className="w-4 h-4" />
                  Member Since
                </div>
                <div className="text-lg font-semibold">{profile.created_at}</div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              className={`px-6 py-3 rounded-xl ${glassClass} hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2 font-semibold`}
              onClick={() => window.history.back()}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !emailValid(profile.email) || !phoneValid(profile.phone)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-60 hover:scale-105 transition-all shadow-lg shadow-blue-500/50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
