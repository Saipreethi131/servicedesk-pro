import mongoose from "mongoose";
import User from "../models/User.js";
import Department from "../models/Department.js";
import RefreshToken from "../models/RefreshToken.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES, ROLE_VALUES } from "../utils/constants.js";
import { isObjectIdString } from "../utils/objectId.js";
import { canAssignRole, canManageUser, canViewUser, userScopeFilter } from "../utils/permissions.js";

const MIN_PASSWORD_LENGTH = 8; // characters: mirrors the model's minlength (bytes >= characters, so this also implies 8 bytes)
const MAX_PASSWORD_BYTES = 72; // bcrypt silently ignores everything past 72 bytes

// isValidObjectId() also accepts any 12-character string and some numbers; this accepts only 24 hex characters.
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// Body values can be objects or arrays ({ "$gt": "" }); require a real string before touching one.
const requireString = (value, field) => {
  if (typeof value !== "string") throw fieldError(field, `${field} must be a string`);
  return value;
};

// Works out which department the new user goes in and proves it exists.
// Returns an ObjectId (or the string form of one), or undefined for a SYSTEM_ADMIN with no department.
const resolveDepartment = async (actor, role, rawDepartment) => {
  let departmentId = rawDepartment ?? undefined; // null and undefined both mean "omitted"

  if (departmentId !== undefined) {
    if (typeof departmentId !== "string" || !OBJECT_ID_PATTERN.test(departmentId)) {
      throw fieldError("department", "department must be a valid id");
    }
  }

  if (actor.role === ROLES.IT_MANAGER) {
    // Fail closed (D3.4): a manager with no department has no scope to create users in.
    if (!actor.department) throw ApiError.forbidden();
    if (departmentId === undefined) {
      departmentId = actor.department; // default to their own department (D3.3)
    } else if (!actor.department.equals(departmentId)) {
      throw ApiError.forbidden("You can only create users in your own department");
    }
  }

  if (departmentId === undefined) {
    if (role !== ROLES.SYSTEM_ADMIN) throw fieldError("department", "department is required for this role"); // D3.9
    return undefined;
  }

  // Must exist AND be active: a deactivated department is soft-deleted and cannot receive new users.
  const department = await Department.exists({ _id: departmentId, isActive: true });
  if (!department) throw fieldError("department", "department does not exist or is inactive");
  return departmentId;
};

export const createUser = async (actor, input) => {
  const firstName = requireString(input.firstName, "firstName").trim();
  const lastName = requireString(input.lastName, "lastName").trim();
  const email = requireString(input.email, "email").trim().toLowerCase();
  const role = requireString(input.role, "role").trim();
  // Not trimmed: login compares the password exactly as typed, so trimming here would make the admin's copy wrong.
  const temporaryPassword = requireString(input.temporaryPassword, "temporaryPassword");

  // phone is optional, but if present it must still be a string.
  let phone;
  if (input.phone !== undefined && input.phone !== null) {
    phone = requireString(input.phone, "phone").trim() || undefined;
  }

  if (!ROLE_VALUES.includes(role)) throw fieldError("role", "role is not a valid role");
  // 403 rather than 400: the role exists but this actor may not hand it out (D3.3).
  if (!canAssignRole(actor, role)) throw ApiError.forbidden("You cannot assign this role");

  // Characters for the minimum (matches the model), bytes for the maximum (bcrypt's limit).
  if (temporaryPassword.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(temporaryPassword, "utf8") > MAX_PASSWORD_BYTES) {
    throw fieldError(
      "temporaryPassword",
      `temporaryPassword must be at least ${MIN_PASSWORD_LENGTH} characters and at most ${MAX_PASSWORD_BYTES} bytes`
    );
  }

  const department = await resolveDepartment(actor, role, input.department);

  try {
    // Named fields only, never a spread of input (D3.5). isActive and mustChangePassword are forced, never client-supplied.
    // No findOne() pre-check for the email: two simultaneous requests would both pass it. The unique index decides,
    // and its 11000 error reaches errorHandler as a 409.
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: temporaryPassword, // the pre('save') hook hashes it
      role,
      department,
      phone,
      isActive: true,
      mustChangePassword: true, // the user may do nothing but change this password (D2.8)
    });
    return user.toJSON(); // strips the password hash
  } catch (err) {
    // errorHandler doesn't know Mongoose validation errors and would answer 500. Report field + message only:
    // never err.value, which for the password field would be the plaintext.
    if (err instanceof mongoose.Error.ValidationError) {
      throw ApiError.validation(
        Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.name === "ValidatorError" ? e.message : "Invalid value",
        }))
      );
    }
    throw err;
  }
};

