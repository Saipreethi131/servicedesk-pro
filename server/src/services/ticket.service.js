import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES, TICKET_STATUS, TICKET_STATUS_VALUES, PRIORITY_VALUES, SLA_TARGETS } from "../utils/constants.js";
import { derivePriority } from "../utils/priority.js";
import { canTransition } from "../utils/ticketTransitions.js";
import { addBusinessMinutes } from "../utils/businessHours.js";
import { isObjectIdString } from "../utils/objectId.js";

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// Applied to every ticket returned to a client (list, single, create, transition, override), never before the
// internal scope/transition checks that need the raw ids (isInTicketScope, canTransition, canOverridePriorityOn,
// the .equals() calls in transitionTicket) - those must run against plain ObjectIds, not populated sub-documents.
// priorityOverride.by stays a raw id. history[].by and Comment.author are resolved to { name, role } via
// loadUserNames: history by presentTicket (every full-ticket response), comments by listComments - see D6.9.
const TICKET_POPULATE = [
  { path: "requester", select: "firstName lastName email" },
  { path: "assignee", select: "firstName lastName email" }, // stays null when unassigned; populate is a no-op on null
  { path: "department", select: "name" },
  { path: "category", select: "name" },
];

// Resolves user ids to display-only { name, role }. Not populate(): populate yields null both for a system action
// (by: null, e.g. SLA escalation) and for a user that no longer exists, and the two must read differently.
// Selects only firstName/lastName/role, so email and auth fields can never reach the response. lean() skips the
// document wrapper (and its toJSON/virtuals) because we shape the output ourselves.
const loadUserNames = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const users = unique.length ? await User.find({ _id: { $in: unique } }).select("firstName lastName role").lean() : [];
  const byId = new Map(users.map((u) => [String(u._id), { name: `${u.firstName} ${u.lastName}`, role: u.role }]));
  // null stays null (system); an id with no matching user becomes "Unknown user".
  return (id) => (id ? (byId.get(String(id)) ?? { name: "Unknown user" }) : null);
};

// Body values can be objects or arrays ({ "$gt": "" }); require a real string before touching one.
const requireString = (value, field) => {
  if (typeof value !== "string") throw fieldError(field, `${field} must be a string`);
  return value;
};

// Mongoose validation errors would otherwise reach errorHandler as a 500 (same convention as user.service.js).
const mapValidationError = (err) => {
  if (err instanceof mongoose.Error.ValidationError) {
    throw ApiError.validation(
      Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.name === "ValidatorError" ? e.message : "Invalid value",
      }))
    );
  }
  throw err;
};

// D6.4, as a filter for list queries. Throws rather than returning {} or a department-less filter for a non-admin
// (same fail-closed shape as userScopeFilter in permissions.js).
// The requester of a ticket always sees it, whatever their role (D6.10), so staff scopes are { requester OR role scope }.
const ticketScopeFilter = (actor) => {
  const own = { requester: actor._id };
  if (actor.role === ROLES.SYSTEM_ADMIN) return {};
  if (actor.role === ROLES.EMPLOYEE) return own;
  if (actor.role === ROLES.IT_MANAGER) {
    if (!actor.department) return own; // no department -> no department scope, but their own tickets still show
    return { $or: [own, { department: actor.department }] };
  }
  if (actor.role === ROLES.TECHNICIAN || actor.role === ROLES.ASSET_MANAGER) {
    if (!actor.department) return own;
    return {
      $or: [own, { department: actor.department, $or: [{ assignee: actor._id }, { assignee: null }] }],
    };
  }
  throw ApiError.forbidden();
};

// D6.4, as a predicate against an already-loaded ticket (used where a single ticket, not a list, needs checking -
// 404 if it doesn't exist, this decides the 403). Mirrors ticketScopeFilter's rules exactly.
const isInTicketScope = (actor, ticket) => {
  if (ticket.requester.equals(actor._id)) return true; // D6.10: the requester is always in scope
  if (actor.role === ROLES.SYSTEM_ADMIN) return true;
  if (actor.role === ROLES.IT_MANAGER) {
    return Boolean(actor.department) && ticket.department.equals(actor.department);
  }
  if (actor.role === ROLES.TECHNICIAN || actor.role === ROLES.ASSET_MANAGER) {
    if (!actor.department || !ticket.department.equals(actor.department)) return false;
    return ticket.assignee === null || ticket.assignee.equals(actor._id);
  }
  if (actor.role === ROLES.EMPLOYEE) return ticket.requester.equals(actor._id);
  return false;
};

