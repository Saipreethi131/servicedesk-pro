import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// Express recognises error middleware by its arity: it must declare exactly four
// parameters, so `_next` stays even though it is never used.
export const errorHandler = (err, req, res, _next) => {
  // If the response has already started, we can't send a new one; let Express close the connection.
  if (res.headersSent) {
    return _next(err);
  }

  let statusCode = 500;
  let message = "Internal server error";
  let errors = [];
  let code = null;
  // The driver's own err.stack for an 11000 embeds its message, which embeds keyValue (the submitted value,
  // e.g. an email address) - the same thing errors/message above are already careful never to echo. So this
  // one error type never gets a stack field below, dev mode or not; every other branch is unaffected.
  let suppressStack = false;

  if (err instanceof ApiError && err.isOperational) {
    ({ statusCode, message, errors, code } = err);
  } else if (err.code === 11000) {
    // MongoDB unique-index violation. Name the field from keyPattern, but never
    // echo keyValue: it holds the submitted value (e.g. an email address).
    const fields = Object.keys(err.keyPattern ?? {});
    statusCode = 409;
    message = fields.length ? `${fields.join(", ")} already exists` : "Duplicate value";
    errors = fields.map((field) => ({ field, message: `${field} already exists` }));
    suppressStack = true;
  } else if (err.type === "entity.parse.failed") {
    // express.json() couldn't parse the body: the client sent malformed JSON.
    statusCode = 400;
    message = "Malformed JSON in request body";
  } else if (err.type === "entity.too.large") {
    // Body exceeded the express.json() limit; without this it would be reported as a 500.
    statusCode = 413;
    message = "Request body too large";
  }

  // Anything that fell through to 500 is a bug: log the real error here, never send it.
  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(code && { code }), // only when set, so existing responses keep their exact shape
    // A stack trace reveals file paths and code structure; development only. Never for 11000 (see suppressStack above).
    ...(env.isDevelopment && !suppressStack && { stack: err.stack }),
  });
};
