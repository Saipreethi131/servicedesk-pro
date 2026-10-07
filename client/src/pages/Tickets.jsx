import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";

const PAGE_SIZE = 20;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const selectClass = "mt-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm";

// Pure client-side comparison against resolutionDeadline, already present on every ticket (P8) - no extra fetch.
// A ticket that's already ESCALATED, RESOLVED or CLOSED isn't "overdue" anymore in any useful sense: ESCALATED
// means the sweep already caught it, and the other two mean the clock stopped mattering.
const OVERDUE_EXEMPT_STATUSES = ["ESCALATED", "RESOLVED", "CLOSED"];
const isOverdue = (t) =>
  Boolean(t.resolutionDeadline) && !OVERDUE_EXEMPT_STATUSES.includes(t.status) && new Date(t.resolutionDeadline).getTime() < Date.now();

// Clicks on these inside a row keep their own behaviour instead of opening the ticket.
const INTERACTIVE = "a, button, input, select, textarea, label";

export default function Tickets() {
  useDocumentTitle("Tickets");
  const navigate = useNavigate();
  // Row click = open the ticket. The ticket-number <Link> remains the accessible, keyboard and middle-click path
  // (the row itself is deliberately not focusable, so there is one tab stop per ticket, not two).
  const handleRowClick = (event, ticketId) => {
    const row = event.currentTarget;
    const hit = event.target.closest(INTERACTIVE);
    if (hit && row.contains(hit)) return; // a link, button or form control handles its own click
    if (window.getSelection()?.toString()) return; // the user is selecting text, not opening
    if (event.ctrlKey || event.metaKey) {
      // Read the href off the row's own <Link>, so the new tab gets exactly the URL the link would.
      window.open(row.querySelector("a[href]").href, "_blank", "noopener");
      return;
    }
    navigate(`/tickets/${ticketId}`);
  };

  const [page, setPage] = useState(1); // the page last REQUESTED; the page on screen is result.page (see Users.jsx)
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [result, setResult] = useState(null); // { items, page, limit, total }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reference, setReference] = useState(null); // { ..., priorities, ticketStatuses }, open to every role (D5.3)

  useEffect(() => {
    let ignore = false;
    request("/reference")
      .then(({ data }) => !ignore && setReference(data))
      .catch(() => {}); // the filters just have no options beyond "All" until this loads
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    request(`/tickets?${params.toString()}`)
      .then(({ data }) => {
        if (ignore) return;
        setResult(data);
        setLoadError(null);
      })
      .catch((err) => !ignore && setLoadError({ page, err }))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [page, statusFilter, priorityFilter, reloadKey]);

  // Always refetches, even for the page already requested (mirrors Users.jsx: after a failed fetch, `page` already
  // holds the failed page, so setting it again would otherwise do nothing).
  const goToPage = (n) => {
    setPage(n);
    setReloadKey((k) => k + 1);
  };

  // Changing a filter resets to page 1; both state updates are batched into the one re-render that refetches.
  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };
  const handlePriorityChange = (value) => {
    setPriorityFilter(value);
    setPage(1);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;
  const showRows = result !== null;
  const showLoadingText = result === null && loading;

  const loadErrorBanner = loadError && {
    message: result
      ? `Could not load page ${loadError.page}: ${loadError.err.message} (still showing page ${result.page})`
      : `Could not load tickets: ${loadError.err.message}`,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        action={
          <Link to="/tickets/new" className="btn btn-primary">
            + New Ticket
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm">
            <span>Status</span>
            <br />
            <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {(reference?.ticketStatuses ?? []).map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>Priority</span>
            <br />
            <select value={priorityFilter} onChange={(e) => handlePriorityChange(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {(reference?.priorities ?? []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <ErrorBanner error={loadErrorBanner} />

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`table ${loading ? "opacity-60" : ""}`}>
            <caption className="sr-only">Tickets</caption>
            <thead>
              <tr>
                <th scope="col">Ticket</th>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Requester</th>
                <th scope="col">Department</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {showRows &&
                result.items.map((t) => {
                  const effectivePriority = t.priorityOverride?.value ?? t.priority;
                  const hasOverride = Boolean(t.priorityOverride);
                  return (
                    <tr key={t._id} className="row-link" onClick={(e) => handleRowClick(e, t._id)}>
                      <td>
                        <Link to={`/tickets/${t._id}`} style={{ color: "var(--color-primary)" }}>
                          TKT-{t.ticketNumber}
                        </Link>
                      </td>
                      <td>{t.title}</td>
                      <td>
                        <Badge variant="status" value={t.status} />
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant="priority" value={effectivePriority} />
                          {hasOverride && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-text-muted)" }}
                              title="A manager overrode the derived priority"
                            >
                              (overridden)
                            </span>
                          )}
                          {isOverdue(t) && (
                            <span
                              className="text-xs font-medium"
                              style={{ color: "var(--color-danger)" }}
                              title={`Resolution deadline was ${formatDate(t.resolutionDeadline)}`}
                            >
                              ● Overdue
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        {/* Defensive fallback only: the server always populates this now, but a bare string would
                            mean something regressed, not that the ticket has no requester (that field is required). */}
                        {t.requester && typeof t.requester === "object" ? (
                          `${t.requester.firstName} ${t.requester.lastName}`
                        ) : (
                          <span title="Requester names aren't available - showing the raw id">{t.requester}</span>
                        )}
                      </td>
                      <td>{t.department?.name ?? "-"}</td>
                      <td>{formatDate(t.createdAt)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {showRows && result.items.length === 0 && (
          <p className="p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            No tickets match these filters.
          </p>
        )}
        {showLoadingText && (
          <p role="status" className="p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading...
          </p>
        )}

        {result && (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-between border-t px-4 py-3 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span style={{ color: "var(--color-text-muted)" }}>
              Page {result.page} of {totalPages} &middot; {result.total} {result.total === 1 ? "ticket" : "tickets"}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goToPage(result.page - 1)}
                disabled={result.page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => goToPage(result.page + 1)}
                disabled={result.page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </nav>
        )}
      </Card>
    </div>
  );
}
