import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const router = Router();

// mongoose.connection.readyState is a number; 99 (uninitialized) is not a state we can be in once connectDB has run.
const DB_STATUS = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

router.get("/", (req, res) => {
  // readyState is a plain property read: no query or ping, so a pinger hitting this every few minutes costs nothing.
  // Only the status word is reported - never the host, database name, URI or an error message (D6.16).
  const dbStatus = DB_STATUS[mongoose.connection.readyState] ?? "disconnected";
  const data = {
    environment: env.nodeEnv,
    uptime: process.uptime(), // seconds since the process started
    timestamp: new Date().toISOString(),
    database: { status: dbStatus },
  };

  if (dbStatus !== "connected") {
    // sendSuccess only emits success: true, so the failure envelope is built here; same data shape on purpose.
    return res.status(503).json({ success: false, message: "Database unavailable", data });
  }
  sendSuccess(res, { message: "Server is healthy", data });
});

export default router;
