import { useEffect, useMemo, useState } from "react";
import { AlertCircle, UsersRound } from "lucide-react";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { manageableRoles } from "../roles.js";
import { roleLabel } from "../lib/labels.js";
import useDocumentTitle from "../useDocumentTitle.js";
import CreateUserForm from "../components/CreateUserForm.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Pagination from "../components/Pagination.jsx";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Skeleton, toast } from "../components/ui/index.js";

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
  const showSkeleton = !showRows && !loadError; // nothing to show yet: first load, or still waiting on the department names

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
    try {
      const { data } = await request(`/users/${target._id}`, { method: "PATCH", body: { isActive: !target.isActive } });
      // Show what the server stored, not what we assumed it would store.
      setResult((current) => ({ ...current, items: current.items.map((u) => (u._id === target._id ? data.user : u)) }));
      toast.success(`${data.user.fullName} is now ${data.user.isActive ? "active" : "inactive"}`);
    } catch (err) {
      setActionError(err); // 403 not permitted, 400 invalid state, 409 last SYSTEM_ADMIN...: the server's wording
    } finally {
      setBusyId(null);
    }
  };

  const handleCreated = (user) => {
    setActionError(null);
    toast.success(`Created ${user.fullName}`, {
      description: `${user.email}. They must change the temporary password at first sign-in.`,
    });
    goToPage(1); // newest first, so the new user is on page 1
  };

  // Always refetches, even for the page already requested: after a failed fetch, `page` already holds the failed page,
  // so setting it again would change nothing and a retry would do nothing.
  const goToPage = (n) => {
    setPage(n);
    setReloadKey((k) => k + 1);
  };

  // Say which page a failed fetch was for and which one is still on screen. With nothing on screen the empty state says it.
  const loadErrorBanner = loadError &&
    result && {
      message: `Could not load page ${loadError.page}: ${loadError.err.message} (still showing page ${result.page})`,
    };

  const statusBadge = (u) => <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Inactive"}</Badge>;

  // Shared by the table row and the mobile card. The visible reason sits next to the disabled button; aria-describedby ties
  // it to the button for screen readers.
  const actionCell = (u) => {
    const blocked = toggleBlockedReason(u);
    const action = u.isActive ? "Deactivate" : "Activate";
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        {blocked && (
          <span id={`blocked-${u._id}`} className="text-xs text-muted-strong">
            {blocked}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant={u.isActive ? "danger" : "secondary"}
          onClick={() => toggleActive(u)}
          disabled={Boolean(blocked) || busyId === u._id}
          aria-label={`${action} ${u.fullName}`}
          aria-describedby={blocked ? `blocked-${u._id}` : undefined}
        >
          {action}
        </Button>
      </span>
    );
  };

  const th = "sticky top-0 z-10 border-b border-border bg-surface px-3 py-2 text-left text-xs font-medium text-muted";
  const td = "border-b border-border px-3 py-2";

  return (
    <div className="space-y-4">
      <PageHeader title="Users" />

      <CreateUserForm departments={departments ?? []} onStart={() => setActionError(null)} onCreated={handleCreated} />

      <ErrorBanner error={departmentsError} />
      <ErrorBanner error={loadErrorBanner} />
      <ErrorBanner error={actionError} focusOnShow />

      <Card className="!p-0 overflow-hidden">
        {loadError && !result ? (
          <EmptyState
            icon={AlertCircle}
            title="Could not load users"
            description={loadError.err.message}
            action={
              <Button type="button" variant="secondary" onClick={() => goToPage(page)}>
                Try again
              </Button>
            }
          />
        ) : showRows && result.items.length === 0 ? (
          <EmptyState icon={UsersRound} title="No users on this page" description="Create a user above to get started." />
        ) : (
          <>
            {/* >= 768px: table. */}
            <div className="hidden max-h-[calc(100vh-17rem)] min-h-40 overflow-auto md:block">
              <table className={`w-full min-w-[760px] border-separate border-spacing-0 text-13 ${loading && showRows ? "opacity-60" : ""}`}>
                <caption className="sr-only">Users</caption>
                <thead>
                  <tr>
                    {["Name", "Email", "Role", "Department", "Status"].map((h) => (
                      <th key={h} scope="col" className={th}>
                        {h}
                      </th>
                    ))}
                    <th scope="col" className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {showRows
                    ? result.items.map((u) => (
                        <tr key={u._id} className="hover:bg-subtle">
                          <td className={td}>
                            <span className="flex items-center gap-2">
                              <Avatar name={u.fullName} size={24} />
                              <span className="font-medium text-fg">{u.fullName}</span>
                            </span>
                          </td>
                          <td className={`${td} text-muted-strong`}>{u.email}</td>
                          <td className={td}>
                            <Badge>{roleLabel(u.role)}</Badge>
                          </td>
                          <td className={`${td} text-muted-strong`}>{departmentLabel(u)}</td>
                          <td className={td}>{statusBadge(u)}</td>
                          <td className={`${td} text-right`}>{actionCell(u)}</td>
                        </tr>
                      ))
                    : showSkeleton &&
                      Array.from({ length: 6 }, (_, i) => (
                        <tr key={i}>
                          {[0, 1, 2, 3, 4, 5].map((c) => (
                            <td key={c} className={td}>
                              <Skeleton className="h-4 w-24" />
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* < 768px: one card per user. */}
            <ul className="divide-y divide-border md:hidden">
              {showRows
                ? result.items.map((u) => (
                    <li key={u._id} className={`space-y-2 p-3 ${loading ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-2">
                        <Avatar name={u.fullName} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">{u.fullName}</p>
                          <p className="truncate text-13 text-muted-strong">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{roleLabel(u.role)}</Badge>
                        {statusBadge(u)}
                        <span className="text-13 text-muted-strong">{departmentLabel(u)}</span>
                      </div>
                      <div className="text-right">{actionCell(u)}</div>
                    </li>
                  ))
                : showSkeleton &&
                  Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="space-y-2 p-3">
                      <Skeleton className="h-8 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </li>
                  ))}
            </ul>
            {showSkeleton && (
              <p role="status" className="sr-only">
                Loading users
              </p>
            )}
          </>
        )}

        {result && <Pagination result={result} loading={loading} noun="user" onPage={goToPage} />}
      </Card>
    </div>
  );
}
