import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import Spinner from "../components/ui/Spinner.jsx";

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
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
        <Spinner size={20} label="Loading" />
      </div>
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-canvas p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div className="mb-2">
            <p className="text-sm font-semibold text-fg">ServiceDesk Pro</p>
            <h1 className="mt-6 text-xl font-semibold text-fg">Sign in</h1>
            <p className="mt-1 text-sm text-muted">Use your work email to continue.</p>
          </div>
          {endedMessage && (
            <p role="status" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-ink">
              {endedMessage}
            </p>
          )}
          <ErrorBanner error={error} focusOnShow />

          <Input
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEndedMessage(null);
            }}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setEndedMessage(null);
            }}
          />

          <Button type="submit" variant="primary" disabled={submitting} className="w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>

      {/* Product panel: decorative only (aria-hidden) except the statement. Large screens only. */}
      <aside className="relative hidden overflow-hidden border-l border-border bg-surface lg:flex lg:items-end">
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-grid-drift opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-96 animate-glow-drift rounded-full bg-accent-soft blur-3xl"
        />
        <div className="relative max-w-md p-12">
          <p className="text-xl font-semibold text-fg">Every request, resolved on time.</p>
          <p className="mt-3 text-sm text-muted">
            Raise, route and resolve IT tickets against clear deadlines, with the right people seeing the right work.
          </p>
        </div>
      </aside>
    </div>
  );
}
