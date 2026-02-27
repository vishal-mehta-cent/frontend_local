import React from "react";

export default function Dashboard({ username, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Welcome, {username}!</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Portfolio Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">📊 Portfolio Overview</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-50 border border-gray-200 rounded">
              <thead className="bg-gray-100 text-gray-700 text-sm">
                <tr>
                  <th className="px-4 py-2 text-left">Script</th>
                  <th className="px-4 py-2 text-left">Qty</th>
                  <th className="px-4 py-2 text-left">Avg. Buy Price</th>
                  <th className="px-4 py-2 text-left">Current Price</th>
                  <th className="px-4 py-2 text-left">P&L</th>
                </tr>
              </thead>
              <tbody>
                {/* Placeholder row */}
                <tr className="border-t border-gray-200 text-sm text-gray-600">
                  <td className="px-4 py-2">NIFTY</td>
                  <td className="px-4 py-2">2</td>
                  <td className="px-4 py-2">22,000</td>
                  <td className="px-4 py-2">22,100</td>
                  <td className="px-4 py-2 text-green-600 font-semibold">+200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Order History Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">📝 Order History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-50 border border-gray-200 rounded">
              <thead className="bg-gray-100 text-gray-700 text-sm">
                <tr>
                  <th className="px-4 py-2 text-left">Script</th>
                  <th className="px-4 py-2 text-left">Order Type</th>
                  <th className="px-4 py-2 text-left">Qty</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Placeholder order */}
                <tr className="border-t border-gray-200 text-sm text-gray-600">
                  <td className="px-4 py-2">BANKNIFTY</td>
                  <td className="px-4 py-2">Buy</td>
                  <td className="px-4 py-2">1</td>
                  <td className="px-4 py-2">48,500</td>
                  <td className="px-4 py-2 text-blue-600 font-medium">Open</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
