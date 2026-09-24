import { ApiError } from "../utils/ApiError.js";
import { getUserFromAccessToken } from "../services/auth.service.js";

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

// Factory, so a route can opt out of the password-change gate: authenticate({ allowPasswordChange: true }).
export const authenticate =
  ({ allowPasswordChange = false } = {}) =>
  async (req, res, next) => {
    const match = BEARER_PATTERN.exec(req.headers.authorization ?? "");
    if (!match) {
      throw ApiError.unauthorized("Authentication required");
    }

    const user = await getUserFromAccessToken(match[1]);

    // A user holding an admin-issued temporary password may do nothing but change it (D2.8).
    if (user.mustChangePassword && !allowPasswordChange) {
      throw ApiError.forbidden("You must change your password before continuing", "PASSWORD_CHANGE_REQUIRED");
    }

    req.user = user; // the database document, never the token's contents
    next();
  };
