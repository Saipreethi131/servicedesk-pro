import { useId } from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/cn.js";

// A checkbox with its label. `checked` may be true, false or "indeterminate". The box is 16px but its hit area is 24px (an invisible
// ring around it) and the label is a real <label> 24px tall, so both meet the 24px minimum target size (WCAG 2.5.8).
// `hint` is linked with aria-describedby.
export default function Checkbox({ label, hint, id, checked, onCheckedChange, disabled, name, required, className }) {
  const autoId = useId();
  const boxId = id ?? autoId;
  const hintId = hint ? `${boxId}-hint` : undefined;
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <RadixCheckbox.Root
        id={boxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        name={name}
        required={required}
        aria-describedby={hintId}
        className="relative mt-1 grid size-4 shrink-0 place-items-center rounded-sm border border-control bg-surface text-on-accent after:absolute after:-inset-1 after:content-[''] transition-colors duration-[120ms] ease-out-expo hover:border-muted disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent"
      >
        <RadixCheckbox.Indicator>
          {checked === "indeterminate" ? <Minus size={12} strokeWidth={3} aria-hidden="true" /> : <Check size={12} strokeWidth={3} aria-hidden="true" />}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {(label || hint) && (
        <div className="grid gap-0.5">
          {label && (
            <label htmlFor={boxId} className="cursor-pointer py-1 text-sm leading-4 text-fg">
              {label}
            </label>
          )}
          {hint && (
            <p id={hintId} className="text-xs text-muted">
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
