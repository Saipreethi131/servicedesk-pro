import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

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
      <p role="status" className="p-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
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
    <div className="auth-shell">
      <Card as="form" onSubmit={handleSubmit} className="auth-card space-y-4">
        <h1 className="auth-card-title">Sign in to ServiceDesk Pro</h1>
        {endedMessage && (
          <p
            role="status"
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb", color: "#92400e" }}
          >
            {endedMessage}
          </p>
        )}
        <ErrorBanner error={error} focusOnShow />

        <label className="block text-sm">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEndedMessage(null);
            }}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span>Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setEndedMessage(null);
            }}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
          />
        </label>

        <Button type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </Card>
    </div>
  );
}
