import { useAuth } from "../AuthContext.jsx";
import { roleLabel } from "../roles.js";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <dt className="text-gray-500">Name</dt>
        <dd>{user.fullName}</dd>
        <dt className="text-gray-500">Role</dt>
        <dd>{roleLabel(user.role)}</dd>
        <dt className="text-gray-500">Email</dt>
        <dd>{user.email}</dd>
      </dl>
    </div>
  );
}
