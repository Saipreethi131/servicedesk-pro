import { useId } from "react";
import { cn } from "../../lib/cn.js";

// The label / control / hint / error arrangement shared by Input, Textarea and Select, so all three behave the same:
//  - the label is tied to the control (htmlFor), so clicking it focuses the control and screen readers announce it;
//  - the hint and error are linked with aria-describedby, and an error is announced (role="alert") and sets aria-invalid.
// `children` is a function that receives the props the control must spread: ({ id, "aria-invalid", "aria-describedby" }) => node.
// With no label, hint or error it returns the bare control, so a control can be used inline (a table filter, a toolbar).
export function inputClasses(error) {
  return cn(
    "w-full rounded-md border bg-surface px-2.5 text-sm text-fg placeholder:text-muted",
    "transition-colors duration-[120ms] ease-out-expo hover:border-muted focus-visible:border-accent",
    "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted",
    error ? "border-danger" : "border-control"
  );
}

export default function Field({ id, label, hint, error, className, children }) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const controlProps = { id: controlId, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };

  if (!label && !hint && !error) return children(controlProps);

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <label htmlFor={controlId} className="text-13 font-medium text-fg">
          {label}
        </label>
      )}
      {children(controlProps)}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
