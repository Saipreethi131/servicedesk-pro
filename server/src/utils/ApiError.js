export class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status to send
   * @param {string} message    safe to show the client
   * @param {Array<{field?: string, message: string}>} errors field-level detail
   * @param {boolean} isOperational true = expected failure we chose to throw; false = a bug
   * @param {string|null} code machine-readable reason (e.g. TOKEN_EXPIRED) for clients to branch on; the message is for humans
   */
  constructor(statusCode, message, errors = [], isOperational = true, code = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.code = code;
    // Keep this constructor out of the stack so it starts at the line that threw.
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Authentication required", code = null) {
    return new ApiError(401, message, [], true, code);
  }

  static forbidden(message = "You do not have permission to do this", code = null) {
    return new ApiError(403, message, [], true, code);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(409, message);
  }

  // 422: the request was well-formed (400 is for malformed) but the values are invalid.
  static validation(errors = [], message = "Validation failed") {
    return new ApiError(422, message, errors);
  }
}
