import { cn } from "../../lib/cn.js";
import { buttonVariants } from "./Button.jsx";
import Tooltip from "./Tooltip.jsx";

// A square button with only an icon. `label` is REQUIRED: it is the accessible name, and by default also the tooltip.
// Pass the icon as `icon` (a component, e.g. a lucide icon) or as children.
export default function IconButton({ label, icon: Icon, children, variant = "ghost", size = "md", tooltip = true, className, ...props }) {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={buttonVariants({ variant, size, className: cn(size === "sm" ? "w-7" : "w-8", "px-0", className) })}
      {...props}
    >
      {children ?? (Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2} aria-hidden="true" />)}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
