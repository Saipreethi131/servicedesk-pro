import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

// One bulk fetch instead of one count-only request per status (see the report for why): the Overdue card needs
// actual ticket rows (resolutionDeadline, status) to tally client-side, and that data has to come from somewhere -
// 8 separate limit=1 count requests wouldn't carry it, which would mean a 9th fetch just for Overdue. One shared
// fetch avoids that and gives every card a single loading/error state instead of eight.
const BULK_FETCH_LIMIT = 100;

// Shown as its own stat card. REOPENED is omitted: tickets never rest there (D6.3 - reopening rewrites the status
// straight to NEW in the same step), so its count would always read 0.
const STATUS_CARDS = ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_ON_REQUESTER", "RESOLVED", "CLOSED", "ESCALATED"];

const STATUS_LABELS = {
  NEW: "New",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  ESCALATED: "Escalated",
};

// Same rule as Tickets.jsx's isOverdue, applied here to the same fetched page instead of a separate request.
const OVERDUE_EXEMPT_STATUSES = ["ESCALATED", "RESOLVED", "CLOSED"];
const isOverdue = (t) =>
  Boolean(t.resolutionDeadline) && !OVERDUE_EXEMPT_STATUSES.includes(t.status) && new Date(t.resolutionDeadline).getTime() < Date.now();

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user, accessNotice, clearAccessNotice } = useAuth();

  // Copy the "no access" notice into local state and clear it from context, so it shows once and not on the next visit.
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!accessNotice) return;
    setNotice(accessNotice);
    clearAccessNotice();
  }, [accessNotice, clearAccessNotice]);

  const [tickets, setTickets] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let ignore = false;
    request(`/tickets?limit=${BULK_FETCH_LIMIT}`)
      .then(({ data }) => !ignore && setTickets(data.items))
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, []);

  const counts = useMemo(() => {
    if (!tickets) return null;
    const byStatus = Object.fromEntries(STATUS_CARDS.map((s) => [s, 0]));
    let overdue = 0;
    for (const t of tickets) {
      if (byStatus[t.status] !== undefined) byStatus[t.status]++;
      if (isOverdue(t)) overdue++;
    }
    return { byStatus, overdue };
  }, [tickets]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {notice && (
        <p
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb", color: "#92400e" }}
        >
          {notice}
        </p>
      )}

      {/* Demoted from the page's main content to a single small line (department isn't shown: user.department
          from /auth/me is a bare id, and resolving it to a name would need an extra fetch - same gap flagged
          when this page was first built). */}
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {user.fullName}
        </span>
        <Badge variant="role" value={user.role} />
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {user.email}
        </span>
      </Card>

      <ErrorBanner error={loadError} />

      {!tickets && !loadError && (
        <p role="status" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading...
        </p>
      )}

      {counts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_CARDS.map((status) => (
            <Link
              key={status}
              to={`/tickets?status=${status}`}
              aria-label={`${counts.byStatus[status]} ${STATUS_LABELS[status]} tickets`}
            >
              <Card interactive className="border-t-4" style={{ borderTopColor: `var(--color-status-${status.toLowerCase()})` }}>
                <div className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
                  {counts.byStatus[status]}
                </div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {STATUS_LABELS[status]}
                </div>
              </Card>
            </Link>
          ))}

          {/* No "overdue" filter exists in Tickets.jsx's UI, so this links to the unfiltered list rather than a
              deep link that doesn't exist yet - flagged in the report, same spirit as the other known gaps. */}
          <Link to="/tickets" aria-label={`${counts.overdue} overdue tickets`}>
            <Card interactive className="border-t-4" style={{ borderTopColor: "var(--color-danger)" }}>
              <div className="text-3xl font-bold" style={{ color: "var(--color-danger)" }}>
                {counts.overdue}
              </div>
              <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Overdue
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
