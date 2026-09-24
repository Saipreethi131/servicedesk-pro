const BASE_URL = import.meta.env.VITE_API_URL;

// Not thrown at import time: an exception during module load happens before React mounts, so the user would see a white page.
// main.jsx checks this flag and renders a configuration screen instead of the app.
export const isApiUrlMissing = !BASE_URL;

// The access token lives in memory only. localStorage is readable by any script on the page, so an XSS bug
// could steal it. A reload loses it on purpose; AuthContext restores it from the httpOnly refresh cookie.
let accessToken = null;
let onSessionCleared = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};

// AuthContext registers here so an unrecoverable 401 inside a request can sign the user out of the UI.
export const onSessionExpired = (handler) => {
  onSessionCleared = handler;
};

const clearSession = () => {
  accessToken = null;
  onSessionCleared();
};

// AuthContext registers here to be told about every 403, so it can re-read the user: a 403 often means the role or
// mustChangePassword changed on the server since we last looked (PASSWORD_CHANGE_REQUIRED is the explicit case).
// api.js only reports; AuthContext decides what to do, so api.js never imports it.
let onForbiddenHandler = () => {};
export const onForbidden = (handler) => {
  onForbiddenHandler = handler;
};

// Carries the server's envelope fields, so pages can show the server's own message.
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(status, message, { errors = [], code = null, isNetworkError = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors; // [{ field, message }]
    this.code = code; // machine-readable reason, e.g. TOKEN_EXPIRED
    this.isNetworkError = isNetworkError; // true when no HTTP response arrived: offline, server down, CORS blocked, or timed out
  }
}

const networkError = (timedOut) =>
  new ApiError(
    0,
    timedOut
      ? "Cannot reach the server (no response after 30 seconds). Try again in a moment."
      : "Cannot reach the server. Check your connection and try again.",
    { isNetworkError: true }
  );

// One HTTP call, no retry logic. Resolves to the envelope { success, message, data }.
const send = async (path, { method = "GET", body, token } = {}) => {
  if (isApiUrlMissing) throw new Error("VITE_API_URL is not set"); // main.jsx never mounts the app in this state; this guards future callers
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  let payload;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include", // lets the browser send and store the httpOnly refresh cookie across origins
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    // Read the body before the timer is cleared: headers can arrive and the body still stall.
    payload = await response.json().catch(() => null); // an empty or non-JSON body is tolerated
  } catch {
    // fetch only rejects when no response arrived at all (server down, offline, CORS blocked, or our abort).
    throw networkError(controller.signal.aborted);
  } finally {
    clearTimeout(timer);
  }

  // The .catch above would hide an abort during the body read as "empty body", so check the signal itself.
  if (controller.signal.aborted) throw networkError(true);

  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? `Request failed (${response.status})`, {
      errors: payload?.errors ?? [],
      code: payload?.code ?? null,
    });
  }
  return payload;
};

const WAKE_DEADLINE_MS = 75_000; // whole wake-up, across all attempts
const WAKE_ATTEMPT_TIMEOUT_MS = 15_000;
const WAKE_RETRY_DELAY_MS = 2_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One ping to GET /health. Resolves true only on a 200; a proxy's 502/503 while the server boots, a timeout or a network
// error all resolve false so the caller keeps polling.
const pingHealth = async (timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // No credentials and no Authorization header: nothing about the user's session is sent.
    const response = await fetch(`${BASE_URL}/health`, { credentials: "omit", signal: controller.signal });
    return response.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

// Free-tier hosts sleep when idle and take up to a minute to boot. Startup calls this BEFORE POST /auth/refresh because
// refresh ROTATES the token: the server revokes the old one and issues a new one. If the browser gave up on a refresh that
// the server had already processed, the new cookie would be lost and the next attempt would present the revoked token,
// which reuse detection (D2.5) treats as theft and answers by ending the whole session. GET /health is public, rate-limit-free
// and changes nothing, so it can be abandoned, repeated or timed out safely while the server wakes.
// Callers share one poll (as with refreshSession), so StrictMode's double effect run doesn't start two loops.
let wakeInFlight = null;
export const wakeServer = () => {
  wakeInFlight ??= (async () => {
    const deadline = Date.now() + WAKE_DEADLINE_MS;
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      if (await pingHealth(Math.min(WAKE_ATTEMPT_TIMEOUT_MS, remaining))) return;
      if (deadline - Date.now() <= WAKE_RETRY_DELAY_MS) break; // no room for another attempt after the pause
      await sleep(WAKE_RETRY_DELAY_MS);
    }
    throw new ApiError(0, `The server did not respond within ${WAKE_DEADLINE_MS / 1000} seconds. Try again in a moment.`, {
      isNetworkError: true,
    });
  })().finally(() => {
    wakeInFlight = null;
  });
  return wakeInFlight;
};

// Every caller shares ONE refresh request. The server rotates refresh tokens and treats a reused one as theft,
// ending the whole session (D2.5). Two simultaneous refreshes would present the same token twice and log the
// user out; this happens for real when several requests expire together, and on every dev page load
// because React StrictMode runs effects twice.
const REFRESH_LOCK = "servicedesk-refresh";

const doRefresh = () =>
  send("/auth/refresh", { method: "POST" }).then(({ data }) => {
    accessToken = data.accessToken;
    return data.accessToken;
  });

// The in-tab sharing above cannot see other tabs. Two tabs sending the same refresh cookie at once (a browser restoring
// several tabs, or two tabs whose tokens expire together) look like a replayed token: reuse detection (D2.5) revokes the
// whole family and logs both out. A Web Lock is held across all tabs of this origin, so the refreshes run one after another.
// The browser attaches the cookie when a request is sent, not when it is queued, so the waiting tab sends the cookie the
// first tab just received. The lock is held until the response is back and the token stored (doRefresh's whole chain),
// and only around this call: wakeServer() pings are side-effect free and must not wait behind a refresh.
// navigator.locks is missing in insecure contexts and old browsers; there we keep the per-tab behaviour.
const refreshAcrossTabs = () =>
  typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(REFRESH_LOCK, doRefresh)
    : doRefresh();

let refreshInFlight = null;
export const refreshSession = () => {
  refreshInFlight ??= refreshAcrossTabs().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

// auth: false for endpoints that must work without a session (login, logout).
const execute = async (path, { method = "GET", body, auth = true } = {}) => {
  if (!auth) return send(path, { method, body });

  try {
    return await send(path, { method, body, token: accessToken });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    // Any 401 other than an expired token (INVALID_TOKEN, no token, deactivated user) cannot be repaired by refreshing.
    if (err.code !== "TOKEN_EXPIRED") {
      clearSession();
      throw err;
    }

    try {
      const token = await refreshSession();
      return await send(path, { method, body, token }); // retried once, never in a loop
    } catch (retryErr) {
      // A 401 here means the refresh token is dead too. Anything else (403, 5xx, network) leaves the session alone.
      if (retryErr instanceof ApiError && retryErr.status === 401) clearSession();
      throw retryErr;
    }
  }
};

// skipForbiddenHook: set by the request the 403 hook itself makes (AuthContext's refreshUser), so a 403 on that request
// can never call the hook again and loop. The error is still thrown to the caller either way.
export const request = async (path, options = {}) => {
  try {
    return await execute(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403 && !options.skipForbiddenHook) onForbiddenHandler(err);
    throw err;
  }
};
