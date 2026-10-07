// Frozen so no code can add or change a role at runtime.
export const ROLES = Object.freeze({
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  IT_MANAGER: "IT_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  ASSET_MANAGER: "ASSET_MANAGER",
  EMPLOYEE: "EMPLOYEE",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

// Ticket impact, urgency and derived priority (D5.1, D5.3). The *_VALUES arrays are ordered lowest to highest,
// and that order is meaningful: it is the order a UI should list them in.
export const IMPACT = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

export const URGENCY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

export const PRIORITY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

export const IMPACT_VALUES = Object.freeze(Object.values(IMPACT));
export const URGENCY_VALUES = Object.freeze(Object.values(URGENCY));
export const PRIORITY_VALUES = Object.freeze(Object.values(PRIORITY));

// Ticket lifecycle (D6.2). Order matches the CLAUDE.md diagram: the main line NEW..CLOSED, then the two branches.
export const TICKET_STATUS = Object.freeze({
  NEW: "NEW",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_ON_REQUESTER: "WAITING_ON_REQUESTER",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  ESCALATED: "ESCALATED",
  REOPENED: "REOPENED",
});

export const TICKET_STATUS_VALUES = Object.freeze(Object.values(TICKET_STATUS));

// Statuses a ticket is never stored in: REOPENED is rewritten to NEW in the same step (D6.3, transitionTicket Note A).
// Request values and history can mention them, but nothing rests there, so counts and cards skip them.
export const TRANSIENT_STATUSES = Object.freeze([TICKET_STATUS.REOPENED]);

// Statuses that can actually hold tickets, in enum order. What /tickets/stats reports (D6.17).
export const RESTING_STATUS_VALUES = Object.freeze(TICKET_STATUS_VALUES.filter((s) => !TRANSIENT_STATUSES.includes(s)));

// A ticket in one of these is never "overdue" and never escalated by the SLA sweep: RESOLVED/CLOSED are done, ESCALATED
// already is. The single definition behind both the stats overdue count and slaEscalation.js (D6.17).
export const SLA_EXEMPT_STATUSES = Object.freeze([TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED, TICKET_STATUS.ESCALATED]);

// SLA targets per effective priority (P8), in business minutes - fed through addBusinessMinutes, never treated
// as wall-clock minutes. Deadlines are snapshotted onto the ticket at creation (CLAUDE.md): changing these later
// never rewrites an existing ticket's deadlines.
export const SLA_TARGETS = Object.freeze({
  CRITICAL: Object.freeze({ responseMins: 60, resolutionMins: 240 }),
  HIGH: Object.freeze({ responseMins: 120, resolutionMins: 480 }),
  MEDIUM: Object.freeze({ responseMins: 240, resolutionMins: 1440 }),
  LOW: Object.freeze({ responseMins: 480, resolutionMins: 4320 }),
});
