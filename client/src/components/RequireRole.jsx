import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../AuthContext.jsx";

// Route guard for pages only some roles should see. Sits inside ProtectedRoute, so `user` is always set here.
// This is convenience, not security: the API refuses the same requests with 403 whatever the UI does.
export default function RequireRole({ roles }) {
  const { user, denyAccess } = useAuth();
  const navigate = useNavigate();
  const allowed = roles.includes(user.role);

  useEffect(() => {
    if (allowed) return;
    // Leave the notice first, then navigate, so the dashboard already has it when it mounts (same idea as the
    // session-ended message on /login). Doing it in an effect, not during render, keeps rendering free of side effects.
    denyAccess();
    navigate("/", { replace: true });
  }, [allowed, denyAccess, navigate]);

  return allowed ? <Outlet /> : null;
}
