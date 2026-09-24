import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import { ROLES } from "../roles.js";

const navLinkClass = "text-blue-600 hover:underline";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold">
              ServiceDesk Pro
            </Link>
            {/* Admin links follow the same role rules as the API; RequireRole guards the routes themselves. */}
            {!user.mustChangePassword && (user.role === ROLES.SYSTEM_ADMIN || user.role === ROLES.IT_MANAGER) && (
              <Link to="/users" className={`text-sm ${navLinkClass}`}>
                Users
              </Link>
            )}
            {!user.mustChangePassword && user.role === ROLES.SYSTEM_ADMIN && (
              <Link to="/departments" className={`text-sm ${navLinkClass}`}>
                Departments
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{user.fullName}</span>
            {/* While a password change is forced, the only useful action is the form itself, so hide the links. */}
            {!user.mustChangePassword && (
              <Link to="/change-password" className={navLinkClass}>
                Change password
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