// Shared by setPriorityOverride (as a guard) and getTicket (as a computed field), so the rule lives in one place.
const canOverridePriorityOn = (actor, ticket) =>
  actor.role === ROLES.SYSTEM_ADMIN ||
  (actor.role === ROLES.IT_MANAGER && Boolean(actor.department) && ticket.department.equals(actor.department));

const REQUESTER_ONLY_ROLES = [ROLES.EMPLOYEE, ROLES.TECHNICIAN, ROLES.ASSET_MANAGER];

export const createTicket = async (actor, input) => {
  const title = requireString(input.title, "title").trim();
  if (title.length < 5 || title.length > 200) throw fieldError("title", "title must be 5-200 characters");

  const description = requireString(input.description, "description").trim();
  if (description.length < 10 || description.length > 5000) {
    throw fieldError("description", "description must be 10-5000 characters");
  }

  if (!isObjectIdString(input.category)) throw fieldError("category", "category must be a valid id");

  // derivePriority also validates impact/urgency (400, D5.1) - the single source of truth, not duplicated here.
  const priority = derivePriority(input.impact, input.urgency);

  // --- requester and department (D6.3 scoping note under createTicket) ---
  let requesterId;
  let department;

  if (REQUESTER_ONLY_ROLES.includes(actor.role)) {
    requesterId = actor._id;
    department = actor.department;
  } else {
    // IT_MANAGER / SYSTEM_ADMIN may file on someone else's behalf.
    if (input.requester !== undefined && input.requester !== null) {
      if (!isObjectIdString(input.requester)) throw fieldError("requester", "requester must be a valid id");
      const targetUser = await User.findById(input.requester);
      if (!targetUser) throw fieldError("requester", "requester does not exist");
      if (actor.role === ROLES.IT_MANAGER && !(targetUser.department && targetUser.department.equals(actor.department))) {
        throw ApiError.forbidden("You can only file tickets for requesters in your own department");
      }
      requesterId = targetUser._id;
      department = targetUser.department;
    } else {
      requesterId = actor._id;
      department = actor.department;
    }
  }

  // Covers both the EMPLOYEE/TECHNICIAN/ASSET_MANAGER case and an IT_MANAGER/SYSTEM_ADMIN filing for themselves
  // with no department of their own - a ticket cannot exist without one either way.
  if (!department) throw fieldError("department", "No department could be determined for this ticket");

  // --- category: exists, active, a leaf (D5.4, D6.6) ---
  const category = await Category.findById(input.category);
  if (!category) throw ApiError.notFound("Category not found");
  if (!category.isActive) {
    throw ApiError.validation([{ field: "category", message: "Category is inactive" }], "Category is inactive");
  }
  // A top-level category only counts as a leaf while it has no children (D5.4); a child is always a leaf (depth 2 cap).
  if (category.parent === null && (await Category.exists({ parent: category._id }))) {
    throw ApiError.validation(
      [{ field: "category", message: "Category must be a leaf category" }],
      "Category must be a leaf category"
    );
  }

  const now = new Date();
  // Snapshotted now, in business minutes (P8) - never recomputed later, so editing SLA_TARGETS never rewrites
  // an existing ticket's deadlines (CLAUDE.md).
  const slaTarget = SLA_TARGETS[priority];
  const responseDeadline = addBusinessMinutes(now, slaTarget.responseMins);
  const resolutionDeadline = addBusinessMinutes(now, slaTarget.resolutionMins);

  try {
    // Named fields only, never a spread of input (D3.5-style convention). ticketNumber is set by the model's own
    // pre('validate') hook; priority, status and history are decided here, never by the client.
    const ticket = await Ticket.create({
      title,
      description,
      requester: requesterId,
      department,
      category: category._id,
      assignee: null,
      status: TICKET_STATUS.NEW,
      impact: input.impact,
      urgency: input.urgency,
      priority,
      responseDeadline,
      resolutionDeadline,
      history: [{ from: null, to: TICKET_STATUS.NEW, by: actor._id, at: now }],
    });
    return await presentTicket(actor, ticket);
  } catch (err) {
    mapValidationError(err);
  }
};

// Options arrive already validated by the controller (page/limit range, status/priority enum membership).
export const listTickets = async (actor, { page, limit, status, priority }) => {
  const filter = ticketScopeFilter(actor);
  if (status !== undefined) filter.status = status;
  // Filters on the stored `priority`, not priorityOverride.value (D6.5) - see the report for the trade-off.
  if (priority !== undefined) filter.priority = priority;

  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(TICKET_POPULATE),
    Ticket.countDocuments(filter),
  ]);

  return { items, page, limit, total };
};

