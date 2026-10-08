import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, Inbox, Plus } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import { ROLES } from "../roles.js";
import { useNow } from "../lib/dashboardHooks.js";
import {
  assignedTo,
  assigneeLabel,
  categoryLabel,
  dailySeries,
  dueSoon,
  greeting,
  groupOpen,
  openCountFromStats,
  periodKpis,
} from "../lib/dashboard.js";
import BarList from "../components/dashboard/BarList.jsx";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton.jsx";
import { derivedNote } from "../components/dashboard/InfoTip.jsx";
import KpiCard from "../components/dashboard/KpiCard.jsx";
import StatusBar from "../components/dashboard/StatusBar.jsx";
import StatusStrip from "../components/dashboard/StatusStrip.jsx";
import TicketList from "../components/dashboard/TicketList.jsx";
import TrendChart from "../components/dashboard/TrendChart.jsx";
import { Button, buttonVariants, Card, EmptyState, PageHeader } from "../components/ui/index.js";

const PAGE_SIZE = 100; // the API's cap per page
const MAX_PAGES = 3; // so at most the newest 300 tickets are read for the derived numbers

// The newest tickets the user can list, up to maxPages pages. The first page also says how many exist in total, which is how
// the page knows whether it saw everything. If a later page fails we keep page one: a gap in the middle would be worse than
// a shorter list, since "newest N" is what the labels promise.
async function loadTickets(maxPages) {
  const url = (page) => `/tickets?page=${page}&limit=${PAGE_SIZE}`;
  const { data: first } = await request(url(1));
  const pages = Math.min(maxPages, Math.ceil(first.total / PAGE_SIZE));
  if (pages <= 1) return { items: first.items, total: first.total };
  try {
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => request(url(i + 2))));
    const seen = new Set();
    // A ticket created while we were paging can shift one across a page boundary, so de-duplicate by id.
    const items = [first.items, ...rest.map((r) => r.data.items)].flat().filter((t) => !seen.has(t._id) && seen.add(t._id));
    return { items, total: first.total };
  } catch {
    return { items: first.items, total: first.total };
  }
}

