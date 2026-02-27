import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

export default function ModifyOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialData = location.state || {};
  const [form, setForm] = useState({
    script: initialData.symbol || "",
    qty: initialData.qty || "",
    price: initialData.price || "",
    trigger_price: initialData.trigger_price || "",
    stop_loss: initialData.stop_loss || "",
    target: initialData.target || "",
  });

  

  // fallback: fetch order if no state provided
  useEffect(() => {
    if (!initialData.symbol) {
      fetch(`http://localhost:8000/orders/${orderId}`)
        .then((res) => res.json())
        .then((data) =>
          setForm({
            script: data.script,
            qty: data.qty,
            price: data.price,
            trigger_price: data.trigger_price,
            stop_loss: data.stop_loss,
            target: data.target,
          })
        )
        .catch((err) => console.error("Failed to load order:", err));
    }
  }, [orderId, initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`http://localhost:8000/orders/modify/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    navigate("/orders", { state: { refresh: true } });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Modify Order</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="script" value={form.script} onChange={handleChange} className="border p-2 w-full" />
        <input name="qty" value={form.qty} onChange={handleChange} className="border p-2 w-full" />
        <input name="price" value={form.price} onChange={handleChange} className="border p-2 w-full" />
        <input name="trigger_price" value={form.trigger_price} onChange={handleChange} className="border p-2 w-full" />
        <input name="stop_loss" value={form.stop_loss} onChange={handleChange} className="border p-2 w-full" />
        <input name="target" value={form.target} onChange={handleChange} className="border p-2 w-full" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Modify
        </button>
      </form>
    </div>
  );
}
