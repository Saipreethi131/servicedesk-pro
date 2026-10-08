import { lazy, Suspense, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useShortcuts from "../lib/shortcuts.js";
import useSidebarCollapsed from "../lib/useSidebarCollapsed.js";
import { cn } from "../lib/cn.js";
import ErrorBanner from "./ErrorBanner.jsx";
import ShortcutsDialog from "./ShortcutsDialog.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import MobileNav from "./MobileNav.jsx";
import { Button, Spinner } from "./ui/index.js";

// cmdk and the palette are only needed once someone opens it, so they load on first use rather than with the app.
const CommandPalette = lazy(() => import("./CommandPalette.jsx"));

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const { pathname } = useLocation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false); // mount the lazy chunk on first open, keep it after
  const [menuOpen, setMenuOpen] = useState(false); // the mobile nav drawer
  const [helpOpen, setHelpOpen] = useState(false);

  // Hooks cannot sit after the early return below, so the forced-password state is checked inside the handlers instead.
  const active = !user.mustChangePassword;
  useShortcuts({
    palette: () => active && openPalette(),
    help: () => active && setHelpOpen(true),
    goDashboard: () => active && navigate("/"),
    goTickets: () => active && navigate("/tickets"),
    createTicket: () => active && navigate("/tickets/new"), // open to every role, like the route
  });

  const openPalette = () => {
    setPaletteEverOpened(true);
    setPaletteOpen(true);
  };

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
      <div className="grid min-h-screen place-items-center bg-canvas p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">ServiceDesk Pro</span>
            {logoutButton}
          </div>
          {logoutError && <ErrorBanner error={logoutError} focusOnShow />}
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar role={user.role} collapsed={collapsed} onToggle={toggleCollapsed} />

      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} role={user.role} />

      <div className={cn("transition-[margin] duration-200 ease-out-expo", collapsed ? "md:ml-14" : "md:ml-56")}>
        <Topbar
          user={user}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenPalette={openPalette}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <main className="mx-auto max-w-6xl space-y-4 px-4 pt-6 pb-8 md:px-6">
          {logoutError && <ErrorBanner error={logoutError} focusOnShow />}
          {/* Keyed by path: a route change remounts this wrapper, which replays the 150ms fade (skipped under reduced motion). */}
          <div key={pathname} className="animate-page-in">
            <Suspense
              fallback={
                <div className="grid place-items-center py-24 text-muted">
                  <Spinner size={20} label="Loading page" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {paletteEverOpened && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} role={user.role} onLogout={handleLogout} />
        </Suspense>
      )}
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
