import { createContext, useContext, useEffect, useState } from "react";
import { request, refreshSession, setAccessToken, onSessionExpired } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the startup check finishes, so protected pages don't flash "logged out"

  useEffect(() => {
    // An unrecoverable 401 inside any request signs the user out; ProtectedRoute then redirects to /login.
    onSessionExpired(() => setUser(null));

    // Runs twice in dev (StrictMode). The first run is ignored; refreshSession() is shared, so the cookie is only spent once.
    let ignore = false;
    (async () => {
      try {
        await refreshSession(); // trades the httpOnly cookie for an access token, kept in memory by api.js
        const { data } = await request("/auth/me");
        if (!ignore) setUser(data.user);
      } catch {
        // No cookie or a rejected one just means "not logged in". That is normal, not an error to show.
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const login = async (email, password) => {
    // auth: false so a wrong password's 401 is shown as an error instead of being treated as an expired session.
    const { data } = await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await request("/auth/logout", { method: "POST", auth: false }); // revokes the refresh token and clears the cookie
    } catch {
      // Even if the server is unreachable, the user asked to leave: end the session locally regardless.
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
};
