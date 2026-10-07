import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ROLES } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";

const inputClass = "mt-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm";
const muted = { color: "var(--color-text-muted)" };

// Plain-language labels for the statuses canTransition can actually produce in availableTransitions (D6.2/D6.3).
// "NEW" never appears there - TRANSITION_TABLE never lists it as a target, only as a source - so the reopen case
// is keyed by "REOPENED" (the value the API expects in the transition request), not "NEW".
const TRANSITION_LABELS = {
  IN_PROGRESS: "Start work",
  WAITING_ON_REQUESTER: "Wait for requester",
  RESOLVED: "Mark resolved",
  CLOSED: "Close ticket",
  ESCALATED: "Escalate",
  REOPENED: "Reopen ticket",
};

const STAFF_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER, ROLES.TECHNICIAN, ROLES.ASSET_MANAGER];

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// history[].by and Comment.author arrive as { name, role } (D6.9). Falls back for a legacy raw id string (shortened,
// clearly technical, rather than faking a name) and for null, which means a system action such as auto-escalation.
const shortId = (id) => (id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
const displayName = (who) => {
  if (who == null) return "System";
  if (typeof who === "string") return `User ${shortId(who)}`;
  return who.name || "Unknown user";
};

// Pure client-side comparison against resolutionDeadline (P8), same rule as Tickets.jsx's list indicator.
const OVERDUE_EXEMPT_STATUSES = ["ESCALATED", "RESOLVED", "CLOSED"];
const isOverdue = (t) =>
  Boolean(t.resolutionDeadline) && !OVERDUE_EXEMPT_STATUSES.includes(t.status) && new Date(t.resolutionDeadline).getTime() < Date.now();

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isManagerRole = user.role === ROLES.IT_MANAGER; // SYSTEM_ADMIN never gets ASSIGNED in availableTransitions - see the report

  const [ticket, setTicket] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  useDocumentTitle(ticket ? `TKT-${ticket.ticketNumber}` : "Ticket");

  const [comments, setComments] = useState(null);
  const [commentsError, setCommentsError] = useState(null);

  const [reference, setReference] = useState(null); // for the priority-override select's options (D5.3)

  const [transitionError, setTransitionError] = useState(null);
  const [transitionNotice, setTransitionNotice] = useState(null);
  const [transitioningTo, setTransitioningTo] = useState(null);
  const [assigningMode, setAssigningMode] = useState(false); // IT_MANAGER only: reveals the assignee-id input
  const [assigneeIdInput, setAssigneeIdInput] = useState("");

  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState(null);
  const [overrideNotice, setOverrideNotice] = useState(null);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const [commentBody, setCommentBody] = useState("");
  const [commentIsInternal, setCommentIsInternal] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setTicket(null);
    setLoadError(null);
    request(`/tickets/${id}`)
      .then(({ data }) => !ignore && setTicket(data.ticket))
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;
    request(`/tickets/${id}/comments`)
      .then(({ data }) => !ignore && setComments(data.items))
      .catch((err) => !ignore && setCommentsError(err));
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;
    request("/reference")
      .then(({ data }) => !ignore && setReference(data))
      .catch(() => {}); // the override select just has no options beyond the placeholder until this loads
    return () => {
      ignore = true;
    };
  }, []);

  // Used after a successful transition/override (never inside the mount effect above, which already guards
  // against a stale response with `ignore`; these run once, sequentially, from a click handler instead).
  const reloadTicket = () => request(`/tickets/${id}`).then(({ data }) => setTicket(data.ticket));
  const reloadComments = () => request(`/tickets/${id}/comments`).then(({ data }) => setComments(data.items));

  const submitTransition = async (toStatus, extra = {}) => {
    setTransitionError(null);
    setTransitionNotice(null);
    setTransitioningTo(toStatus);
    try {
      await request(`/tickets/${id}/transition`, { method: "POST", body: { toStatus, ...extra } });
      await reloadTicket(); // refetch rather than patch client state, so status/availableTransitions/history stay authoritative
      setTransitionNotice(`Updated to ${toStatus.replaceAll("_", " ")}`);
      setAssigningMode(false);
      setAssigneeIdInput("");
    } catch (err) {
      setTransitionError(err);
    } finally {
      setTransitioningTo(null);
    }
  };

  const submitOverride = async (event) => {
    event.preventDefault();
    setOverrideError(null);
    setOverrideNotice(null);
    setOverrideSubmitting(true);
    try {
      await request(`/tickets/${id}/priority-override`, {
        method: "POST",
        body: { value: overrideValue, reason: overrideReason },
      });
      await reloadTicket();
      setOverrideNotice("Priority override saved");
      setOverrideReason("");
    } catch (err) {
      setOverrideError(err);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    setCommentError(null);
    setCommentSubmitting(true);
    try {
      await request(`/tickets/${id}/comments`, {
        method: "POST",
        body: { body: commentBody.trim(), ...(commentIsInternal && { isInternal: true }) },
      });
      await reloadComments(); // comments only, not the whole ticket - the ticket itself didn't change
      setCommentBody("");
      setCommentIsInternal(false);
    } catch (err) {
      setCommentError(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  // --- full-page states: loading, and "there's nothing else to show" (403/404) ---
  if (loadError) {
    return (
      <div className="flex justify-center py-12">
        <Card className="max-w-md text-center">
          <h1 className="auth-card-title">
            {loadError.status === 404 ? "Ticket not found" : loadError.status === 403 ? "Access denied" : "Something went wrong"}
          </h1>
          <p className="text-sm" style={muted}>
            {loadError.message}
          </p>
          <Link to="/tickets" className="mt-4 inline-block text-sm" style={{ color: "var(--color-primary)" }}>
            Back to tickets
          </Link>
        </Card>
      </div>
    );
  }
  if (!ticket) {
    return (
      <p role="status" className="p-6 text-sm" style={muted}>
        Loading...
      </p>
    );
  }

  const effectivePriority = ticket.priorityOverride?.value ?? ticket.priority;
  const hasOverride = Boolean(ticket.priorityOverride);
  const canMarkInternal = STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                TKT-{ticket.ticketNumber}
              </span>
              <span className="text-lg" style={{ color: "var(--color-text)" }}>
                {ticket.title}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="status" value={ticket.status} />
              <Badge variant="priority" value={effectivePriority} />
              {hasOverride && (
                <span className="text-xs" style={muted} title={ticket.priorityOverride.reason}>
                  (overridden)
                </span>
              )}
              {isOverdue(ticket) && (
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-danger)" }}
                  title={`Resolution deadline was ${formatDateTime(ticket.resolutionDeadline)}`}
                >
                  ● Overdue
                </span>
              )}
            </div>
            {ticket.escalatedAt && (
              <p className="mt-2 text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                Escalated at {formatDateTime(ticket.escalatedAt)}
              </p>
            )}
          </div>
          <div className="text-right text-sm" style={muted}>
            <div>Created {formatDateTime(ticket.createdAt)}</div>
            <div>Updated {formatDateTime(ticket.updatedAt)}</div>
          </div>
        </div>
      </Card>

      {/* 2. Body */}
      <Card title="Details">
        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs" style={muted}>
              Requester
            </dt>
            <dd>
              {ticket.requester.firstName} {ticket.requester.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs" style={muted}>
              Assignee
            </dt>
            <dd>
              {ticket.assignee ? (
                `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
              ) : (
                <span className="italic" style={muted}>
                  Unassigned
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs" style={muted}>
              Department
            </dt>
            <dd>{ticket.department.name}</dd>
          </div>
          <div>
            {/* The category populate only selects `name` (server-side), so a parent/child chain isn't available
                here - showing just the name rather than faking "Parent / Child". See the report. */}
            <dt className="text-xs" style={muted}>
              Category
            </dt>
            <dd>{ticket.category.name}</dd>
          </div>
          <div>
            <dt className="text-xs" style={muted}>
              Response due
            </dt>
            <dd>{ticket.responseDeadline ? formatDateTime(ticket.responseDeadline) : "-"}</dd>
          </div>
          <div>
            <dt className="text-xs" style={muted}>
              Resolution due
            </dt>
            <dd className="flex items-center gap-2">
              {ticket.resolutionDeadline ? formatDateTime(ticket.resolutionDeadline) : "-"}
              {isOverdue(ticket) && (
                <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                  ● Overdue
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* 3. Actions */}
      <Card title="Actions">
        <ErrorBanner error={transitionError} focusOnShow />
        <Notice message={transitionNotice} />

        {ticket.availableTransitions.length === 0 ? (
          <p className="text-sm" style={muted}>
            No actions available right now.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {ticket.availableTransitions.map((status) => {
              if (status === "ASSIGNED") {
                const label = ticket.assignee === null ? "Claim ticket" : "Reassign";
                if (!isManagerRole) {
                  return (
                    <Button
                      key={status}
                      type="button"
                      variant="primary"
                      onClick={() => submitTransition("ASSIGNED")}
                      disabled={Boolean(transitioningTo)}
                    >
                      {transitioningTo === "ASSIGNED" ? "Claiming..." : label}
                    </Button>
                  );
                }
                // IT_MANAGER: there's no user-picker component anywhere in the app (NewTicket.jsx flagged the
                // same gap for its "file on behalf of" field) - this is a plain id input, not a search widget.
                return assigningMode ? (
                  <form
                    key={status}
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitTransition("ASSIGNED", assigneeIdInput.trim() ? { assigneeId: assigneeIdInput.trim() } : {});
                    }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      value={assigneeIdInput}
                      onChange={(e) => setAssigneeIdInput(e.target.value)}
                      placeholder="Assignee user id (blank = assign yourself)"
                      className={inputClass}
                    />
                    <Button type="submit" variant="primary" disabled={transitioningTo === "ASSIGNED"}>
                      {transitioningTo === "ASSIGNED" ? "Assigning..." : "Confirm"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAssigningMode(false);
                        setAssigneeIdInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <Button key={status} type="button" variant="secondary" onClick={() => setAssigningMode(true)}>
                    {label}
                  </Button>
                );
              }

              return (
                <Button
                  key={status}
                  type="button"
                  variant={status === "ESCALATED" ? "danger" : "secondary"}
                  onClick={() => submitTransition(status)}
                  disabled={Boolean(transitioningTo)}
                >
                  {transitioningTo === status ? "Working..." : TRANSITION_LABELS[status] ?? status}
                </Button>
              );
            })}
          </div>
        )}

        {ticket.canOverridePriority && (
          <form onSubmit={submitOverride} className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <ErrorBanner error={overrideError} focusOnShow />
            <Notice message={overrideNotice} />
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span>Change priority</span>
                <br />
                <select required value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)} className={inputClass}>
                  <option value="">Select</option>
                  {(reference?.priorities ?? []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[14rem] flex-1 text-sm">
                <span>Reason</span>
                <br />
                <input
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className={`${inputClass} w-full`}
                />
              </label>
              <Button type="submit" variant="primary" disabled={overrideSubmitting}>
                {overrideSubmitting ? "Saving..." : "Override priority"}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* 4. History - most recent first (matches the ticket list's own newest-first sort) */}
      <Card title="History">
        <ol className="space-y-3">
          {[...ticket.history].reverse().map((h, i) => (
            <li key={i} className="border-b pb-2 text-sm last:border-b-0 last:pb-0" style={{ borderColor: "var(--color-border)" }}>
              <div>
                {h.from ? h.from.replaceAll("_", " ") : "Created"} &rarr; {h.to.replaceAll("_", " ")}
              </div>
              <div className="text-xs" style={muted}>
                by {displayName(h.by)} &middot; {formatDateTime(h.at)}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* 5. Comments */}
      <Card title="Comments">
        <ErrorBanner error={commentsError} />
        <div className="space-y-3">
          {comments === null && (
            <p role="status" className="text-sm" style={muted}>
              Loading...
            </p>
          )}
          {comments?.length === 0 && (
            <p className="text-sm" style={muted}>
              No comments yet.
            </p>
          )}
          {comments?.map((c) =>
            c.isInternal ? (
              <div key={c._id} className="rounded-md border-l-4 p-3" style={{ borderLeftColor: "#f59e0b", backgroundColor: "#fffbeb" }}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: "#92400e" }}>
                    Internal
                  </span>
                  <span className="text-xs" style={muted}>
                    by {displayName(c.author)} &middot; {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              </div>
            ) : (
              <div key={c._id} className="rounded-md border p-3" style={{ borderColor: "var(--color-border)" }}>
                <div className="mb-1 text-xs" style={muted}>
                  by {displayName(c.author)} &middot; {formatDateTime(c.createdAt)}
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              </div>
            )
          )}
        </div>

        <form onSubmit={submitComment} className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <ErrorBanner error={commentError} focusOnShow />
          <label className="block text-sm">
            <span>Add a comment</span>
            <textarea
              required
              rows={3}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </label>
          {canMarkInternal && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={commentIsInternal} onChange={(e) => setCommentIsInternal(e.target.checked)} />
              Internal note (staff only)
            </label>
          )}
          <Button type="submit" variant="primary" disabled={commentSubmitting}>
            {commentSubmitting ? "Posting..." : "Post comment"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
