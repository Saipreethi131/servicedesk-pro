import { Router } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const router = Router();

router.get("/", (req, res) => {
  sendSuccess(res, {
    message: "Server is healthy",
    data: {
      environment: env.nodeEnv,
      uptime: process.uptime(), // seconds since the process started
      timestamp: new Date().toISOString(),
    },
  });
});

// TEMPORARY: exercises the error pipeline end to end. Remove before P1 ships.
router.get("/boom", () => {
  throw ApiError.badRequest("Deliberate test error", [
    { field: "demo", message: "This error was thrown on purpose" },
  ]);
});

export default router;
