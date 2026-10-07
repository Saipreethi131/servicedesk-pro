import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ROLES } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";

const REQUESTER_MIN_CHARS = 2;
const REQUESTER_DEBOUNCE_MS = 300;

const inputClass = "mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2";

export default function NewTicket() {
  useDocumentTitle("New ticket");
  const { user } = useAuth();
  const navigate = useNavigate();
  const canFileForSomeoneElse = user.role === ROLES.SYSTEM_ADMIN || user.role === ROLES.IT_MANAGER;

  const [categories, setCategories] = useState(null); // null = still loading; active leaf tree (D5.4)
  const [categoriesError, setCategoriesError] = useState(null);
  const [reference, setReference] = useState(null); // { impacts, urgencies, priorities, matrix } - D5.3
  const [referenceError, setReferenceError] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topCategoryId, setTopCategoryId] = useState("");
  const [childCategoryId, setChildCategoryId] = useState("");
  const [impact, setImpact] = useState("");
  const [urgency, setUrgency] = useState("");
  const [requester, setRequester] = useState(null); // chosen { _id, name, role, department }; null = file for myself
  const [requesterQuery, setRequesterQuery] = useState("");
  const [requesterResults, setRequesterResults] = useState(null); // null = nothing searched yet / too short
  const [requesterError, setRequesterError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    request("/categories")
      .then(({ data }) => !ignore && setCategories(data.categories))
      .catch((err) => !ignore && setCategoriesError(err));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    request("/reference")
      .then(({ data }) => !ignore && setReference(data))
      .catch((err) => !ignore && setReferenceError(err));
    return () => {
      ignore = true;
    };
  }, []);

  // Debounced search of the server's requester-options (the server decides who is eligible, D6.14). Only runs for
  // actors who see the picker, only once something is typed, and ignores a response that a newer keystroke superseded.
  useEffect(() => {
    const q = requesterQuery.trim();
    setRequesterError(null);
    if (!canFileForSomeoneElse || requester || q.length < REQUESTER_MIN_CHARS) {
      setRequesterResults(null);
      return undefined;
    }
    let ignore = false;
    const timer = setTimeout(() => {
      request(`/tickets/requester-options?q=${encodeURIComponent(q)}`)
        .then(({ data }) => !ignore && setRequesterResults(data.items))
        .catch((err) => !ignore && setRequesterError(err));
    }, REQUESTER_DEBOUNCE_MS);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [requesterQuery, requester, canFileForSomeoneElse]);

  const selectedTop = useMemo(() => categories?.find((c) => c._id === topCategoryId) ?? null, [categories, topCategoryId]);
  const hasChildren = Boolean(selectedTop?.children?.length);
  // A top-level category with no children is itself a leaf (D5.4/D6.6); only once one is chosen with children
  // does the second dropdown's pick become the real category.
  const leafCategoryId = hasChildren ? childCategoryId : topCategoryId;

  const handleTopChange = (value) => {
    setTopCategoryId(value);
    setChildCategoryId(""); // the previous child belonged to a different parent
  };

  const previewPriority = impact && urgency ? reference?.matrix?.[impact]?.[urgency] : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await request("/tickets", {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim(),
          category: leafCategoryId,
          impact,
          urgency,
          ...(canFileForSomeoneElse && requester && { requester: requester._id }),
        },
      });
      // Prompt 6 builds the detail page next; the link is live even though that page doesn't exist yet.
      navigate(`/tickets/${data.ticket._id}`, { replace: true });
    } catch (err) {
      setError(err); // 400/422 field errors, 403, 404 category...: the server's own wording
      setSubmitting(false);
    }
  };

  const categoriesLoaded = categories !== null;
  const noCategories = categoriesLoaded && categories.length === 0;

  return (
    <div className="space-y-6">
      <Card as="form" onSubmit={handleSubmit} title="New ticket" className="max-w-2xl space-y-4">
        <ErrorBanner error={error} focusOnShow />
        <ErrorBanner error={categoriesError} />
        <ErrorBanner error={referenceError} />

        <label className="block text-sm">
          <span>Title (5-200 characters)</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </label>

        <label className="block text-sm">
          <span>Description (10-5000 characters)</span>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span>Category</span>
            <select
              required
              value={topCategoryId}
              onChange={(e) => handleTopChange(e.target.value)}
              disabled={!categoriesLoaded || noCategories}
              className={inputClass}
            >
              <option value="">{categoriesLoaded ? "Select a category" : "Loading..."}</option>
              {categories?.map((top) => (
                <option key={top._id} value={top._id}>
                  {top.name}
                </option>
              ))}
            </select>
          </label>

          {/* Only shown once a parent with children is chosen; a childless top-level category is already a leaf. */}
          {hasChildren && (
            <label className="block text-sm">
              <span>Subcategory</span>
              <select
                required
                value={childCategoryId}
                onChange={(e) => setChildCategoryId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a subcategory</option>
                {selectedTop.children.map((child) => (
                  <option key={child._id} value={child._id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {noCategories && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No categories exist yet. An administrator needs to add one before a ticket can be filed.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span>Impact</span>
            <select required value={impact} onChange={(e) => setImpact(e.target.value)} className={inputClass}>
              <option value="">Select impact</option>
              {reference?.impacts.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span>Urgency</span>
            <div className="mt-1 flex items-center gap-2">
              <select
                required
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2"
              >
                <option value="">Select urgency</option>
                {reference?.urgencies.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {/* Client-side preview only, from the same matrix the server uses (D5.1) - the server still derives
                  the authoritative priority on submit; this never travels in the request body. */}
              {previewPriority && <Badge variant="priority" value={previewPriority}>{`Priority: ${previewPriority}`}</Badge>}
            </div>
          </label>
        </div>

        {canFileForSomeoneElse && (
          <div className="text-sm">
            <span>File on behalf of</span>
            {requester ? (
              <div className="mt-1 flex items-center gap-2">
                <span>
                  {requester.name} ({requester.role}, {requester.department?.name ?? "no department"})
                </span>
                <Button type="button" variant="ghost" onClick={() => setRequester(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <input
                  value={requesterQuery}
                  onChange={(e) => setRequesterQuery(e.target.value)}
                  placeholder="Myself - or type a name to search"
                  aria-label="Search for a requester"
                  className={inputClass}
                />
                <ErrorBanner error={requesterError} />
                {requesterResults &&
                  (requesterResults.length === 0 ? (
                    <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
                      No matching users
                    </p>
                  ) : (
                    <ul className="mt-1 rounded-md border border-[var(--color-border)]">
                      {requesterResults.map((u) => (
                        <li key={u._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setRequester(u);
                              setRequesterQuery("");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-black/5"
                          >
                            {u.name} ({u.role}, {u.department?.name ?? "no department"})
                          </button>
                        </li>
                      ))}
                    </ul>
                  ))}
              </>
            )}
          </div>
        )}

        <Button type="submit" variant="primary" disabled={submitting || !leafCategoryId}>
          {submitting ? "Creating..." : "Create ticket"}
        </Button>
      </Card>
    </div>
  );
}
