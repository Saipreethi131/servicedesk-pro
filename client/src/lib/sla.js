import { span } from "./dashboard.js";

// How one SLA clock reads right now: { kind, text, tone, share } or null when there is no deadline.
//   running:  "2h 10m left"; tone is neutral above 50% of the window left, warning from 50% down to 10%, danger below 10%
//   breached: "3h 0m overdue" (danger), the deadline passed and nothing stopped the clock
//   escalated: "Escalated, 3h 0m past deadline" (danger): the deadline passed AND the ticket is ESCALATED. The server does not
//             count an escalated ticket as overdue (SLA_EXEMPT_STATUSES, D6.17: the sweep already acted on it), so calling it
//             "overdue" here would disagree with the Overdue count on the dashboard. Only the wording differs; the clock is the same.
//   met / missed: the clock was stopped (`stoppedAt`) before / after the deadline
// `share` is the fraction of the window still left (1 = all of it, 0 = none), for a progress bar.
// The window is measured in wall-clock time from creation to the deadline. The deadline itself was computed in business hours
// on the server, so the percentage only approximates how much of the real window is left (same trade-off as D7.4); the
// deadline and the "overdue" wording are exact. There is no pause: the server never stops these clocks (not even while a ticket
// waits on the requester), so neither does this.
export function timerState({ createdAt, deadline, stoppedAt, escalated = false, now }) {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();

  if (stoppedAt) {
    const met = new Date(stoppedAt).getTime() <= end;
    return { kind: met ? "met" : "missed", text: met ? "Met" : "Missed", tone: met ? "neutral" : "danger", share: met ? 1 : 0 };
  }

  const left = end - now;
  if (left <= 0) {
    return escalated
      ? { kind: "escalated", text: `Escalated, ${span(-left)} past deadline`, tone: "danger", share: 0 }
      : { kind: "breached", text: `${span(-left)} overdue`, tone: "danger", share: 0 };
  }

  const window = end - new Date(createdAt).getTime();
  const share = window > 0 ? left / window : 0;
  return { kind: "running", text: `${span(left)} left`, tone: share < 0.1 ? "danger" : share < 0.5 ? "warning" : "neutral", share };
}

// The resolution clock of a ticket, for every place that shows one as a pill (ticket list, dashboard lists, peek drawer). A finished ticket's clock stopped at resolvedAt; one without a
// resolvedAt has nothing to show.
export function slaState(ticket, now) {
  const finished = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  if (finished && !ticket.resolvedAt) return null;
  return timerState({
    createdAt: ticket.createdAt,
    deadline: ticket.resolutionDeadline,
    stoppedAt: finished ? ticket.resolvedAt : null,
    escalated: ticket.status === "ESCALATED",
    now,
  });
}
