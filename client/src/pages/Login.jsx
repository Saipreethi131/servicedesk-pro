import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";

export default function Login() {
  useDocumentTitle("Sign in");
  const { user, loading, login, sessionMessage, clearSessionMessage } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Copy the "session ended" message into local state, then clear it from context so a later visit to /login
  // doesn't show it again. Typing dismisses the local copy.
  const [endedMessage, setEndedMessage] = useState(sessionMessage);
  useEffect(() => {
    if (sessionMessage) clearSessionMessage();
  }, [sessionMessage, clearSessionMessage]);

  if (loading) {
    return (
      <p role="status" className="p-6 text-gray-500">
        Loading...
      </p>
    );
  }
  // Already signed in (or just did): go where ProtectedRoute originally sent us from, else the dashboard.
  if (user) return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password); // success sets the user, and the redirect above takes over
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sign in to ServiceDesk Pro</h1>
        {endedMessage && (
          <p role="status" className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {endedMessage}
          </p>
        )}
        <ErrorBanner error={error} focusOnShow />

        <label className="block text-sm">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEndedMessage(null);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setEndedMessage(null);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
