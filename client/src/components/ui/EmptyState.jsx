import { cn } from "../../lib/cn.js";

// "Nothing here" with a way forward. `icon` is a component (a lucide icon); `action` is any node, usually a Button.
// `titleAs` is the heading element: a paragraph by default, "h2" or "h1" when this block is the whole page.
export default function EmptyState({ icon: Icon, title, description, action, titleAs: Title = "p", className }) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {Icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-lg border border-border bg-subtle text-muted-strong" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <Title className="text-sm font-medium text-fg">{title}</Title>
      {description && <p className="mt-1 max-w-sm text-13 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
