import { useEffect, useMemo, useState } from "react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { manageableRoles, roleLabel } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";
import CreateUserForm from "../components/CreateUserForm.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";

const PAGE_SIZE = 20;

export default function Users() {
  useDocumentTitle("Users");
  const { user: actor } = useAuth();
  const [page, setPage] = useState(1); // the page last REQUESTED. The page on screen is result.page, which differs after a failed fetch
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch even when `page` did not change
  const [result, setResult] = useState(null); // { items, page, limit, total }
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState(null); // null until the request has finished
  // Three separate errors: one shared slot let a later success (the users list) wipe an earlier failure (the departments).
  const [departmentsError, setDepartmentsError] = useState(null);
  const [loadError, setLoadError] = useState(null); // { page, err } of the last failed page fetch; cleared by the next success
  const [actionError, setActionError] = useState(null); // a failed activate/deactivate
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // The users list carries department ids only, so names come from the departments list.
  useEffect(() => {
    let ignore = false;
    request("/departments")
      .then(({ data }) => !ignore && setDepartments(data.departments))
      .catch((err) => !ignore && setDepartmentsError({ message: `Could not load departments. ${err.message}` }));
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
        setLoadError(null);
      })
      .catch((err) => !ignore && setLoadError({ page, err }))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [page, reloadKey]);

  const departmentNames = useMemo(() => new Map((departments ?? []).map((d) => [d._id, d.name])), [departments]);

  // Department cells wait for the departments request (success or failure), so a name never flashes as "Unknown".
  const departmentsSettled = departments !== null || departmentsError !== null;
  const showRows = result !== null && departmentsSettled;
  const showLoadingText = (result === null && loading) || (result !== null && !departmentsSettled);

  // /departments only returns ACTIVE departments, so a user in an inactive one has no name to show.
  const departmentLabel = (u) => {
    if (!u.department) return "-";
    if (departments === null) return "Unavailable"; // the departments request failed; its banner says why
    return departmentNames.get(u.department) ?? "Unknown";
  };

  // UI hint only: the server makes the real decision and answers 403 if this is ever wrong (D3.3, D3.6).
  const toggleBlockedReason = (target) => {
    if (target._id === actor._id) return "You cannot change your own status";
    if (!manageableRoles(actor.role).includes(target.role)) return "You cannot manage this role";
    return null;
  };

  const toggleActive = async (target) => {
    setBusyId(target._id);
    setActionError(null);
    setNotice(null);
    try {
      const { data } = await request(`/users/${target._id}`, { method: "PATCH", body: { isActive: !target.isActive } });
      // Show what the server stored, not what we assumed it would store.
      setResult((current) => ({ ...current, items: current.items.map((u) => (u._id === target._id ? data.user : u)) }));
      setNotice(`${data.user.fullName} is now ${data.user.isActive ? "active" : "inactive"}`);
    } catch (err) {
      setActionError(err); // 403 not permitted, 400 invalid state, 409 last SYSTEM_ADMIN...: the server's wording
    } finally {
      setBusyId(null);
    }
  };

  const handleCreated = (user) => {
    setActionError(null);
    setNotice(`Created ${user.fullName} (${user.email}). They must change the temporary password at first sign-in.`);
    goToPage(1); // newest first, so the new user is on page 1
  };

  // Always refetches, even for the page already requested: after a failed fetch, `page` already holds the failed page,
  // so setting it again would change nothing and a retry would do nothing.
  const goToPage = (n) => {
    setPage(n);
    setReloadKey((k) => k + 1);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  // Say which page a failed fetch was for and which one is still on screen.
  const loadErrorBanner = loadError && {
    message: result
      ? `Could not load page ${loadError.page}: ${loadError.err.message} (still showing page ${result.page})`
      : `Could not load users: ${loadError.err.message}`,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>

      <CreateUserForm
        departments={departments ?? []}
        onStart={() => {
          setActionError(null);
          setNotice(null);
        }}
        onCreated={handleCreated}
      />

      <ErrorBanner error={departmentsError} />
      <ErrorBanner error={loadErrorBanner} />
      <ErrorBanner error={actionError} focusOnShow />
      <Notice message={notice} />

      <section className="rounded border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-sm ${loading ? "opacity-60" : ""}`}>
            <caption className="sr-only">Users</caption>
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Name</th>
                <th scope="col" className="px-3 py-2 font-medium">Email</th>
                <th scope="col" className="px-3 py-2 font-medium">Role</th>
                <th scope="col" className="px-3 py-2 font-medium">Department</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {showRows &&
                result.items.map((u) => {
                  const blocked = toggleBlockedReason(u);
                  const action = u.isActive ? "Deactivate" : "Activate";
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
                        {/* Visible reason next to the disabled button; aria-describedby ties it to the button for screen readers. */}
                        {blocked && (
                          <span id={`blocked-${u._id}`} className="mr-3 text-xs text-gray-500">
                            {blocked}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          disabled={Boolean(blocked) || busyId === u._id}
                          aria-label={`${action} ${u.fullName}`}
                          aria-describedby={blocked ? `blocked-${u._id}` : undefined}
                          className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {action}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {showRows && result.items.length === 0 && <p className="p-4 text-sm text-gray-500">No users on this page.</p>}
        {showLoadingText && (
          <p role="status" className="p-4 text-sm text-gray-500">
            Loading...
          </p>
        )}

        {result && (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">
              Page {result.page} of {totalPages} &middot; {result.total} {result.total === 1 ? "user" : "users"}
            </span>
            <div className="flex gap-2">
              {/* Both buttons work from result.page (what is on screen), not from `page` (what was last requested). */}
              <button
                type="button"
                onClick={() => goToPage(result.page - 1)}
                disabled={result.page <= 1 || loading}
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(result.page + 1)}
                disabled={result.page >= totalPages || loading}
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
