import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Order matters: each middleware runs in the order it is registered.
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser()); // populates req.cookies; the refresh token cookie is read from there (D2.4)
if (env.isDevelopment) {
  app.use(morgan("dev"));
}

app.use("/api/v1", routes);

// These two must stay last: notFound catches whatever no route matched,
// and errorHandler catches everything passed to next(err) or thrown above.
app.use(notFound);
app.use(errorHandler);

export default app;
