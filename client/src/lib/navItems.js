import { Building2, FolderTree, KeyRound, LayoutDashboard, Ticket, Users } from "lucide-react";
import { ROLES } from "../roles.js";

// The single list of navigable destinations. The sidebar and the command palette both read it, so they cannot disagree.
// `roles` mirrors the <RequireRole> wrappers in App.jsx; it only decides which links are SHOWN. Access is still enforced
// by RequireRole on the client and by the API. Omitted `roles` means every signed-in user.
// `group` is "main" or "admin" (the sidebar draws a label above the admin group), or "account": reachable from the user menu in the
// top bar and the command palette, but not listed in the sidebar.
export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, group: "main" },
  { to: "/tickets", label: "Tickets", icon: Ticket, group: "main" },
  { to: "/change-password", label: "Change password", icon: KeyRound, group: "account" },
  { to: "/users", label: "Users", icon: Users, group: "admin", roles: [ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER] },
  { to: "/departments", label: "Departments", icon: Building2, group: "admin", roles: [ROLES.SYSTEM_ADMIN] },
  { to: "/categories", label: "Categories", icon: FolderTree, group: "admin", roles: [ROLES.SYSTEM_ADMIN] },
];

export const navItemsFor = (role) => NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
