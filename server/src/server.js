import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";

// Connect first so the server never accepts traffic it can't serve.
await connectDB();

const server = app.listen(env.port, () => {
  console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
});

let shuttingDown = false;

const shutdown = (reason, exitCode) => {
  if (shuttingDown) return; // a second signal must not start a second shutdown
  shuttingDown = true;
  console.log(`\n${reason} received. Shutting down gracefully...`);

  // Stop accepting new connections and let in-flight requests finish, then exit.
  // Close the DB only after HTTP has drained, so in-flight requests can still query.
  server.close(async () => {
    console.log("HTTP server closed.");
    await disconnectDB();
    console.log("MongoDB connection closed.");
    process.exit(exitCode);
  });

  // Safety net: if a connection never finishes, force the exit rather than hang forever.
  // unref() stops this timer from keeping the process alive on its own.
  setTimeout(() => {
    console.error("Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000).unref();
};

// A rejected promise nobody handled is a bug, so the process state is suspect: shut down with failure.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});

process.on("SIGINT", () => shutdown("SIGINT", 0)); // Ctrl+C
process.on("SIGTERM", () => shutdown("SIGTERM", 0)); // what hosting platforms send to stop a process
