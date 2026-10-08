import { priorityLabel } from "../../lib/labels.js";
import { categoryPath, displayName, formatDateTime } from "../../lib/ticketText.js";
import { Avatar, Badge, Button, Card, PriorityIcon, Tooltip } from "../ui/index.js";

function Row({ label, children }) {
  return (
    <div className="grid min-h-9 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 py-1">
      <dt className="text-13 text-muted-strong">{label}</dt>
      <dd className="min-w-0 text-13 text-fg">{children}</dd>
    </div>
  );
}

function Person({ person }) {
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} size={20} />
      <span className="truncate">{name}</span>
    </span>
  );
}

// The right-hand properties list. `statusField` is the page's status control (a Dropdown built from availableTransitions);
// it is passed in because the transition logic stays in the page.
export default function PropertiesPanel({ ticket, statusField, onChangePriority }) {
  const override = ticket.priorityOverride;
  const priority = override?.value ?? ticket.priority;

  return (
    <Card className="!py-2">
      <dl className="divide-y divide-border">
        <Row label="Status">{statusField}</Row>

        <Row label="Priority">
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <PriorityIcon priority={priority} /> {priorityLabel(priority)}
            </span>
            {override && (
              <Tooltip
                content={`Derived priority was ${priorityLabel(ticket.priority)}. Reason: ${override.reason}. Set ${formatDateTime(override.at)} by ${displayName(override.by)}.`}
              >
                {/* A button so the tooltip opens from the keyboard as well as the mouse. */}
                <button type="button" className="inline-flex min-h-6 items-center rounded-md">
                  <Badge tone="accent">Override</Badge>
                </button>
              </Tooltip>
            )}
            {ticket.canOverridePriority && (
              <Button type="button" variant="ghost" size="sm" onClick={onChangePriority}>
                Change
              </Button>
            )}
          </span>
        </Row>

        <Row label="Assignee">
          {ticket.assignee ? <Person person={ticket.assignee} /> : <span className="text-muted">Unassigned</span>}
        </Row>
        <Row label="Category">{categoryPath(ticket.category)}</Row>
        <Row label="Department">{ticket.department.name}</Row>
        <Row label="Requester">
          <Person person={ticket.requester} />
        </Row>
        <Row label="Created">
          <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
        </Row>
        <Row label="Updated">
          <time dateTime={ticket.updatedAt}>{formatDateTime(ticket.updatedAt)}</time>
        </Row>
      </dl>
    </Card>
  );
}
