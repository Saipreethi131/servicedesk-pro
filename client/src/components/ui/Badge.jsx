import { cn } from "../../lib/cn.js";

// A small label. `tone` picks the colour; the text is always readable on its tinted background (the -ink colours, never the
// raw semantic colour). `icon` is an optional leading node.
const tones = {
  neutral: "border-border bg-subtle text-muted-strong",
  accent: "border-accent/25 bg-accent-soft text-accent-ink",
  success: "border-success/25 bg-success-soft text-success-ink",
  warning: "border-warning/30 bg-warning-soft text-warning-ink",
  danger: "border-danger/25 bg-danger-soft text-danger-ink",
  info: "border-info/25 bg-info-soft text-info-ink",
};

export default function Badge({ tone = "neutral", icon, className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium",
        tones[tone] ?? tones.neutral,
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
