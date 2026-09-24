import { useEffect } from "react";

const APP_NAME = "ServiceDesk Pro";

// Browser tabs, history and screen readers announce the page by document.title; in a single-page app nothing changes it
// on navigation unless we do.
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
