import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { relativeTime } from "../../lib/dashboard.js";
import { isTypingTarget, overlayOpen } from "../../lib/shortcuts.js";
import { priorityLabel, statusLabel } from "../../lib/labels.js";
import { cn } from "../../lib/cn.js";
import { Avatar, PriorityIcon, Skeleton, StatusIcon } from "../ui/index.js";
import SlaPill from "./SlaPill.jsx";

// Clicks on these inside a row keep their own behaviour instead of opening the ticket.
const INTERACTIVE = "a, button, input, select, textarea, label";

const HEADERS = [
  ["ID", "w-24"],
  ["Title", "min-w-36"],
  ["Status", "w-44"],
  ["Priority", "w-32"],
  ["SLA", "w-36"],
  ["Assignee", "w-44"],
  ["Category", "w-36"],
  ["Updated", "w-24"],
];

const effectivePriority = (t) => t.priorityOverride?.value ?? t.priority;
const fullName = (person) => (person ? `${person.firstName} ${person.lastName}` : null);

function Assignee({ ticket }) {
  const name = fullName(ticket.assignee);
  return name ? (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} size={20} />
      <span className="truncate">{name}</span>
    </span>
  ) : (
    <span className="text-muted-strong">Unassigned</span>
  );
}

function SkeletonRows({ cell }) {
  return Array.from({ length: 8 }, (_, i) => (
    <tr key={i}>
      {HEADERS.map(([name]) => (
        <td key={name} className={cn(cell, "border-b border-border")}>
          <Skeleton className={cn("h-4", name === "Title" ? "w-3/4" : "w-16")} />
        </td>
      ))}
      <td className={cn(cell, "border-b border-border")} />
    </tr>
  ));
}