// Deliberately fetched with no scope filter: 404 means it doesn't exist, 403 means it exists but is out of
// scope (D3.4-style trade-off: a 403 reveals the id is real). id format is validated by the controller.
//
// Three computed fields ride along so the client can render the right action buttons without reimplementing any
// of this: availableTransitions (every status canTransition currently allows), canOverridePriority, and canComment
// (always true here, since reaching this point already required the same scope check - kept as its own field for
// a client that wants one flag per capability rather than inferring "can comment" from "didn't 403 on GET").
export const getTicket = async (actor, id) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) throw ApiError.notFound("Ticket not found");
  if (!isInTicketScope(actor, ticket)) throw ApiError.forbidden("You do not have permission to view this ticket");
  return presentTicket(actor, ticket);
};

// The one response shape for a full ticket: getTicket, createTicket, transitionTicket and setPriorityOverride all
// return through here, so the endpoints cannot drift apart. `ticket` must be an un-populated document (raw ids),
// already scope-checked by the caller. Computed fields reflect the ticket's state *now*, so after a transition
// they describe what the actor can do next.
const presentTicket = async (actor, ticket) => {
  // Computed from the raw-id ticket, before populate below swaps requester/assignee/department/category for
  // sub-documents: canTransition and canOverridePriorityOn both rely on comparing plain ObjectIds.
  const availableTransitions = TICKET_STATUS_VALUES.filter((status) => canTransition(ticket, actor, status));
  const canOverridePriority = canOverridePriorityOn(actor, ticket);
  const canComment = isInTicketScope(actor, ticket);

  // Read before populate, same reason as above; history[].by is still a raw ObjectId (or null) here.
  const nameOf = await loadUserNames(ticket.history.map((h) => h.by));

  await ticket.populate(TICKET_POPULATE);

  const json = ticket.toJSON();
  json.history = json.history.map((h) => ({ ...h, by: nameOf(h.by) }));
  return { ...json, availableTransitions, canOverridePriority, canComment };
};

const ASSIGNABLE_ROLES = [ROLES.TECHNICIAN, ROLES.ASSET_MANAGER];

// The one assignee-eligibility rule (D6.13): active TECHNICIAN or ASSET_MANAGER in the ticket's department. Used as a
// query filter by both listAssignableUsers (the picker) and transitionTicket (what the server accepts), so the two
// cannot disagree.
const assignableUserFilter = (ticket) => ({
  role: { $in: ASSIGNABLE_ROLES },
  department: ticket.department,
  isActive: true,
});

// Who the actor may pick as assignee for this ticket, so the client never re-implements the rule. Ticket lookup and
// scope check match getTicket (404 / 403). Only a manager of the ticket (SYSTEM_ADMIN, or IT_MANAGER in its
// department) picks someone else; canTransition(..., ASSIGNED) covers both "is a manager of it" and "ticket is
// assignable right now". A technician's self-claim needs no list, so they get 403 here.
export const listAssignableUsers = async (actor, id) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) throw ApiError.notFound("Ticket not found");
  if (!isInTicketScope(actor, ticket)) throw ApiError.forbidden("You do not have permission to view this ticket");

  const isManagerRole = actor.role === ROLES.SYSTEM_ADMIN || actor.role === ROLES.IT_MANAGER;
  if (!isManagerRole || !canTransition(ticket, actor, TICKET_STATUS.ASSIGNED)) {
    throw ApiError.forbidden("You cannot assign this ticket");
  }

  const users = await User.find(assignableUserFilter(ticket))
    .select("firstName lastName role")
    .sort({ firstName: 1, lastName: 1 })
    .lean();
  return users.map((u) => ({ _id: u._id, name: `${u.firstName} ${u.lastName}`, role: u.role }));
};

