import { useCallback, useState } from "react";

const KEY = "sidebar-collapsed";

const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false; // storage blocked: start expanded
  }
};

// Whether the sidebar is the narrow icon-only rail. Remembered across visits.
export default function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(read);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // not saved; still applies for this page
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
