import { Link } from "react-router";
import { priorityLabel, statusLabel } from "../../lib/labels.js";
import { Avatar, buttonVariants, Drawer, DrawerContent, PriorityIcon, StatusIcon } from "../ui/index.js";
import SlaPill from "./SlaPill.jsx";

const EXCERPT_LENGTH = 280;

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-13 text-muted-strong">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-fg">{children}</dd>
    </div>
  );
}

// A quick look at one ticket from the list, in a right-hand drawer. Local state only: the URL does not change, and everything
// shown is already in the list row, so opening it costs no request. Escape or the X closes it (Radix Dialog).
export default function TicketPeek({ ticket, now, onClose }) {
  if (!ticket) return null;
  const priority = ticket.priorityOverride?.value ?? ticket.priority;
  const excerpt = ticket.description.length > EXCERPT_LENGTH ? `${ticket.description.slice(0, EXCERPT_LENGTH).trimEnd()}...` : ticket.description;
  const assignee = ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : null;

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        title={ticket.title}
        description={`TKT-${ticket.ticketNumber}`}
        footer={
          <Link to={`/tickets/${ticket._id}`} className={buttonVariants({ variant: "primary" })}>
            Open full page
          </Link>
        }
      >
        <p className="whitespace-pre-wrap text-sm text-fg">{excerpt}</p>
        <dl className="mt-4 divide-y divide-border border-t border-border">
          <Row label="Status">
            <StatusIcon status={ticket.status} /> {statusLabel(ticket.status)}
          </Row>
          <Row label="Priority">
            <PriorityIcon priority={priority} /> {priorityLabel(priority)}
          </Row>
          <Row label="SLA">
            <SlaPill ticket={ticket} now={now} />
          </Row>
          <Row label="Assignee">
            {assignee ? (
              <>
                <Avatar name={assignee} size={20} /> {assignee}
              </>
            ) : (
              <span className="text-muted">Unassigned</span>
            )}
          </Row>
        </dl>
      </DrawerContent>
    </Drawer>
  );
}
