import { Clock } from "lucide-react";
import { slaState } from "../../lib/sla.js";
import { Badge } from "../ui/index.js";

// The SLA countdown pill. Colour carries urgency; the words say the same thing. `now` is the page's clock.
export default function SlaPill({ ticket, now }) {
  const state = slaState(ticket, now);
  if (!state) return <span className="text-muted-strong" aria-label="No SLA">&mdash;</span>;
  const title = ticket.resolutionDeadline ? `Resolution deadline: ${new Date(ticket.resolutionDeadline).toLocaleString()}` : undefined;
  return (
    <Badge tone={state.tone} icon={<Clock size={12} aria-hidden="true" />} title={title}>
      {state.text}
    </Badge>
  );
}
