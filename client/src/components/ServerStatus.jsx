// Full-page state for the startup check. "waking" is shown while the check is slow; otherwise the check failed
// in a way that says nothing about the session (network, timeout, 429, 5xx), so the user can retry instead of being logged out.
export default function ServerStatus({ waking, message, onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div role="status" className="w-full max-w-sm space-y-4 rounded border border-gray-200 bg-white p-6 text-center">
        {waking ? (
          <>
            <h1 className="text-xl font-semibold">Waking up the server</h1>
            <p className="text-sm text-gray-600">Waking up the server, this can take up to a minute on the free tier.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Server is unavailable or waking up</h1>
            <p className="text-sm text-gray-600">{message}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
