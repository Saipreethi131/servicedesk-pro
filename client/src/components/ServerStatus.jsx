import Button from "./ui/Button.jsx";
import ProgressBar from "./ui/ProgressBar.jsx";

// Full-page state for the startup check. "waking" is shown while the check is slow; otherwise the check failed
// in a way that says nothing about the session (network, timeout, 429, 5xx), so the user can retry instead of being logged out.
export default function ServerStatus({ waking, message, onRetry }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <div role="status" className="w-full max-w-sm space-y-4 text-center">
        {waking ? (
          <>
            <h1 className="text-base font-semibold text-fg">Waking up the server</h1>
            <p className="text-sm text-muted">Waking up the server, this can take up to a minute.</p>
            <ProgressBar indeterminate label="Waking up the server" />
          </>
        ) : (
          <>
            <h1 className="text-base font-semibold text-fg">Server is unavailable or waking up</h1>
            <p className="text-sm text-muted">{message}</p>
            <Button type="button" variant="primary" onClick={onRetry}>
              Retry
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
