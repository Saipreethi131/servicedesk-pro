import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

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
  useDocumentTitle("Change password");
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
      <span>{label}</span>
      <input
        type="password"
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
      />
    </label>
  );

  return (
    <Card as="form" onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <h1 className="auth-card-title">Change password</h1>

      {user.mustChangePassword && (
        <p
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb", color: "#92400e" }}
        >
          Your password was set by an administrator. Choose a new one to continue.
        </p>
      )}

      <ErrorBanner error={error} focusOnShow />
      {field("Current password", current, setCurrent, "current-password")}
      {field("New password", next, setNext, "new-password")}
      {field("Confirm new password", confirm, setConfirm, "new-password")}

      <Button type="submit" variant="primary" disabled={submitting} className="w-full">
        {submitting ? "Saving..." : "Change password"}
      </Button>
    </Card>
  );
}
