import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn.js";
import IconButton from "./IconButton.jsx";
import { usePortalContainer } from "./portal.js";
import useRestoreFocus from "./restoreFocus.js";

// A panel that slides in from the right edge (or the left, with side="left", for navigation), for detail or editing that should not leave the page (a ticket preview, a long
// form). It is a modal dialog underneath (same focus trap, Escape, inert page, returned focus) with the same props:
// `title` required, `description` and `footer` optional. The body scrolls; the header and footer stay put.
export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;
export const DrawerClose = RadixDialog.Close;

export function DrawerContent({ title, description, children, footer, className, side = "right" }) {
  const container = usePortalContainer();
  const restoreFocus = useRestoreFocus();
  return (
    <RadixDialog.Portal container={container}>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <RadixDialog.Content
        {...restoreFocus}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed inset-y-0 z-50 flex w-full max-w-md flex-col border-border bg-surface shadow-popover",
          side === "left"
            ? "left-0 border-r data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left"
            : "right-0 border-l data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <RadixDialog.Title className="text-base font-semibold text-fg">{title}</RadixDialog.Title>
            {description && <RadixDialog.Description className="mt-0.5 text-13 text-muted">{description}</RadixDialog.Description>}
          </div>
          <RadixDialog.Close asChild>
            <IconButton label="Close" icon={X} size="sm" tooltip={false} />
          </RadixDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
