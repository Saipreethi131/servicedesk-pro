import * as RadixTooltip from "@radix-ui/react-tooltip";
import { usePortalContainer } from "./portal.js";

// Wraps ONE focusable child. Opens on hover and on keyboard focus, closes on Escape, and the content is linked to the child
// with aria-describedby (Radix does this). For a short label only: anything the user must read belongs in the page, not a tooltip.
export default function Tooltip({ content, children, side = "top", delayDuration = 300 }) {
  const container = usePortalContainer();
  if (!content) return children;
  return (
    <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={100}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal container={container}>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-xs rounded-md bg-fg px-2 py-1 text-xs font-medium text-canvas data-[state=closed]:animate-pop-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in"
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
