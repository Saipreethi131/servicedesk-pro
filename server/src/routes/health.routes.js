import { Router } from "express";
import { env } from "../config/env.js";
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

export default router;