export default function TicketsTable({ items, loading, now, density, onPeek }) {
  const navigate = useNavigate();
  const bodyRef = useRef(null);
  const [tabStop, setTabStop] = useState(0); // which row is the table's single Tab stop (roving tabindex)

  const cell = density === "compact" ? "px-3 py-1" : "px-3 py-2.5";

  // Row click = open the ticket; ctrl/cmd-click opens a new tab. The ID link and the Open link stay real links (middle-click,
  // "copy link address"); they are just not Tab stops, because the row itself is.
  const handleRowClick = (event, ticketId) => {
    const row = event.currentTarget;
    const hit = event.target.closest(INTERACTIVE);
    if (hit && row.contains(hit)) return; // a link or button handles its own click
    if (window.getSelection()?.toString()) return; // the user is selecting text, not opening
    if (event.ctrlKey || event.metaKey) {
      window.open(row.querySelector("a[href]").href, "_blank", "noopener");
      return;
    }
    navigate(`/tickets/${ticketId}`);
  };

  // Enter opens the page, Space opens the peek drawer. Only when the row itself has focus, so Enter on the inner link
  // still follows that link and does not also trigger this.
  const handleRowKeyDown = (event, ticket) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter") {
      event.preventDefault();
      navigate(`/tickets/${ticket._id}`);
    } else if (event.key === " ") {
      event.preventDefault(); // no page scroll
      onPeek(ticket);
    }
  };

  // j / k move row focus (like Linear). Ignored while typing, with a modifier held, or with any dialog, menu or drawer open.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "j" && event.key !== "k") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target) || overlayOpen()) return;
      const rows = [...(bodyRef.current?.querySelectorAll("tr[data-row]") ?? [])];
      if (rows.length === 0 || rows[0].offsetParent === null) return; // none, or the table is hidden (mobile)
      const current = rows.findIndex((r) => r === document.activeElement || r.contains(document.activeElement));
      const next = current === -1 ? 0 : Math.min(Math.max(current + (event.key === "j" ? 1 : -1), 0), rows.length - 1);
      event.preventDefault();
      rows[next].focus();
      rows[next].scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const stop = items ? Math.min(tabStop, items.length - 1) : 0;

  return (
    <>
      {/* >= 768px: the table. The wrapper scrolls (both ways) so the header can stay put inside it. */}
      <div className="hidden max-h-[calc(100vh-17rem)] min-h-40 overflow-auto md:block">
        <table className="w-full min-w-[960px] border-separate border-spacing-0 text-13 tabular-nums">
          <caption className="sr-only">Tickets. Use j and k to move between rows, Enter to open a ticket, Space for a quick look.</caption>
          <thead>
            <tr>
              {HEADERS.map(([name, width]) => (
                <th
                  key={name}
                  scope="col"
                  className={cn("sticky top-0 z-10 border-b border-border bg-surface px-3 py-2 text-left text-xs font-medium text-muted", width)}
                >
                  {name}
                </th>
              ))}
              <th scope="col" className="sticky top-0 z-10 w-20 border-b border-border bg-surface">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody ref={bodyRef} className={cn(loading && items && "opacity-60")}>
            {items === null ? (
              <SkeletonRows cell={cell} />
            ) : (
              items.map((t, i) => (
                <tr
                  key={t._id}
                  data-row
                  tabIndex={i === stop ? 0 : -1}
                  onFocus={() => setTabStop(i)}
                  onClick={(e) => handleRowClick(e, t._id)}
                  onKeyDown={(e) => handleRowKeyDown(e, t)}
                  className="group cursor-pointer hover:bg-subtle focus-visible:-outline-offset-2"
                >
                  <td className={cn(cell, "border-b border-border")}>
                    <Link to={`/tickets/${t._id}`} tabIndex={-1} className="whitespace-nowrap font-mono text-xs text-accent hover:underline">
                      TKT-{t.ticketNumber}
                    </Link>
                  </td>
                  <td className={cn(cell, "max-w-0 border-b border-border")}>
                    <span className="block truncate text-fg" title={t.title}>
                      {t.title}
                    </span>
                  </td>
                  <td className={cn(cell, "border-b border-border")}>
                    <span className="inline-flex items-center gap-2">
                      <StatusIcon status={t.status} /> {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className={cn(cell, "border-b border-border")}>
                    <span className="inline-flex items-center gap-2">
                      <PriorityIcon priority={effectivePriority(t)} /> {priorityLabel(effectivePriority(t))}
                      {t.priorityOverride && <span className="text-xs text-muted-strong" title="A manager overrode the derived priority">*</span>}
                    </span>
                  </td>
                  <td className={cn(cell, "border-b border-border")}>
                    <SlaPill ticket={t} now={now} />
                  </td>
                  <td className={cn(cell, "max-w-[8rem] border-b border-border")}>
                    <Assignee ticket={t} />
                  </td>
                  <td className={cn(cell, "max-w-[7rem] border-b border-border")}>
                    <span className="block truncate text-muted-strong">{t.category?.name ?? "-"}</span>
                  </td>
                  <td className={cn(cell, "whitespace-nowrap border-b border-border text-muted-strong")}>
                    <time dateTime={t.updatedAt} title={new Date(t.updatedAt).toLocaleString()}>
                      {relativeTime(t.updatedAt, now)}
                    </time>
                  </td>
                  <td className={cn(cell, "border-b border-border text-right")}>
                    {/* Hover / keyboard-focus affordance. It is the same navigation the row already does, nothing new. */}
                    <Link
                      to={`/tickets/${t._id}`}
                      tabIndex={-1}
                      className="inline-flex items-center gap-0.5 rounded-md px-1.5 text-xs font-medium text-muted-strong opacity-0 hover:text-fg group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      Open <ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* < 768px: one stacked card per ticket. */}
      <ul className="divide-y divide-border md:hidden">
        {items === null
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="space-y-2 p-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </li>
            ))
          : items.map((t) => (
              <li key={t._id} className={cn(loading && "opacity-60")}>
                <Link to={`/tickets/${t._id}`} className="block space-y-1.5 p-3 hover:bg-subtle">
                  <span className="font-mono text-xs text-accent">TKT-{t.ticketNumber}</span>
                  <span className="block text-sm font-medium text-fg">{t.title}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-13 text-muted-strong">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusIcon status={t.status} /> {statusLabel(t.status)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <PriorityIcon priority={effectivePriority(t)} /> {priorityLabel(effectivePriority(t))}
                    </span>
                    <SlaPill ticket={t} now={now} />
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </>
  );
}