function SectionError({ title, error, onRetry }) {
  return (
    <Card>
      <EmptyState icon={AlertCircle} title={title} description={error.message} action={<Button type="button" variant="secondary" onClick={onRetry}>Try again</Button>} />
    </Card>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user, accessNotice, clearAccessNotice } = useAuth();
  const now = useNow(30_000);

  // Copy the "no access" notice into local state and clear it from context, so it shows once and not on the next visit.
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!accessNotice) return;
    setNotice(accessNotice);
    clearAccessNotice();
  }, [accessNotice, clearAccessNotice]);

  const isEmployee = user.role === ROLES.EMPLOYEE;
  const isQueueRole = user.role === ROLES.TECHNICIAN || user.role === ROLES.ASSET_MANAGER;
  const isManager = user.role === ROLES.IT_MANAGER || user.role === ROLES.SYSTEM_ADMIN;

  // Two independent requests: exact counts from /tickets/stats, and the ticket list the time-based numbers are derived from.
  // Each can fail on its own, and only the sections that need it show the error.
  const [stats, setStats] = useState({ status: "loading" }); // { status: "loading" | "ok" | "error", data?, error? }
  const [list, setList] = useState({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => {
    setStats({ status: "loading" });
    setList({ status: "loading" });
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    request("/tickets/stats")
      .then(({ data }) => !ignore && setStats({ status: "ok", data }))
      .catch((error) => !ignore && setStats({ status: "error", error }));
    // An employee gets the one newest page (recent activity only); everyone else gets up to MAX_PAGES for the analytics.
    loadTickets(isEmployee ? 1 : MAX_PAGES)
      .then((data) => !ignore && setList({ status: "ok", data }))
      .catch((error) => !ignore && setList({ status: "error", error }));
    return () => {
      ignore = true;
    };
  }, [isEmployee, reloadKey]);

  const items = list.status === "ok" ? list.data.items : null;
  const total = list.status === "ok" ? list.data.total : 0;
  const complete = items !== null && items.length >= total; // everything the user can see is loaded
  const note = items ? derivedNote({ loaded: items.length, total }) : "";

  // Everything below is computed in the browser from `items` and labelled as such.
  const derived = useMemo(() => {
    if (!items) return null;
    const days = dailySeries(items, now, 14);
    return { days, kpis: periodKpis(items, now, complete) };
  }, [items, now, complete]);

  const openCount = stats.status === "ok" ? openCountFromStats(stats.data.byStatus) : null;
  // "Open at the end of each day" can only be rebuilt from created/resolved dates when every ticket is loaded. As a check on
  // that rebuild, its last point must equal the server's own open count; if not, the sparkline is left out rather than shown wrong.
  const openSeries = derived && complete ? derived.days.map((d) => d.openAtEnd) : null;
  const openSparkline = openSeries && openSeries.at(-1) === openCount ? openSeries : null;

  const loading = stats.status === "loading" || list.status === "loading";
  const firstName = user.fullName.split(" ")[0];
  const today = new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const newRequest = (
    <Link to="/tickets/new" className={buttonVariants({ variant: "primary", size: isEmployee ? "lg" : "md" })}>
      <Plus size={16} aria-hidden="true" />
      New request
    </Link>
  );

  // ---- Pieces that depend on the role ----
  const mine = items && isQueueRole ? assignedTo(items, user._id) : [];
  const myQueue = [...mine]
    .sort((a, b) => new Date(a.resolutionDeadline ?? 8.64e15) - new Date(b.resolutionDeadline ?? 8.64e15))
    .slice(0, 8);

  const recentActivity = items
    ? [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5)
    : [];

  const body = () => {
    if (loading) return <DashboardSkeleton />;

    if (stats.status === "ok" && stats.data.total === 0) {
      return (
        <Card>
          <EmptyState
            icon={Inbox}
            titleAs="h2"
            title="No tickets yet"
            description={isEmployee ? "When you raise a request, it shows up here." : "Tickets you can see will show up here."}
            action={newRequest}
          />
        </Card>
      );
    }

    // ---- Employee: a summary, one big button, recent activity. No analytics. ----
    if (isEmployee) {
      return (
        <div className="space-y-4">
          {stats.status === "ok" ? (
            <>
              <Card title="My requests">
                <dl className="grid grid-cols-3 gap-4">
                  {[
                    ["Open", openCount],
                    ["Waiting on you", stats.data.byStatus.WAITING_ON_REQUESTER ?? 0],
                    ["Resolved", (stats.data.byStatus.RESOLVED ?? 0) + (stats.data.byStatus.CLOSED ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-13 text-muted-strong">{label}</dt>
                      <dd className="mt-1 text-2xl font-semibold tracking-tight text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <StatusStrip stats={stats.data} />
            </>
          ) : (
            <SectionError title="Could not load your request counts" error={stats.error} onRetry={reload} />
          )}
          {list.status === "ok" ? (
            <TicketList
              title="Recent activity"
              description="Your most recently updated requests"
              tickets={recentActivity}
              now={now}
              kind="activity"
              emptyTitle="No activity yet"
              emptyDescription="Requests you raise will appear here."
            />
          ) : (
            <SectionError title="Could not load recent activity" error={list.error} onRetry={reload} />
          )}
        </div>
      );
    }

    // ---- Technician / Asset Manager / IT Manager / Admin ----
    const k = derived?.kpis;
    const days = derived?.days;
    const resolvedSpark = days && { values: days.map((d) => d.resolved), label: "Tickets resolved per day, last 14 days" };

    return (
      <div className="space-y-4">
        {isQueueRole && list.status === "ok" && (
          <TicketList
            title="My queue"
            description="Open tickets assigned to you, nearest deadline first"
            info={note}
            tickets={myQueue}
            now={now}
            emphasis
            emptyTitle="Your queue is clear"
            emptyDescription="Nothing open is assigned to you."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Open"
            value={openCount}
            sparkline={openSparkline && { values: openSparkline, label: "Open tickets at the end of each of the last 14 days" }}
          />
          <KpiCard
            label="Overdue"
            value={stats.status === "ok" ? stats.data.overdue : null}
            tone="danger"
            info="Counts tickets past their resolution deadline that have not yet been escalated."
          />
          <KpiCard
            label="Resolved (7 days)"
            value={k ? k.resolved7 : null}
            info={note}
            sparkline={resolvedSpark}
            delta={k?.resolved7Delta != null ? { amount: k.resolved7Delta, unit: "", against: "vs prior 7 days" } : undefined}
          />
          <KpiCard
            label="SLA compliance (30 days)"
            value={k ? k.sla30 : null}
            suffix="%"
            info={note}
            note={k && k.sla30 === null ? "No resolved tickets yet" : undefined}
            delta={k?.sla30Delta != null ? { amount: k.sla30Delta, unit: " pts", against: "vs prior 30 days" } : undefined}
          />
        </div>

        {stats.status === "ok" ? <StatusStrip stats={stats.data} /> : <SectionError title="Could not load ticket counts" error={stats.error} onRetry={reload} />}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {days ? <TrendChart days={days} info={note} /> : <SectionError title="Could not load the trend" error={list.error} onRetry={reload} />}
            {stats.status === "ok" && <StatusBar byStatus={stats.data.byStatus} />}
          </div>
          <div className="min-w-0">
            {items ? (
              <TicketList
                title="Due soon"
                description="Open tickets, nearest resolution deadline first"
                info={note}
                tickets={dueSoon(items, 5)}
                now={now}
                emptyTitle="Nothing due soon"
                emptyDescription="No open ticket has a running deadline."
              />
            ) : (
              <SectionError title="Could not load due tickets" error={list.error} onRetry={reload} />
            )}
          </div>
        </div>

        {isManager && items && (
          <div className="grid gap-4 md:grid-cols-2">
            <BarList title="Workload by assignee" info={note} items={groupOpen(items, assigneeLabel)} emptyText="No open tickets" />
            <BarList title="Open tickets by category" info={note} items={groupOpen(items, categoryLabel)} emptyText="No open tickets" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title={`${greeting(now)}, ${firstName}`} description={today} action={isEmployee ? newRequest : undefined} />

      {notice && (
        <p role="status" className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-ink">
          {notice}
        </p>
      )}

      {body()}
    </div>
  );
}
