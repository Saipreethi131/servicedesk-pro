import { createContext, useContext, useEffect, useState } from "react";
import { ApiError, request, refreshSession, setAccessToken, onSessionExpired, wakeServer } from "./api.js";
import ServerStatus from "./components/ServerStatus.jsx";

const AuthContext = createContext(null);

const SLOW_STARTUP_MS = 4000;
const SESSION_ENDED_MESSAGE = "Your session ended. Please log in again.";

// These outcomes say nothing about whether the session is valid: no response, a rate limit, or a server error.
// Anything else (401 for no cookie or a dead one) is a real "not logged in".
const isServerUnavailable = (err) =>
  err instanceof ApiError && (err.isNetworkError || err.status === 429 || err.status >= 500);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the startup check finishes, so protected pages don't flash "logged out"
  const [startupError, setStartupError] = useState(null); // set when the startup check could not tell if the user is logged in
  const [slowStartup, setSlowStartup] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumping it reruns the startup effect
  const [sessionMessage, setSessionMessage] = useState(null); // shown once on /login after a forced sign-out

  useEffect(() => {
    // An unrecoverable 401 inside any request signs the user out; ProtectedRoute then redirects to /login.
    onSessionExpired(() => {
      setSessionMessage(SESSION_ENDED_MESSAGE);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    // Runs twice in dev (StrictMode). The first run is ignored; refreshSession() is shared, so the cookie is only spent once.
    let ignore = false;
    const slowTimer = setTimeout(() => setSlowStartup(true), SLOW_STARTUP_MS);
    (async () => {
      try {
        // Wake the server with a harmless ping first, so the token-rotating refresh is never sent to a sleeping server
        // and abandoned mid-flight (see wakeServer in api.js). The "waking up" screen lasts only as long as the ping does.
        await wakeServer();
        clearTimeout(slowTimer);
        if (!ignore) setSlowStartup(false);

        await refreshSession(); // trades the httpOnly cookie for an access token, kept in memory by api.js
        const { data } = await request("/auth/me");
        if (!ignore) setUser(data.user);
      } catch (err) {
        if (ignore) return;
        if (isServerUnavailable(err)) setStartupError(err);
        else setUser(null); // No cookie or a rejected one just means "not logged in". That is normal, not an error to show.
      } finally {
        clearTimeout(slowTimer);
        if (!ignore) {
          setLoading(false);
          setSlowStartup(false);
        }
      }
    })();
    return () => {
      ignore = true;
      clearTimeout(slowTimer);
    };
  }, [attempt]);

  const retryStartup = () => {
    setStartupError(null);
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  const clearSessionMessage = () => setSessionMessage(null);

  const login = async (email, password) => {
    // auth: false so a wrong password's 401 is shown as an error instead of being treated as an expired session.
    const { data } = await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await request("/auth/logout", { method: "POST", auth: false }); // revokes the refresh token and clears the cookie
    } catch (err) {
      // No response means the server never revoked the token or cleared the cookie, so the next reload would sign the user
      // straight back in. Stay logged in and let the caller say so. Any other error (the server did answer) still ends the session.
      if (err instanceof ApiError && err.isNetworkError) throw err;
    }
    setAccessToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const { data } = await request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
    // The server revoked every old session and issued this token for the new one.
    setAccessToken(data.accessToken);
    // Reload the user: mustChangePassword is now false, which is what releases the forced redirect.
    const me = await request("/auth/me");
    setUser(me.data.user);
  };

  // The startup screens replace the whole app: a failed or slow check must not render as "logged out".
  let content = children;
  if (startupError) content = <ServerStatus message={startupError.message} onRetry={retryStartup} />;
  else if (loading && slowStartup) content = <ServerStatus waking />;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, sessionMessage, clearSessionMessage }}>
      {content}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
};
