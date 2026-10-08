import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import { Spinner } from "./ui/index.js";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the startup refresh: without this, a reload would bounce a logged-in user to /login for a moment.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
        <Spinner size={20} label="Loading" />
      </div>
    );
  }

  // `from` lets the login page send the user back to where they were headed.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // The server blocks every other endpoint for this user (D2.8), so the UI sends them to the one page that works.
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
