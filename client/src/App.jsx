import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RequireRole from "./components/RequireRole.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Users from "./pages/Users.jsx";
import Departments from "./pages/Departments.jsx";
import Categories from "./pages/Categories.jsx";
import Tickets from "./pages/Tickets.jsx";
import NewTicket from "./pages/NewTicket.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";
import NotFound from "./pages/NotFound.jsx";
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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
