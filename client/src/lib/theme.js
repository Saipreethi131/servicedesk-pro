import { useCallback, useEffect, useState } from "react";

// Light / dark / follow-the-system. "system" is the default: no data-theme attribute, so the CSS media query decides.
// An explicit choice sets data-theme on <html> and is remembered. index.html applies the saved choice before first paint.
const KEY = "theme";
const CHANGE_EVENT = "themechange";

const readStored = () => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system"; // storage can be blocked (private mode); the choice then just lasts for this page
  }
};

const apply = (theme) => {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
};

export function useTheme() {
  const [theme, setThemeState] = useState(readStored);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Every useTheme() call has its own state (the top bar, the command palette, the Toaster). setTheme announces the change
  // on window so the others re-read it, otherwise they would keep showing the old choice.
  useEffect(() => {
    // Read the attribute apply() just set, not localStorage (which may be blocked).
    const onThemeChange = () => setThemeState(document.documentElement.getAttribute("data-theme") ?? "system");
    window.addEventListener(CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(CHANGE_EVENT, onThemeChange);
  }, []);

  const setTheme = useCallback((next) => {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // not saved; still applied below
    }
    apply(next);
    setThemeState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  // What the user actually sees right now, for components that need to know (the Toaster).
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  return { theme, resolved, setTheme };
}
