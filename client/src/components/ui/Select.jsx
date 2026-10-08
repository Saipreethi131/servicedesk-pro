import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn.js";
import Field, { inputClasses } from "./Field.jsx";
import { usePortalContainer } from "./portal.js";

// A dropdown built on Radix Select: full keyboard support (type to jump, arrows, Home/End, Enter/Space, Escape).
//   <Select label="Priority" value={v} onValueChange={setV} options={[{ value: "LOW", label: "Low" }, ...]} placeholder="Choose" />
// `value` "" shows the placeholder. An option's own value cannot be "" (Radix reserves it for "nothing chosen"); to offer a
// "None" choice, give it a real value such as "none" and map it where you use it. `name` + `required` take part in a
// <form> submit through Radix's hidden native select.
export default function Select({
  label,
  hint,
  error,
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled,
  name,
  required,
  className,
  wrapperClassName,
}) {
  const container = usePortalContainer();
  return (
    <Field id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      {(controlProps) => (
        <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name} required={required}>
          <RadixSelect.Trigger
            {...controlProps}
            className={cn(inputClasses(error), "flex h-8 items-center justify-between gap-2 text-left data-[placeholder]:text-muted", className)}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon>
              <ChevronDown size={14} className="text-muted" aria-hidden="true" />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
          <RadixSelect.Portal container={container}>
            <RadixSelect.Content
              position="popper"
              sideOffset={4}
              className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-popover data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
            >
              <RadixSelect.Viewport>
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="relative flex h-8 cursor-default select-none items-center rounded-md pr-2 pl-7 text-sm text-fg outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 inline-flex">
                      <Check size={14} aria-hidden="true" />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    </Field>
  );
}
