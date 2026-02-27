// ✅ Notes.jsx - Notes Page for a Script (Styled like ScriptDetailsModal)
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BackButton from "../components/BackButton";
import { FileText, Save, Trash2 } from "lucide-react";

export default function Notes() {
  const { symbol } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const sym =
    (symbol || location.state?.symbol || "").toString().toUpperCase();

  const username = localStorage.getItem("username") || "guest";
  const storageKey = `notes:${username}:${sym}`;

  // ✅ where to go back
  const from = location.state?.from || "/portfolio";

  const [note, setNote] = useState("");

  const isDark = true;

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  // Load existing note
  useEffect(() => {
    if (!sym) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) setNote(saved);
    } catch { }
  }, [storageKey, sym]);

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, note);
      alert(`Note saved for ${sym}`);
      navigate(from);
    } catch {
      alert("Couldn't save the note locally.");
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear note for this script?")) return;
    try {
      localStorage.removeItem(storageKey);
      setNote("");
    } catch { }
  };

  if (!sym) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className={`${glassClass} rounded-2xl p-6 text-center ${textClass}`}>
          <div className="text-lg font-semibold mb-3">No symbol provided</div>
          <button
            onClick={() => navigate(from)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2 rounded-xl font-semibold hover:scale-105 transition-all"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative overflow-hidden`}>
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-none mx-0 px-0 py-6 flex flex-col min-h-screen">
        {/* Header */}
        <div className={`${glassClass} rounded-2xl p-4 mb-6 shadow-2xl`}>
          <div className="flex items-center justify-between">
            <BackButton className="text-white hover:text-cyan-400" />

            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Notes for {sym}
              </h1>
            </div>

            <div className="w-10" />
          </div>
        </div>

        {/* Notes Card */}
        <div className={`${glassClass} rounded-3xl p-6 shadow-2xl flex-1 flex flex-col`}>
          <label className={`text-sm ${textSecondaryClass} mb-2`}>
            Your Notes
          </label>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={14}
            placeholder="Write your notes here..."
            className={`w-full flex-1 resize-none px-4 py-3 rounded-2xl ${glassClass} ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all`}
          />

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Note
            </button>

            <button
              onClick={handleClear}
              className={`${glassClass} ${cardHoverClass} py-3 px-6 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2`}
            >
              <Trash2 className="w-5 h-5 text-red-400" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
