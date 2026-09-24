import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginLimiter, refreshLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/login", loginLimiter, authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout); // public on purpose: it must work with an expired session (D2.6)

// These two stay reachable while mustChangePassword is set; everything else will be blocked by the default (D2.8).
router.get("/me", authenticate({ allowPasswordChange: true }), authController.me);
router.post(
  "/change-password",
  authenticate({ allowPasswordChange: true }),
  authController.changePassword
);

export default router;
