import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { priorityLabel, statusLabel } from "../../lib/labels.js";
import { Button, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "../ui/index.js";

// One filter: a chip that opens a picker. With no value it reads "+ Status" (dashed edge); with a value it reads
// "Status: In progress" and gains an x to remove just that filter. `options` come from /reference; the active value is shown
// even before they load, so a deep link looks right straight away.
function FilterChip({ name, value, options, labelOf, onChange }) {
  const active = value !== "";
  return (
    <div
      className={cn(
        "inline-flex h-7 items-center rounded-md border text-13",
        active ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-dashed border-control bg-surface text-muted-strong"
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={cn("inline-flex h-full items-center gap-1 rounded-md px-2 hover:bg-subtle/60", active && "pr-1")}>
            {active ? (
              <>
                {name}: <span className="font-medium">{labelOf(value)}</span>
              </>
            ) : (
              <>
                <Plus size={12} aria-hidden="true" /> {name}
              </>
            )}
            <ChevronDown size={12} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1">
          <ul aria-label={`${name} filter`}>
            {[{ value: "", label: "All" }, ...options.map((o) => ({ value: o, label: labelOf(o) }))].map((o) => (
              <li key={o.value || "all"}>
                <PopoverClose asChild>
                  <button
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => onChange(o.value)}
                    className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-fg hover:bg-subtle focus-visible:-outline-offset-2"
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {value === o.value && <Check size={14} className="text-accent" aria-hidden="true" />}
                  </button>
                </PopoverClose>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {active && (
        <button
          type="button"
          aria-label={`Remove ${name.toLowerCase()} filter`}
          onClick={() => onChange("")}
          className="mr-0.5 grid size-6 place-items-center rounded-md hover:bg-subtle/60"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function FilterBar({ reference, status, priority, onChange, onClear, trailing }) {
  const anyActive = status !== "" || priority !== "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChip name="Status" value={status} options={reference?.ticketStatuses ?? []} labelOf={statusLabel} onChange={(v) => onChange("status", v)} />
      <FilterChip name="Priority" value={priority} options={reference?.priorities ?? []} labelOf={priorityLabel} onChange={(v) => onChange("priority", v)} />
      {anyActive && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear all
        </Button>
      )}
      <div className="ml-auto">{trailing}</div>
    </div>
  );
}