// id format and toStatus presence are validated by the controller; toStatus's enum membership is checked here.
// `reason` is accepted (matches the agreed signature) but unused: no transition in D6.3 records one.
export const transitionTicket = async (actor, id, toStatus, { assigneeId, reason } = {}) => {
  if (!TICKET_STATUS_VALUES.includes(toStatus)) throw fieldError("toStatus", "toStatus is not a valid status");

  const ticket = await Ticket.findById(id);
  if (!ticket) throw ApiError.notFound("Ticket not found");

  if (!canTransition(ticket, actor, toStatus)) {
    throw ApiError.forbidden(`Cannot transition from ${ticket.status} to ${toStatus}`);
  }

  // Every assignment, including one where the assignee is the actor, passes the same eligibility rule as the
  // assignable-users list. Runs after canTransition so a caller who may not assign at all gets 403, not a probe of ids.
  let resolvedAssigneeId;
  if (toStatus === TICKET_STATUS.ASSIGNED) {
    const candidate = assigneeId ?? String(actor._id); // no assigneeId = self-claim (still validated below)
    if (!isObjectIdString(candidate)) throw fieldError("assigneeId", "assigneeId must be a valid id");
    const target = await User.findOne({ _id: candidate, ...assignableUserFilter(ticket) }).select("_id");
    if (!target) throw fieldError("assigneeId", "assigneeId is not an eligible assignee for this ticket");
    resolvedAssigneeId = target._id;
  }

  const now = new Date();
  const from = ticket.status; // captured before any assignment below

  // First activity on the ticket, of any kind (P8's response SLA) - toStatus is never actually 'NEW' (nothing
  // transitions into it; REOPENED is the request value for that case), so this fires on every successful call
  // the first time, exactly as asked, even though the comparison is structurally always true in practice.
  if (ticket.firstResponseAt === null && toStatus !== TICKET_STATUS.NEW) {
    ticket.firstResponseAt = now;
  }

  if (toStatus === TICKET_STATUS.REOPENED) {
    // Note A: one logical step, never two. Never leaves status at REOPENED.
    ticket.status = TICKET_STATUS.NEW;
    ticket.assignee = null;
    ticket.history.push({ from: TICKET_STATUS.RESOLVED, to: TICKET_STATUS.NEW, by: actor._id, at: now });
  } else {
    if (toStatus === TICKET_STATUS.RESOLVED) ticket.resolvedAt = now;
    // the assignee validated above (the actor themself on a self-claim).
    if (toStatus === TICKET_STATUS.ASSIGNED) ticket.assignee = resolvedAssigneeId;
    ticket.status = toStatus;
    ticket.history.push({ from, to: toStatus, by: actor._id, at: now });
  }

  try {
    await ticket.save();
  } catch (err) {
    mapValidationError(err);
  }
  return presentTicket(actor, ticket);
};

// id format is validated by the controller; route-level authorize() already limits this to SYSTEM_ADMIN/IT_MANAGER.
export const setPriorityOverride = async (actor, id, { value, reason }) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) throw ApiError.notFound("Ticket not found");

  if (!canOverridePriorityOn(actor, ticket)) {
    throw ApiError.forbidden("You can only override priority on tickets in your own department");
  }

  if (!PRIORITY_VALUES.includes(value)) throw fieldError("value", "value is not a valid priority");
  const trimmedReason = requireString(reason, "reason").trim();
  if (trimmedReason.length === 0) throw fieldError("reason", "reason is required");

  // priority itself is never touched (D5.2, D6.5); effective priority is computed by callers as priorityOverride.value ?? priority.
  ticket.priorityOverride = { value, by: actor._id, reason: trimmedReason, at: new Date() };

  try {
    await ticket.save();
  } catch (err) {
    mapValidationError(err);
  }
  return presentTicket(actor, ticket);
};

// Only these roles may mark a comment internal (D6.7).
const STAFF_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER, ROLES.TECHNICIAN, ROLES.ASSET_MANAGER];

export const createComment = async (actor, ticketId, { body, isInternal }) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw ApiError.notFound("Ticket not found");
  if (!isInTicketScope(actor, ticket)) throw ApiError.forbidden("You do not have permission to comment on this ticket");

  const text = requireString(body, "body").trim();
  if (text.length < 1 || text.length > 5000) throw fieldError("body", "body must be 1-5000 characters");

  // Strict: only a real boolean or absent. Boolean("false") would be true, so no coercion.
  if (isInternal !== undefined && typeof isInternal !== "boolean") {
    throw fieldError("isInternal", "isInternal must be true or false");
  }
  const internal = isInternal === true;
  if (internal && !STAFF_ROLES.includes(actor.role)) {
    throw fieldError("isInternal", "Only staff can create internal comments");
  }

  try {
    return await Comment.create({ ticket: ticket._id, author: actor._id, body: text, isInternal: internal });
  } catch (err) {
    mapValidationError(err);
  }
};

export const listComments = async (actor, ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw ApiError.notFound("Ticket not found");
  if (!isInTicketScope(actor, ticket)) throw ApiError.forbidden("You do not have permission to view this ticket's comments");

  const comments = await Comment.find({ ticket: ticket._id }).sort({ createdAt: 1 });

  // isInTicketScope already guarantees an EMPLOYEE who got this far is the requester; checked explicitly anyway
  // so the rule reads directly off D6.7 rather than relying on that guarantee holding elsewhere.
  const isRequesterEmployee = actor.role === ROLES.EMPLOYEE && ticket.requester.equals(actor._id);
  const visible = isRequesterEmployee ? comments.filter((c) => !c.isInternal) : comments;

  // Names are looked up only for comments that survived the internal filter above.
  const nameOf = await loadUserNames(visible.map((c) => c.author));
  const items = visible.map((c) => ({ ...c.toJSON(), author: nameOf(c.author) }));

  return { items };
};
