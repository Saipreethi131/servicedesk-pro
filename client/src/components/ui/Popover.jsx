import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "../../lib/cn.js";
import { usePortalContainer } from "./portal.js";

// A small floating panel anchored to its trigger, for things the user may click inside (a filter form, a date picker). It
// traps nothing: focus moves in on open, Escape or an outside click closes it and focus returns to the trigger.
// For a plain label use Tooltip; for a list of actions use Dropdown.
//   <Popover><PopoverTrigger asChild><Button variant="secondary">Filters</Button></PopoverTrigger><PopoverContent>...</PopoverContent></Popover>
export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;

export function PopoverContent({ className, align = "start", sideOffset = 6, ...props }) {
  const container = usePortalContainer();
  return (
    <RadixPopover.Portal container={container}>
      <RadixPopover.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-lg border border-border bg-surface p-3 text-sm text-fg shadow-popover",
          "data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
          className
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
