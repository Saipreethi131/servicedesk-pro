const BASE_URL = import.meta.env.VITE_API_URL;
if (!BASE_URL) {
  throw new Error("VITE_API_URL is not set. Copy client/.env.example to client/.env and restart the dev server.");
}

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

// Carries the server's envelope fields, so pages can show the server's own message.
export class ApiError extends Error {
  constructor(status, message, { errors = [], code = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors; // [{ field, message }]
    this.code = code; // machine-readable reason, e.g. TOKEN_EXPIRED
  }
}

// One HTTP call, no retry logic. Resolves to the envelope { success, message, data }.
const send = async (path, { method = "GET", body, token } = {}) => {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include", // lets the browser send and store the httpOnly refresh cookie across origins
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when no response arrived at all (server down, offline, CORS blocked).
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  const payload = await response.json().catch(() => null); // an empty or non-JSON body is tolerated
  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? `Request failed (${response.status})`, {
      errors: payload?.errors ?? [],
      code: payload?.code ?? null,
    });
  }
  return payload;
};

// Every caller shares ONE refresh request. The server rotates refresh tokens and treats a reused one as theft,
// ending the whole session (D2.5). Two simultaneous refreshes would present the same token twice and log the
// user out; this happens for real when several requests expire together, and on every dev page load
// because React StrictMode runs effects twice.
let refreshInFlight = null;
export const refreshSession = () => {
  refreshInFlight ??= send("/auth/refresh", { method: "POST" })
    .then(({ data }) => {
      accessToken = data.accessToken;
      return data.accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

// auth: false for endpoints that must work without a session (login, logout).
export const request = async (path, { method = "GET", body, auth = true } = {}) => {
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
