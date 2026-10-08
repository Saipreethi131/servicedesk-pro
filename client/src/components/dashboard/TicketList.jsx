import { Link } from "react-router";
import { CheckCircle2, Clock } from "lucide-react";
import { relativeTime } from "../../lib/dashboard.js";
import { slaState } from "../../lib/sla.js";
import { statusLabel } from "../../lib/labels.js";
import { Badge, Card, EmptyState, PriorityIcon, StatusIcon } from "../ui/index.js";
import InfoTip from "./InfoTip.jsx";

// "2h 10m left" / "Escalated, 1d past deadline" chip, worded by the same slaState as the ticket list and the detail page, so
// the three can never disagree. `now` comes from the page's 30s clock, so every chip on the page ticks together.
export function CountdownChip({ ticket, now }) {
  const state = slaState(ticket, now);
  if (!state) return null;
  const { text, tone } = state;
  return (
    <Badge tone={tone} icon={<Clock size={12} aria-hidden="true" />} title={`Resolution deadline: ${new Date(ticket.resolutionDeadline).toLocaleString()}`}>
      {text}
    </Badge>
  );
}

// One list for "Due soon", "My queue" and "Recent activity". `trailing(ticket)` decides what sits on the right of a row.
export default function TicketList({ title, description, info, tickets, now, kind = "deadline", emptyTitle, emptyDescription, emphasis = false }) {
  return (
    <Card title={title} description={description} action={info && <InfoTip>{info}</InfoTip>} className={emphasis ? "border-accent/40" : undefined}>
      {tickets.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={emptyTitle} description={emptyDescription} className="py-6" />
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {tickets.map((t) => {
            const effectivePriority = t.priorityOverride?.value ?? t.priority;
            return (
              <li key={t._id}>
                <Link to={`/tickets/${t._id}`} className="block rounded-md px-2 py-2 hover:bg-subtle">
                  <span className="flex items-center gap-3">
                    {kind === "deadline" ? <PriorityIcon priority={effectivePriority} /> : <StatusIcon status={t.status} />}
                    <span className="shrink-0 font-mono text-xs text-muted-strong">TKT-{t.ticketNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-13 text-fg">{t.title}</span>
                    {/* The activity line is short enough to share the row with the title. */}
                    {!(kind === "deadline" && t.resolutionDeadline) && (
                      <span className="shrink-0 text-xs text-muted-strong">
                        {statusLabel(t.status)} &middot; {relativeTime(t.updatedAt, now)}
                      </span>
                    )}
                  </span>
                  {/* A countdown can read "Escalated, 1d 3h past deadline": on its own line (under the icon column) so it never
                      squeezes the title out of the row. */}
                  {kind === "deadline" && t.resolutionDeadline && (
                    <span className="mt-1 block pl-7">
                      <CountdownChip ticket={t} now={now} />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
