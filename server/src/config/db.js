import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  // These fire after the initial connection succeeds. The driver retries by itself,
  // so we only log: exiting here would turn a brief network blip into an outage.
  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));

  try {
    await mongoose.connect(env.mongoUri, {
      // Index builds can be slow and lock work on large collections; in production
      // they should be a deliberate step, not a side effect of booting.
      autoIndex: !env.isProduction,
      // Default is 30s, which makes a dead host look like a hang.
      serverSelectionTimeoutMS: 5000,
    });
    const { host, name } = mongoose.connection;
    console.log(`MongoDB connected: ${host}/${name}`); // not the URI: it may hold credentials
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

export const disconnectDB = () => mongoose.disconnect();
