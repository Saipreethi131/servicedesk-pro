import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import Badge from "./ui/Badge.jsx";
import Button from "./ui/Button.jsx";
import { ROLES } from "../roles.js";

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);
const PasswordIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9M15 7l2 2M18 4l2 2" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="8" r="2.5" />
    <path d="M15.5 14.2c2.6.5 4.5 2.8 4.5 5.8" />
  </svg>
);
const DepartmentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M4 21V9l8-5 8 5v12" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      // logout() only throws when the server could not be reached; the user is still logged in.
      setLogoutError({ message: "Could not log out, please try again" });
      setLoggingOut(false);
    }
  };

  const logoutButton = (
    <Button type="button" variant="ghost" onClick={handleLogout} disabled={loggingOut}>
      {loggingOut ? "Logging out..." : "Log out"}
    </Button>
  );

  // Forced password change (D4.4): no sidebar, just a centered card. Logout stays reachable so the user isn't
  // trapped on this page.
  if (user.mustChangePassword) {
    return (
      <div className="auth-shell">
        <div className="auth-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              ServiceDesk Pro
            </span>
            {logoutButton}
          </div>
          {logoutError && <ErrorBanner error={logoutError} focusOnShow />}
          <Outlet />
        </div>
      </div>
    );
  }

  const navLinkClass = ({ isActive }) => `sidebar-link${isActive ? " active" : ""}`;
  // Same rules as before (and as the API): just which links render, not how access is enforced.
  const showUsers = user.role === ROLES.SYSTEM_ADMIN || user.role === ROLES.IT_MANAGER;
  const showDepartments = user.role === ROLES.SYSTEM_ADMIN;
  const showAdminGroup = showUsers || showDepartments;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-text">ServiceDesk Pro</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={navLinkClass}>
            <DashboardIcon />
            <span className="sidebar-link-text">Dashboard</span>
          </NavLink>
          <NavLink to="/change-password" className={navLinkClass}>
            <PasswordIcon />
            <span className="sidebar-link-text">Change password</span>
          </NavLink>

          {showAdminGroup && <div className="sidebar-group-label">Admin</div>}
          {showUsers && (
            <NavLink to="/users" className={navLinkClass}>
              <UsersIcon />
              <span className="sidebar-link-text">Users</span>
            </NavLink>
          )}
          {showDepartments && (
            <NavLink to="/departments" className={navLinkClass}>
              <DepartmentsIcon />
              <span className="sidebar-link-text">Departments</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.fullName}</div>
            <Badge variant="role" value={user.role} />
          </div>
          {logoutButton}
        </div>
      </aside>

      <div className="app-content">
        <div className="app-content-inner space-y-4">
          {logoutError && <ErrorBanner error={logoutError} focusOnShow />}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
