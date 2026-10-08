import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AlertCircle, AlignJustify, Inbox, Plus, SearchX, StretchHorizontal } from "lucide-react";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import { useNow } from "../lib/dashboardHooks.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Pagination from "../components/Pagination.jsx";
import FilterBar from "../components/tickets/FilterBar.jsx";
import TicketPeek from "../components/tickets/TicketPeek.jsx";
import TicketsTable from "../components/tickets/TicketsTable.jsx";
import { Button, buttonVariants, Card, EmptyState, IconButton, PageHeader } from "../components/ui/index.js";

const PAGE_SIZE = 20;
const DENSITY_KEY = "tickets-density";

const readDensity = () => {
  try {
    return localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable"; // storage blocked: the choice just lasts for this page
  }
};

export default function Tickets() {
  useDocumentTitle("Tickets");
  const now = useNow(30_000);

  // The URL is the single source of truth for the filters, so a link such as /tickets?status=NEW lands on that view (the
  // dashboard tiles rely on it). The values go to the server as given: an invalid one gets the server's 400, shown below.
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "";
  const filterKey = `${statusFilter}|${priorityFilter}`;

  // The page is remembered together with the filter set it belongs to; when the filters change, it is page 1 again.
  // (No effect needed, and it also covers the filters changing through a link, not only through this page's own controls.)
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 }); // the page last REQUESTED
  const page = pageState.key === filterKey ? pageState.page : 1;

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null); // { items, page, limit, total }; the page on screen is result.page
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reference, setReference] = useState(null); // { ..., priorities, ticketStatuses }, open to every role (D5.3)
  const [peekId, setPeekId] = useState(null); // local state only: the peek drawer never changes the URL
  const [density, setDensity] = useState(readDensity);

  useEffect(() => {
    let ignore = false;
    request("/reference")
      .then(({ data }) => !ignore && setReference(data))
      .catch(() => {}); // the pickers just have no options beyond "All" until this loads
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

  // Always refetches, even for the page already requested (after a failed fetch `page` already holds the failed page, so
  // setting it again would otherwise do nothing). Also what "Try again" uses.
  const goToPage = (n) => {
    setPageState({ key: filterKey, page: n });
    setReloadKey((k) => k + 1);
  };

  // Filter changes replace the history entry (they are view state, not navigation). Unrelated params are kept.
  const setFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    next.delete("priority");
    setSearchParams(next, { replace: true });
  };

  const changeDensity = (value) => {
    setDensity(value);
    try {
      localStorage.setItem(DENSITY_KEY, value);
    } catch {
      // not saved; still applied
    }
  };

  const anyFilter = statusFilter !== "" || priorityFilter !== "";
  const peeked = result?.items.find((t) => t._id === peekId) ?? null;

  const loadErrorBanner = loadError && result && {
    message: `Could not load page ${loadError.page}: ${loadError.err.message} (still showing page ${result.page})`,
  };

  const densityToggle = (
    <div className="inline-flex gap-0.5" role="group" aria-label="Row density">
      <IconButton
        label="Comfortable rows"
        icon={StretchHorizontal}
        size="sm"
        variant={density === "comfortable" ? "secondary" : "ghost"}
        aria-pressed={density === "comfortable"}
        onClick={() => changeDensity("comfortable")}
      />
      <IconButton
        label="Compact rows"
        icon={AlignJustify}
        size="sm"
        variant={density === "compact" ? "secondary" : "ghost"}
        aria-pressed={density === "compact"}
        onClick={() => changeDensity("compact")}
      />
    </div>
  );

  // What the body shows: a full-card state (first load failed, or nothing to list) or the table.
  const failedFirstLoad = loadError && !result;
  const empty = result && result.items.length === 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tickets"
        action={
          <Link to="/tickets/new" className={buttonVariants({ variant: "primary" })}>
            <Plus size={16} aria-hidden="true" />
            New Ticket
          </Link>
        }
      />

      <FilterBar
        reference={reference}
        status={statusFilter}
        priority={priorityFilter}
        onChange={setFilter}
        onClear={clearFilters}
        trailing={densityToggle}
      />

      <ErrorBanner error={loadErrorBanner} />

      <Card className="!p-0 overflow-hidden">
        {failedFirstLoad ? (
          <EmptyState
            icon={AlertCircle}
            title="Could not load tickets"
            description={loadError.err.message}
            action={
              <Button type="button" variant="secondary" onClick={() => goToPage(page)}>
                Try again
              </Button>
            }
          />
        ) : empty ? (
          anyFilter ? (
            <EmptyState
              icon={SearchX}
              title="No tickets match these filters"
              description="Try removing a filter to see more."
              action={
                <Button type="button" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Inbox} title="No tickets yet" description="Tickets you can see will show up here." />
          )
        ) : (
          <TicketsTable items={result ? result.items : null} loading={loading} now={now} density={density} onPeek={(t) => setPeekId(t._id)} />
        )}

        {result && <Pagination result={result} loading={loading} noun="ticket" onPage={goToPage} />}
      </Card>

      <TicketPeek ticket={peeked} now={now} onClose={() => setPeekId(null)} />
    </div>
  );
}
