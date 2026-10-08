import { useState } from "react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ROLES, manageableRoles } from "../roles.js";
import { roleLabel } from "../lib/labels.js";
import ErrorBanner from "./ErrorBanner.jsx";
import { Button, Card, Checkbox, Input, Select } from "./ui/index.js";

const NO_DEPARTMENT = "__none__"; // Radix Select cannot hold "" as an option value, so "No department" travels as this and is mapped back

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
  const [departmentError, setDepartmentError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Every role except SYSTEM_ADMIN needs a department (D3.9).
  const departmentRequired = role !== ROLES.SYSTEM_ADMIN;

  const handleSubmit = async (event) => {
    event.preventDefault();
    // The Radix Select has no native "required" the browser can point at, so this one rule is checked here.
    if (departmentRequired && !department) {
      setDepartmentError("Select a department");
      return;
    }
    setDepartmentError(null);
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

  // For a SYSTEM_ADMIN (department optional) the first choice is an explicit "No department".
  const departmentOptions = [
    ...(departmentRequired ? [] : [{ value: NO_DEPARTMENT, label: "No department" }]),
    ...departments.map((d) => ({ value: d._id, label: d.name })),
  ];

  return (
    <Card as="form" onSubmit={handleSubmit} title="Create user" className="space-y-4">
      <ErrorBanner error={error} focusOnShow />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Input
          label="Email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          wrapperClassName="md:col-span-2"
        />

        <Select
          label="Role"
          value={role}
          onValueChange={setRole}
          options={roleOptions.map((r) => ({ value: r, label: roleLabel(r) }))}
        />

        <Select
          label="Department"
          value={department || (departmentRequired ? "" : NO_DEPARTMENT)}
          onValueChange={(value) => {
            setDepartment(value === NO_DEPARTMENT ? "" : value);
            setDepartmentError(null);
          }}
          disabled={!isAdmin}
          placeholder="Select a department"
          options={departmentOptions}
          error={departmentError}
        />

        <div className="space-y-2 md:col-span-2">
          <Input
            label="Temporary password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            hint="The user must change it at first sign-in. Share it securely."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Checkbox label="Show password" checked={showPassword} onCheckedChange={(checked) => setShowPassword(checked === true)} />
        </div>
      </div>

      <Button type="submit" variant="primary" loading={submitting}>
        {submitting ? "Creating..." : "Create user"}
      </Button>
    </Card>
  );
}
