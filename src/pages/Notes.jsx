// ✅ Notes.jsx - Notes Page for a Script
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BackButton from "../components/BackButton";

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

  // Load existing note
  useEffect(() => {
    if (!sym) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) setNote(saved);
    } catch {}
  }, [storageKey, sym]);

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, note);
      alert(`Note saved for ${sym}`);
      navigate(from); // ✅ dynamic return
    } catch {
      alert("Couldn't save the note locally.");
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear note for this script?")) return;
    try {
      localStorage.removeItem(storageKey);
      setNote("");
    } catch {}
  };

  if (!sym) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No symbol provided</div>
          <button
            onClick={() => navigate(from)}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center mb-4">
        <BackButton />
        <h1 className="flex-1 text-center text-xl font-bold text-blue-600">
          Notes for {sym}
        </h1>
        <div className="w-10" />
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={12}
        className="border p-3 rounded w-full mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Write your notes here..."
      />

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Save Note
        </button>
        <button
          onClick={handleClear}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
