import { useEffect, useState } from "react";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

export default function Departments() {
  useDocumentTitle("Departments");
  const [departments, setDepartments] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false; // StrictMode runs this twice in dev; only the last run may set state
    request("/departments")
      .then(({ data }) => !ignore && setDepartments(data.departments))
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const { data } = await request("/departments", { method: "POST", body: { name } });
      // Use the server's response instead of refetching; sorted like the server sorts.
      setDepartments((current) => [...current, data.department].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice(`Added "${data.department.name}"`);
      setName("");
    } catch (err) {
      setError(err); // 409 duplicate, 422 bad length, 403...: the server's own wording
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" />

      <Card as="form" onSubmit={handleSubmit} title="Add a department" className="max-w-md space-y-3">
        <ErrorBanner error={error} focusOnShow />
        <Notice message={notice} />
        <label className="block text-sm">
          <span>Name (2-60 characters)</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
          />
        </label>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Adding..." : "Add department"}
        </Button>
      </Card>

      <Card title="Active departments" className="max-w-md">
        <ErrorBanner error={loadError} />
        {!loadError && departments === null && (
          <p role="status" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading...
          </p>
        )}
        {departments?.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No departments yet.
          </p>
        )}
        <ul className="divide-y divide-[var(--color-border)] text-sm">
          {departments?.map((d) => (
            <li key={d._id} className="py-2">
              {d.name}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
