import { useRef } from "react";

// Radix Dialog only gives focus back to its <Trigger>. Our dialogs and drawers are opened from state (a keyboard shortcut, a
// row, a menu item), so with no Trigger focus fell to <body> and a keyboard user lost their place. This remembers what had
// focus when the dialog opened and returns it there on close. Spread the result onto <RadixDialog.Content>.
// When it was opened from a menu item, that item is gone by the time the dialog closes; `fallback()` (optional) names where
// focus should go instead, e.g. the button that opened the menu.
export default function useRestoreFocus(fallback) {
  const opener = useRef(null);
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement;
    },
    onCloseAutoFocus: (event) => {
      event.preventDefault(); // replaces Radix's own "focus the trigger", which does nothing without one
      const target = opener.current?.isConnected ? opener.current : fallback?.();
      target?.focus();
      opener.current = null;
    },
  };
}
