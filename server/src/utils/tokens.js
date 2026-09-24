import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const ALGORITHM = "HS256";

// Payload is { sub } only: role and department are read from the database on every request (D2.2, D2.3).
export const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwtAccessSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwtAccessTtl,
  });

// Pinning `algorithms` stops a token from choosing its own algorithm (e.g. "none").
// Errors (TokenExpiredError, JsonWebTokenError) propagate; the authenticate middleware decides what they mean.
export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwtAccessSecret, { algorithms: [ALGORITHM] });

// SHA-256, not bcrypt: the token is 384 random bits, so there is nothing to brute-force,
// and the database must be able to look it up by its hash.
export const hashRefreshToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

export const generateRefreshToken = () => {
  const raw = crypto.randomBytes(48).toString("base64url");
  return { raw, hash: hashRefreshToken(raw) };
};
