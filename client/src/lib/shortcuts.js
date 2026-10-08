import { useEffect, useRef } from "react";

export const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

// For the help dialog. `keys` is what to draw as key caps; "then" between caps means a sequence.
export const SHORTCUTS = [
  { keys: [MOD_KEY, "K"], label: "Open the command palette" },
  { keys: ["/"], label: "Open the command palette" },
  { keys: ["G", "then", "D"], label: "Go to Dashboard" },
  { keys: ["G", "then", "T"], label: "Go to Tickets" },
  { keys: ["C"], label: "Create a ticket" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
];

const SEQUENCE_MS = 1000; // how long "g" waits for its second key

export const isTypingTarget = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// Something modal is open (dialog, menu, select list): the page behind must not react to keys.
export const overlayOpen = () => document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]') !== null;

// Global shortcuts. `handlers` = { palette, help, goDashboard, goTickets, createTicket }. The latest handlers are kept in a ref
// so the listener is attached once and never sees stale ones.
export default function useShortcuts(handlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    let pendingG = null; // timer id while waiting for the second key of "g then ..."

    const clearPending = () => {
      clearTimeout(pendingG);
      pendingG = null;
    };

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;

      // Ctrl/Cmd+K is the one shortcut that also works while typing: it is the universal "search" chord.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ref.current.palette();
        return;
      }

      // Everything else: plain keys only, never while typing, never behind an open overlay.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target) || overlayOpen()) return;

      if (pendingG) {
        clearPending();
        const key = event.key.toLowerCase();
        if (key === "d") ref.current.goDashboard();
        else if (key === "t") ref.current.goTickets();
        else return;
        event.preventDefault();
        return;
      }

      switch (event.key) {
        case "g":
          pendingG = setTimeout(clearPending, SEQUENCE_MS);
          break;
        case "/":
          event.preventDefault(); // otherwise "/" would be typed into the palette input that opens
          ref.current.palette();
          break;
        case "?":
          ref.current.help();
          break;
        case "c":
          event.preventDefault();
          ref.current.createTicket();
          break;
        default:
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPending();
    };
  }, []);
}
