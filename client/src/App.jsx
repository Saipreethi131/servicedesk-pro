import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RequireRole from "./components/RequireRole.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Users from "./pages/Users.jsx";
import Departments from "./pages/Departments.jsx";
import { ROLES } from "./roles.js";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Everything below needs a session. ProtectedRoute also forces /change-password while mustChangePassword is set. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="change-password" element={<ChangePassword />} />

              <Route element={<RequireRole roles={[ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER]} />}>
                <Route path="users" element={<Users />} />
              </Route>
              <Route element={<RequireRole roles={[ROLES.SYSTEM_ADMIN]} />}>
                <Route path="departments" element={<Departments />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
