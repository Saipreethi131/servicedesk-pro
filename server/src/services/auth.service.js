import crypto from "node:crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { ApiError } from "../utils/ApiError.js";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/tokens.js";

const MIN_PASSWORD_LENGTH = 8; // characters: mirrors the minlength on the User model
const MAX_PASSWORD_BYTES = 72; // bcrypt silently ignores everything past 72 bytes

// Must match the cost in models/User.js, or the timing equalisation below is pointless.
const BCRYPT_COST = 12;

// Compared against when the email is unknown, so "no such user" takes as long as "wrong password"
// and response time can't be used to discover which emails exist (D2.7). Computed once at load.
const DUMMY_HASH = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), BCRYPT_COST);

const REFRESH_TTL_MS = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000;

// Deliberately identical for every failure reason: the client must not learn which one it was.
const invalidCredentials = () => ApiError.unauthorized("Invalid email or password");
const invalidRefreshToken = () => ApiError.unauthorized("Invalid or expired refresh token");

const issueRefreshToken = async (userId, familyId) => {
  const { raw, hash } = generateRefreshToken();
  await RefreshToken.create({
    userId,
    tokenHash: hash,
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { raw, maxAgeMs: REFRESH_TTL_MS };
};

const revokeFamily = (familyId) =>
  RefreshToken.updateMany({ familyId, revokedAt: null }, { revokedAt: new Date() });

const revokeAllForUser = (userId) =>
  RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });

export const login = async (email, password) => {
  // Rejecting non-strings blocks NoSQL operator injection such as { "email": { "$gt": "" } }.
  if (typeof email !== "string" || typeof password !== "string") {
    throw ApiError.badRequest("Email and password must be strings");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

  // Always run exactly one bcrypt comparison, whether or not the user exists.
  const passwordMatches = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !passwordMatches || !user.isActive) {
    throw invalidCredentials();
  }

  user.lastLoginAt = new Date();
  await user.save(); // password is unmodified, so the pre('save') hook does not re-hash it

  const refresh = await issueRefreshToken(user._id, crypto.randomUUID()); // new family per login
  return { accessToken: signAccessToken(user._id), user: user.toJSON(), refresh };
};

export const refresh = async (rawToken) => {
  if (typeof rawToken !== "string" || rawToken.length === 0) {
    throw invalidRefreshToken();
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken) });

  // The TTL index deletes expired rows only about once a minute, so check expiry ourselves.
  if (!stored || stored.expiresAt <= new Date()) {
    throw invalidRefreshToken();
  }

  // A revoked token being presented again means it was copied: either the thief or the
  // real client is replaying it. We can't tell which, so end the whole session (D2.5).
  if (stored.revokedAt) {
    await revokeFamily(stored.familyId);
    throw invalidRefreshToken();
  }

  const user = await User.findById(stored.userId);
  if (!user || !user.isActive) {
    await revokeAllForUser(stored.userId);
    throw invalidRefreshToken();
  }

  // Atomic "revoke if still unrevoked". A plain read-then-write would let two simultaneous requests
  // with the same token both pass the check above and both mint a successor.
  const claimed = await RefreshToken.updateOne(
    { _id: stored._id, revokedAt: null },
    { revokedAt: new Date() }
  );
  if (claimed.modifiedCount === 0) {
    await revokeFamily(stored.familyId); // lost the race: treated as reuse, the D2.5 trade-off
    throw invalidRefreshToken();
  }

  const next = await issueRefreshToken(user._id, stored.familyId); // same family
  return { accessToken: signAccessToken(user._id), refresh: next };
};

// Never throws for a missing, unknown or malformed token: logging out must always succeed (D2.6).
export const logout = async (rawToken) => {
  if (typeof rawToken !== "string" || rawToken.length === 0) return;
  const stored = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken) });
  if (stored) {
    await revokeFamily(stored.familyId);
  }
};

// Turns an access token into the user it belongs to. The database is the source of truth (D2.3):
// role, department and isActive are read fresh, never from the token.
export const getUserFromAccessToken = async (token) => {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    // The client refreshes on TOKEN_EXPIRED and re-logs-in on anything else, so the two must differ.
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Access token expired", "TOKEN_EXPIRED");
    }
    throw ApiError.unauthorized("Invalid access token", "INVALID_TOKEN");
  }

  const invalid = () => ApiError.unauthorized("Invalid access token", "INVALID_TOKEN");
  if (typeof payload.sub !== "string" || !mongoose.isValidObjectId(payload.sub)) throw invalid();

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw invalid();
  return user;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw ApiError.badRequest("Current password and new password must be strings");
  }

  // Cheap checks first, before spending ~250ms on bcrypt.
  // Characters, not bytes, for the minimum: a 6-character password can be 8 bytes, and the model would reject it on save.
  if (newPassword.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(newPassword, "utf8") > MAX_PASSWORD_BYTES) {
    throw ApiError.validation([
      {
        field: "newPassword",
        message: `Must be at least ${MIN_PASSWORD_LENGTH} characters and at most ${MAX_PASSWORD_BYTES} bytes`,
      },
    ]);
  }

  // req.user was loaded without the hash (select: false), so load it again with it.
  const user = await User.findById(userId).select("+password");
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid access token", "INVALID_TOKEN");
  }

  // 400, not 401: a client interceptor that reacts to 401 by refreshing would loop on this.
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect", [
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  }

  // Already known to equal the stored password, so plain string comparison is enough.
  if (newPassword === currentPassword) {
    throw ApiError.validation([
      { field: "newPassword", message: "New password must be different from the current password" },
    ]);
  }

  user.password = newPassword; // the pre('save') hook hashes it
  user.mustChangePassword = false;
  await user.save();

  // Every existing session ends, including any a thief may hold; then this one continues on a new family.
  await revokeAllForUser(user._id);
  const refresh = await issueRefreshToken(user._id, crypto.randomUUID());
  return { accessToken: signAccessToken(user._id), refresh };
};
