import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn.js";
import IconButton from "./IconButton.jsx";
import { usePortalContainer } from "./portal.js";
import useRestoreFocus from "./restoreFocus.js";

// A modal dialog on Radix: focus moves in and is trapped, Escape closes, the page behind is inert, and focus returns to the
// opener. `title` is required (it is the dialog's accessible name); `description` is optional help text under it.
//   <Dialog open={open} onOpenChange={setOpen}>
//     <DialogContent title="Deactivate user?" description="They can no longer sign in." footer={<>...buttons...</>}>...</DialogContent>
//   </Dialog>
// Or uncontrolled with <DialogTrigger asChild>. Wrap the confirm action's result in your own state: Dialog only closes itself
// on Escape, the X, a click outside, or a <DialogClose>.
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({ title, description, children, footer, className, hideClose = false, returnFocusTo }) {
  const container = usePortalContainer();
  const restoreFocus = useRestoreFocus(returnFocusTo);
  return (
    <RadixDialog.Portal container={container}>
      <RadixDialog.Overlay className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
        <RadixDialog.Content
          {...restoreFocus}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "relative w-full max-w-md rounded-lg border border-border bg-surface shadow-popover",
            "data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
            className
          )}
        >
          <div className={cn("px-4 pt-4 pr-12", !children && "pb-4")}>
            <RadixDialog.Title className="text-base font-semibold text-fg">{title}</RadixDialog.Title>
            {description && <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description>}
          </div>
          {children && <div className="px-4 py-4 text-sm">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
          {!hideClose && (
            <RadixDialog.Close asChild>
              <IconButton label="Close" icon={X} size="sm" tooltip={false} className="absolute top-3 right-3" />
            </RadixDialog.Close>
          )}
        </RadixDialog.Content>
      </RadixDialog.Overlay>
    </RadixDialog.Portal>
  );
}
