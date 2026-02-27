import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import "../index.css";
import { useTheme } from "../context/ThemeContext";
import { useLocation } from "react-router-dom";

export default function LoginRegister({ onLoginSuccess }) {
  const { isDark } = useTheme();
  const location = useLocation();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isLogin, setIsLogin] = useState(true);

  // Common
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Signup extra fields (single page)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // OTP
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const otpRefs = useRef([]);

  // Stage: "basic" => details editable, otp not sent
  //        "otp"   => otp sent, phone/email locked, verify enabled
  const [signupStage, setSignupStage] = useState("basic");

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password modal
  const [fpOpen, setFpOpen] = useState(false);
  const [fpStage, setFpStage] = useState("input"); // "input" | "otp" | "done"
  const [fpEmail, setFpEmail] = useState("");
  const [fpPhone, setFpPhone] = useState("");
  const [fpOtpDigits, setFpOtpDigits] = useState(["", "", "", ""]);
  const fpOtpRefs = useRef([]);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg, setFpMsg] = useState("");
  const [fpMsgType, setFpMsgType] = useState(""); // "success" | "error"

  useEffect(() => {
    const mode = new URLSearchParams(location.search).get("mode");
    if (mode === "signup") setIsLogin(false);
    if (mode === "login") setIsLogin(true);
  }, [location.search]);

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100";

  const glassClass = isDark
    ? "bg-white/5 backdrop-blur-xl border border-white/10"
    : "bg-white/60 backdrop-blur-xl border border-white/40";

  const textClass = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClass = isDark ? "text-slate-300" : "text-slate-600";

  const inputClass = isDark
    ? "bg-white/10 border-white/10 focus:border-white/20 text-white placeholder:text-slate-300"
    : "bg-white/70 border-white/40 focus:border-white/70 text-slate-900 placeholder:text-slate-500";

  const brandGradient =
    "bg-gradient-to-r from-[#1ea7ff] via-[#22d3ee] via-[#22c55e] to-[#f59e0b]";

  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  const showError = (msg) => {
    setMessage("❌ " + msg);
    setMessageType("error");
  };

  const showSuccess = (msg) => {
    setMessage("✅ " + msg);
    setMessageType("success");
  };

  const resetSignupState = () => {
    setFirstName("");
    setLastName("");
    setCity("");
    setPhone("");
    setEmail("");
    setOtpDigits(["", "", "", ""]);
    setSignupStage("basic");
  };

  const validateBasicSignup = () => {
    if (!username || !password) {
      showError("Please enter username and password.");
      return false;
    }
    if (password !== confirm) {
      showError("Password and Confirm Password do not match.");
      return false;
    }
    return true;
  };

  const validateDetails = () => {
    if (!firstName) return showError("Please enter First Name."), false;
    if (!lastName) return showError("Please enter Last Name."), false;
    if (!city) return showError("Please enter City."), false;

    if (!phone) return showError("Please enter Mobile No."), false;

    // Optional strong validation for India mobile (10 digits)
    const phoneDigits = String(phone).replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      showError("Mobile No. must be 10 digits.");
      return false;
    }

    if (!email) return showError("Please enter Email ID to receive OTP."), false;

    // Basic email pattern
    const em = String(email).trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      showError("Please enter a valid Email ID.");
      return false;
    }

    return true;
  };

  const sendSignupOtp = async () => {
    clearMessage();

    if (!validateBasicSignup()) return;
    if (!validateDetails()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/auth/signup/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          first_name: firstName,
          last_name: lastName,
          city,
          phone: String(phone).replace(/\D/g, ""),
          email: String(email).trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showError(data.message || "Failed to send OTP");
        return;
      }

      showSuccess("OTP sent to email. Please enter the 4-digit OTP.");
      setOtpDigits(["", "", "", ""]);
      setSignupStage("otp");
      setTimeout(() => otpRefs.current?.[0]?.focus?.(), 150);
    } catch (err) {
      showError("Cannot connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignupOtp = async () => {
    clearMessage();

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 4) {
      showError("Please enter 4-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/auth/signup/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          first_name: firstName,
          last_name: lastName,
          city,
          phone: String(phone).replace(/\D/g, ""),
          email: String(email).trim(),
          otp: otpCode,
        }),
      });

      const data = await res.json();

      // ✅ Requirement: if OTP incorrect, show error and ask to enter correct OTP
      if (!data.success) {
        showError(data.message || "Incorrect OTP. Please enter the correct OTP.");
        // Stay on OTP stage
        setSignupStage("otp");
        return;
      }

      showSuccess("Signup successful. Please Sign In.");
      setIsLogin(true);
      resetSignupState();
      setPassword("");
      setConfirm("");
    } catch (err) {
      showError("Cannot connect to server.");
      setSignupStage("otp");
    } finally {
      setIsLoading(false);
    }
  };

  const doLogin = async () => {
    clearMessage();

    if (!username || !password) {
      showError("Please enter username and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        const u = (data.username || username || "").trim();

        localStorage.setItem("user_id", u);
        localStorage.setItem("username", u);
        localStorage.setItem("session_id", data.session_id || "");

        // ✅ store email/phone in consistent keys (not only email_id)
        localStorage.setItem("email", data.email || "");
        localStorage.setItem("phone", data.phone || "");

        // keep your old key too (optional)
        localStorage.setItem("email_id", data.email || "");

        // ✅ also fetch full profile (so allowlist users also get email/phone if stored)
        try {
          const pr = await fetch(`${backendBaseUrl}/users/${encodeURIComponent(u)}`);
          if (pr.ok) {
            const p = await pr.json();

            const fullName =
              (p.full_name || "").trim() ||
              [p.first_name, p.last_name].filter(Boolean).join(" ").trim();

            const ncUser = {
              username: u,
              email: (p.email || data.email || "").trim(),
              phone: (p.phone || data.phone || "").trim(),
              full_name: fullName,
              first_name: (p.first_name || "").trim(),
              last_name: (p.last_name || "").trim(),
              city: (p.city || "").trim(),
              created_at: (p.created_at || "").trim(),
            };

            localStorage.setItem("nc_user", JSON.stringify(ncUser));

            // also mirror common keys for pages that read them
            localStorage.setItem("full_name", ncUser.full_name);
            localStorage.setItem("created_at", ncUser.created_at);
            localStorage.setItem("email", ncUser.email);
            localStorage.setItem("phone", ncUser.phone);
          } else {
            // fallback nc_user from login response only
            localStorage.setItem(
              "nc_user",
              JSON.stringify({
                username: u,
                email: data.email || "",
                phone: data.phone || "",
              })
            );
          }
        } catch {
          localStorage.setItem(
            "nc_user",
            JSON.stringify({
              username: u,
              email: data.email || "",
              phone: data.phone || "",
            })
          );
        }

        onLoginSuccess(u);
      } else {
        showError(data.message || "Invalid credentials");
      }

    } catch (err) {
      showError("Cannot connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const fpClear = () => {
    setFpMsg("");
    setFpMsgType("");
  };

  const fpError = (msg) => {
    setFpMsg("❌ " + msg);
    setFpMsgType("error");
  };

  const fpSuccess = (msg) => {
    setFpMsg("✅ " + msg);
    setFpMsgType("success");
  };

  const openForgot = () => {
    fpClear();
    setIsLogin(true);          // ✅ force Sign In tab
    setFpOpen(true);
    setFpStage("input");
    setFpEmail("");
    setFpPhone("");
    setFpOtpDigits(["", "", "", ""]);
  };


  const closeForgot = () => {
    setFpOpen(false);
    setFpStage("input");
    setFpEmail("");
    setFpPhone("");
    setFpOtpDigits(["", "", "", ""]);
    fpClear();
  };

  const requestForgotOtp = async () => {
    fpClear();

    const emailTrim = String(fpEmail || "").trim();
    const phoneDigits = String(fpPhone || "").replace(/\D/g, "");

    if (!emailTrim && !phoneDigits) {
      fpError("Please enter Email ID or Mobile No.");
      return;
    }
    if (emailTrim && !/^\S+@\S+\.\S+$/.test(emailTrim)) {
      fpError("Please enter a valid Email ID.");
      return;
    }
    if (phoneDigits && phoneDigits.length !== 10) {
      fpError("Mobile No. must be 10 digits.");
      return;
    }

    setFpLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/auth/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim || null,
          phone: phoneDigits || null,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        fpError(data.message || "Failed to send OTP.");
        return;
      }

      fpSuccess(`OTP sent to ${data.email || emailTrim}. Please enter the 4-digit OTP.`);
      setFpStage("otp");
      setFpOtpDigits(["", "", "", ""]);
      setTimeout(() => fpOtpRefs.current?.[0]?.focus?.(), 150);
    } catch (e) {
      fpError("Cannot connect to server.");
    } finally {
      setFpLoading(false);
    }
  };

  const verifyForgotOtp = async () => {
    fpClear();

    const otp = fpOtpDigits.join("");
    if (otp.length !== 4) {
      fpError("Please enter 4-digit OTP.");
      return;
    }

    const emailTrim = String(fpEmail || "").trim();
    const phoneDigits = String(fpPhone || "").replace(/\D/g, "");

    setFpLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/auth/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim || null,
          phone: phoneDigits || null,
          otp,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        fpError(data.message || "Incorrect OTP. Please enter the correct OTP.");
        setFpStage("otp");
        return;
      }

      fpSuccess(`Password Sent successfully on ${data.email || emailTrim}`);
      setFpStage("done");
    } catch (e) {
      fpError("Cannot connect to server.");
    } finally {
      setFpLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const token = credentialResponse.credential;

    try {
      const res = await fetch(`${backendBaseUrl}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("user_id", data.username);
        localStorage.setItem("session_id", data.session_id || "");
        localStorage.setItem("email_id", data.email || "");
        localStorage.setItem("username", data.username);
        onLoginSuccess(data.username);
      } else {
        showError(data.message || "Google login failed");
      }
    } catch (err) {
      showError("Google login failed");
    }
  };

  if (!mounted) return null;

  const phoneLocked = !isLogin && signupStage === "otp"; // once OTP sent, lock mobile
  const emailLocked = !isLogin && signupStage === "otp"; // lock email too (keeps OTP consistent)

  const ui = (
    <div
      className={`fixed inset-0 w-screen h-[100dvh] ${bgClass} ${textClass} flex items-center justify-center px-4 overflow-hidden transition-colors duration-300`}
      style={{ zIndex: 9999 }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-[34rem] h-[34rem] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-[34rem] h-[34rem] bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[34rem] h-[34rem] bg-blue-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* BRAND */}
        <div className="hidden lg:flex flex-col items-center">
          <img
            src="/logo1.png"
            alt="NeuroCrest"
            className="h-28 w-28 mb-6 select-none"
            draggable="false"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#1ea7ff] via-[#22c55e] to-[#f59e0b]">
            NEUROCREST
          </h1>
          <p className={`text-lg ${textSecondaryClass} text-center mt-2`}>
            Your All-in-One AI Trading Mentor
          </p>
        </div>

        {/* MAIN CARD */}
        <div className={`w-full max-w-md mx-auto rounded-3xl ${glassClass} shadow-2xl p-8`}>
          {/* Mobile brand */}
          <div className="flex flex-col items-center mb-6 lg:hidden">
            <img
              src="/logo1.png"
              alt="NeuroCrest"
              className="h-20 w-20 mb-3 select-none"
              draggable="false"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#1ea7ff] via-[#22c55e] to-[#f59e0b]">
              NEUROCREST
            </h1>
            <p className={`text-sm ${textSecondaryClass} mt-1 text-center`}>
              Your All-in-One AI Trading Mentor
            </p>
          </div>

          {/* Toggle */}
          <div
            className={`flex rounded-full p-1 mb-6 ${isDark ? "bg-white/10" : "bg-white/70 border border-white/40"
              }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                clearMessage();
                setSignupStage("basic");
              }}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${isLogin ? `${brandGradient} text-black shadow-lg` : `${textSecondaryClass} hover:opacity-90`
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                closeForgot(); // ✅ Important
                setIsLogin(false);
                clearMessage();
                resetSignupState();
              }}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${!isLogin ? `${brandGradient} text-black shadow-lg` : `${textSecondaryClass} hover:opacity-90`
                }`}
            >
              Sign Up
            </button>

          </div>

          {/* message */}
          {message && (
            <div
              className={`mb-4 text-sm text-center ${messageType === "success"
                ? isDark
                  ? "text-emerald-400"
                  : "text-emerald-600"
                : isDark
                  ? "text-rose-400"
                  : "text-rose-600"
                }`}
            >
              {message}
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin ? (
            <form
  autoComplete="off"   // ✅ add here
  onSubmit={(e) => {
    e.preventDefault();
    doLogin();
  }}
  className="space-y-4"
>

              <input
                type="text"
                name="nc_login_username"   // ✅ ADD
                id="nc_login_username"     // ✅ ADD
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"         // ✅ CHANGE (was "username")
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all ${inputClass}`}
              />

              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  name="nc_login_password"   // ✅ ADD
                  id="nc_login_password"     // ✅ ADD
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" // ✅ CHANGE (was "current-password")
                  className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all pr-12 ${inputClass}`}
                />
                <button
                  type="button"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  onClick={() => setShowPwd((s) => !s)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="button"
                onClick={openForgot}
                className={`w-full text-xs text-right cursor-pointer hover:underline select-none ${isDark ? "text-cyan-300" : "text-blue-600"
                  }`}
              >
                Forgot Password?
              </button>


              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
              >
                {isLoading ? "Please wait..." : "Sign In"}
              </button>



              <p className={`mt-6 text-xs text-center ${textSecondaryClass}`}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          ) : (
            /* SIGNUP (SINGLE PAGE) */
            <div className="space-y-4">
              {/* Basic signup */}
              <input
  type="text"
  name="nc_login_username"
  id="nc_login_username"
  placeholder="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  autoComplete="off"
  autoCapitalize="none"
  autoCorrect="off"
  spellCheck={false}
  data-lpignore="true"       // ✅ ADD HERE
  data-1p-ignore="true"      // ✅ ADD HERE
  className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all ${inputClass}`}
