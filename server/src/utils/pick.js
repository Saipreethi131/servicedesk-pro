import { ApiError } from "./ApiError.js";

const isPlainObject = (value) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// Whitelist for request bodies (D3.5). Unknown keys are rejected, not silently dropped,
// so a client trying to send `role` learns it was refused.
export const pickAllowed = (body, allowedKeys) => {
  if (!isPlainObject(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }

  // Object.keys lists own keys only, so a JSON body containing "__proto__" shows up here and is rejected.
  const unknown = Object.keys(body).filter((key) => !allowedKeys.includes(key));
  if (unknown.length > 0) {
    throw ApiError.badRequest(
      `Unexpected field(s): ${unknown.join(", ")}`,
      unknown.map((field) => ({ field, message: "This field is not allowed" }))
    );
  }

  // Copy only keys the body actually has, so an omitted optional field stays omitted instead of becoming undefined.
  return Object.fromEntries(allowedKeys.filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
};
