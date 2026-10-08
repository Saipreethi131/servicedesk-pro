import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronRight, FileQuestion, ShieldAlert } from "lucide-react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ROLES } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";
import { useNow } from "../lib/dashboardHooks.js";
import { statusLabel } from "../lib/labels.js";
import { TRANSITION_LABELS } from "../lib/ticketText.js";
import { cn } from "../lib/cn.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import ActivityTimeline from "../components/tickets/ActivityTimeline.jsx";
import CommentComposer from "../components/tickets/CommentComposer.jsx";
import PropertiesPanel from "../components/tickets/PropertiesPanel.jsx";
import SlaPanel from "../components/tickets/SlaPanel.jsx";
import TicketDetailSkeleton from "../components/tickets/TicketDetailSkeleton.jsx";
import { AssignDialog, OverrideDialog } from "../components/tickets/TicketDialogs.jsx";
import {
  buttonVariants,
  Card,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownTrigger,
  EmptyState,
  StatusIcon,
  toast,
} from "../components/ui/index.js";

const STAFF_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER, ROLES.TECHNICIAN, ROLES.ASSET_MANAGER];
const FLASH_MS = 200;

// A status icon in the shape DropdownItem expects for its `icon` prop (a component that takes `size`).
const statusItemIcon = (status) =>
  function StatusItemIcon({ size }) {
    return <StatusIcon status={status} size={size} />;
  };

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const now = useNow(30_000);
  // UX only (D4.3): these roles pick someone else from a list; everyone else with ASSIGNED just claims. The server
  // decides who is actually eligible (assignable-users) and re-checks on transition.
  const isManagerRole = user.role === ROLES.IT_MANAGER || user.role === ROLES.SYSTEM_ADMIN;

  const [ticket, setTicket] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  useDocumentTitle(ticket ? `TKT-${ticket.ticketNumber}` : "Ticket");

  const [comments, setComments] = useState(null);
  const [commentsError, setCommentsError] = useState(null);

  const [reference, setReference] = useState(null); // for the priority-override select's options (D5.3)

  const [transitionError, setTransitionError] = useState(null);
  const [transitioningTo, setTransitioningTo] = useState(null);
  const [flashStatus, setFlashStatus] = useState(false); // the 200ms highlight on the status field after a change
  const [assignOpen, setAssignOpen] = useState(false); // managers only: the assignee picker dialog
  const [assignable, setAssignable] = useState(null); // null = not loaded; otherwise [{ _id, name, role }] from the server
  const [assignableError, setAssignableError] = useState(null);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideError, setOverrideError] = useState(null);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const [commentError, setCommentError] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false); // small screens: the properties list is a collapsible section

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
      .catch(() => {}); // the override select just has no options until this loads
    return () => {
      ignore = true;
    };
  }, []);

  // Only fetched when this user would see the picker AND the server lists ASSIGNED as an available action.
  const showAssignPicker = isManagerRole && Boolean(ticket?.availableTransitions.includes("ASSIGNED"));
  useEffect(() => {
    setAssignable(null);
    setAssignableError(null);
    if (!showAssignPicker) return undefined;
    let ignore = false;
    request(`/tickets/${id}/assignable-users`)
      .then(({ data }) => !ignore && setAssignable(data.items))
      .catch((err) => !ignore && setAssignableError(err));
    return () => {
      ignore = true;
    };
  }, [id, showAssignPicker]);

  // The highlight clears itself. The effect's cleanup stops the timer if the page goes away first.
  useEffect(() => {
    if (!flashStatus) return undefined;
    const timer = setTimeout(() => setFlashStatus(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashStatus]);

  // Used after a successful transition/override (never inside the mount effect above, which already guards
  // against a stale response with `ignore`; these run once, sequentially, from a click handler instead).
  const reloadTicket = () =>
    request(`/tickets/${id}`).then(({ data }) => {
      setTicket(data.ticket);
      return data.ticket;
    });
  const reloadComments = () => request(`/tickets/${id}/comments`).then(({ data }) => setComments(data.items));

  // Same call as before. Refetching (rather than patching state) keeps status, availableTransitions and history authoritative.
  const submitTransition = async (toStatus, extra = {}) => {
    setTransitionError(null);
    setTransitioningTo(toStatus);
    try {
      await request(`/tickets/${id}/transition`, { method: "POST", body: { toStatus, ...extra } });
      const updated = await reloadTicket();
      toast.success(`Status updated to ${statusLabel(updated.status)}`);
      setFlashStatus(true);
      setAssignOpen(false);
    } catch (err) {
      setTransitionError(err);
    } finally {
      setTransitioningTo(null);
    }
  };

  const submitOverride = async ({ value, reason }) => {
    setOverrideError(null);
    setOverrideSubmitting(true);
    try {
      await request(`/tickets/${id}/priority-override`, { method: "POST", body: { value, reason } });
      await reloadTicket();
      toast.success("Priority override saved");
      return true;
    } catch (err) {
      setOverrideError(err);
      return false;
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const submitComment = async ({ body, isInternal }) => {
    setCommentError(null);
    setCommentSubmitting(true);
    try {
      await request(`/tickets/${id}/comments`, {
        method: "POST",
        body: { body, ...(isInternal && { isInternal: true }) },
      });
      await reloadComments(); // comments only, not the whole ticket - the ticket itself didn't change
      return true;
    } catch (err) {
      setCommentError(err);
      return false;
    } finally {
      setCommentSubmitting(false);
    }
  };

  // --- full-page states: loading, and "there's nothing else to show" (403/404) ---
  if (loadError) {
    const notFound = loadError.status === 404;
    const denied = loadError.status === 403;
    return (
      <Card className="mx-auto max-w-md">
        <EmptyState
          icon={notFound ? FileQuestion : denied ? ShieldAlert : AlertCircle}
          titleAs="h1"
          title={notFound ? "Ticket not found" : denied ? "Access denied" : "Something went wrong"}
          description={loadError.message}
          action={
            <Link to="/tickets" className={buttonVariants({ variant: "secondary" })}>
              Back to tickets
            </Link>
          }
        />
      </Card>
    );
  }
  if (!ticket) return <TicketDetailSkeleton />;

  const canMarkInternal = STAFF_ROLES.includes(user.role);

  // What the Assign item is called: managers choose someone, everyone else with ASSIGNED just claims.
  const transitionLabel = (status) => {
    if (status === "ASSIGNED") return ticket.assignee === null ? (isManagerRole ? "Assign" : "Claim ticket") : "Reassign";
    return TRANSITION_LABELS[status] ?? statusLabel(status);
  };

  const chooseTransition = (status) => {
    if (status === "ASSIGNED" && isManagerRole) setAssignOpen(true); // the picker keeps its own confirm step, in a Dialog
    else submitTransition(status);
  };

  // The Status property. ONLY the transitions the server listed for this user appear (availableTransitions); with none,
  // it is just a label.
  const current = (
    <span className="inline-flex items-center gap-1.5">
      <StatusIcon status={ticket.status} /> {statusLabel(ticket.status)}
    </span>
  );
  const statusField = (
    <div className={cn("-mx-1.5 rounded-md px-1.5 py-0.5 transition-colors duration-[400ms]", flashStatus && "bg-accent-soft")}>
      {ticket.availableTransitions.length === 0 ? (
        current
      ) : (
        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              disabled={Boolean(transitioningTo)}
              aria-label={`Status: ${statusLabel(ticket.status)}. Change status`}
              className="-ml-1.5 inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 hover:bg-subtle disabled:opacity-60"
            >
              {transitioningTo ? <>Updating...</> : current}
              <ChevronDown size={12} className="text-muted" aria-hidden="true" />
            </button>
          </DropdownTrigger>
          <DropdownContent align="start">
            <DropdownLabel>Change status</DropdownLabel>
            {ticket.availableTransitions.map((status) => (
              <DropdownItem
                key={status}
                icon={statusItemIcon(status)}
                destructive={status === "ESCALATED"}
                onSelect={() => chooseTransition(status)}
              >
                {transitionLabel(status)}
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-13 text-muted">
          <li>
            <Link to="/tickets" className="inline-flex min-h-6 items-center gap-1 hover:text-fg">
              <ArrowLeft size={13} aria-hidden="true" /> Tickets
            </Link>
          </li>
          <ChevronRight size={12} aria-hidden="true" />
          <li aria-current="page" className="font-mono text-xs text-fg">
            TKT-{ticket.ticketNumber}
          </li>
        </ol>
      </nav>

      {/* While the assign dialog is open its own copy of the error is shown inside it. */}
      {!assignOpen && <ErrorBanner error={transitionError} focusOnShow />}

      {/* auto + 1fr rows: the tall sidebar spans both, and the spare height goes to the Activity row, not between it and the description. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        <section aria-label="Ticket" className="min-w-0 lg:col-start-1 lg:row-start-1">
          <p className="font-mono text-xs text-muted-strong">TKT-{ticket.ticketNumber}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">{ticket.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-sm text-fg">{ticket.description}</p>
        </section>

        <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div>
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls="ticket-details"
              onClick={() => setDetailsOpen((o) => !o)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-13 font-medium text-fg lg:hidden"
            >
              Details
              <ChevronDown size={14} className={cn("transition-transform duration-150", detailsOpen && "rotate-180")} aria-hidden="true" />
            </button>
            <div id="ticket-details" className={cn(detailsOpen ? "mt-2 block" : "hidden", "lg:mt-0 lg:block")}>
              <PropertiesPanel ticket={ticket} statusField={statusField} onChangePriority={() => setOverrideOpen(true)} />
            </div>
          </div>
          <SlaPanel ticket={ticket} now={now} />
        </aside>

        <section aria-labelledby="activity-heading" className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
          <h2 id="activity-heading" className="text-sm font-semibold text-fg">
            Activity
          </h2>
          <ErrorBanner error={commentsError} />
          <ActivityTimeline history={ticket.history} comments={commentsError ? [] : comments} now={now} />
          <CommentComposer canMarkInternal={canMarkInternal} onSubmit={submitComment} submitting={commentSubmitting} error={commentError} />
        </section>
      </div>

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        assignable={assignable}
        assignableError={assignableError}
        submitting={transitioningTo === "ASSIGNED"}
        error={transitionError}
        onConfirm={(assigneeId) => submitTransition("ASSIGNED", { assigneeId })}
      />
      <OverrideDialog
        open={overrideOpen}
        onOpenChange={(open) => {
          setOverrideOpen(open);
          if (!open) setOverrideError(null);
        }}
        priorities={reference?.priorities ?? []}
        submitting={overrideSubmitting}
        error={overrideError}
        onSubmit={submitOverride}
      />
    </div>
  );
}
