import { useState } from "react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ROLES, manageableRoles, roleLabel } from "../roles.js";
import ErrorBanner from "./ErrorBanner.jsx";

const inputClass = "mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500";

// onStart runs when a submit begins, so the page can clear messages from earlier actions instead of leaving them next to the new result.
export default function CreateUserForm({ departments, onStart, onCreated }) {
  const { user: actor } = useAuth();
  const isAdmin = actor.role === ROLES.SYSTEM_ADMIN;
  const roleOptions = manageableRoles(actor.role);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  // An IT_MANAGER can only create users in their own department, so it is derived from the current user on every render
  // (not copied into state at mount, which would go stale if an admin moves them) and locked. Only an admin's pick is state.
  const [adminDepartment, setDepartment] = useState("");
  const department = isAdmin ? adminDepartment : (actor.department ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Every role except SYSTEM_ADMIN needs a department (D3.9).
  const departmentRequired = role !== ROLES.SYSTEM_ADMIN;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    onStart();
    setSubmitting(true);
    try {
      const { data } = await request("/users", {
        method: "POST",
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role,
          temporaryPassword: password,
          ...(department && { department }),
        },
      });
      // Keep role and department so several users can be added in a row; clear what is personal.
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      onCreated(data.user);
    } catch (err) {
      setError(err); // 409 duplicate email, 400 invalid value, 403 not permitted: shown exactly as the server words it
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded border border-gray-200 bg-white p-4">
      <h2 className="font-medium">Create user</h2>
      <ErrorBanner error={error} focusOnShow />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-gray-700">First name</span>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Last name</span>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-700">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-gray-700">Department</span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!isAdmin}
            required={departmentRequired}
            className={inputClass}
          >
            {/* Empty choice: a prompt when a department is needed, an explicit "none" for a SYSTEM_ADMIN. */}
            <option value="">{departmentRequired ? "Select a department" : "No department"}</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        {/* Not one big <label>: the "Show" checkbox has a label of its own, and labels must not nest. */}
        <div className="text-sm md:col-span-2">
          <label htmlFor="temporaryPassword" className="text-gray-700">
            Temporary password
          </label>
          <input
            id="temporaryPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>The user must change it at first sign-in. Share it securely.</span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show
            </label>
          </div>
        </div>

      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
