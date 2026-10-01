import Card from "./ui/Card.jsx";
import Button from "./ui/Button.jsx";

// Full-page state for the startup check. "waking" is shown while the check is slow; otherwise the check failed
// in a way that says nothing about the session (network, timeout, 429, 5xx), so the user can retry instead of being logged out.
export default function ServerStatus({ waking, message, onRetry }) {
  return (
    <div className="auth-shell">
      <Card role="status" className="auth-card space-y-4 text-center">
        {waking ? (
          <>
            <h1 className="auth-card-title">Waking up the server</h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Waking up the server, this can take up to a minute on the free tier.
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-card-title">Server is unavailable or waking up</h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {message}
            </p>
            <Button type="button" variant="primary" onClick={onRetry}>
              Retry
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
