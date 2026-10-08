import { cn } from "../../lib/cn.js";

// A grey block that stands in for content that is loading. Size it with className (h-4 w-32). It pulses only when motion is
// allowed. It is hidden from screen readers: the page announces loading once (a Spinner or a status line), not per block.
export default function Skeleton({ className, ...props }) {
  return <div aria-hidden="true" className={cn("rounded-md bg-border motion-safe:animate-pulse", className)} {...props} />;
}
