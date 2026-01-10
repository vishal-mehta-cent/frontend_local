import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import "../index.css";
import { useTheme } from "../context/ThemeContext";
import { useLocation } from "react-router-dom";

export default function LoginRegister({ onLoginSuccess }) {
  const { isDark } = useTheme();

  const [isLogin, setIsLogin] = useState(true);

  // Step 1 (main signup card)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2 (details modal)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 3 (otp modal)
  const [otp, setOtp] = useState("");

  // ✅ NEW: bank-style 4 boxes OTP
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const otpRefs = useRef([]);

  // signupStage: "basic" (main card) -> "details" (modal) -> "otp" (modal)
  const [signupStage, setSignupStage] = useState("basic");

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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

  const resetSignupState = () => {
    setFirstName("");
    setLastName("");
    setCity("");
    setPhone("");
    setEmail("");
    setOtp("");
    setOtpDigits(["", "", "", ""]);
    setSignupStage("basic");
  };

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
    if (!firstName) {
      showError("Please enter First Name.");
      return false;
    }
    if (!lastName) {
      showError("Please enter Last Name.");
      return false;
    }
    if (!city) {
      showError("Please enter City.");
      return false;
    }
    if (!phone) {
      showError("Please enter Mobile No.");
      return false;
    }
    if (!email) {
      showError("Please enter Email ID to receive OTP.");
      return false;
    }
    return true;
  };

  const openDetailsBox = () => {
    clearMessage();
    if (!validateBasicSignup()) return;
    setSignupStage("details");
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
          city: city,
          phone,
          email,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showError(data.message || "Failed to send OTP");
        return;
      }

      showSuccess("OTP sent to email");
      setOtp("");
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

    setOtp(otpCode);

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
          city: city,
          phone,
          email,
          otp: otpCode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showError(data.message || "OTP verification failed");
        return;
      }

      showSuccess("Signup successful. Please Sign In.");
      setIsLogin(true);
      resetSignupState();
      setPassword("");
      setConfirm("");
    } catch (err) {
      showError("Cannot connect to server.");
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
        localStorage.setItem("user_id", data.username || username);
        localStorage.setItem("session_id", data.session_id || "");
        localStorage.setItem("email_id", data.email || "");
        localStorage.setItem("username", data.username || username);
        onLoginSuccess(data.username || username);
      } else {
        showError(data.message || "Invalid credentials");
      }
    } catch (err) {
      showError("Cannot connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
      return doLogin();
    }

    // Signup main card: clicking Sign Up opens details box (bank style)
    return openDetailsBox();
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

  const signupModalOpen = !isLogin && (signupStage === "details" || signupStage === "otp");

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
              const tried = e.currentTarget.getAttribute("data-tried") || "";
              if (!tried) {
                e.currentTarget.setAttribute("data-tried", "publicpath");
                e.currentTarget.src = "/public/logo1.png";
              } else {
                e.currentTarget.style.display = "none";
              }
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
                const tried = e.currentTarget.getAttribute("data-tried") || "";
                if (!tried) {
                  e.currentTarget.setAttribute("data-tried", "publicpath");
                  e.currentTarget.src = "/public/logo1.png";
                } else {
                  e.currentTarget.style.display = "none";
                }
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
            className={`flex rounded-full p-1 mb-6 ${
              isDark ? "bg-white/10" : "bg-white/70 border border-white/40"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                clearMessage();
                resetSignupState();
              }}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${
                isLogin ? `${brandGradient} text-black shadow-lg` : `${textSecondaryClass} hover:opacity-90`
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                clearMessage();
                resetSignupState();
              }}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${
                !isLogin ? `${brandGradient} text-black shadow-lg` : `${textSecondaryClass} hover:opacity-90`
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* message */}
          {message && (
            <div
              className={`mb-4 text-sm text-center ${
                messageType === "success"
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

          {/* MAIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete={isLogin ? "username" : "new-username"}
              className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all ${inputClass}`}
            />

            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all pr-12 ${inputClass}`}
              />
              <button
                type="button"
                aria-label={showPwd ? "Hide password" : "Show password"}
                onClick={() => setShowPwd((s) => !s)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <input
                  type={showPwd2 ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 focus:ring-blue-500/40 shadow-lg transition-all pr-12 ${inputClass}`}
                />
                <button
                  type="button"
                  aria-label={showPwd2 ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowPwd2((s) => !s)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                  tabIndex={-1}
                >
                  {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {isLogin && (
              <p
                className={`text-xs text-right cursor-pointer hover:underline select-none ${
                  isDark ? "text-cyan-300" : "text-blue-600"
                }`}
              >
                Forgot Password?
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl`}
            >
              {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          {googleClientId && (
            <div className="mt-5 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  showError("Google login failed");
                }}
              />
            </div>
          )}

          <p className={`mt-6 text-xs text-center ${textSecondaryClass}`}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* SIGNUP MODAL (new box) */}
      {signupModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (isLoading) return;
              setSignupStage("basic");
              setOtp("");
              setOtpDigits(["", "", "", ""]);
            }}
          />
          <div className={`relative w-full max-w-md rounded-3xl ${glassClass} shadow-2xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-extrabold tracking-wide">
                {signupStage === "details" ? "Complete Sign Up" : "Verify OTP"}
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (isLoading) return;
                  if (signupStage === "otp") {
                    setSignupStage("details");
                    setOtp("");
                    setOtpDigits(["", "", "", ""]);
                  } else {
                    setSignupStage("basic");
                    setOtp("");
                    setOtpDigits(["", "", "", ""]);
                  }
                  clearMessage();
                }}
                className={`text-xs px-3 py-1 rounded-full ${
                  isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"
                }`}
              >
                Back
              </button>
            </div>

            {/* show message inside modal too */}
            {message && (
              <div
                className={`mb-3 text-sm text-center ${
                  messageType === "success"
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

            {signupStage === "details" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="User Name"
                  value={username}
                  readOnly
                  className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
                />
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
                <input
                  type="tel"
                  placeholder="Mobile No."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
                />
                <input
                  type="email"
                  placeholder="Email ID (OTP will be sent here)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 outline-none border shadow-lg transition-all ${inputClass}`}
                />

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={sendSignupOtp}
                  className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl mt-2`}
                >
                  {isLoading ? "Please wait..." : "Send OTP"}
                </button>
              </div>
            )}

            {signupStage === "otp" && (
              <div className="space-y-3">
                <div className={`text-sm ${textSecondaryClass}`}>
                  OTP sent to: <span className="font-semibold">{email}</span>
                </div>

                {/* ✅ NEW: 4 OTP boxes */}
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

                        if (v && idx < 3) {
                          otpRefs.current[idx + 1]?.focus?.();
                        }
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
                  className={`w-full py-3 rounded-xl font-bold text-black ${brandGradient} disabled:opacity-70 shadow-xl mt-2`}
                >
                  {isLoading ? "Please wait..." : "Verify OTP"}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    if (isLoading) return;
                    setSignupStage("details");
                    setOtp("");
                    setOtpDigits(["", "", "", ""]);
                    clearMessage();
                  }}
                  className={`w-full py-3 rounded-xl font-bold ${
                    isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-black/5 text-slate-900 hover:bg-black/10"
                  } shadow-xl`}
                >
                  Resend / Change Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}
