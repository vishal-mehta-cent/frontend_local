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



// ✅ add
import AlertModal from "./components/AlertModal";
import NeuroBotChat from "./components/NeuroBotChat";
import { useTheme } from "./context/ThemeContext";
import RequireSubscription from "./components/RequireSubscription";
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
import AutoTrade from "./pages/AutoTrade";


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
  // ✅ needed for Toast theme
  const { isDark } = useTheme();

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
      <ToastContainer
        position="top-center"
        autoClose={2000}
        theme={isDark ? "dark" : "light"} // ✅ dark/light toast
        newestOnTop
        pauseOnHover
        closeOnClick
      />

      <AnimatedRoutes
        username={username}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </BrowserRouter>
  );
}

const handleLoginSuccess = async (user) => {
  setUsername(user);

  // ✅ auto-create free trial on first login (by calling subscription endpoint once)
  try {
    const u = String(user || "").trim().toLowerCase();
    await fetch(`${API}/payments/subscription/${encodeURIComponent(u)}`);
  } catch (e) {
    // ignore if offline; user can still open /payments later
  }

  const redirectTo = localStorage.getItem("post_login_redirect");
  if (redirectTo) {
    localStorage.removeItem("post_login_redirect");
    window.location.href = redirectTo;
    return;
  }

  window.location.href = "/menu";
};


function AnimatedRoutes({ username, onLoginSuccess, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // ✅ Chart-style popup state (replaces browser alert)
  const [popup, setPopup] = useState({ open: false, title: "", message: "" });
  const [pendingLogout, setPendingLogout] = useState(false);

  const closePopup = () => {
    setPopup((p) => ({ ...p, open: false }));
    if (pendingLogout) {
      setPendingLogout(false);
      onLogout(); // ✅ logout after OK
    }
  };

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
    const user =
      localStorage.getItem("user_id") || localStorage.getItem("username");
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

          // ✅ REPLACE browser alert with Chart-style popup
          setPendingLogout(true);
          setPopup({
            open: true,
            title: "Logged out",
            message:
              "You were logged out because you logged in from another device.",
          });

          // ❌ do not call onLogout here; it will run when user clicks OK
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
    <>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* 🌐 LANDING PAGE */}
          <Route
            path="/"
            element={username ? <Navigate to="/menu" replace /> : <Landing />}
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
              username ? (
                <RequireSubscription>
                  <Menu logout={onLogout} />
                </RequireSubscription>
              ) : <Navigate to="/" replace />
            }
          />

          <Route
            path="/trade"
            element={
              username ? (
                <RequireSubscription>
                
                  <Trade username={username} />
                
                </RequireSubscription>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/trade/:symbol"
            element={
              username ? (
                <RequireSubscription>

                  <ScriptDetail username={username} />
                 
                </RequireSubscription>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/orders"
            element={
              username ? (
                <RequireSubscription>
                
                  <Orders username={username} />
                 
                </RequireSubscription>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/buy/:symbol"
            element={username ? (
              <RequireSubscription>
                <Buy />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />
          <Route
            path="/sell/:symbol"
            element={username ? (
              <RequireSubscription>
                <Sell />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />
          <Route
            path="/trade-success"
            element={username ? (
              <RequireSubscription>
                <TradeSuccess />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route
            path="/chart/:symbol"
            element={username ? (
              <RequireSubscription>
                <ChartPage />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />
          <Route
            path="/alert/:symbol"
            element={username ? (
              <RequireSubscription>
                <SetAlert />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />
          <Route
            path="/notes/:symbol"
            element={username ? (
              <RequireSubscription>
                <Notes />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route
            path="/portfolio"
            element={
              username ? (
                <RequireSubscription>
                
                  <Portfolio username={username} />
             
                </RequireSubscription>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/recommendations"
            element={
              username ? (
                <RequireSubscription>
                  <Recommendation />
                </RequireSubscription>
              ) : <Navigate to="/" replace />
            }
          />

          <Route
            path="/insight"
            element={username ? (
              <RequireSubscription>
                <Insight />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route
            path="/ipo-tracker"
            element={username ? (
              <RequireSubscription>
                <IpoTracker />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route path="/feedback" element={<Feedback username={username} />} />

                    <Route
  path="/profile"
  element={
    username ? (
      <RequireSubscription>
        <Profile username={username} logout={onLogout} />
      </RequireSubscription>
    ) : (
      <Navigate to="/" replace />
    )
  }
/>

          <Route
            path="/profile/funds"
            element={
              username ? (
                <RequireSubscription>
                  <Funds username={username} />
                </RequireSubscription>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="/payments" element={<Payments username={username} />} />
          <Route
            path="/trade"
            element={
              username ? (
                <RequireSubscription>
                  <Trade username={username} />
                </RequireSubscription>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/history"
            element={
              username ? (
                <RequireSubscription>
                  <History username={username} />
                </RequireSubscription>
              ) : <Navigate to="/" replace />
            }
          />

          <Route
            path="/settings"
            element={username ? (
              <RequireSubscription>
                <Settings />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route
            path="/settings/change-password"
            element={
              username ? (
                <RequireSubscription>
                  <PasswordChange username={username} />
                </RequireSubscription>
              ) : <Navigate to="/" replace />
            }
          />

          {/* ✅ Short route for Profile tile */}
          <Route
            path="/passwordchange"
            element={
              username ? (
                <RequireSubscription>
                  <PasswordChange username={username} />
                </RequireSubscription>
              ) : <Navigate to="/" replace />
            }
          />

          <Route
            path="/settings/change-email"
            element={
              username ? (
                <RequireSubscription>
                  <EmailChange username={username} />
                </RequireSubscription>
              ) : <Navigate to="/" replace />
            }
          />


          <Route path="/modify/:id" element={<ModifyOrderPage />} />

          <Route
            path="/live"
            element={username ? (
              <RequireSubscription>
                <LiveChart />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route
            path="/whatsapp"
            element={username ? (
              <RequireSubscription>
                <Whatsapp />
              </RequireSubscription>
            ) : <Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
          <Route
    path="/autotrade"
    element={
      username ? (
        <RequireSubscription>
          <AutoTrade />
        </RequireSubscription>
      ) : (
        <Navigate to="/" replace />
      )
    }
  />
  <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        

      </AnimatePresence>

      {/* ✅ Chart-style popup modal */}
      <AlertModal
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        isDark={isDark}
      />

      {/* ✅ Floating chatbot on all pages (bottom-right) */}
      <NeuroBotChat />
    </>
  );
}
