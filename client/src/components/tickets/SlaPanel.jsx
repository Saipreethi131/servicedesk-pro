import { timerState } from "../../lib/sla.js";
import { formatDateTime } from "../../lib/ticketText.js";
import { Badge, Card, ProgressBar } from "../ui/index.js";
import InfoTip from "../dashboard/InfoTip.jsx";

// The list pill's neutral / warning / danger become the bar's accent / warning / danger (the bar has no neutral fill).
const BAR_TONE = { neutral: "accent", warning: "warning", danger: "danger" };

// One clock. `state` comes from timerState, the same function the list pill uses, so the colour rules are shared.
// While running the bar shows the share of the window still LEFT; a stopped clock (met) or a breached one fills the bar.
function Timer({ name, state, deadline, stoppedAt, stoppedLabel }) {
  if (!state) {
    return (
      <div>
        <p className="text-13 font-medium text-fg">{name}</p>
        <p className="mt-1 text-13 text-muted">&mdash;</p>
      </div>
    );
  }
  const breached = state.kind === "breached" || state.kind === "missed" || state.kind === "escalated";
  const tone = state.kind === "met" ? "success" : BAR_TONE[state.tone];
  const value = state.kind === "running" ? Math.round(state.share * 100) : 100;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-13 font-medium text-fg">{name}</p>
        {breached ? <Badge tone="danger">Breached</Badge> : null}
      </div>
      <p className="mt-0.5 text-13 text-muted-strong">{state.text}</p>
      <ProgressBar className="mt-2" label={`${name} SLA: ${breached ? "breached, " : ""}${state.text}`} value={value} tone={tone} />
      <p className="mt-1.5 text-xs text-muted">
        Due {formatDateTime(deadline)}
        {stoppedAt && (
          <>
            {" · "}
            {stoppedLabel} {formatDateTime(stoppedAt)}
          </>
        )}
      </p>
    </div>
  );
}

export default function SlaPanel({ ticket, now }) {
  const finished = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

  const response = timerState({
    createdAt: ticket.createdAt,
    deadline: ticket.responseDeadline,
    stoppedAt: ticket.firstResponseAt,
    // An escalated ticket that was never answered (the sweep escalates without recording a response) would otherwise read
    // "overdue" here; same wording as the resolution clock, so nothing on an escalated ticket says "overdue".
    escalated: ticket.status === "ESCALATED",
    now,
  });
  // A finished ticket without a resolvedAt has no stop time to judge, so its clock is shown as unknown rather than running.
  const resolution = finished && !ticket.resolvedAt
    ? null
    : timerState({
        createdAt: ticket.createdAt,
        deadline: ticket.resolutionDeadline,
        stoppedAt: finished ? ticket.resolvedAt : null,
        escalated: ticket.status === "ESCALATED", // wording only: "Escalated, 1d past deadline", not "overdue" (see lib/sla.js)
        now,
      });

  return (
    <Card
      title="SLA"
      action={
        <InfoTip label="About these deadlines">
          Deadlines are set in business hours when the ticket is created. The clocks never pause, not even while the ticket is waiting
          on the requester (a known limitation).
        </InfoTip>
      }
    >
      <div className="space-y-4">
        <Timer name="Response" state={response} deadline={ticket.responseDeadline} stoppedAt={ticket.firstResponseAt} stoppedLabel="Responded" />
        <Timer
          name="Resolution"
          state={resolution}
          deadline={ticket.resolutionDeadline}
          stoppedAt={finished ? ticket.resolvedAt : null}
          stoppedLabel="Resolved"
        />
      </div>
      {ticket.escalatedAt && <p className="mt-3 text-xs font-medium text-danger-ink">Escalated {formatDateTime(ticket.escalatedAt)}</p>}
    </Card>
  );
}
