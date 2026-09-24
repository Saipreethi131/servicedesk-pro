import { useEffect, useMemo, useState } from "react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { manageableRoles, roleLabel } from "../roles.js";
import CreateUserForm from "../components/CreateUserForm.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";

const PAGE_SIZE = 20;

export default function Users() {
  const { user: actor } = useAuth();
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch the current page
  const [result, setResult] = useState(null); // { items, page, limit, total }
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null); // load failures and action failures share one banner
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // The users list carries department ids only, so names come from the departments list.
  useEffect(() => {
    let ignore = false;
    request("/departments")
      .then(({ data }) => !ignore && setDepartments(data.departments))
      .catch((err) => !ignore && setError(err));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    request(`/users?page=${page}&limit=${PAGE_SIZE}`)
      .then(({ data }) => {
        if (ignore) return;
        setResult(data);
        setError(null);
      })
      .catch((err) => !ignore && setError(err))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [page, reloadKey]);

  const departmentNames = useMemo(() => new Map(departments.map((d) => [d._id, d.name])), [departments]);

  // /departments only returns ACTIVE departments, so a user in an inactive one has no name to show.
  const departmentLabel = (u) => (u.department ? (departmentNames.get(u.department) ?? "Unknown") : "-");

  // UI hint only: the server makes the real decision and answers 403 if this is ever wrong (D3.3, D3.6).
  const toggleBlockedReason = (target) => {
    if (target._id === actor._id) return "You cannot change your own status";
    if (!manageableRoles(actor.role).includes(target.role)) return "You cannot manage this role";
    return null;
  };

  const toggleActive = async (target) => {
    setBusyId(target._id);
    setError(null);
    setNotice(null);
    try {
      const { data } = await request(`/users/${target._id}`, { method: "PATCH", body: { isActive: !target.isActive } });
      // Show what the server stored, not what we assumed it would store.
      setResult((current) => ({ ...current, items: current.items.map((u) => (u._id === target._id ? data.user : u)) }));
      setNotice(`${data.user.fullName} is now ${data.user.isActive ? "active" : "inactive"}`);
    } catch (err) {
      setError(err); // 403 not permitted, 400 invalid state, 409 last SYSTEM_ADMIN...: the server's wording
    } finally {
      setBusyId(null);
    }
  };

  const handleCreated = (user) => {
    setError(null);
    setNotice(`Created ${user.fullName} (${user.email}). They must change the temporary password at first sign-in.`);
    setPage(1); // newest first, so the new user is on page 1
    setReloadKey((k) => k + 1);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>

      <CreateUserForm
        departments={departments}
        onStart={() => {
          setError(null);
          setNotice(null);
        }}
        onCreated={handleCreated}
      />

      <ErrorBanner error={error} />
      <Notice message={notice} />

      <section className="rounded border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-sm ${loading ? "opacity-60" : ""}`}>
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result?.items.map((u) => {
                const blocked = toggleBlockedReason(u);
                return (
                  <tr key={u._id}>
                    <td className="px-3 py-2">{u.fullName}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{roleLabel(u.role)}</td>
                    <td className="px-3 py-2">{departmentLabel(u)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          u.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={Boolean(blocked) || busyId === u._id}
                        title={blocked ?? undefined}
                        className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {result?.items.length === 0 && <p className="p-4 text-sm text-gray-500">No users on this page.</p>}
        {!result && loading && <p className="p-4 text-sm text-gray-500">Loading...</p>}

        {result && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">
              Page {result.page} of {totalPages} &middot; {result.total} {result.total === 1 ? "user" : "users"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1 || loading}
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages || loading}
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
