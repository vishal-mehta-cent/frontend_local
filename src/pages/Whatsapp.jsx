import React, { useEffect, useState } from "react";
import BackButton from "../components/BackButton";
import { Search, ClipboardList } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://paper-trading-backend.onrender.com";

export default function Whatsapp() {
    const [scripts, setScripts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API}/whatsapp/list`)
            .then((r) => r.json())
            .then((data) => setScripts(Array.isArray(data) ? data : []))
            .catch(() => setScripts([]));
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-between p-4">

        
            <div>
                <BackButton to="/trade" />

                <h1 className="text-xl font-semibold text-center mt-3 mb-6">
                    WhatsApp Alerts
                </h1>

                <div className="bg-white rounded-xl shadow p-4 overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-700">Script</th>
                                <th className="px-4 py-2 text-center text-gray-700">
                                    Intraday Fast Alert
                                </th>
                                <th className="px-4 py-2 text-center text-gray-700">
                                    Intraday
                                </th>
                                <th className="px-4 py-2 text-center text-gray-700">
                                    BTST
                                </th>
                                <th className="px-4 py-2 text-center text-gray-700">
                                    Short-Term
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {scripts.map((sym, i) => (
                                <tr key={i} className="border-b hover:bg-gray-50">

                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {sym}
                                    </td>

                                    
                                    <td className="text-center">
                                        <input type="checkbox" className="w-4 h-4 accent-blue-600" />
                                    </td>

                                  
                                    <td className="text-center">
                                        <input type="checkbox" className="w-4 h-4 accent-blue-600" />
                                    </td>

                                    
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-blue-600"
                                            defaultChecked
                                        />
                                    </td>

                                    
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-blue-600"
                                            defaultChecked
                                        />
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-2 flex justify-around z-40 border-t border-gray-700">
                <button
                    onClick={() => navigate("/trade")}
                    className="flex flex-col items-center text-gray-400"
                >
                    <Search size={24} />
                    <span className="text-xs">Watchlist</span>
                </button>

                <button
                    onClick={() => navigate("/orders")}
                    className="flex flex-col items-center text-gray-400"
                >
                    <ClipboardList size={24} />
                    <span className="text-xs">Orders</span>
                </button>

                <button
                    onClick={() => navigate("/whatsapp")}
                    className="flex flex-col items-center text-blue-400"
                >
                    <FaWhatsapp size={24} />
                    <span className="text-xs">WhatsApp</span>
                </button>
            </div>

        </div>
    );
}
