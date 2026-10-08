import { Card } from "../ui/index.js";

// Plain-language steps. Every claim is something the app really does: priority comes from impact and urgency and sets the
// SLA deadlines at creation; a technician claims the ticket or a manager assigns it; the ticket page shows status and comments.
const STEPS = [
  {
    title: "We set the priority",
    text: "Your impact and urgency decide the priority, and the priority sets how quickly we aim to respond and resolve. A manager can adjust it later, with a reason on record.",
  },
  {
    title: "It gets assigned",
    text: "Your request goes to your department's IT queue. A technician picks it up, or a manager assigns it to someone.",
  },
  {
    title: "You can follow it",
    text: "Open the ticket any time to see its status, who is working on it and the deadlines. Questions and updates appear in its comments.",
  },
];

export default function WhatHappensNext() {
  return (
    <Card title="What happens next" className="h-fit">
      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-13 font-medium text-fg">{step.title}</p>
              <p className="mt-0.5 text-13 text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