// Options arrive already validated by the controller (types, enum, id format, ranges).
// Deciding what this actor may see is authorization, so it lives here.
export const listUsers = async (actor, { page, limit, role, isActive, department }) => {
  // Throws 403 for anyone without a scope (D3.4). Never {} or { department: null } for a non-admin.
  const filter = { ...userScopeFilter(actor) };

  if (role !== undefined) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  if (department !== undefined) {
    // A department filter can narrow the scope but never widen it: if the scope already pins a
    // department (IT_MANAGER), asking for a different one is refused rather than silently ignored (D3.3).
    if (filter.department && !filter.department.equals(department)) {
      throw ApiError.forbidden("You can only view users in your own department");
    }
    filter.department = department;
  }

  // _id as a tie-breaker: createdAt can repeat, and an unstable order lets rows skip or repeat across pages.
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { items: users.map((u) => u.toJSON()), page, limit, total };
};

// Deliberately fetched with no scope filter: 404 means it doesn't exist, 403 means it exists but is out of
// scope (D3.4). The trade-off is that a 403 reveals the id is real.
export const getUserById = async (actor, id) => {
  const target = await User.findById(id);
  if (!target) throw ApiError.notFound("User not found");
  if (!canViewUser(actor, target)) throw ApiError.forbidden("You do not have permission to view this user");
  return target.toJSON();
};

// --- Update and password reset (D3.5-D3.8) ---

const SELF_PROTECTED_FIELDS = ["role", "department", "isActive"]; // D3.6: nobody edits their own access level

// Ends every session the user has (D2.6). Same one-liner as auth.service's private helper.
const revokeAllTokens = (userId) =>
  RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });

// Same rule as createUser: characters for the minimum (matches the model), bytes for the maximum (bcrypt's limit).
const assertPasswordAcceptable = (password) => {
  if (password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw fieldError(
      "temporaryPassword",
      `temporaryPassword must be at least ${MIN_PASSWORD_LENGTH} characters and at most ${MAX_PASSWORD_BYTES} bytes`
    );
  }
};

// Mongoose validation errors would otherwise reach errorHandler as a 500. Field + message only, never err.value.
const saveOrThrowValidation = async (user) => {
  try {
    await user.save();
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      throw ApiError.validation(
        Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.name === "ValidatorError" ? e.message : "Invalid value",
        }))
      );
    }
    throw err;
  }
};

// Shared by both functions: 404 if missing, 403 if the actor may not manage this record (D3.3, D3.4).
const loadManageableTarget = async (actor, id) => {
  const target = await User.findById(id);
  if (!target) throw ApiError.notFound("User not found");
  if (!canManageUser(actor, target)) throw ApiError.forbidden("You do not have permission to modify this user");
  return target;
};

