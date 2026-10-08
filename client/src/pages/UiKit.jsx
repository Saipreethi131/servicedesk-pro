import { useState } from "react";
import { Bell, Copy, Download, Inbox, Monitor, MoreHorizontal, Moon, Plus, Search, Sun, Trash2, UserPlus } from "lucide-react";
import useDocumentTitle from "../useDocumentTitle.js";
import { useTheme } from "../lib/theme.js";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PortalContainerProvider,
  PriorityIcon,
  ProgressBar,
  Select,
  Skeleton,
  Spinner,
  StatusIcon,
  Textarea,
  Tooltip,
  toast,
} from "../components/ui/index.js";

// Dev-only showcase of every primitive (route /_kit, registered only when import.meta.env.DEV). It renders the same set twice,
// one pane forced to light and one to dark, so both themes are visible at once. The panes pass themselves as the portal
// container, so popovers, menus, dialogs and drawers opened inside a pane use that pane's theme. Toasts and the page itself
// follow the page-level toggle at the top.

const STATUSES = ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_ON_REQUESTER", "RESOLVED", "CLOSED", "ESCALATED", "REOPENED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SWATCHES = ["canvas", "surface", "subtle", "border", "control", "text", "muted", "muted-strong", "accent", "accent-soft", "success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info", "info-soft"];
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function Section({ title, children }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-13 font-semibold text-fg">{title}</h3>
      {children}
    </section>
  );
}

const Row = ({ children }) => <div className="flex flex-wrap items-center gap-2">{children}</div>;

