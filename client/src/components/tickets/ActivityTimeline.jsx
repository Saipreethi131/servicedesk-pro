import { useMemo } from "react";
import { ArrowRight, Lock, PlusCircle } from "lucide-react";
import { relativeTime } from "../../lib/dashboard.js";
import { statusLabel } from "../../lib/labels.js";
import { displayName, formatDateTime } from "../../lib/ticketText.js";
import { Avatar, Badge, Skeleton } from "../ui/index.js";
import { cn } from "../../lib/cn.js";

function When({ iso, now }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className="whitespace-nowrap text-xs text-muted-strong">
      {relativeTime(iso, now)}
    </time>
  );
}

// One line for a status change. History entries have no id, so the caller keys them by position.
function EventRow({ entry, now }) {
  const created = !entry.from;
  const Icon = created ? PlusCircle : ArrowRight;
  return (
    <li className="flex items-center gap-2 py-1 text-13 text-muted-strong">
      <span className="grid size-6 shrink-0 place-items-center text-muted" aria-hidden="true">
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        {created ? (
          <>Ticket created</>
        ) : (
          <>
            Status changed <span className="font-medium text-fg">{statusLabel(entry.from)}</span> &rarr;{" "}
            <span className="font-medium text-fg">{statusLabel(entry.to)}</span>
          </>
        )}{" "}
        <span className="text-muted-strong">by {displayName(entry.by)}</span>
      </span>
      <When iso={entry.at} now={now} />
    </li>
  );
}

// A comment is a card. Internal notes get a lock, an "Internal" badge and a tint. They only ever appear here because the
// server sent them (it strips them for Employees); this component never decides who may see one.
function CommentCard({ comment, now }) {
  const name = displayName(comment.author);
  return (
    <li className="py-1.5">
      <article
        className={cn(
          "rounded-lg border p-3",
          comment.isInternal ? "border-warning/30 bg-warning-soft" : "border-border bg-surface"
        )}
      >
        <header className="mb-1.5 flex flex-wrap items-center gap-2">
          <Avatar name={name} size={20} />
          <span className="text-13 font-medium text-fg">{name}</span>
          {comment.isInternal && (
            <Badge tone="warning" icon={<Lock size={11} aria-hidden="true" />}>
              Internal
            </Badge>
          )}
          <span className="ml-auto">
            <When iso={comment.createdAt} now={now} />
          </span>
        </header>
        <p className="whitespace-pre-wrap text-sm text-fg">{comment.body}</p>
      </article>
    </li>
  );
}

// ONE timeline, oldest first: the ticket's history events and its comments merged by time, built here from the two
// responses the page already has. `comments` is null while loading.
export default function ActivityTimeline({ history, comments, now }) {
  const entries = useMemo(() => {
    const events = history.map((h, i) => ({ type: "event", key: `h${i}`, at: h.at, entry: h }));
    const notes = (comments ?? []).map((c) => ({ type: "comment", key: c._id, at: c.createdAt, comment: c }));
    // Array.sort is stable, so entries with the same instant keep their order (events first, then comments).
    return [...events, ...notes].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [history, comments]);

  return (
    <div>
      <ol className="space-y-0.5">
        {entries.map((e) =>
          e.type === "event" ? <EventRow key={e.key} entry={e.entry} now={now} /> : <CommentCard key={e.key} comment={e.comment} now={now} />
        )}
      </ol>
      {comments === null && (
        <div className="mt-2 space-y-2" role="status">
          <span className="sr-only">Loading comments</span>
          <Skeleton className="h-16 w-full" />
        </div>
      )}
    </div>
  );
}
