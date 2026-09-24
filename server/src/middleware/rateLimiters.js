import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Forward a 429 ApiError instead of letting the library write its own response,
// so a throttled request gets the same envelope as every other error.
const createLimiter = (limit, message, options = {}) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    standardHeaders: true, // RateLimit-* headers, and Retry-After when blocked
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, message)),
    ...options,
  });

// Counters live in this process's memory: they reset on restart and are not shared across instances.
// Successful logins (status < 400) are not counted: the limit exists to stop password guessing,
// and a legitimate user logging in and out must not lock themselves out.
export const loginLimiter = createLimiter(10, "Too many login attempts. Try again later.", {
  skipSuccessfulRequests: true,
});
export const refreshLimiter = createLimiter(30, "Too many refresh attempts. Try again later.");
