// Pure helpers behind the dashboard. Everything here is computed in the browser from tickets the user can already list
// (no endpoint added). Nothing here knows about React.
//
// The one status fact the client holds: which statuses mean "finished". The server owns the enum but sends nothing that says
// which are done (same note as D7.3), so it is named once here.
const DONE_STATUSES = new Set(["RESOLVED", "CLOSED"]);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const isOpen = (ticket) => !DONE_STATUSES.has(ticket.status);
export const openCountFromStats = (byStatus) =>
  Object.entries(byStatus).reduce((sum, [status, count]) => (DONE_STATUSES.has(status) ? sum : sum + count), 0);

const startOfLocalDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const within = (iso, from, to) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t > from && t <= to;
};

// One entry per local calendar day for the last `n` days, oldest first.
//   created / resolved: how many tickets have that createdAt / resolvedAt on that day.
//   openAtEnd: how many were open when that day ended (created by then, not yet resolved). Only meaningful when `complete`.
export function dailySeries(tickets, now, n = 14) {
  const today = startOfLocalDay(now);
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(start.getDate() - i); // setDate, not "- i * DAY": a day is 23 or 25 hours across a clock change
    const from = start.getTime();
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    const end = Math.min(next.getTime(), now);
    days.push({ from, end, date: start, created: 0, resolved: 0, openAtEnd: 0 });
  }
  for (const t of tickets) {
    const created = new Date(t.createdAt).getTime();
    const resolved = t.resolvedAt ? new Date(t.resolvedAt).getTime() : null;
    for (const day of days) {
      if (created >= day.from && created < day.end) day.created++;
      if (resolved !== null && resolved >= day.from && resolved < day.end) day.resolved++;
      if (created < day.end && !(resolved !== null && resolved < day.end)) day.openAtEnd++;
    }
  }
  return days;
}

// The headline numbers that need history. `complete` = every ticket the user can see is loaded; only then is a comparison with
// an earlier period trustworthy, because a missing old ticket would silently lower the "prior" figure.
export function periodKpis(tickets, now, complete) {
  const resolvedIn = (from, to) => tickets.filter((t) => within(t.resolvedAt, from, to));
  const onTimeRate = (list) => {
    const judged = list.filter((t) => t.resolutionDeadline);
    if (judged.length === 0) return null;
    const onTime = judged.filter((t) => new Date(t.resolvedAt) <= new Date(t.resolutionDeadline)).length;
    return Math.round((onTime / judged.length) * 100);
  };

  const resolved7 = resolvedIn(now - 7 * DAY, now);
  const resolvedPrev7 = resolvedIn(now - 14 * DAY, now - 7 * DAY);
  const sla30 = onTimeRate(resolvedIn(now - 30 * DAY, now));
  const slaPrev30 = onTimeRate(resolvedIn(now - 60 * DAY, now - 30 * DAY));

  return {
    resolved7: resolved7.length,
    resolved7Delta: complete ? resolved7.length - resolvedPrev7.length : null,
    sla30,
    sla30Delta: complete && sla30 !== null && slaPrev30 !== null ? sla30 - slaPrev30 : null,
  };
}

// Open tickets, nearest resolution deadline first (already-overdue ones come first, as they should). Every open ticket has a
// running clock: the server never pauses one.
export const dueSoon = (tickets, limit = 5) =>
  tickets
    .filter((t) => isOpen(t) && t.resolutionDeadline)
    .sort((a, b) => new Date(a.resolutionDeadline) - new Date(b.resolutionDeadline))
    .slice(0, limit);

export const assignedTo = (tickets, userId) => tickets.filter((t) => isOpen(t) && t.assignee?._id === userId);

// [{ label, count }] of open tickets grouped by `labelOf(ticket)`, biggest first.
export function groupOpen(tickets, labelOf, limit = 8) {
  const counts = new Map();
  for (const t of tickets) {
    if (!isOpen(t)) continue;
    const label = labelOf(t);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export const assigneeLabel = (t) => (t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned");
export const categoryLabel = (t) => t.category?.name ?? "Uncategorised";

export const span = (ms) => {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MINUTE))}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h ${Math.floor((ms % HOUR) / MINUTE)}m`;
  return `${Math.floor(ms / DAY)}d ${Math.floor((ms % DAY) / HOUR)}h`;
};

export function relativeTime(iso, now) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

export const greeting = (now) => {
  const hour = new Date(now).getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};
