import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { ROLES } from "../utils/constants.js";

const router = Router();

// Plain authenticate(): nothing here stays open to a user who must change their password (D2.8).
router.use(authenticate());

// Every signed-in role reads the tree (D5.5); asking for inactive ones is refused in the service for non-admins.
router.get("/", categoryController.listCategories);
router.post("/", authorize(ROLES.SYSTEM_ADMIN), categoryController.createCategory);
router.patch("/:id", authorize(ROLES.SYSTEM_ADMIN), categoryController.updateCategory);
// No DELETE: categories are deactivated, never removed (soft-delete convention).

export default router;
