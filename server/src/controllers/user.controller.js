import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLE_VALUES } from "../utils/constants.js";
import { isObjectIdString } from "../utils/objectId.js";
import { pickAllowed } from "../utils/pick.js";
import * as userService from "../services/user.service.js";

const LIST_QUERY_FIELDS = ["page", "limit", "role", "isActive", "department"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const badParam = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// Query values are strings, or arrays when a key is repeated (?role=a&role=b); accept only a single string.
const requireQueryString = (value, field) => {
  if (typeof value !== "string") throw badParam(field, `${field} must be a single value`);
  return value;
};

// Digits only, so "1e3", "-1", "0x10", "2.5" and " 3" are all rejected instead of being coerced by Number().
const parsePositiveInt = (value, field, fallback) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(requireQueryString(value, field))) throw badParam(field, `${field} must be a positive integer`);
  const n = Number(value);
  if (n < 1) throw badParam(field, `${field} must be at least 1`);
  return n;
};

const parseListQuery = (query) => {
  const q = pickAllowed(query, LIST_QUERY_FIELDS); // unknown params -> 400 naming them

  const page = parsePositiveInt(q.page, "page", 1);
  const limit = parsePositiveInt(q.limit, "limit", DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) throw badParam("limit", `limit must be at most ${MAX_LIMIT}`);
  // A huge page would make skip() meaningless; reject anything past what a number can hold exactly.
  if (!Number.isSafeInteger((page - 1) * limit)) throw badParam("page", "page is too large");

  const parsed = { page, limit };

  if (q.role !== undefined) {
    if (!ROLE_VALUES.includes(requireQueryString(q.role, "role"))) throw badParam("role", "role is not a valid role");
    parsed.role = q.role;
  }
  if (q.isActive !== undefined) {
    const raw = requireQueryString(q.isActive, "isActive");
    if (raw !== "true" && raw !== "false") throw badParam("isActive", 'isActive must be "true" or "false"');
    parsed.isActive = raw === "true";
  }
  if (q.department !== undefined) {
    if (!isObjectIdString(q.department)) throw badParam("department", "department must be a valid id");
    parsed.department = q.department;
  }
  return parsed;
};

// Anything else in the body (isActive, mustChangePassword, _id...) is rejected with a 400 naming it (D3.5).
const CREATE_USER_FIELDS = ["firstName", "lastName", "email", "role", "department", "phone", "temporaryPassword"];

export const createUser = async (req, res) => {
  const input = pickAllowed(req.body, CREATE_USER_FIELDS);
  const user = await userService.createUser(req.user, input);
  sendSuccess(res, { statusCode: 201, message: "User created", data: { user } });
};

export const listUsers = async (req, res) => {
  const result = await userService.listUsers(req.user, parseListQuery(req.query));
  sendSuccess(res, { message: "Users retrieved", data: result });
};

export const getUser = async (req, res) => {
  if (!isObjectIdString(req.params.id)) throw badParam("id", "id must be a valid id");
  const user = await userService.getUserById(req.user, req.params.id);
  sendSuccess(res, { message: "User retrieved", data: { user } });
};

// role, department and isActive are allowed here, but the service refuses them on yourself (D3.6) and gates them by role.
const UPDATE_USER_FIELDS = ["firstName", "lastName", "phone", "role", "department", "isActive"];
const RESET_PASSWORD_FIELDS = ["temporaryPassword"];

const requireIdParam = (id) => {
  if (!isObjectIdString(id)) throw badParam("id", "id must be a valid id");
  return id;
};

export const updateUser = async (req, res) => {
  const id = requireIdParam(req.params.id);
  const input = pickAllowed(req.body, UPDATE_USER_FIELDS);
  const user = await userService.updateUser(req.user, id, input);
  sendSuccess(res, { message: "User updated", data: { user } });
};

export const resetPassword = async (req, res) => {
  const id = requireIdParam(req.params.id);
  const input = pickAllowed(req.body, RESET_PASSWORD_FIELDS);
  const user = await userService.resetPassword(req.user, id, input);
  sendSuccess(res, { message: "Temporary password set; the user must change it at next login", data: { user } });
};
