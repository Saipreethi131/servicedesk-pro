import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn.js";
import Kbd from "./Kbd.jsx";
import { usePortalContainer } from "./portal.js";

// An actions menu on Radix: opens from a button, arrow keys move, type to jump, Enter activates, Escape closes and returns focus.
//   <Dropdown>
//     <DropdownTrigger asChild><IconButton label="More" icon={MoreHorizontal} /></DropdownTrigger>
//     <DropdownContent>
//       <DropdownLabel>Ticket</DropdownLabel>
//       <DropdownItem icon={Copy} shortcut="C" onSelect={copy}>Copy link</DropdownItem>
//       <DropdownSeparator />
//       <DropdownItem destructive onSelect={askToDelete}>Delete</DropdownItem>
//     </DropdownContent>
//   </Dropdown>
// An item that destroys something should open a Dialog to confirm, not act at once.
export const Dropdown = RadixMenu.Root;
export const DropdownTrigger = RadixMenu.Trigger;

export function DropdownContent({ className, align = "end", sideOffset = 4, ...props }) {
  const container = usePortalContainer();
  return (
    <RadixMenu.Portal container={container}>
      <RadixMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-popover",
          "data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
          className
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function DropdownItem({ icon: Icon, shortcut, destructive = false, className, children, ...props }) {
  return (
    <RadixMenu.Item
      className={cn(
        "relative flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-sm outline-none",
        "data-[disabled]:opacity-50 data-[highlighted]:bg-subtle",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        destructive ? "text-danger-ink" : "text-fg",
        className
      )}
      {...props}
    >
      {Icon && <Icon size={14} className={destructive ? "" : "text-muted-strong"} aria-hidden="true" />}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </RadixMenu.Item>
  );
}

export function DropdownLabel({ className, ...props }) {
  return <RadixMenu.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted", className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }) {
  return <RadixMenu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
