// Wording helpers for the ticket page, moved out of TicketDetail.jsx so the timeline and the properties panel share them.

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// history[].by and Comment.author arrive as { name, role } (D6.9, hard rule 4). Only a legacy raw id string is shortened
// (clearly technical, rather than faking a name), and null means a system action such as auto-escalation.
const shortId = (id) => (id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
export const displayName = (who) => {
  if (who == null) return "System";
  if (typeof who === "string") return `User ${shortId(who)}`;
  return who.name || "Unknown user";
};

// category arrives as { name, parent: { name } | null } (parent null = top-level). Tolerates a missing category or a
// legacy shape without a parent rather than crashing.
export const categoryPath = (category) => {
  if (!category?.name) return "Unknown category";
  return category.parent?.name ? `${category.parent.name} › ${category.name}` : category.name;
};

// Plain-language labels for the statuses canTransition can actually produce in availableTransitions (D6.2/D6.3).
// "NEW" never appears there - TRANSITION_TABLE never lists it as a target, only as a source - so the reopen case
// is keyed by "REOPENED" (the value the API expects in the transition request), not "NEW".
export const TRANSITION_LABELS = {
  ASSIGNED: "Assign",
  IN_PROGRESS: "Start work",
  WAITING_ON_REQUESTER: "Wait for requester",
  RESOLVED: "Mark resolved",
  CLOSED: "Close ticket",
  ESCALATED: "Escalate",
  REOPENED: "Reopen ticket",
};
