import { ROLES, TICKET_STATUS } from "./constants.js";

const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// "Open" = still active work, i.e. everything before RESOLVED (CLAUDE.md's lifecycle: NEW -> ... -> RESOLVED -> CLOSED,
// with ESCALATED and REOPENED as branches). D6.3 says "any open state -> ESCALATED"; this is that set, spelled out so
// TRANSITION_TABLE below doesn't have to repeat it four times.
const OPEN_STATUSES = [TICKET_STATUS.NEW, TICKET_STATUS.ASSIGNED, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.WAITING_ON_REQUESTER];

// The from -> to pairs only, with no notion of who may trigger them. Lets a caller (e.g. a future "what can I do with
// this ticket" UI control) list the valid next statuses for ticket.status without re-deriving them from RULES below.
export const TRANSITION_TABLE = Object.freeze({
  [TICKET_STATUS.NEW]: Object.freeze([TICKET_STATUS.ASSIGNED, TICKET_STATUS.ESCALATED]),
  [TICKET_STATUS.ASSIGNED]: Object.freeze([TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.ESCALATED]),
  [TICKET_STATUS.IN_PROGRESS]: Object.freeze([TICKET_STATUS.WAITING_ON_REQUESTER, TICKET_STATUS.RESOLVED, TICKET_STATUS.ESCALATED]),
  [TICKET_STATUS.WAITING_ON_REQUESTER]: Object.freeze([TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED, TICKET_STATUS.ESCALATED]),
  [TICKET_STATUS.RESOLVED]: Object.freeze([TICKET_STATUS.CLOSED, TICKET_STATUS.REOPENED]),
  [TICKET_STATUS.CLOSED]: Object.freeze([]),
  [TICKET_STATUS.ESCALATED]: Object.freeze([TICKET_STATUS.IN_PROGRESS]),
  [TICKET_STATUS.REOPENED]: Object.freeze([]), // D6.3: reopening returns the ticket straight to NEW: REOPENED is never a "from" state
});

// Accepts an ObjectId, a populated document's _id, or a plain string - whatever a plain test fixture or an
// unpopulated Mongoose ref field hands in. Never true if either side is missing.
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const actorId = (actor) => actor._id ?? actor.id;

const inDepartment = (ticket, actor) => sameId(ticket.department, actor.department);
const isAssignee = (ticket, actor) => sameId(ticket.assignee, actorId(actor));
const isRequester = (ticket, actor) => sameId(ticket.requester, actorId(actor));
const isManagerOf = (ticket, actor) => actor.role === ROLES.IT_MANAGER && inDepartment(ticket, actor);

const CLAIM_ROLES = [ROLES.TECHNICIAN, ROLES.ASSET_MANAGER];

// Who may trigger each pair (D6.3). Keyed "<from>-><to>" against TRANSITION_TABLE's own values, so a pair that is
// not in TRANSITION_TABLE can never reach one of these predicates (canTransition checks the table first).
const RULES = {
  [`${TICKET_STATUS.NEW}->${TICKET_STATUS.ASSIGNED}`]: (ticket, actor) => {
    if (isManagerOf(ticket, actor)) return true; // assigning to someone else; that the target is a valid assignee is the caller's job
    if (CLAIM_ROLES.includes(actor.role) && inDepartment(ticket, actor)) return ticket.assignee == null; // self-claim only while unassigned
    return false;
  },
  [`${TICKET_STATUS.ASSIGNED}->${TICKET_STATUS.IN_PROGRESS}`]: (t, a) => isAssignee(t, a) || isManagerOf(t, a),
  [`${TICKET_STATUS.IN_PROGRESS}->${TICKET_STATUS.WAITING_ON_REQUESTER}`]: (t, a) => isAssignee(t, a) || isManagerOf(t, a),
  [`${TICKET_STATUS.IN_PROGRESS}->${TICKET_STATUS.RESOLVED}`]: (t, a) => isAssignee(t, a) || isManagerOf(t, a),
  [`${TICKET_STATUS.WAITING_ON_REQUESTER}->${TICKET_STATUS.RESOLVED}`]: (t, a) => isAssignee(t, a) || isManagerOf(t, a),
  [`${TICKET_STATUS.WAITING_ON_REQUESTER}->${TICKET_STATUS.IN_PROGRESS}`]: (t, a) =>
    isAssignee(t, a) || isManagerOf(t, a) || isRequester(t, a),
  [`${TICKET_STATUS.RESOLVED}->${TICKET_STATUS.CLOSED}`]: (t, a) => isRequester(t, a) || isManagerOf(t, a),
  [`${TICKET_STATUS.RESOLVED}->${TICKET_STATUS.REOPENED}`]: (ticket, actor) => {
    if (!isRequester(ticket, actor)) return false;
    if (!ticket.resolvedAt) return false; // can't be within the window if it was never (recorded as) resolved
    return Date.now() - new Date(ticket.resolvedAt).getTime() <= REOPEN_WINDOW_MS;
  },
  ...Object.fromEntries(OPEN_STATUSES.map((status) => [`${status}->${TICKET_STATUS.ESCALATED}`, isManagerOf])),
  [`${TICKET_STATUS.ESCALATED}->${TICKET_STATUS.IN_PROGRESS}`]: isManagerOf,
};

// Pure: ticket and actor are plain objects or already-loaded Mongoose documents; no DB calls, so the service and any
// future UI check can both call it without an await.
export const canTransition = (ticket, actor, toStatus) => {
  if (!ticket || !actor || !toStatus) return false;
  const from = ticket.status;
  if (!TRANSITION_TABLE[from]?.includes(toStatus)) return false; // not a valid pair at all, whoever is asking

  const rule = RULES[`${from}->${toStatus}`];
  return rule ? rule(ticket, actor) : false;
};
