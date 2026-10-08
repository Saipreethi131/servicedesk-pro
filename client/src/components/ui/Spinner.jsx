import { cn } from "../../lib/cn.js";

// A ring with a moving arc. It spins only when motion is allowed; with prefers-reduced-motion it stays a still ring, and the
// label (read by screen readers) says what is happening. `decorative` drops the status role and label, for use inside a
// button that already announces itself (Button with `loading`).
export default function Spinner({ size = 16, label = "Loading", decorative = false, className }) {
  const ring = (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true" className="motion-safe:animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (decorative) return <span className={cn("inline-flex", className)}>{ring}</span>;
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  );
}
