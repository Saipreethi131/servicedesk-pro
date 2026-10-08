import { useId } from "react";
import { cn } from "../../lib/cn.js";
import { Skeleton } from "../ui/index.js";

// A radio group drawn as cards: each option has a label and a one-line description. Arrow keys move the selection (like native
// radios), and only the selected option (or the first, when nothing is chosen) is a Tab stop. `options` is null while the
// values are still loading.
export default function SegmentedChoice({ label, options, value, onChange, error }) {
  const labelId = useId();
  const errorId = useId();

  const onKeyDown = (event, index) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    // Move focus with the selection, as native radios do.
    event.currentTarget.parentElement.querySelector(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div>
      <p id={labelId} className="mb-1.5 text-13 font-medium text-fg">
        {label}
      </p>
      {options === null ? (
        <div className="grid gap-2 sm:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="grid gap-2 sm:grid-cols-3"
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-value={option.value}
                tabIndex={selected || (!value && index === 0) ? 0 : -1}
                onClick={() => onChange(option.value)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={cn(
                  "rounded-md border p-2.5 text-left transition-colors duration-[120ms] ease-out-expo",
                  selected ? "border-accent bg-accent-soft" : "border-control bg-surface hover:bg-subtle",
                  error && !selected && "border-danger"
                )}
              >
                <span className="block text-13 font-medium text-fg">{option.label}</span>
                {option.description && (
                  <span className="mt-0.5 block text-xs text-muted-strong">{option.description}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
