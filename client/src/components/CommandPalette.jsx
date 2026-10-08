import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Command } from "cmdk";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Clock, LogOut, Monitor, Moon, Plus, Search, Sun } from "lucide-react";
import { request } from "../api.js";
import { navItemsFor } from "../lib/navItems.js";
import { useTheme } from "../lib/theme.js";
import { Kbd, StatusIcon } from "./ui/index.js";
import useRestoreFocus from "./ui/restoreFocus.js";

const RECENT_KEY = "palette-recent";
const RECENT_MAX = 5;
const TICKET_FETCH_LIMIT = 50; // the list API caps a page at 100; this is a "recent tickets" search, not a full one

const readRecent = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRecent = (entry) => {
  const next = [entry, ...readRecent().filter((r) => r.to !== entry.to)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // not remembered; harmless
  }
};

const itemClass =
  "flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-sm text-fg " +
  "data-[selected=true]:bg-subtle data-[disabled=true]:opacity-50";

function Item({ icon: Icon, children, ...props }) {
  return (
    <Command.Item className={itemClass} {...props}>
      {Icon && <Icon size={14} className="shrink-0 text-muted-strong" aria-hidden="true" />}
      {children}
    </Command.Item>
  );
}

const THEME_CHOICES = [
  { value: "system", label: "Theme: System", icon: Monitor },
  { value: "light", label: "Theme: Light", icon: Sun },
  { value: "dark", label: "Theme: Dark", icon: Moon },
];

export default function CommandPalette({ open, onOpenChange, role, onLogout }) {
  const navigate = useNavigate();
  const restoreFocus = useRestoreFocus();
  const { setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [recent, setRecent] = useState([]);

  const navItems = useMemo(() => navItemsFor(role), [role]);

  // Each time the palette opens: clear the box, re-read recents, and fetch tickets through the existing list endpoint.
  // The server scopes that list to what this user may see, so nothing here widens access.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    // A recent navigation entry from a previous session must still be reachable by THIS role.
    const allowed = new Set(navItems.map((i) => i.to));
    setRecent(readRecent().filter((r) => r.kind === "ticket" || allowed.has(r.to)));

    let ignore = false;
    setLoadingTickets(true);
    request(`/tickets?page=1&limit=${TICKET_FETCH_LIMIT}`)
      .then(({ data }) => !ignore && setTickets(data.items ?? []))
      .catch(() => !ignore && setTickets([])) // search just has no tickets to offer; nav and actions still work
      .finally(() => !ignore && setLoadingTickets(false));
    return () => {
      ignore = true;
    };
  }, [open, navItems]);

  // Close first so focus returns to the page, then do the thing.
  const run = (fn) => () => {
    onOpenChange(false);
    fn();
  };
  const go = (to, label, kind = "nav") =>
    run(() => {
      saveRecent({ kind, to, label });
      navigate(to);
    });

  const searching = search.trim() !== "";

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
          <RadixDialog.Content
            {...restoreFocus}
            aria-describedby={undefined}
            className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-popover data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
          >
            <RadixDialog.Title className="sr-only">Command palette</RadixDialog.Title>
            <Command label="Command palette" loop>
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search size={14} className="shrink-0 text-muted" aria-hidden="true" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search pages, actions and tickets..."
                  className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                />
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-1.5 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No results.</Command.Empty>

                {!searching && recent.length > 0 && (
                  <Command.Group heading="Recent">
                    {recent.map((r) => (
                      <Item key={r.to} value={`recent ${r.to}`} icon={Clock} onSelect={go(r.to, r.label, r.kind)}>
                        <span className="truncate">{r.label}</span>
                      </Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Navigation">
                  {navItems.map((item) => (
                    <Item key={item.to} value={`Go to ${item.label}`} icon={item.icon} onSelect={go(item.to, item.label)}>
                      {item.label}
                    </Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions">
                  {/* Open to every role today, like the /tickets/new route itself. */}
                  <Item value="Create ticket New ticket" icon={Plus} onSelect={go("/tickets/new", "New ticket")}>
                    Create ticket
                  </Item>
                  {THEME_CHOICES.map((t) => (
                    <Item key={t.value} value={t.label} icon={t.icon} onSelect={run(() => setTheme(t.value))}>
                      {t.label}
                    </Item>
                  ))}
                  <Item value="Log out" icon={LogOut} onSelect={run(onLogout)}>
                    Log out
                  </Item>
                </Command.Group>

                {(tickets.length > 0 || loadingTickets) && (
                  <Command.Group heading="Tickets">
                    {loadingTickets && (
                      <Command.Loading>
                        <div className="px-2.5 py-2 text-xs text-muted">Loading tickets...</div>
                      </Command.Loading>
                    )}
                    {tickets.map((t) => (
                      <Item
                        key={t._id}
                        value={`TKT-${t.ticketNumber} ${t.title}`}
                        onSelect={go(`/tickets/${t._id}`, `TKT-${t.ticketNumber} ${t.title}`, "ticket")}
                      >
                        <StatusIcon status={t.status} />
                        <span className="shrink-0 font-mono text-xs text-muted-strong">TKT-{t.ticketNumber}</span>
                        <span className="truncate">{t.title}</span>
                      </Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Kbd>&uarr;</Kbd>
                  <Kbd>&darr;</Kbd> move
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>&crarr;</Kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>Esc</Kbd> close
                </span>
              </div>
            </Command>
          </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
