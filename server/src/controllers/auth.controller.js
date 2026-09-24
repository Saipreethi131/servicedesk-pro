import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import * as authService from "../services/auth.service.js";

const REFRESH_COOKIE = "refreshToken";

// Path limits the browser to sending this cookie only to /auth endpoints, not on every API call.
// clearCookie only removes a cookie whose name, path and flags match how it was set, so both share this.
const cookieOptions = {
  httpOnly: true, // not readable from JavaScript, which limits what an XSS bug can steal
  // Production: the frontend is on a different domain, so the cookie must be allowed cross-site ("none").
  // Browsers only accept "none" together with Secure. Locally, same-site requests can use the stricter "strict".
  sameSite: env.isProduction ? "none" : "strict",
  secure: env.isProduction, // Secure cookies are not sent over plain http://localhost
  path: "/api/v1/auth",
};

const setRefreshCookie = (res, { raw, maxAgeMs }) =>
  res.cookie(REFRESH_COOKIE, raw, { ...cookieOptions, maxAge: maxAgeMs });

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions);

export const login = async (req, res) => {
  // req.body is undefined in Express 5 when no body was sent; the service rejects non-strings.
  const { email, password } = req.body ?? {};
  const { accessToken, user, refresh } = await authService.login(email, password);

  setRefreshCookie(res, refresh);
  sendSuccess(res, { message: "Logged in", data: { accessToken, user } }); // refresh token is cookie-only
};

export const refresh = async (req, res) => {
  try {
    const { accessToken, refresh: next } = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    setRefreshCookie(res, next);
    sendSuccess(res, { message: "Token refreshed", data: { accessToken } });
  } catch (err) {
    // A rejected token is dead; don't leave the browser sending it again.
    if (err instanceof ApiError && err.statusCode === 401) clearRefreshCookie(res);
    throw err;
  }
};

export const me = (req, res) => {
  sendSuccess(res, { message: "Current user", data: { user: req.user } });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const { accessToken, refresh } = await authService.changePassword(
    req.user._id,
    currentPassword,
    newPassword
  );

  setRefreshCookie(res, refresh); // all old sessions were revoked; this replaces the browser's cookie
  sendSuccess(res, { message: "Password changed", data: { accessToken } });
};

export const logout = async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  sendSuccess(res, { message: "Logged out" });
};
