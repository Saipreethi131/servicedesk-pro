import { cn } from "../../lib/cn.js";

// One original progress-circle glyph per ticket lifecycle status (D6.2): the more finished the ticket, the fuller the circle.
//   NEW: dashed empty ring            ASSIGNED: solid empty ring       IN_PROGRESS: half full
//   WAITING_ON_REQUESTER: three quarters   RESOLVED: green check disc   CLOSED: grey check disc
//   ESCALATED: red "!" disc           REOPENED: ring with a return arrow
// Colour comes from the status (text-*), so the icon is never the only carrier of meaning: always show the label next to it
// (Badge does), or pass `label` to give the icon its own accessible name. An unknown status draws like NEW.
const CIRCUMFERENCE = 2 * Math.PI * 3; // the inner wedge is a circle of r=3 drawn with a 6-wide stroke, which fills radius 0..6

const LOOK = {
  NEW: { color: "text-muted", kind: "dashed" },
  ASSIGNED: { color: "text-info", kind: "ring" },
  IN_PROGRESS: { color: "text-warning", kind: "ring", fill: 0.5 },
  WAITING_ON_REQUESTER: { color: "text-accent", kind: "ring", fill: 0.75 },
  RESOLVED: { color: "text-success", kind: "check" },
  CLOSED: { color: "text-muted", kind: "check" },
  ESCALATED: { color: "text-danger", kind: "alert" },
  REOPENED: { color: "text-accent", kind: "reopen" },
};

export default function StatusIcon({ status, size = 16, label, className }) {
  const look = LOOK[status] ?? LOOK.NEW;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" className={cn("shrink-0", look.color, className)} {...a11y}>
      {(look.kind === "dashed" || look.kind === "ring" || look.kind === "reopen") && (
        <circle
          cx="8"
          cy="8"
          r="6.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={look.kind === "dashed" ? "2.4 2.1" : undefined}
        />
      )}
      {look.fill && (
        <circle
          cx="8"
          cy="8"
          r="3"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${look.fill * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform="rotate(-90 8 8)"
        />
      )}
      {look.kind === "check" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M5 8.2l2.1 2.1L11 6.1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {look.kind === "alert" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M8 4.6v3.9" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11.2" r="0.95" fill="white" />
        </>
      )}
      {look.kind === "reopen" && (
        <>
          <path d="M10.6 6.2A3.2 3.2 0 1 0 11 8.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10.9 3.9v2.5H8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
