import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { ROLES } from "../utils/constants.js";

const router = Router();

// Plain authenticate(): unlike /auth/me, nothing here stays open to a user who must change their password (D2.8).
router.use(authenticate());

const canManageUsers = authorize(ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER); // coarse gate only; scope is applied in the service (D3.1)

router.post("/", canManageUsers, userController.createUser);
router.get("/", canManageUsers, userController.listUsers);
router.get("/:id", canManageUsers, userController.getUser);
router.patch("/:id", canManageUsers, userController.updateUser);
router.post("/:id/reset-password", canManageUsers, userController.resetPassword);

export default router;
