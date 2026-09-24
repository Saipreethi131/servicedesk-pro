import { useEffect, useState } from "react";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";

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
      <h1 className="text-xl font-semibold">Departments</h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-3 rounded border border-gray-200 bg-white p-4">
        <h2 className="font-medium">Add a department</h2>
        <ErrorBanner error={error} focusOnShow />
        <Notice message={notice} />
        <label className="block text-sm">
          <span className="text-gray-700">Name (2-60 characters)</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add department"}
        </button>
      </form>

      <section className="max-w-md rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-medium">Active departments</h2>
        <ErrorBanner error={loadError} />
        {!loadError && departments === null && (
          <p role="status" className="text-sm text-gray-500">
            Loading...
          </p>
        )}
        {departments?.length === 0 && <p className="text-sm text-gray-500">No departments yet.</p>}
        <ul className="divide-y divide-gray-100 text-sm">
          {departments?.map((d) => (
            <li key={d._id} className="py-2">
              {d.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
