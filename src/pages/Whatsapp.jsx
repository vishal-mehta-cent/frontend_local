import React, { useEffect, useState } from "react";
import BackButton from "../components/BackButton";
import { Search, ClipboardList, Trash2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";




const API =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://paper-trading-backend.onrender.com";

export default function Whatsapp() {
    const location = useLocation();
   const chartSymbol = location.state?.symbol || "";

    const [scripts, setScripts] = useState([]);
   const [newScript, setNewScript] = useState(() => chartSymbol || "");

 // ⭐ For adding script
    const navigate = useNavigate();
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [loadingNumber, setLoadingNumber] = useState(false);

    // ✅ Logged-in user (used for WhatsApp user-wise data)
    const userId = localStorage.getItem("user_id") || "";
    const emailId = localStorage.getItem("email_id") || "";



    // ---------------------------------------------------------
    // LOAD FULL SETTINGS (script + fast + intraday)
    // ---------------------------------------------------------

    useEffect(() => {
        if (!userId) return;

        fetch(`${API}/whatsapp/user-settings?user_id=${userId}`)
            .then(res => res.json())   // ✅ THIS LINE WAS MISSING
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
        // 🚫 Do nothing until userId is available
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




    // ADD SCRIPT (DUPLICATE CHECK) — FINAL SAFE VERSION
    // ---------------------------------------------------------
    const addScript = async () => {
        const script = newScript.trim().toUpperCase();
        if (!script) return;

        if (!userId) {
            alert("User not identified. Please login again.");
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
            showToast(`${script} already exists in WhatsApp Alerts`);
            setNewScript("");
            return;
        }

        if (data.status === "ok") {
            showToast(`${script} added to WhatsApp Alerts!`);
            setNewScript("");

            // ✅ IMPORTANT: reload user-wise settings from backend
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

        showToast("Unable to add script. Try again.");
    };







    // ---------------------------------------------------------
    // UPDATE CHECKBOX FIELD LOCALLY
    // ---------------------------------------------------------
    const updateField = (index, field, value) => {
        setScripts(prev =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        );
    };

    // ---------------------------------------------------------
    // DELETE SCRIPT
    // ---------------------------------------------------------
    const deleteScript = async (script) => {
        if (!window.confirm(`Delete ${script}?`)) return;

        try {
            const res = await fetch(`${API}/whatsapp/remove-alert/${script}`, {
                method: "DELETE",
            });


            const data = await res.json();

            if (data.status === "ok") {
                setScripts(data.alerts);
            } else {
                alert("Delete failed");
            }

        } catch (err) {
            alert("Server error");
        }
    }




    // ---------------------------------------------------------
    // SAVE SETTINGS TO BACKEND
    // ---------------------------------------------------------
    const handleSave = async () => {
        if (!whatsappNumber.trim()) {
            alert("Please enter WhatsApp number");
            return;
        }

        const payload = {
            user_id: userId,
            email_id: emailId,
            whatsapp_number: whatsappNumber,
            settings: scripts
        };

        const res = await fetch(`${API}/whatsapp/save-user-details`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data.status === "ok") {
            alert(`Saved successfully (${data.rows_saved} rows)`);
        } else {
            alert("Save failed");
        }
    };





    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-between p-4">

            <div>
                <BackButton to="/trade" />

                <h1 className="text-xl font-semibold text-center mt-3 mb-6">
                    WhatsApp Alerts
                </h1>

                {/* WhatsApp Number */}
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp Number
                    </label>

                    <div className="flex gap-2">
                        <input
                            type="tel"
                            placeholder="e.g. 919876543210"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            className="flex-1 border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                        Include country code (India → 91)
                    </p>
                </div>



                {/* ⭐ SAVE BUTTON ABOVE TABLE */}
                <div className="flex justify-end mb-2 pr-2">
                    <button
                        onClick={handleSave}
                        className="bg-green-600 text-white px-5 py-1 rounded-md shadow hover:bg-green-700"
                    >
                        Save
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow p-4 overflow-auto min-h-[120px]">

                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-700">Script</th>
                                <th className="px-4 py-2 text-center text-gray-700">Intraday Fast Alert</th>
                                <th className="px-4 py-2 text-center text-gray-700">Intraday</th>
                                <th className="px-4 py-2 text-center text-gray-700">BTST</th>
                                <th className="px-4 py-2 text-center text-gray-700">Short-Term</th>
                                <th className="px-4 py-2 text-center text-gray-700">Delete</th>
                            </tr>
                        </thead>

                        <tbody>
                            {scripts.map((row, i) => (
                                <tr key={row.script} className="border-b hover:bg-gray-50">


                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {row.script}
                                    </td>

                                    {/* ⭐ FAST ALERT CHECKBOX */}
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.fast || false}
                                            onChange={(e) =>
                                                updateField(i, "fast", e.target.checked)
                                            }
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                    </td>

                                    {/* ⭐ INTRADAY CHECKBOX */}
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.intraday || false}
                                            onChange={(e) =>
                                                updateField(i, "intraday", e.target.checked)
                                            }
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                    </td>

                                    {/* BTST STATIC */}
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.btst ?? true}
                                            onChange={(e) =>
                                                updateField(i, "btst", e.target.checked)
                                            }
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                    </td>


                                    {/* Short Term STATIC */}
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.shortterm ?? true}
                                            onChange={(e) =>
                                                updateField(i, "shortterm", e.target.checked)
                                            }
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                    </td>


                                    {/* DELETE BUTTON */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => deleteScript(row.script)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ⭐ SUBSCRIPTION BOX (UNCHANGED) */}
            <div className="fixed bottom-16 right-4 bg-white shadow-lg p-3 rounded-lg border w-64 text-right">
                <p className="text-sm font-semibold text-gray-800">
                    Your Subscription →
                    <span className="text-blue-600"> Short-Term & BTST</span>
                </p>

                <p className="text-xs text-gray-500 mt-1">
                    If you want to access other WhatsApp alerts, please upgrade.
                </p>

                <button
                    onClick={() => navigate("/payments")}
                    className="mt-2 bg-blue-600 text-white py-1 px-4 rounded-md hover:bg-blue-700 w-full text-sm"
                >
                    Upgrade Now
                </button>
            </div>

            {/* ⭐ BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-2 flex justify-around z-40 border-t border-gray-700">
                <button onClick={() => navigate("/trade")} className="flex flex-col items-center text-gray-400">
                    <Search size={24} />
                    <span className="text-xs">Watchlist</span>
                </button>

                <button onClick={() => navigate("/orders")} className="flex flex-col items-center text-gray-400">
                    <ClipboardList size={24} />
                    <span className="text-xs">Orders</span>
                </button>

                <button onClick={() => navigate("/whatsapp")} className="flex flex-col items-center text-blue-400">
                    <FaWhatsapp size={24} />
                    <span className="text-xs">WhatsApp</span>
                </button>
            </div>

        </div>
    );
}
