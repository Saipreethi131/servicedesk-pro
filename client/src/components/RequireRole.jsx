import { Navigate, Outlet } from "react-router";
import { useAuth } from "../AuthContext.jsx";

// Route guard for pages only some roles should see. Sits inside ProtectedRoute, so `user` is always set here.
// This is convenience, not security: the API refuses the same requests with 403 whatever the UI does.
export default function RequireRole({ roles }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
}
