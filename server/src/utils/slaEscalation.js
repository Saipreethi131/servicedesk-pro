import Ticket from "../models/Ticket.js";
import { TICKET_STATUS } from "./constants.js";

// RESOLVED/CLOSED are done; ESCALATED is already escalated. REOPENED is never actually a persisted status
// (transitionTicket rewrites it to NEW in the same step - Note A), so it needs no entry here.
const EXEMPT_STATUSES = [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED, TICKET_STATUS.ESCALATED];

// No req/res: callable from the interval in server.js or a one-off script. Idempotent on repeat calls - once a
// ticket is ESCALATED, the query above excludes it, so a second sweep (run immediately after, or because the
// first one raced with a request) finds nothing left to do for it.
export const runEscalationSweep = async () => {
  const now = new Date();
  const overdue = await Ticket.find({
    resolutionDeadline: { $lt: now },
    status: { $nin: EXEMPT_STATUSES },
  });

  for (const ticket of overdue) {
    const from = ticket.status;
    ticket.status = TICKET_STATUS.ESCALATED;
    ticket.escalatedAt = now;
    // by: null - this is a system action, not something a person triggered (unlike every other history row).
    ticket.history.push({ from, to: TICKET_STATUS.ESCALATED, by: null, at: now });
    await ticket.save();
  }

  return overdue.length;
};
