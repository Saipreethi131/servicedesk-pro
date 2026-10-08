import { useState } from "react";
import { statusLabel } from "../../lib/labels.js";
import { Card, EmptyState, StatusIcon } from "../ui/index.js";

// Same colour families as StatusIcon, so a status looks the same everywhere. Colour is never the only signal: the legend
// prints each status with its icon and count.
const FILL = {
  NEW: "var(--muted)",
  ASSIGNED: "var(--info)",
  IN_PROGRESS: "var(--warning)",
  WAITING_ON_REQUESTER: "var(--accent)",
  RESOLVED: "var(--success)",
  CLOSED: "var(--control)",
  ESCALATED: "var(--danger)",
};

const BAR_HEIGHT = 28;

// One stacked bar across the card width. Percent geometry (x="12%"), so the SVG needs no pixel measuring.
// Counts come from /tickets/stats, so the bar is exact. Each segment is focusable for keyboard users.
export default function StatusBar({ byStatus }) {
  const [active, setActive] = useState(null);
  const entries = Object.entries(byStatus);
  const total = entries.reduce((s, [, c]) => s + c, 0);

  let cursor = 0;
  const segments = entries
    .filter(([, count]) => count > 0)
    .map(([status, count]) => {
      const pct = (count / total) * 100;
      const seg = { status, count, pct, start: cursor };
      cursor += pct;
      return seg;
    });
  const current = segments.find((s) => s.status === active);

  return (
    <Card title="Status distribution" description={`${total} ${total === 1 ? "ticket" : "tickets"}`}>
      {total === 0 ? (
        <EmptyState title="No tickets yet" className="py-6" />
      ) : (
        <>
          <div className="relative pt-8">
            <svg role="group" aria-label="Tickets by status, as one stacked bar" width="100%" height={BAR_HEIGHT} className="block">
              {segments.map((s) => (
                <rect
                  key={s.status}
                  role="img"
                  aria-label={`${statusLabel(s.status)}: ${s.count}`}
                  tabIndex={0}
                  x={`${s.start}%`}
                  width={`${s.pct}%`}
                  height={BAR_HEIGHT}
                  fill={FILL[s.status] ?? "var(--muted)"}
                  stroke="var(--surface)"
                  strokeWidth="2"
                  opacity={active && active !== s.status ? 0.4 : 1}
                  onPointerEnter={() => setActive(s.status)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(s.status)}
                  onBlur={() => setActive(null)}
                />
              ))}
            </svg>
            {current && (
              <div
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-popover"
                style={{ left: `${Math.min(Math.max(current.start + current.pct / 2, 14), 86)}%` }}
              >
                <span className="font-medium text-fg">{statusLabel(current.status)}</span>
                <span className="text-muted-strong">
                  {" "}
                  {current.count} ({Math.round(current.pct)}%)
                </span>
              </div>
            )}
          </div>

          {/* The visible legend repeats what the table below says, so screen readers skip it. */}
          <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-strong">
            {segments.map((s) => (
              <li key={s.status} className="flex items-center gap-1.5">
                <StatusIcon status={s.status} size={12} />
                {statusLabel(s.status)} <span className="font-medium text-fg">{s.count}</span>
              </li>
            ))}
          </ul>

          <table className="sr-only">
            <caption>Tickets by status</caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([status, count]) => (
                <tr key={status}>
                  <th scope="row">{statusLabel(status)}</th>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
