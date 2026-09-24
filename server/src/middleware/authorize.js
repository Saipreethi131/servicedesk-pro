import { ApiError } from "../utils/ApiError.js";
import { ROLE_VALUES } from "../utils/constants.js";

// Coarse route gate (D3.1): says which roles may reach a route at all. Record-level checks live in services.
// Usage: router.get("/", authenticate(), authorize(ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER), controller)
export const authorize = (...roles) => {
  // Runs when the route file loads, so a bad role list crashes at boot instead of failing at request time.
  if (roles.length === 0) {
    throw new Error("authorize() needs at least one role");
  }
  const unknown = roles.filter((role) => !ROLE_VALUES.includes(role));
  if (unknown.length > 0) {
    throw new Error(`authorize() received unknown role(s): ${unknown.map(String).join(", ")}`);
  }

  return (req, res, next) => {
    // Fail closed: reaching here without authenticate() ahead of us is a 401, never a pass-through.
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden("You do not have permission to perform this action");
    }
    next();
  };
};
