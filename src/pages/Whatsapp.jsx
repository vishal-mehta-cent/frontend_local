import React, { useEffect, useState, useRef } from "react";
import BackButton from "../components/BackButton";
import {
  Search, ClipboardList, Trash2, Plus, Save, Bell, Moon, Sun,
  CheckCircle, XCircle, Zap, TrendingUp, Package, Sparkles,
  AlertCircle, Info, Crown
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";


const API =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://paper-trading-backend.onrender.com";

export default function Whatsapp() {
  const location = useLocation();
  const chartSymbol = location.state?.symbol || "";
  const fromChart = Boolean(chartSymbol);

  const [scripts, setScripts] = useState([]);
  const [newScript, setNewScript] = useState(() => chartSymbol || "");

  const navigate = useNavigate();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loadingNumber, setLoadingNumber] = useState(false);

  const userId = localStorage.getItem("user_id") || "";
  const emailId = localStorage.getItem("email_id") || "";
  const autoAddedRef = useRef(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allScripts, setAllScripts] = useState([]);

  const addDropdownScripts =
    newScript.trim().length === 0
      ? []
      : scripts
        .filter(s =>
          s.script?.toLowerCase().includes(newScript.toLowerCase())
        )
        .slice(0, 6);

  const { isDark } = useTheme();

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-green-900 to-slate-900"
    : "bg-gradient-to-br from-green-50 via-emerald-50 to-green-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  useEffect(() => {
    fetch(`${API}/search/scripts`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllScripts(data);
        else setAllScripts([]);
      })
      .catch(() => setAllScripts([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);


  useEffect(() => {
    if (!userId) return;

    fetch(`${API}/whatsapp/user-settings?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        console.log("RAW RESPONSE:", data);
        console.log("TYPE:", typeof data);
        console.log("SETTINGS:", data?.settings);

        setScripts(Array.isArray(data?.settings) ? data.settings : []);
      })
      .catch(err => {
        console.error("USER SETTINGS ERROR:", err);
        setScripts([]);
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetch(`${API}/whatsapp/get-number?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.whatsapp_number) {
          setWhatsappNumber(data.whatsapp_number);
        } else {
          setWhatsappNumber("");
        }
      })
      .catch(() => {
        setWhatsappNumber("");
      });

  }, [userId]);

  useEffect(() => {
    const close = () => setShowSearchDropdown(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);


  useEffect(() => {
    if (!chartSymbol || !userId) return;
    if (autoAddedRef.current) return;

    const script = chartSymbol.toUpperCase();

    const alreadyExists = scripts.some(
      (s) => s.script?.toUpperCase() === script
    );

    autoAddedRef.current = true;

    if (alreadyExists) {
      setNewScript("");
      return;
    }

    setTimeout(() => {
      setNewScript(script);
      addScript();
    }, 300);

  }, [chartSymbol, userId, scripts]);

  const addScript = async () => {
    const script = newScript.trim().toUpperCase();
    if (!script) return;

    if (!userId) {
      showToast("User not identified. Please login again.", "error");
      return;
    }

    const res = await fetch(`${API}/whatsapp/add-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script,
        user_id: userId
      })
    });

    const data = await res.json();
    console.log("ADD-ALERT RESPONSE:", data);

    if (data.status === "exists") {
      showToast(`${script} already exists in WhatsApp Alerts`, "info");
      setNewScript("");
      return;
    }

    if (data.status === "ok") {
      showToast(`${script} added to WhatsApp Alerts!`, "success");
      setNewScript("");

      fetch(`${API}/whatsapp/user-settings?user_id=${userId}`)
        .then(res => res.json())
        .then(d => {
          if (Array.isArray(d.settings)) {
            setScripts(d.settings);
          } else {
            setScripts([]);
          }
        })
        .catch(() => setScripts([]));

      return;
    }

    showToast("Unable to add script. Try again.", "error");
  };

  const updateField = (index, field, value) => {
    setScripts(prev =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const deleteScript = async (script) => {
    if (!window.confirm(`Delete ${script}?`)) return;

    try {
      const res = await fetch(`${API}/whatsapp/remove-alert/${script}?user_id=${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.status === "ok") {
        setScripts(prev =>
          prev.filter(row => row.script !== script)
        );
        showToast(`${script} deleted successfully`, "success");
      } else {
        showToast("Delete failed", "error");
      }

    } catch (err) {
      showToast("Server error", "error");
    }
  };

  const handleSave = async () => {
    if (!whatsappNumber.trim()) {
      showToast("Please enter WhatsApp number", "error");
      return;
    }

    setSaving(true);

    const payload = {
      user_id: userId,
      email_id: emailId,
      whatsapp_number: whatsappNumber,
      settings: scripts
    };

    try {
      const res = await fetch(`${API}/whatsapp/save-user-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === "ok") {
        showToast(`Saved successfully (${data.rows_saved} rows)`, "success");
      } else {
        showToast("Save failed", "error");
      }
    } catch (err) {
      showToast("Server error", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredScripts = scripts.filter(script =>
    script.script?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const dropdownScripts =
    searchQuery.trim().length === 0
      ? []
      : scripts
        .filter(s =>
          s.script?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6); // limit like watchlist

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}>
      {/* Enhanced Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 min-h-screen">
        {/* Header */}
        <div className={`${glassClass} rounded-2xl p-4 mb-6 shadow-2xl transform transition-all hover:scale-[1.01]`}>
          <div className="flex items-center justify-between">
            <BackButton to="/trade" />

            {/* CENTER */}
            <div className="flex items-center space-x-3 mx-auto">
              <div className="relative">
                <FaWhatsapp className="w-8 h-8 text-green-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></span>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  WhatsApp Alerts
                </h1>
                <p className="text-xs text-slate-400">
                  Manage your trading notifications
                </p>
              </div>
            </div>

            {/* RIGHT PLACEHOLDER (IMPORTANT) */}
            <div className="w-10 h-10" />


            {/* Theme Toggle */}

          </div>
        </div>

        {/* WhatsApp Number Card */}
        <div className={`${glassClass} rounded-3xl p-6 mb-6 shadow-2xl space-y-4`}>
          <div className="flex items-center space-x-2 mb-3">
            <FaWhatsapp className="w-5 h-5 text-green-400" />
            <label className={`text-sm font-semibold ${textClass}`}>
              WhatsApp Number
            </label>
          </div>

          <div className="relative">
            <input
              type="tel"
              placeholder="e.g. 919876543210"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className={`w-full px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Bell className="w-5 h-5 text-green-400" />
            </div>
          </div>

          <p className={`text-xs ${textSecondaryClass} flex items-center space-x-1`}>
            <Info className="w-3 h-3" />
            <span>Include country code (India → 91)</span>
          </p>
        </div>

        {/* Scripts Table */}
        <div className={`${glassClass} rounded-3xl p-6 shadow-2xl mb-36`}>
          {/* Search Bar */}
          {/* Search Bar */}
          {/* Add Script Section */}
          <div className={`${glassClass} rounded-3xl p-6 mb-6 shadow-2xl`}>
            <div className="flex items-center space-x-2 mb-4">

              <h3 className="text-lg font-semibold text-cyan-400">Add New Script</h3>
            </div>


            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter Script To Add (e.g., TCS)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowAddDropdown(true)}




                onKeyPress={(e) => e.key === "Enter" && addScript()}
                className={`flex-1 px-4 py-3 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all`}
              />
              <button
                onClick={addScript}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2"
              >

                <span>Add</span>
              </button>
            </div>
          </div>
          {showAddDropdown && suggestions.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`${glassClass} mt-2 rounded-xl shadow-2xl max-h-64 overflow-auto`}
            >
              {suggestions.map((s, i) => {
                const sym = s.symbol || s.tradingsymbol;
                return (
                  <div
                    key={`${sym}-${i}`}
                    onClick={() => {
                      setNewScript(sym.toUpperCase());
                      setQuery(sym.toUpperCase());
                      setShowAddDropdown(false);
                    }}
                    className="px-4 py-3 cursor-pointer hover:bg-green-500/20 transition"
                  >
                    <div className="font-semibold text-green-400">
                      {sym}
                    </div>
                    <div className="text-xs text-slate-400">
                      {s.name} • {s.exchange}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-2">

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Existing Scripts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className={`w-half pl-11 pr-4 py-1 ${glassClass} rounded-xl ${textClass} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all`}
              />

              {/* ✅ SEARCH DROPDOWN (CORRECT PLACE) */}
              {showSearchDropdown && dropdownScripts.length > 0 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`${glassClass} mt-2 rounded-xl shadow-2xl max-h-56 overflow-auto`}
                >
                  {dropdownScripts.map((item) => (
                    <div
                      key={item.script}
                      onClick={() => {
                        setSearchQuery(item.script);
                        setShowSearchDropdown(false);
                      }}
                      className="px-4 py-2 cursor-pointer text-sm font-medium
                         hover:bg-green-500/20 transition
                         text-green-400"
                    >
                      {item.script}
                    </div>
                  ))}
                </div>
              )}
            </div>





          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-green-400">Alert Configurations</h3>
              <span className={`text-sm ${textSecondaryClass}`}>
                ({filteredScripts.length} scripts)
              </span>
            </div>




            <button
              onClick={handleSave}
              disabled={saving}
              className={`bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-green-500/50 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 ${saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save All</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${glassClass} border-b border-white/10`}>
                  <th className={`px-6 py-4 text-left ${textClass} font-semibold`}>
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4" />
                      <span>Script</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-center ${textClass} font-semibold`}>
                    <div className="flex flex-col items-center space-y-1">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs">Fast Alert</span>
                      <span className="text-xs text-slate-400">(Generate Signals)</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-center ${textClass} font-semibold`}>
                    <div className="flex flex-col items-center space-y-1">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-xs">Intraday</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-center ${textClass} font-semibold`}>
                    <div className="flex flex-col items-center space-y-1">
                      <Bell className="w-4 h-4 text-green-400" />
                      <span className="text-xs">BTST</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-center ${textClass} font-semibold`}>
                    <div className="flex flex-col items-center space-y-1">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs">Short-Term</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-center ${textClass} font-semibold`}>
                    <Trash2 className="w-4 h-4 mx-auto text-red-400" />
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredScripts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3">
                        <AlertCircle className={`w-12 h-12 ${textSecondaryClass}`} />
                        <p className={textSecondaryClass}>No scripts added yet</p>
                        <p className="text-xs text-slate-400">Add your first script above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredScripts.map((row, i) => (
                    <tr
                      key={row.script}
                      className={`border-b border-white/5 ${cardHoverClass} transition-all`}
                    >
                      <td className="px-6 py-4">
                        <div className={`${glassClass} rounded-lg px-3 py-2 inline-block`}>
                          <span className="font-bold text-green-400">{row.script}</span>
                        </div>
                      </td>

                      {/* Fast Alert */}
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.fast || false}
                            onChange={(e) => updateField(i, "fast", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-500 peer-checked:to-orange-500"></div>
                        </label>
                      </td>

                      {/* Intraday */}
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.intraday || false}
                            onChange={(e) => updateField(i, "intraday", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500"></div>
                        </label>
                      </td>

                      {/* BTST */}
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.btst ?? true}
                            onChange={(e) => updateField(i, "btst", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-500"></div>
                        </label>
                      </td>

                      {/* Short-Term */}
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.shortterm ?? true}
                            onChange={(e) => updateField(i, "shortterm", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                        </label>
                      </td>

                      {/* Delete */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => deleteScript(row.script)}
                          className={`${glassClass} p-2 rounded-lg hover:bg-red-500/20 transition-all hover:scale-110`}
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Box - BELOW ALL SCRIPTS */}
        <div className={`${glassClass} rounded-3xl p-6 shadow-2xl border-2 border-blue-500/30 mt-10`}>
          <div className="flex flex-col gap-4">

            <div className="flex items-center gap-2 text-blue-400 font-semibold text-lg">
              <span>👑</span>
              <span>Your Subscription</span>
            </div>

            <p className="text-green-400 font-medium">
              Short-Term & BTST
            </p>

            <p className={`text-sm ${textSecondaryClass}`}>
              Upgrade to access Intraday and Fast Alert notifications
            </p>

            <button
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 transition"
            >
              ✨ Upgrade Now
            </button>

          </div>
        </div>

      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-slideIn">
          <div
            className={`${glassClass} rounded-2xl p-4 shadow-2xl flex items-center space-x-3 min-w-[300px] ${toast.type === "success"
              ? "border-green-500/50"
              : toast.type === "error"
                ? "border-red-500/50"
                : "border-blue-500/50"
              }`}
          >
            {toast.type === "success" && (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 animate-pulse" />
            )}
            {toast.type === "error" && (
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 animate-pulse" />
            )}
            {toast.type === "info" && (
              <Info className="w-6 h-6 text-blue-400 flex-shrink-0 animate-pulse" />
            )}
            <p className={`text-sm ${textClass} flex-1`}>{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
