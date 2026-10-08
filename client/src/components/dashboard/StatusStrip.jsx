import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";
import { statusLabel } from "../../lib/labels.js";
import { StatusIcon } from "../ui/index.js";

const tileClass =
  "flex h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-13 " +
  "transition-colors duration-[120ms] ease-out-expo hover:bg-subtle hover:border-control";

// The compact row of status counts. The click targets are exactly the ones the old tiles had (hard rule 2):
//   /tickets?status=<STATUS> for each status, and plain /tickets for Overdue (the list has no overdue filter).
// No aria-label: the link's name is built from its visible text ("New 4" + a hidden "tickets"), so what a voice-control user
// sees is what they can say.
// Counts come from /tickets/stats, so they are exact whatever the volume. Object key order is the server's enum order.
export default function StatusStrip({ stats }) {
  return (
    <nav aria-label="Tickets by status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Object.entries(stats.byStatus).map(([status, count]) => (
        <Link key={status} to={`/tickets?status=${status}`} className={tileClass}>
          <StatusIcon status={status} />
          <span className="truncate text-muted-strong">{statusLabel(status)}</span>
          <span className="ml-auto font-medium text-fg">{count}</span>
          <span className="sr-only">tickets</span>
        </Link>
      ))}
      <Link to="/tickets" className={tileClass}>
        <AlertTriangle size={16} className="shrink-0 text-danger" aria-hidden="true" />
        <span className="truncate text-muted-strong">Overdue</span>
        <span className={`ml-auto font-medium ${stats.overdue > 0 ? "text-danger-ink" : "text-fg"}`}>{stats.overdue}</span>
        <span className="sr-only">tickets</span>
      </Link>
    </nav>
  );
}
