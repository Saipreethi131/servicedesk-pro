import { cn } from "../../lib/cn.js";

// The page's one <h1>, with an optional description and an action (usually a Button) on the right.
export default function PageHeader({ title, description, action, className }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
