import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

// "IN_PROGRESS" -> "In progress". Derived, not a lookup table, so a status the server adds still renders.
const statusLabel = (status) => {
  const text = status.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

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

  const [stats, setStats] = useState(null); // { byStatus, overdue, total } from the server; null = still loading
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let ignore = false;
    request("/tickets/stats")
      .then(({ data }) => !ignore && setStats(data))
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, []);

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

      {!stats && !loadError && (
        <p role="status" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading...
        </p>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Object key order = the server's status enum order. */}
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <Link
              key={status}
              to={`/tickets?status=${status}`}
              aria-label={`${count} ${statusLabel(status)} tickets`}
            >
              <Card interactive className="border-t-4" style={{ borderTopColor: `var(--color-status-${status.toLowerCase()})` }}>
                <div className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
                  {count}
                </div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {statusLabel(status)}
                </div>
              </Card>
            </Link>
          ))}

          {/* No "overdue" filter exists in Tickets.jsx's UI, so this links to the unfiltered list rather than a
              deep link that doesn't exist yet - flagged in the report, same spirit as the other known gaps. */}
          <Link to="/tickets" aria-label={`${stats.overdue} overdue tickets`}>
            <Card interactive className="border-t-4" style={{ borderTopColor: "var(--color-danger)" }}>
              <div className="text-3xl font-bold" style={{ color: "var(--color-danger)" }}>
                {stats.overdue}
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
