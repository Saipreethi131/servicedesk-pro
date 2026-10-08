import { Fragment } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Check, ChevronRight, KeyRound, LogOut, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { NAV_ITEMS } from "../lib/navItems.js";
import { roleLabel } from "../lib/labels.js";
import { MOD_KEY } from "../lib/shortcuts.js";
import { useTheme } from "../lib/theme.js";
import {
  Avatar,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  IconButton,
  Kbd,
} from "./ui/index.js";

// Breadcrumbs come from the URL, not from a registry: first segment looks up the nav label, the rest are fixed words.
// A ticket's own number is not known here (that would need a fetch), so a detail page just says "Ticket".
function crumbsFor(pathname) {
  const [first, second] = pathname.split("/").filter(Boolean);
  if (!first) return [{ label: "Dashboard" }];
  const item = NAV_ITEMS.find((i) => i.to === `/${first}`);
  const crumbs = [];
  if (item?.group === "admin") crumbs.push({ label: "Admin" });
  crumbs.push({ label: item?.label ?? "Not found", to: second ? item?.to : undefined });
  if (second) crumbs.push({ label: second === "new" ? "New ticket" : "Ticket" });
  return crumbs;
}

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function Topbar({ user, onOpenMenu, onOpenPalette, onLogout, loggingOut }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const crumbs = crumbsFor(pathname);
  const ThemeIcon = THEME_OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor;

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-canvas px-3 md:gap-3 md:px-4">
      <IconButton label="Open menu" icon={Menu} onClick={onOpenMenu} className="md:hidden" />
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-13">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={crumb.label}>
                {i > 0 && <ChevronRight size={12} className="shrink-0 text-muted" aria-hidden="true" />}
                <li className="min-w-0 truncate">
                  {crumb.to ? (
                    <Link to={crumb.to} className="inline-flex min-h-6 items-center text-muted hover:text-fg">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={last ? "font-medium text-fg" : "text-muted"} aria-current={last ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-8 w-8 shrink-0 items-center justify-center gap-2 rounded-md border border-control bg-surface text-13 text-muted-strong hover:bg-subtle md:w-56 md:justify-start md:px-2.5"
      >
        <Search size={14} aria-hidden="true" />
        {/* Name from content (no aria-label, so it always matches what is visible): hidden text on small screens, "Search..." on wide. */}
        <span className="sr-only md:hidden">Search or run a command</span>
        <span className="hidden flex-1 text-left md:inline">Search...</span>
        <span className="hidden items-center gap-0.5 md:flex" aria-hidden="true">
          <Kbd>{MOD_KEY}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <Dropdown>
        <DropdownTrigger asChild>
          <IconButton label="Theme" icon={ThemeIcon} />
        </DropdownTrigger>
        <DropdownContent>
          {THEME_OPTIONS.map((o) => (
            <DropdownItem key={o.value} icon={o.icon} onSelect={() => setTheme(o.value)}>
              <span className="flex items-center justify-between gap-4">
                {o.label}
                {theme === o.value && <Check size={14} className="text-accent" aria-label="Selected" />}
              </span>
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>

      <Dropdown>
        <DropdownTrigger asChild>
          <button type="button" className="flex h-8 items-center gap-2 rounded-md px-1 hover:bg-subtle">
            {/* The accessible name comes from this text; the avatar's initials are decorative here, so they are hidden. */}
            <span className="sr-only">User menu: {user.fullName}</span>
            <span aria-hidden="true">
              <Avatar name={user.fullName} />
            </span>
          </button>
        </DropdownTrigger>
        <DropdownContent className="min-w-56">
          <DropdownLabel>
            <span className="block text-13 font-medium text-fg">{user.fullName}</span>
            <span className="block text-xs text-muted">{roleLabel(user.role)}</span>
          </DropdownLabel>
          <DropdownSeparator />
          <DropdownItem icon={KeyRound} onSelect={() => navigate("/change-password")}>
            Change password
          </DropdownItem>
          <DropdownItem icon={LogOut} disabled={loggingOut} onSelect={onLogout}>
            {loggingOut ? "Logging out..." : "Log out"}
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </header>
  );
}
