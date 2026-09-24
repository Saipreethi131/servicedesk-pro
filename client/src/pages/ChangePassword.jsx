import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";

const MIN_LENGTH = 8; // characters, as on the server
const MAX_BYTES = 72; // bcrypt ignores everything past 72 bytes, so the server refuses longer passwords

// Quick checks so an obvious mistake doesn't cost a slow round trip. The server still decides; its messages are shown as-is.
const validate = (current, next, confirm) => {
  if (next.length < MIN_LENGTH || new TextEncoder().encode(next).length > MAX_BYTES) {
    return `New password must be at least ${MIN_LENGTH} characters and at most ${MAX_BYTES} bytes`;
  }
  if (next !== confirm) return "New passwords do not match";
  if (next === current) return "New password must be different from the current password";
  return null;
};

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problem = validate(current, next, confirm);
    if (problem) return setError({ message: problem });

    setError(null);
    setSubmitting(true);
    try {
      await changePassword(current, next);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const field = (label, value, setValue, autoComplete) => (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <input
        type="password"
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
      />
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4 rounded border border-gray-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Change password</h1>

      {user.mustChangePassword && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your password was set by an administrator. Choose a new one to continue.
        </p>
      )}

      <ErrorBanner error={error} />
      {field("Current password", current, setCurrent, "current-password")}
      {field("New password", next, setNext, "new-password")}
      {field("Confirm new password", confirm, setConfirm, "new-password")}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
