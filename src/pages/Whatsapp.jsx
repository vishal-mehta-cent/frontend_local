import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import BackButton from "../components/BackButton";

export default function Whatsapp() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-100">

            {/* Header */}
            <div className="p-4 bg-white shadow sticky top-0 z-50">
                <BackButton to="/trade" />
                <h1 className="text-center text-xl font-semibold text-gray-800">
                    WhatsApp Alerts
                </h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow">
                    <h2 className="text-lg font-semibold text-gray-800">Send Broadcast Alert</h2>
                    <p className="text-sm text-gray-600 mt-2">
                        Use this page to send WhatsApp updates to your number or groups.
                    </p>

                    <button
                        className="mt-4 flex items-center bg-green-500 text-white py-2 px-4 rounded-lg shadow hover:bg-green-600"
                        onClick={() => {
                            window.open("https://wa.me/?text=Hello%20from%20NeuroCrest", "_blank");
                        }}
                    >
                        <FaWhatsapp className="mr-2 text-xl" />
                        Send Test Message
                    </button>
                </div>
            </div>

        </div>
    );
}
