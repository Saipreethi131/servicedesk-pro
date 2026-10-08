import { NavLink } from "react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navItemsFor } from "../lib/navItems.js";
import { cn } from "../lib/cn.js";
import { IconButton, Tooltip } from "./ui/index.js";

function SidebarLink({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      // When collapsed the visible text is gone, so the label becomes the accessible name.
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-13 font-medium no-underline transition-colors duration-150",
          isActive ? "bg-accent-soft text-accent-ink" : "text-muted-strong hover:bg-subtle hover:text-fg",
          collapsed && "justify-center px-0"
        )
      }
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

// The role-gated links, shared by the desktop sidebar and the mobile drawer. `onNavigate` lets the drawer close itself.
export function NavList({ role, collapsed = false, onNavigate }) {
  const items = navItemsFor(role);
  const main = items.filter((i) => i.group === "main");
  const admin = items.filter((i) => i.group === "admin");

  return (
    <nav aria-label="Main" className="space-y-0.5">
      {main.map((item) => (
        <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
      {admin.length > 0 && (
        <>
          {collapsed ? (
            <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
          ) : (
            <div className="px-2.5 pt-4 pb-1 text-xs font-medium text-muted">Admin</div>
          )}
          {admin.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  );
}

// Desktop (>= 768px) only; below that the same links live in MobileNav.
export default function Sidebar({ role, collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out-expo md:flex",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className={cn("flex h-12 shrink-0 items-center border-b border-border", collapsed ? "justify-center" : "px-4")}>
        {collapsed ? (
          <span aria-label="ServiceDesk Pro" role="img" className="text-sm font-semibold text-fg">
            SD
          </span>
        ) : (
          <span className="truncate text-sm font-semibold text-fg">ServiceDesk Pro</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <NavList role={role} collapsed={collapsed} />
      </div>

      <div className={cn("flex shrink-0 border-t border-border p-2", collapsed ? "justify-center" : "justify-end")}>
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          aria-expanded={!collapsed}
          onClick={onToggle}
        />
      </div>
    </aside>
  );
}
