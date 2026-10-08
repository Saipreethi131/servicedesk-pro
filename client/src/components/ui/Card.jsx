import { cn } from "../../lib/cn.js";

// A bordered surface. No shadow: the 1px border is the edge.
// `as` lets a <form> be a Card directly (so onSubmit stays on the element Card renders) instead of nesting a <form> inside a
// <section>, which would be invalid HTML. `title` renders a heading row (an <h2>) with an optional `description` and `action`.
// `interactive` is for a Card that is itself a click target: it gets a hover tint.
// The padding is on the Card itself, so a table that must touch the edges can opt out with className="!p-0 overflow-hidden".
export default function Card({ as: Tag = "section", title, description, action, interactive = false, className, children, ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-border bg-surface p-4",
        interactive && "cursor-pointer transition-colors duration-[120ms] ease-out-expo hover:bg-subtle",
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-13 text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
