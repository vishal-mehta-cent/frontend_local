import React, { useState } from "react";
import BackButton from "../components/BackButton";
import { Sun, Moon, MessageSquare, Mail, Send, User, Phone, FileText, MessageCircle, Sparkles, Shield } from "lucide-react";

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

  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackMessage.trim()) {
      alert("Please fill in both Name and Feedback fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName,
          message: feedbackMessage,
        }),
      });

      if (res.ok) {
        alert("Feedback submitted successfully");
        setFeedbackName("");
        setFeedbackMessage("");
      } else {
        console.error("Feedback Error:", await res.text());
        alert("Failed to submit feedback");
      }
    } catch (err) {
      console.error("Feedback Error:", err);
      alert("Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (
      !contactName.trim() ||
      !contactEmail.trim() ||
      !contactPhone.trim() ||
      !contactSubject.trim() ||
      !contactMessage.trim()
    ) {
      alert("Please fill in all contact fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/feedback/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: String(contactPhone),
          subject: contactSubject,
          message: contactMessage,
        }),
      });

      if (res.ok) {
        alert("Contact message sent successfully");
        setContactName("");
        setContactEmail("");
        setContactPhone("");
        setContactSubject("");
        setContactMessage("");
      } else {
        const err = await res.text();
        console.error("Contact error:", err);
        alert("Failed to send contact message");
      }
    } catch (err) {
      console.error("Error submitting contact form:", err);
      alert("Failed to send contact message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} relative transition-colors duration-300 overflow-hidden`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <div className={`${glassClass} rounded-2xl p-4 mb-8 flex items-center justify-between shadow-2xl`}>
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
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className={`${glassClass} rounded-3xl p-6 mb-8 shadow-2xl`}>
          <div className="flex justify-center mb-8 space-x-3">
            <button
              onClick={() => setTab("feedback")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center space-x-2 ${
                tab === "feedback"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/50 scale-105"
                  : `${glassClass} ${cardHoverClass} ${textSecondaryClass}`
              }`}
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
            >
              <Mail className="w-5 h-5" />
              <span>Contact</span>
            </button>
          </div>

          {tab === "feedback" && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl"></div>

              <div className="relative">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-center text-xl font-bold mb-2">Share Your Feedback</h3>
                <p className={`text-center ${textSecondaryClass} mb-6`}>
                  We value your opinion and would love to hear from you
                </p>

                <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`} />
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
                    <MessageSquare className={`absolute left-4 top-6 w-5 h-5 ${textSecondaryClass}`} />
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
            </div>
          )}

          {tab === "contact" && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-2xl"></div>

              <div className="relative">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <Shield className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
                <h3 className="text-center text-xl font-bold mb-2">Get In Touch</h3>
                <p className={`text-center ${textSecondaryClass} mb-6`}>
                  Have questions? We're here to help you 24/7
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`} />
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
                    <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`} />
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
                    <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`} />
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
                    <FileText className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondaryClass}`} />
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="Subject"
                      className={`w-full pl-12 pr-4 py-4 ${inputClass} border rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-lg`}
                      required
                    />
                  </div>
                  <div className="relative">
                    <MessageSquare className={`absolute left-4 top-6 w-5 h-5 ${textSecondaryClass}`} />
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

        <div className={`${glassClass} rounded-2xl p-6 text-center shadow-xl`}>
          <p className={`text-sm ${textSecondaryClass}`}>
            Your feedback helps us improve. Thank you for reaching out!
          </p>
        </div>
      </div>
    </div>
  );
}
