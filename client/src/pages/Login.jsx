import { useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";

export default function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="p-6 text-gray-500">Loading...</p>;
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
        <ErrorBanner error={error} />

        <label className="block text-sm">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
