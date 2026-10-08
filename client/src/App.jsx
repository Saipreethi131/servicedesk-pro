import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RequireRole from "./components/RequireRole.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import NotFound from "./pages/NotFound.jsx";
import { ROLES } from "./roles.js";
import { Toaster } from "./components/ui/index.js";

// Route pages load on demand, so the first screen does not download the dashboard charts, the ticket pages or the admin pages.
// Layout wraps the outlet in <Suspense>. Login, Change password and Not found stay in the main bundle: they are small and
// are what a visitor can land on first.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Tickets = lazy(() => import("./pages/Tickets.jsx"));
const NewTicket = lazy(() => import("./pages/NewTicket.jsx"));
const TicketDetail = lazy(() => import("./pages/TicketDetail.jsx"));
const Users = lazy(() => import("./pages/Users.jsx"));
const Departments = lazy(() => import("./pages/Departments.jsx"));
const Categories = lazy(() => import("./pages/Categories.jsx"));

// Dev-only component showcase. import.meta.env.DEV is replaced by `false` at build time, so the production bundle contains
// neither this lazy import nor the page.
const UiKit = import.meta.env.DEV ? lazy(() => import("./pages/UiKit.jsx")) : null;

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
              <Route path="tickets" element={<Tickets />} />
              <Route path="tickets/new" element={<NewTicket />} />
              <Route path="tickets/:id" element={<TicketDetail />} />

              <Route element={<RequireRole roles={[ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER]} />}>
                <Route path="users" element={<Users />} />
              </Route>
              <Route element={<RequireRole roles={[ROLES.SYSTEM_ADMIN]} />}>
                <Route path="departments" element={<Departments />} />
                <Route path="categories" element={<Categories />} />
              </Route>
            </Route>
          </Route>

          {UiKit && (
            <Route
              path="_kit"
              element={
                <Suspense fallback={null}>
                  <UiKit />
                </Suspense>
              }
            />
          )}

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  );
}
