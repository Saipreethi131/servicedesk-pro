import { useEffect, useMemo, useState } from "react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { manageableRoles } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";
import CreateUserForm from "../components/CreateUserForm.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";

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
      <PageHeader title="Users" />

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

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`table ${loading ? "opacity-60" : ""}`}>
            <caption className="sr-only">Users</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Department</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {showRows &&
                result.items.map((u) => {
                  const blocked = toggleBlockedReason(u);
                  const action = u.isActive ? "Deactivate" : "Activate";
                  return (
                    <tr key={u._id}>
                      <td>{u.fullName}</td>
                      <td>{u.email}</td>
                      <td>
                        <Badge variant="role" value={u.role} />
                      </td>
                      <td>{departmentLabel(u)}</td>
                      <td>
                        <Badge variant="active" value={u.isActive} />
                      </td>
                      <td className="text-right">
                        {/* Visible reason next to the disabled button; aria-describedby ties it to the button for screen readers. */}
                        {blocked && (
                          <span
                            id={`blocked-${u._id}`}
                            className="mr-3 text-xs"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {blocked}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant={u.isActive ? "danger" : "secondary"}
                          onClick={() => toggleActive(u)}
                          disabled={Boolean(blocked) || busyId === u._id}
                          aria-label={`${action} ${u.fullName}`}
                          aria-describedby={blocked ? `blocked-${u._id}` : undefined}
                        >
                          {action}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {showRows && result.items.length === 0 && (
          <p className="p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            No users on this page.
          </p>
        )}
        {showLoadingText && (
          <p role="status" className="p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading...
          </p>
        )}

        {result && (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-between border-t px-4 py-3 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span style={{ color: "var(--color-text-muted)" }}>
              Page {result.page} of {totalPages} &middot; {result.total} {result.total === 1 ? "user" : "users"}
            </span>
            <div className="flex gap-2">
              {/* Both buttons work from result.page (what is on screen), not from `page` (what was last requested). */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => goToPage(result.page - 1)}
                disabled={result.page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => goToPage(result.page + 1)}
                disabled={result.page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </nav>
        )}
      </Card>
    </div>
  );
}