function Showcase() {
  const [select, setSelect] = useState("");
  const [checks, setChecks] = useState({ a: true, b: false, c: "indeterminate" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fakeSave = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  return (
    <div className="grid gap-8">
      <Section title="Colour tokens">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SWATCHES.map((name) => (
            <div key={name} className="min-w-0">
              <div className="h-8 rounded-md border border-border" style={{ background: `var(--${name})` }} />
              <p className="mt-1 truncate font-mono text-xs text-muted">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type, radius and numbers">
        <div className="grid gap-1">
          <p className="text-2xl font-semibold tracking-tight">32 Page title</p>
          <p className="text-xl font-semibold tracking-tight">24 Section title</p>
          <p className="text-lg font-semibold">20 Subsection</p>
          <p className="text-base">16 Lead text</p>
          <p className="text-sm">14 Body text, the default for the interface</p>
          <p className="text-13 text-muted">13 Secondary text and dense controls</p>
          <p className="text-xs text-muted">12 Captions, badges and hints</p>
          <p className="font-mono text-13">TKT-1042 &middot; due in 02:14:09 &middot; 1,111 / 8,888</p>
        </div>
        <Row>
          <div className="grid h-10 w-16 place-items-center rounded-md border border-border bg-surface text-xs text-muted">6px</div>
          <div className="grid h-10 w-16 place-items-center rounded-lg border border-border bg-surface text-xs text-muted">8px</div>
        </Row>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </Row>
        <Row>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </Row>
        <Row>
          <Button loading={loading} onClick={fakeSave}>
            {loading ? "Saving" : "Click to load"}
          </Button>
          <Button variant="secondary">
            <Plus size={14} aria-hidden="true" />
            With icon
          </Button>
          <Button variant="secondary">
            <Download size={14} aria-hidden="true" />
            Export
            <Kbd>E</Kbd>
          </Button>
        </Row>
        <Row>
          <IconButton label="Search" icon={Search} />
          <IconButton label="Notifications" icon={Bell} variant="secondary" />
          <IconButton label="Delete" icon={Trash2} variant="danger" />
          <IconButton label="Small icon button" icon={Plus} size="sm" />
          <Kbd>Esc</Kbd>
          <Kbd>&#8984;</Kbd>
          <Kbd>K</Kbd>
        </Row>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Title" placeholder="Short summary" hint="5 to 200 characters." />
          <Input label="Email" defaultValue="not-an-email" error="Enter a valid email address." />
          <Input label="Disabled" defaultValue="Read only" disabled />
          <Select label="Priority" value={select} onValueChange={setSelect} options={PRIORITY_OPTIONS} placeholder="Choose a priority" />
        </div>
        <Textarea label="Description" placeholder="What happened?" hint="Markdown is not supported." />
        <div className="grid gap-2">
          <Checkbox label="Notify me by email" hint="Only for tickets assigned to you." checked={checks.a} onCheckedChange={(v) => setChecks((c) => ({ ...c, a: v }))} />
          <Checkbox label="Mark as internal" checked={checks.b} onCheckedChange={(v) => setChecks((c) => ({ ...c, b: v }))} />
          <Checkbox label="Select all (some selected)" checked={checks.c} onCheckedChange={(v) => setChecks((c) => ({ ...c, c: v === "indeterminate" ? true : v }))} />
          <Checkbox label="Disabled" disabled />
        </div>
      </Section>

      <Section title="Status and priority">
        <div className="grid gap-2 sm:grid-cols-2">
          {STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <StatusIcon status={status} size={16} />
              <span>{status.replaceAll("_", " ").toLowerCase()}</span>
            </div>
          ))}
        </div>
        <Row>
          {PRIORITIES.map((priority) => (
            <span key={priority} className="inline-flex items-center gap-1.5 text-sm">
              <PriorityIcon priority={priority} />
              {priority.toLowerCase()}
            </span>
          ))}
        </Row>
        <Row>
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
        </Row>
      </Section>

      <Section title="Avatar">
        <Row>
          <Avatar name="Ada Lovelace" size={20} />
          <Avatar name="Grace Hopper" size={24} />
          <Avatar name="Linus Torvalds" size={32} />
          <Avatar name="Maya Manager" size={32} />
          <Avatar name="Eli" size={32} />
          <Avatar name="Broken Image" src="/missing.png" size={32} />
        </Row>
      </Section>

      <Section title="Card">
        <Card title="Card with a title" description="A short description under it." action={<Button size="sm" variant="secondary">Action</Button>}>
          <p className="text-sm">Cards have a 1px border and no shadow.</p>
        </Card>
        <Card interactive tabIndex={0}>
          <p className="text-sm">An interactive card gets a hover tint.</p>
        </Card>
      </Section>

      <Section title="Overlays">
        <Row>
          <Tooltip content="Copies the ticket link">
            <Button variant="secondary">Tooltip</Button>
          </Tooltip>
          <Dropdown>
            <DropdownTrigger asChild>
              <IconButton label="More actions" icon={MoreHorizontal} variant="secondary" />
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLabel>Ticket</DropdownLabel>
              <DropdownItem icon={Copy} shortcut="C">
                Copy link
              </DropdownItem>
              <DropdownItem icon={UserPlus}>Assign...</DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={Trash2} destructive>
                Delete
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="mb-2 text-13 font-medium">Filter</p>
              <Select value={select} onValueChange={setSelect} options={PRIORITY_OPTIONS} placeholder="Any priority" />
            </PopoverContent>
          </Popover>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Dialog</Button>
            </DialogTrigger>
            <DialogContent
              title="Deactivate user?"
              description="They can no longer sign in. You can reactivate them later."
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button variant="danger" onClick={() => setDialogOpen(false)}>
                    Deactivate
                  </Button>
                </>
              }
            />
          </Dialog>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="secondary">Drawer</Button>
            </DrawerTrigger>
            <DrawerContent
              title="TKT-1042"
              description="Printer on floor 3 is offline"
              footer={
                <DrawerClose asChild>
                  <Button variant="secondary">Close</Button>
                </DrawerClose>
              }
            >
              <p className="text-sm text-muted">A right-hand panel. Focus is trapped inside until it closes.</p>
            </DrawerContent>
          </Drawer>
        </Row>
        <Row>
          <Button variant="ghost" onClick={() => toast.success("Ticket assigned")}>
            Success toast
          </Button>
          <Button variant="ghost" onClick={() => toast.error("Could not save", { description: "The server did not respond." })}>
            Error toast
          </Button>
          <Button variant="ghost" onClick={() => toast("Copied to clipboard")}>
            Plain toast
          </Button>
        </Row>
      </Section>

      <Section title="Feedback">
        <Row>
          <Spinner size={14} />
          <Spinner size={20} />
          <Spinner size={28} label="Loading tickets" />
        </Row>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid gap-3">
          <ProgressBar value={72} label="Accent progress" />
          <ProgressBar value={45} tone="success" label="Success progress" />
          <ProgressBar value={30} tone="warning" label="Warning progress" />
          <ProgressBar value={90} tone="danger" label="Danger progress" />
          <ProgressBar indeterminate label="Waiting for the server" />
        </div>
        <Card className="p-0">
          <EmptyState
            icon={Inbox}
            title="No tickets match these filters"
            description="Try removing a filter, or create a new ticket."
            action={<Button variant="secondary">Clear filters</Button>}
          />
        </Card>
      </Section>
    </div>
  );
}

function Pane({ theme, label }) {
  const [element, setElement] = useState(null);
  return (
    <div ref={setElement} data-theme={theme} className="min-w-0 rounded-lg border border-border bg-canvas p-4 text-fg">
      <PortalContainerProvider value={element}>
        <p className="mb-4 text-xs font-medium text-muted">{label}</p>
        <Showcase />
      </PortalContainerProvider>
    </div>
  );
}

export default function UiKit() {
  useDocumentTitle("UI kit");
  const { theme, setTheme } = useTheme();
  const choices = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">UI kit</h1>
            <p className="text-xs text-muted">Development only. Every primitive, light and dark side by side.</p>
          </div>
          <div role="group" aria-label="Page theme" className="flex items-center gap-1">
            {choices.map(({ value, label, icon: Icon }) => (
              <Button key={value} size="sm" variant={theme === value ? "primary" : "secondary"} aria-pressed={theme === value} onClick={() => setTheme(value)}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
        <Pane theme="light" label="Light" />
        <Pane theme="dark" label="Dark" />
      </main>
    </div>
  );
}
