import { useEffect } from "react";

// While `dirty` is true, closing or reloading the tab makes the browser ask "Leave site?". The browser shows its own fixed
// wording (pages cannot customise it). In-app navigation is NOT covered: the app uses <BrowserRouter>, and React Router's
// useBlocker only works under a data router, so the page guards its own Cancel button separately.
export default function useUnsavedChangesWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ""; // older browsers need a value set before they show the prompt
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
