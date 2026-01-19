// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Landing from "./pages/Landing";
import LoginRegister from "./pages/LoginRegister";
import Menu from "./pages/Menu";
import Trade from "./pages/Trade";
import ScriptDetail from "./pages/ScriptDetail";
import Portfolio from "./pages/Portfolio";
import Orders from "./pages/Orders";
import Recommendation from "./pages/Recommendation";
import Insight from "./pages/Insight";
import IpoTracker from "./pages/IpoTracker";
import Feedback from "./pages/Feedback";
import Profile from "./pages/Profile";
import Buy from "./pages/Buy";
import Sell from "./pages/Sell";
import TradeSuccess from "./pages/TradeSuccess";
import ChartPage from "./pages/Chart";
import SetAlert from "./pages/SetAlert";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import PasswordChange from "./pages/PasswordChange";
import EmailChange from "./pages/EmailChange";
import Funds from "./pages/Funds";
import History from "./pages/History";
import ModifyOrderPage from "./pages/ModifyOrderPage";
import ProfileDetail from "./pages/ProfileDetail";
import Payments from "./pages/Payments.jsx";
import LiveChart from "./pages/LiveChart";
import Whatsapp from "./pages/Whatsapp";

// ✅ Backend API base
const API =
  import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

/** Fixed logo shown on every non-auth page (rendered to body via portal) */


/** Auth screen */
function AuthScreen({ onLoginSuccess }) {
  return (
    <div className="flex-1 flex items-start justify-center px-4 pb-8">
      <div className="w-full max-w-md">
        <LoginRegister onLoginSuccess={onLoginSuccess} />
      </div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState(() =>
    localStorage.getItem("user_id") || localStorage.getItem("username")
  );

  useEffect(() => {
    if (username) {
      // Keep BOTH keys for backward compatibility (some pages still read "username")
      localStorage.setItem("user_id", username);
      localStorage.setItem("username", username);
    } else {
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
    }
  }, [username]);

  const handleLoginSuccess = (user) => {
  setUsername(user);

  const redirectTo = localStorage.getItem("post_login_redirect");
  if (redirectTo) {
    localStorage.removeItem("post_login_redirect");
    window.location.href = redirectTo;
    return;
  }

  window.location.href = "/menu";
};



  const handleLogout = () => {
    // Don't nuke *everything* (theme/UI prefs etc.) — just auth/session keys
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("session_id");
    localStorage.removeItem("email_id");
    setUsername(null);
    window.location.replace("/");
  };

  return (
    <BrowserRouter>

      <ToastContainer position="top-center" autoClose={2000} />

      <AnimatedRoutes
        username={username}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </BrowserRouter>
  );
}

function AnimatedRoutes({ username, onLoginSuccess, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // -------------------------------------------------------
  // Listen to custom open-script-details event
  // -------------------------------------------------------
  useEffect(() => {
    function onOpenDetails(e) {
      const symbol = e?.detail?.symbol;
      if (!symbol) return;
      navigate(`/trade/${encodeURIComponent(symbol)}`);
    }
    window.addEventListener("open-script-details", onOpenDetails);
    return () =>
      window.removeEventListener("open-script-details", onOpenDetails);
  }, [navigate]);

  // -------------------------------------------------------
  // 🔥 ZERODHA-STYLE SINGLE SESSION WATCHER
  // -------------------------------------------------------
  useEffect(() => {
    const user = localStorage.getItem("user_id") || localStorage.getItem("username");
    const session = localStorage.getItem("session_id");

    if (!user || !session) return;

    let active = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}/auth/validate-session?username=${user}&session_id=${session}`
        );

        if (!res.ok) throw new Error("Network error");

        const data = await res.json();

        if (active && !data.valid) {
          active = false;
          clearInterval(interval);

          alert(
            "You were logged out because you logged in from another device."
          );

          onLogout(); // ✅ single source of truth
        }
      } catch {
        clearInterval(interval); // silent stop on network fail
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [username, onLogout]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>

        {/* 🌐 LANDING PAGE */}
        <Route
          path="/"
          element={
            username ? <Navigate to="/menu" replace /> : <Landing />
          }
        />

        {/* 🔐 LOGIN PAGE */}
        <Route
          path="/login"
          element={
            username ? (
              <Navigate to="/trade" replace />
            ) : (
              <AuthScreen onLoginSuccess={onLoginSuccess} />
            )
          }
        />

        <Route
          path="/menu"
          element={
            username ? <Menu logout={onLogout} /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/trade"
          element={
            username ? <Trade username={username} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/trade/:symbol"
          element={
            username ? (
              <ScriptDetail username={username} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/orders"
          element={
            username ? <Orders username={username} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/buy/:symbol"
          element={username ? <Buy /> : <Navigate to="/" replace />}
        />
        <Route
          path="/sell/:symbol"
          element={username ? <Sell /> : <Navigate to="/" replace />}
        />
        <Route
          path="/trade-success"
          element={username ? <TradeSuccess /> : <Navigate to="/" replace />}
        />

        <Route
          path="/chart/:symbol"
          element={username ? <ChartPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/alert/:symbol"
          element={username ? <SetAlert /> : <Navigate to="/" replace />}
        />
        <Route
          path="/notes/:symbol"
          element={username ? <Notes /> : <Navigate to="/" replace />}
        />

        <Route
          path="/portfolio"
          element={
            username ? (
              <Portfolio username={username} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/recommendations"
          element={username ? <Recommendation /> : <Navigate to="/" replace />}
        />

        <Route
          path="/insight"
          element={username ? <Insight /> : <Navigate to="/" replace />}
        />

        <Route
          path="/ipo-tracker"
          element={username ? <IpoTracker /> : <Navigate to="/" replace />}
        />

        <Route
          path="/feedback"
          element={<Feedback username={username} />}
        />

        <Route
          path="/profile"
          element={
            username ? (
              <Profile username={username} logout={onLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="/profile/funds" element={<Funds username={username} />} />

        <Route path="/payments" element={<Payments username={username} />} />


        <Route
          path="/history"
          element={
            username ? <History username={username} /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/settings"
          element={username ? <Settings /> : <Navigate to="/" replace />}
        />

        <Route
          path="/settings/change-password"
          element={username ? <PasswordChange username={username} /> : <Navigate to="/" replace />}

        />

        <Route path="/profile/details" element={<ProfileDetail />} />

        <Route
          path="/settings/change-email"
          element={username ? <EmailChange /> : <Navigate to="/" replace />}
        />

        <Route path="/modify/:id" element={<ModifyOrderPage />} />

        <Route
          path="/live"
          element={username ? <LiveChart /> : <Navigate to="/" replace />}
        />

        <Route
          path="/whatsapp"
          element={username ? <Whatsapp /> : <Navigate to="/" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
