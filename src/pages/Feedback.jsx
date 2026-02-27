import React, { useState, useEffect } from "react";

import BackButton from "../components/BackButton";
import {
  Sun,
  Moon,
  MessageSquare,
  Mail,
  Send,
  User,
  Phone,
  FileText,
  MessageCircle,
  Sparkles,
  Shield,
} from "lucide-react";

// ✅ Use env backend base (works on domain + local)
const API = (import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

// ✅ Modal popup like Chart.jsx (no browser alert)
function AlertModal({ open, title, message, onClose, isDark }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-5 ${
          isDark
            ? "bg-[#0b1220] border border-white/10"
            : "bg-white border border-black/10"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={`text-[17px] font-semibold tracking-tight ${
                isDark ? "text-blue-300" : "text-blue-700"
              }`}
              style={{ fontFamily: "'Segoe UI', Inter, system-ui" }}
            >
              {title || "Alert"}
            </div>

            <div
              className={`mt-3 text-[14.5px] leading-[1.7] whitespace-pre-line ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {message}
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-xl grid place-items-center ${
              isDark
                ? "bg-white/10 hover:bg-white/15"
                : "bg-black/5 hover:bg-black/10"
            } transition`}
            title="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 transition"
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Feedback() {
  const [tab, setTab] = useState("feedback");
  const [isDark, setIsDark] = useState(true);

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";
  const cardHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-white/80";
  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder-slate-400"
    : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-500";

  // ✅ Support details (for the strip like your 1st image)
  const SUPPORT_PHONE = "9426001601";
  const SUPPORT_EMAIL = "neurocrest.app@gmail.com";
  const WHATSAPP_LINK = `https://wa.me/91${SUPPORT_PHONE}`;
  const MAILTO_LINK = `mailto:${SUPPORT_EMAIL}`;

  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Styled popup state (instead of alert)
  const [popup, setPopup] = useState({ open: false, title: "", message: "" });

  const showPopup = (title, message) => {
    setPopup({
      open: true,
      title: title || "Alert",
      message: message || "",
    });
  };

  const closePopup = () => {
    setPopup((p) => ({ ...p, open: false }));
  };

  // ✅ Autofill from localStorage nc_user
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("nc_user") || "{}");

      const name =
        (u.full_name || "").trim() ||
        [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
        (u.username || "").trim();

      if (name) {
        if (!feedbackName) setFeedbackName(name);
        if (!contactName) setContactName(name);
      }
      if (u.email && !contactEmail) setContactEmail(u.email);
      if (u.phone && !contactPhone) setContactPhone(u.phone);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    if (!feedbackName.trim() || !feedbackMessage.trim()) {
      showPopup("Missing Details", "Please fill in both Name and Feedback fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/feedback/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName,
          message: feedbackMessage,
        }),
      });

      if (res.ok) {
        showPopup("Success", "Feedback submitted successfully");
        // ✅ keep name (so it stays autofilled), clear only message
        setFeedbackMessage("");
      } else {
        console.error("Feedback Error:", await res.text());
        showPopup("Failed", "Failed to submit feedback");
      }
    } catch (err) {
      console.error("Feedback Error:", err);
      showPopup("Failed", "Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    // ✅ Subject is optional
    if (
      !contactName.trim() ||
      !contactEmail.trim() ||
      !contactPhone.trim() ||
      !contactMessage.trim()
    ) {
      showPopup("Missing Details", "Please fill in required contact fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/feedback/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: String(contactPhone),
          subject: contactSubject.trim(), // optional (can be empty)
          message: contactMessage,
        }),
      });

      if (res.ok) {
        showPopup("Success", "Contact message sent successfully");
        // ✅ keep autofill fields, clear only subject/message
        setContactSubject("");
        setContactMessage("");
      } else {
        const err = await res.text();
        console.error("Contact error:", err);
        showPopup("Failed", "Failed to send contact message");
      }
    } catch (err) {
      console.error("Error submitting contact form:", err);
      showPopup("Failed", "Failed to send contact message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}
    >
      {/* ✅ Styled popup like Chart.jsx */}
      <AlertModal
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        isDark={isDark}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div
          className={`${glassClass} rounded-2xl p-4 mb-5 flex items-center justify-between shadow-2xl`}
        >
          <BackButton
            to="/menu"
            className={isDark ? "text-slate-200 hover:text-white" : "text-slate-600"}
          />

          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              FEEDBACK & CONTACT
            </h2>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`${glassClass} p-3 rounded-xl ${cardHoverClass} transition-all shadow-lg`}
            type="button"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* ✅ Support strip (single pill like your 1st image) */}
        <div className={`${glassClass} rounded-2xl p-3 mb-6 shadow-2xl`}>
          <div
            className={`w-full flex flex-wrap items-center justify-center gap-4 px-4 py-3 rounded-2xl border ${
              isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/60"
            }`}
          >
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:opacity-90 transition"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-[14px] font-semibold tracking-wide">
                {SUPPORT_PHONE}
              </span>
            </a>

            <span className={`${isDark ? "text-white/25" : "text-slate-400"}`}>|</span>

            <a
              href={MAILTO_LINK}
              className="flex items-center gap-2 hover:opacity-90 transition"
              title="Send Email"
            >
              <Mail className="w-5 h-5" />
              <span className="text-[14px] font-semibold tracking-wide">
                {SUPPORT_EMAIL}
              </span>
            </a>
          </div>
        </div>

        {/* Main Card */}
        <div className={`${glassClass} rounded-3xl p-6 mb-8 shadow-2xl`}>
          <div className="flex justify-center mb-8 space-x-3">
            <button
              onClick={() => setTab("feedback")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center space-x-2 ${
                tab === "feedback"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/50 scale-105"
                  : `${glassClass} ${cardHoverClass} ${textSecondaryClass}`
              }`}
              type="button"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Feedback</span>
            </button>

            <button
              onClick={() => setTab("contact")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center space-x-2 ${
                tab === "contact"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/50 scale-105"
                  : `${glassClass} ${cardHoverClass} ${textSecondaryClass}`
              }`}
              type="button"
            >
              <Mail className="w-5 h-5" />
              <span>Contact</span>
            </button>
          </div>

          {tab === "feedback" && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl"></div>

              <div className="relative">
                <h3 className="text-center text-xl font-bold mb-2">
                  Share Your Feedback
                </h3>
                <p className={`text-center ${textSecondaryClass} mb-6`}>
                  We value your opinion and would love to hear from you
                </p>

                <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                  <div className="relative">
                    <User
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <input
                      type="text"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      placeholder="Your Name"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <MessageSquare
                      className={`absolute left-4 top-6 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Your Feedback"
                      rows="6"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg resize-none`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? "Submitting..." : "Submit Feedback"}</span>
                  </button>
                </form>
              </div>

              <p className={`text-center ${textSecondaryClass} mt-4`}>
                Your feedback helps us improve. Thank you for reaching out!
              </p>
            </div>
          )}

          {tab === "contact" && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl"></div>

              <div className="relative">
                <h3 className="text-center text-xl font-bold mb-2">Get In Touch</h3>
                <p className={`text-center ${textSecondaryClass} mb-6`}>
                  Have questions? We're here to help you 24/7
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="relative">
                    <User
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your Name"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Phone
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone Number"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Mail
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Your Email"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <FileText
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="Subject"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg`}
                    />
                  </div>

                  <div className="relative">
                    <MessageSquare
                      className={`absolute left-4 top-6 w-5 h-5 ${textSecondaryClass}`}
                    />
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Message"
                      rows="6"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg resize-none`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? "Sending..." : "Send Message"}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
