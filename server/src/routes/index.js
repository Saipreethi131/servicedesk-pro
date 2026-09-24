import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import departmentRoutes from "./department.routes.js";
import referenceRoutes from "./reference.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/reference", referenceRoutes);
router.use("/health", healthRoutes);

export default router;
