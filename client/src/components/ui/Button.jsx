import { cn } from "../../lib/cn.js";
import Spinner from "./Spinner.jsx";

// Variants: primary (the one main action on a screen), secondary (everything else), ghost (quiet, in toolbars and rows),
// danger (destructive; a tinted outline, so a row of them stays calm. Confirm in a Dialog).
const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium " +
  "transition-colors duration-[120ms] ease-out-expo disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-fg hover:bg-subtle",
  ghost: "text-muted-strong hover:bg-subtle hover:text-fg",
  danger: "border border-danger/40 bg-surface text-danger-ink hover:bg-danger-soft",
};

const sizes = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-13",
  lg: "h-9 px-4 text-sm",
};

// The class string on its own, for things that must LOOK like a button but are another element (a router <Link>):
//   <Link to="/tickets/new" className={buttonVariants({ variant: "primary" })}>New ticket</Link>
export const buttonVariants = ({ variant = "primary", size = "md", className } = {}) =>
  cn(base, variants[variant] ?? variants.primary, sizes[size] ?? sizes.md, className);

// Every native prop (type, onClick, aria-*...) passes straight through. `type` is NOT defaulted, so a button inside a form
// behaves as a native button does: set type="button" or type="submit" explicitly. `loading` disables the button, shows a
// spinner and sets aria-busy, so a second click cannot start a second request.
export default function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, ...props }) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner decorative size={size === "sm" ? 12 : 14} />}
      {children}
    </button>
  );
}
