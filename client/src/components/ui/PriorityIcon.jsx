import { cn } from "../../lib/cn.js";

// An original three-bar glyph: the number of filled bars is the priority (LOW 1, MEDIUM 2, HIGH 3). CRITICAL is a red square
// with an exclamation mark, so the one level that needs attention is the one that looks different. As with StatusIcon, show
// the label next to it, or pass `label` to name the icon itself. An unknown priority draws as LOW.
const BARS = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export default function PriorityIcon({ priority, size = 16, label, className }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  if (priority === "CRITICAL") {
    return (
      <svg viewBox="0 0 16 16" width={size} height={size} fill="none" className={cn("shrink-0 text-danger", className)} {...a11y}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <path d="M8 4.6v4" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="11.1" r="0.95" fill="white" />
      </svg>
    );
  }

  const filled = BARS[priority] ?? 1;
  const bars = [
    { x: 2, y: 10, h: 4 },
    { x: 6.5, y: 6.5, h: 7.5 },
    { x: 11, y: 3, h: 11 },
  ];
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={cn("shrink-0 text-muted-strong", className)} {...a11y}>
      {bars.map((bar, i) => (
        <rect key={bar.x} x={bar.x} y={bar.y} width="3" height={bar.h} rx="0.8" fill="currentColor" fillOpacity={i < filled ? 1 : 0.25} />
      ))}
    </svg>
  );
}
