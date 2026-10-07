import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { TICKET_STATUS_VALUES, PRIORITY_VALUES } from "../utils/constants.js";
import { isObjectIdString } from "../utils/objectId.js";
import { pickAllowed } from "../utils/pick.js";
import * as ticketService from "../services/ticket.service.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const badParam = (field, message) => ApiError.badRequest(message, [{ field, message }]);

const requireIdParam = (id) => {
  if (!isObjectIdString(id)) throw badParam("id", "id must be a valid id");
  return id;
};

// Query values are strings, or arrays when a key is repeated; accept only a single string.
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

const LIST_QUERY_FIELDS = ["page", "limit", "status", "priority"];

const parseListQuery = (query) => {
  const q = pickAllowed(query, LIST_QUERY_FIELDS); // unknown params -> 400 naming them

  const page = parsePositiveInt(q.page, "page", 1);
  const limit = parsePositiveInt(q.limit, "limit", DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) throw badParam("limit", `limit must be at most ${MAX_LIMIT}`);
  if (!Number.isSafeInteger((page - 1) * limit)) throw badParam("page", "page is too large");

  const parsed = { page, limit };
  if (q.status !== undefined) {
    if (!TICKET_STATUS_VALUES.includes(requireQueryString(q.status, "status"))) {
      throw badParam("status", "status is not a valid status");
    }
    parsed.status = q.status;
  }
  if (q.priority !== undefined) {
    if (!PRIORITY_VALUES.includes(requireQueryString(q.priority, "priority"))) {
      throw badParam("priority", "priority is not a valid priority");
    }
    parsed.priority = q.priority;
  }
  return parsed;
};

const CREATE_TICKET_FIELDS = ["title", "description", "category", "impact", "urgency", "requester"];
const TRANSITION_FIELDS = ["toStatus", "assigneeId"];
const PRIORITY_OVERRIDE_FIELDS = ["value", "reason"];
const COMMENT_FIELDS = ["body", "isInternal"];

export const createTicket = async (req, res) => {
  const input = pickAllowed(req.body, CREATE_TICKET_FIELDS);
  const ticket = await ticketService.createTicket(req.user, input);
  sendSuccess(res, { statusCode: 201, message: "Ticket created", data: { ticket } });
};

export const listTickets = async (req, res) => {
  const result = await ticketService.listTickets(req.user, parseListQuery(req.query));
  sendSuccess(res, { message: "Tickets retrieved", data: result });
};

export const getTicket = async (req, res) => {
  const id = requireIdParam(req.params.id);
  const ticket = await ticketService.getTicket(req.user, id);
  sendSuccess(res, { message: "Ticket retrieved", data: { ticket } });
};

const MAX_SEARCH_LENGTH = 100;

export const listRequesterOptions = async (req, res) => {
  const { q } = pickAllowed(req.query, ["q"]); // unknown params -> 400 naming them
  if (q !== undefined && requireQueryString(q, "q").length > MAX_SEARCH_LENGTH) {
    throw badParam("q", `q must be at most ${MAX_SEARCH_LENGTH} characters`);
  }
  const items = await ticketService.listRequesterOptions(req.user, q);
  sendSuccess(res, { message: "Requester options retrieved", data: { items } });
};

export const listAssignableUsers = async (req, res) => {
  const id = requireIdParam(req.params.id);
  const items = await ticketService.listAssignableUsers(req.user, id);
  sendSuccess(res, { message: "Assignable users retrieved", data: { items } });
};

// toStatus is a validated body field, never part of the URL; enum membership is checked in the service.
export const transitionTicket = async (req, res) => {
  const id = requireIdParam(req.params.id);
  const input = pickAllowed(req.body, TRANSITION_FIELDS);
  if (typeof input.toStatus !== "string") throw badParam("toStatus", "toStatus is required");
  const ticket = await ticketService.transitionTicket(req.user, id, input.toStatus, { assigneeId: input.assigneeId });
  sendSuccess(res, { message: "Ticket updated", data: { ticket } });
};

export const setPriorityOverride = async (req, res) => {
  const id = requireIdParam(req.params.id);
  const input = pickAllowed(req.body, PRIORITY_OVERRIDE_FIELDS);
  const ticket = await ticketService.setPriorityOverride(req.user, id, input);
  sendSuccess(res, { message: "Priority override set", data: { ticket } });
};

export const createComment = async (req, res) => {
  const ticketId = requireIdParam(req.params.id);
  const input = pickAllowed(req.body, COMMENT_FIELDS);
  const comment = await ticketService.createComment(req.user, ticketId, input);
  sendSuccess(res, { statusCode: 201, message: "Comment created", data: { comment } });
};

export const listComments = async (req, res) => {
  const ticketId = requireIdParam(req.params.id);
  const result = await ticketService.listComments(req.user, ticketId);
  sendSuccess(res, { message: "Comments retrieved", data: result });
};
