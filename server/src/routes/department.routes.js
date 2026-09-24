import { Router } from "express";
import * as departmentController from "../controllers/department.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { ROLES } from "../utils/constants.js";

const router = Router();

// Plain authenticate(): nothing here stays open to a user who must change their password (D2.8).
router.use(authenticate());

// Coarse gates only; an IT_MANAGER's narrower view is applied in the service (D3.1).
router.get("/", authorize(ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER), departmentController.listDepartments);
router.post("/", authorize(ROLES.SYSTEM_ADMIN), departmentController.createDepartment);

export default router;
