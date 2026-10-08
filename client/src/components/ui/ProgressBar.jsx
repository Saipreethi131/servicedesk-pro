import { cn } from "../../lib/cn.js";

// A thin bar. `label` is REQUIRED (it is the accessible name). `indeterminate` is for waiting with no known length: a block
// sweeps across (only when motion is allowed; otherwise it stays a still partial bar) and there is no aria-valuenow, which is
// how ARIA says "busy, progress unknown". Never invent a percentage for it.
const fills = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export default function ProgressBar({ value = 0, max = 100, label, tone = "accent", indeterminate = false, className }) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(Number(value) || 0, 0), safeMax);
  const percent = (clamped / safeMax) * 100;
  const valueProps = indeterminate ? {} : { "aria-valuemin": 0, "aria-valuemax": safeMax, "aria-valuenow": clamped };

  return (
    <div role="progressbar" aria-label={label} {...valueProps} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-border", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-200 ease-out-expo",
          fills[tone] ?? fills.accent,
          indeterminate && "w-2/5 motion-safe:animate-indeterminate"
        )}
        style={indeterminate ? undefined : { width: `${percent}%` }}
      />
    </div>
  );
}