// `input` has already been through pickAllowed, so it only holds whitelisted keys (D3.5).
export const updateUser = async (actor, id, input) => {
  if (Object.keys(input).length === 0) throw ApiError.badRequest("No updatable fields provided");

  const target = await loadManageableTarget(actor, id);

  // Self-protection (D3.6). A key being present is enough: the attempt itself is refused, even if the value is unchanged.
  if (target._id.equals(actor._id) && SELF_PROTECTED_FIELDS.some((key) => Object.hasOwn(input, key))) {
    throw ApiError.forbidden("You cannot change your own role, department or active status");
  }

  // Captured before any assignment: the last-admin guard and token revocation need the old values.
  const wasActiveAdmin = target.role === ROLES.SYSTEM_ADMIN && target.isActive;
  const wasActive = target.isActive;

  // Load -> assign -> save, so the model's validators run. Only named fields are ever assigned.
  if (input.firstName !== undefined) target.firstName = requireString(input.firstName, "firstName").trim();
  if (input.lastName !== undefined) target.lastName = requireString(input.lastName, "lastName").trim();
  if (input.phone !== undefined) {
    // null or an empty string clears the phone number.
    target.phone = input.phone === null ? undefined : requireString(input.phone, "phone").trim() || undefined;
  }

  if (input.role !== undefined) {
    const role = requireString(input.role, "role").trim();
    if (!ROLE_VALUES.includes(role)) throw fieldError("role", "role is not a valid role");
    // Applies to the NEW role: an IT_MANAGER can't promote anyone to SYSTEM_ADMIN or IT_MANAGER (D3.3).
    if (!canAssignRole(actor, role)) throw ApiError.forbidden("You cannot assign this role");
    target.role = role;
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") throw fieldError("isActive", "isActive must be true or false");
    target.isActive = input.isActive;
  }

  if (input.department !== undefined) {
    // Only SYSTEM_ADMIN moves people between departments (D3.3), so this is checked before the format.
    if (actor.role !== ROLES.SYSTEM_ADMIN) throw ApiError.forbidden("Only a SYSTEM_ADMIN can change a user's department");
    if (input.department === null) {
      target.department = undefined; // legal only if the user ends up a SYSTEM_ADMIN; checked below
    } else {
      if (!isObjectIdString(input.department)) throw fieldError("department", "department must be a valid id");
      if (!(await Department.exists({ _id: input.department, isActive: true }))) {
        throw fieldError("department", "department does not exist or is inactive");
      }
      target.department = input.department;
    }
  }

  // Judged on the final state, so a demotion without a department is caught too (D3.9).
  if (target.role !== ROLES.SYSTEM_ADMIN && !target.department) {
    throw fieldError("department", "department is required for this role");
  }

  // Last-admin guard (D3.6): count the OTHER active admins. Check-then-write, so two admins demoting each
  // other at the same instant can still both pass; that race is accepted for now.
  const removesAdmin = wasActiveAdmin && (target.role !== ROLES.SYSTEM_ADMIN || !target.isActive);
  if (removesAdmin) {
    const others = await User.countDocuments({ role: ROLES.SYSTEM_ADMIN, isActive: true, _id: { $ne: target._id } });
    if (others === 0) throw ApiError.conflict("Cannot remove the last active SYSTEM_ADMIN");
  }

  await saveOrThrowValidation(target);

  // After the save: a failed save must not log the user out. Access is already cut off by the isActive check on
  // every request (D2.3); this also stops the refresh token from being used (D3.7).
  if (wasActive && !target.isActive) await revokeAllTokens(target._id);

  return target.toJSON();
};

// Admin-issued temporary password (D3.8). Your own password goes through /auth/change-password only.
export const resetPassword = async (actor, id, input) => {
  const target = await loadManageableTarget(actor, id);
  if (target._id.equals(actor._id)) {
    throw ApiError.forbidden("Use change-password to change your own password");
  }

  const temporaryPassword = requireString(input.temporaryPassword, "temporaryPassword");
  assertPasswordAcceptable(temporaryPassword);

  target.password = temporaryPassword; // the pre('save') hook hashes it
  target.mustChangePassword = true; // the user may do nothing but change it (D2.8)
  await saveOrThrowValidation(target);

  // The old password may be in someone else's hands; every session it opened must end.
  await revokeAllTokens(target._id);

  return target.toJSON(); // no password: toJSON strips it
};
