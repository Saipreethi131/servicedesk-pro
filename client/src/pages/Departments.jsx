import { useEffect, useState } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import { Button, Card, EmptyState, Input, PageHeader, Skeleton, toast } from "../components/ui/index.js";

export default function Departments() {
  useDocumentTitle("Departments");
  const [departments, setDepartments] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false; // StrictMode runs this twice in dev; only the last run may set state
    request("/departments")
      .then(({ data }) => {
        if (ignore) return;
        setDepartments(data.departments);
        setLoadError(null);
      })
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await request("/departments", { method: "POST", body: { name } });
      // Use the server's response instead of refetching; sorted like the server sorts.
      setDepartments((current) => [...(current ?? []), data.department].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Added "${data.department.name}"`);
      setName("");
    } catch (err) {
      setError(err); // 409 duplicate, 422 bad length, 403...: the server's own wording
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Departments" />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card as="form" onSubmit={handleSubmit} title="Add a department" className="space-y-4">
          <ErrorBanner error={error} focusOnShow />
          <Input label="Name" hint="2-60 characters" required value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="primary" loading={submitting}>
            {submitting ? "Adding..." : "Add department"}
          </Button>
        </Card>

        <Card title="Active departments">
          {loadError ? (
            <EmptyState
              icon={AlertCircle}
              title="Could not load departments"
              description={loadError.message}
              action={
                <Button type="button" variant="secondary" onClick={retry}>
                  Try again
                </Button>
              }
            />
          ) : departments === null ? (
            <div role="status" className="space-y-2">
              <span className="sr-only">Loading departments</span>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <EmptyState icon={Building2} title="No departments yet" description="Add the first one using the form." />
          ) : (
            <ul className="-my-1 divide-y divide-border text-sm">
              {departments.map((d) => (
                <li key={d._id} className="py-2 text-fg">
                  {d.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
