import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import { Button, Card, Input } from "../components/ui/index.js";

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

  return (
    <Card as="form" onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-fg">Change password</h1>

      {user.mustChangePassword && (
        <p role="status" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-ink">
          Your password was set by an administrator. Choose a new one to continue.
        </p>
      )}

      <ErrorBanner error={error} focusOnShow />
      <Input label="Current password" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        hint={`At least ${MIN_LENGTH} characters`}
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <Input label="Confirm new password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

      <Button type="submit" variant="primary" loading={submitting} className="w-full">
        {submitting ? "Saving..." : "Change password"}
      </Button>
    </Card>
  );
}