/>


              <div className="relative">
                <input
  type={showPwd ? "text" : "password"}
  name="nc_login_password"
  id="nc_login_password"
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  autoComplete="new-password"
  data-lpignore="true"       // ✅ ADD HERE
  data-1p-ignore="true"      // ✅ ADD HERE
  className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all pr-12 ${inputClass}`}
/>

                <button
                  type="button"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  onClick={() => setShowPwd((s) => !s)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPwd2 ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all pr-12 ${inputClass}`}
                />
                <button
                  type="button"
                  aria-label={showPwd2 ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowPwd2((s) => !s)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  tabIndex={-1}
                >
                  {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>


              {/* Details */}
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
              />
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
              />

              <div className="space-y-1">
                <input
                  type="tel"
                  placeholder="Mobile No. (WhatsApp Number)"
                  value={phone}
                  onChange={(e) => {
                    if (phoneLocked) return;
                    setPhone(e.target.value);
                  }}
                  disabled={phoneLocked}
                  className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass} ${phoneLocked ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                />
                <div className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  ⚠️ Please enter your WhatsApp number. Once this mobile number is saved then can’t be changed.
                </div>
              </div>

              {/* Email + Send OTP beside it */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <input
                  type="email"
                  placeholder="Email ID (OTP will be sent here)"
                  value={email}
                  onChange={(e) => {
                    if (emailLocked) return;
                    setEmail(e.target.value);
                  }}
                  disabled={emailLocked}
                  className={`flex-1 rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass} ${emailLocked ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                />

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={sendSignupOtp}
                  className={`sm:w-[140px] w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
                >
                  {isLoading ? "Wait..." : "Send OTP"}
                </button>
              </div>

              {/* OTP boxes + Verify (only after OTP sent) */}
              {signupStage === "otp" && (
                <div className="pt-2 space-y-3">
                  <div className={`text-sm ${textSecondaryClass}`}>
                    Enter the 4-digit OTP sent to <span className="font-semibold">{email}</span>
                  </div>

                  <div className="flex justify-center gap-3">
                    {otpDigits.map((d, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        value={d}
                        inputMode="numeric"
                        maxLength={1}
                        onChange={(e) => {
                          const v = (e.target.value || "").replace(/\D/g, "");
                          const next = [...otpDigits];
                          next[idx] = v;
                          setOtpDigits(next);

                          if (v && idx < 3) otpRefs.current[idx + 1]?.focus?.();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
                            otpRefs.current[idx - 1]?.focus?.();
                          }
                        }}
                        className={[
                          "w-14 h-14 text-center text-xl font-extrabold rounded-xl outline-none border shadow-lg transition-all",
                          inputClass,
                        ].join(" ")}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={verifySignupOtp}
                    className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
                  >
                    {isLoading ? "Please wait..." : "Verify OTP & Create Account"}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (isLoading) return;
                      // Allow resend OTP but keep phone locked (as per requirement)
                      setOtpDigits(["", "", "", ""]);
                      clearMessage();
                      sendSignupOtp();
                    }}
                    className={`w-full py-3 rounded-xl font-bold ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-black/5 text-slate-900 hover:bg-black/10"
                      } shadow-xl`}
                  >
                    Resend OTP
                  </button>
                </div>
              )}

              <p className={`mt-2 text-xs text-center ${textSecondaryClass}`}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>

            </div>
          )}
        </div>
        {/* ✅ Forgot Password Modal (ONLY for Sign In) */}
        {isLogin && fpOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => (fpLoading ? null : closeForgot())}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-md rounded-3xl ${glassClass} shadow-2xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-extrabold">Forgot Password</h3>
                <button
                  type="button"
                  onClick={() => (fpLoading ? null : closeForgot())}
                  className={`${textSecondaryClass} hover:opacity-80`}
                >
                  ✕
                </button>
              </div>

              {fpMsg && (
                <div
                  className={`mb-4 text-sm text-center ${fpMsgType === "success"
                    ? isDark
                      ? "text-emerald-400"
                      : "text-emerald-700"
                    : isDark
                      ? "text-rose-400"
                      : "text-rose-700"
                    }`}
                >
                  {fpMsg}
                </div>
              )}

              {fpStage === "input" && (
                <div className="space-y-3">
                  <input
                    type="tel"
                    placeholder="Mobile No."
                    value={fpPhone}
                    onChange={(e) => setFpPhone(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
                  />

                  <input
                    type="email"
                    placeholder="Email ID"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
                  />

                  <div className={`text-xs ${textSecondaryClass}`}>
                    Enter <b>either</b> Mobile No. or Email ID. OTP will be sent on Email.
                  </div>

                  <button
                    type="button"
                    disabled={fpLoading}
                    onClick={requestForgotOtp}
                    className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
                  >
                    {fpLoading ? "Please wait..." : "Send OTP"}
                  </button>
                </div>
              )}

              {fpStage === "otp" && (
                <div className="space-y-4">
                  <div className={`text-sm ${textSecondaryClass}`}>
                    Enter the 4-digit OTP sent to your email.
                  </div>

                  <div className="flex justify-center gap-3">
                    {fpOtpDigits.map((d, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (fpOtpRefs.current[idx] = el)}
                        value={d}
                        inputMode="numeric"
                        maxLength={1}
                        onChange={(e) => {
                          const v = (e.target.value || "").replace(/\D/g, "");
                          const next = [...fpOtpDigits];
                          next[idx] = v;
                          setFpOtpDigits(next);
                          if (v && idx < 3) fpOtpRefs.current[idx + 1]?.focus?.();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !fpOtpDigits[idx] && idx > 0) {
                            fpOtpRefs.current[idx - 1]?.focus?.();
                          }
                        }}
                        className={[
                          "w-14 h-14 text-center text-xl font-extrabold rounded-xl outline-none border shadow-lg transition-all",
                          inputClass,
                        ].join(" ")}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={fpLoading}
                    onClick={verifyForgotOtp}
                    className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
                  >
                    {fpLoading ? "Please wait..." : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    disabled={fpLoading}
                    onClick={requestForgotOtp}
                    className={`w-full py-3 rounded-xl font-bold ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-black/5 text-slate-900 hover:bg-black/10"
                      } shadow-xl`}
                  >
                    Resend OTP
                  </button>
                </div>
              )}

              {fpStage === "done" && (
                <div className="space-y-4">
                  <div className={`text-sm ${textSecondaryClass} text-center`}>
                    Password has been sent to your email.
                  </div>

                  <button
                    type="button"
                    onClick={closeForgot}
                    className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} shadow-xl`}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );


  return createPortal(ui, document.body);
}
