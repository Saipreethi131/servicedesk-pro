import { cn } from "../../lib/cn.js";

// A keyboard key, in the mono face: <Kbd>Esc</Kbd>, <Kbd>⌘</Kbd><Kbd>K</Kbd>.
export default function Kbd({ className, children, ...props }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-subtle px-1 font-mono text-xs font-medium text-muted-strong",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
