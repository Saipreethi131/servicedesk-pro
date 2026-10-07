import { useEffect, useState } from "react";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Notice from "../components/Notice.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";

// Replaces one category (top-level or a direct child - the tree is only ever two levels) by id, anywhere in the tree.
const updateCategoryInTree = (categories, id, patch) =>
  categories.map((top) =>
    top._id === id
      ? { ...top, ...patch }
      : { ...top, children: top.children.map((c) => (c._id === id ? { ...c, ...patch } : c)) }
  );

const byName = (a, b) => a.name.localeCompare(b.name);

// Module scope (not nested inside Categories): a component declared per-render would get a new identity every time
// its parent re-renders, so React would remount it - including the rename <input>, which would lose focus on
// every keystroke once typing updated state. Everything it needs comes in as props instead of closures.
function CategoryRow({
  category,
  isRenaming,
  renameValue,
  onRenameValueChange,
  renameSubmitting,
  onSubmitRename,
  onStartRename,
  onCancelRename,
  busy,
  onToggle,
  blockedReason,
}) {
  const action = category.isActive ? "Deactivate" : "Activate";

  if (isRenaming) {
    return (
      <form onSubmit={onSubmitRename} className="flex flex-wrap items-center gap-2">
        <input
          required
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameValueChange(e.target.value)}
          aria-label={`New name for ${category.name}`}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <Button type="submit" variant="primary" disabled={renameSubmitting}>
          {renameSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelRename} disabled={renameSubmitting}>
          Cancel
        </Button>
        {/* The toggle button stays visible but disabled during rename (see blockedReason below), so it needs its reason too. */}
        <span id={`cat-blocked-${category._id}`} className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {blockedReason}
        </span>
        <Button
          type="button"
          variant={category.isActive ? "danger" : "secondary"}
          disabled
          aria-label={`${action} ${category.name}`}
          aria-describedby={`cat-blocked-${category._id}`}
        >
          {action}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
        {category.name}
      </span>
      {!category.isActive && <Badge variant="active" value={false} />}
      <Button type="button" variant="secondary" onClick={onStartRename} aria-label={`Rename ${category.name}`}>
        Rename
      </Button>
      {blockedReason && (
        <span id={`cat-blocked-${category._id}`} className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {blockedReason}
        </span>
      )}
      <Button
        type="button"
        variant={category.isActive ? "danger" : "secondary"}
        onClick={onToggle}
        disabled={Boolean(blockedReason) || busy}
        aria-label={`${action} ${category.name}`}
        aria-describedby={blockedReason ? `cat-blocked-${category._id}` : undefined}
      >
        {busy ? "Updating..." : action}
      </Button>
    </div>
  );
}

export default function Categories() {
  useDocumentTitle("Categories");
  const [categories, setCategories] = useState(null); // null = still loading; top-level items carry a children array
  const [loadError, setLoadError] = useState(null);

  const [topName, setTopName] = useState("");
  const [addTopError, setAddTopError] = useState(null);
  const [addTopSubmitting, setAddTopSubmitting] = useState(false);

  const [childName, setChildName] = useState("");
  const [childParentId, setChildParentId] = useState("");
  const [addChildError, setAddChildError] = useState(null);
  const [addChildSubmitting, setAddChildSubmitting] = useState(false);

  // Only one category can be renamed at a time, so one slot covers the whole tree (mirrors Users.jsx's busyId).
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState(null);
  const [renameSubmitting, setRenameSubmitting] = useState(false);

  const [busyId, setBusyId] = useState(null); // the category whose activate/deactivate request is in flight
  const [toggleError, setToggleError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let ignore = false; // StrictMode runs this twice in dev; only the last run may set state
    request("/categories?includeInactive=true")
      .then(({ data }) => !ignore && setCategories(data.categories))
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, []);

  const handleAddTop = async (event) => {
    event.preventDefault();
    setAddTopError(null);
    setNotice(null);
    setAddTopSubmitting(true);
    try {
      const { data } = await request("/categories", { method: "POST", body: { name: topName } });
      setCategories((current) =>
        [
          ...current,
          { _id: data.category._id, name: data.category.name, isActive: data.category.isActive, children: [] },
        ].sort(byName)
      );
      setNotice(`Added "${data.category.name}"`);
      setTopName("");
    } catch (err) {
      setAddTopError(err); // 409 duplicate, 422 bad length...: the server's own wording
    } finally {
      setAddTopSubmitting(false);
    }
  };

  const handleAddChild = async (event) => {
    event.preventDefault();
    setAddChildError(null);
    setNotice(null);
    setAddChildSubmitting(true);
    try {
      const { data } = await request("/categories", {
        method: "POST",
        body: { name: childName, parent: childParentId },
      });
      setCategories((current) =>
        current.map((top) =>
          top._id === childParentId
            ? {
                ...top,
                children: [
                  ...top.children,
                  { _id: data.category._id, name: data.category.name, isActive: data.category.isActive },
                ].sort(byName),
              }
            : top
        )
      );
      setNotice(`Added "${data.category.name}"`);
      setChildName("");
    } catch (err) {
      setAddChildError(err); // 409 duplicate, 422 bad length, 400/422 bad or inactive parent...: the server's own wording
    } finally {
      setAddChildSubmitting(false);
    }
  };

  const startRename = (category) => {
    setRenameError(null);
    setRenamingId(category._id);
    setRenameValue(category.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
  };

  const submitRename = async (event, category) => {
    event.preventDefault();
    setRenameError(null);
    setNotice(null);
    setRenameSubmitting(true);
    try {
      const { data } = await request(`/categories/${category._id}`, {
        method: "PATCH",
        body: { name: renameValue },
      });
      setCategories((current) => updateCategoryInTree(current, category._id, { name: data.category.name }));
      setNotice(`Renamed to "${data.category.name}"`);
      setRenamingId(null);
      setRenameValue("");
    } catch (err) {
      setRenameError(err); // 409 duplicate sibling name, 422 bad length...: the server's own wording
    } finally {
      setRenameSubmitting(false);
    }
  };

  // UI hint only; mirrors the pattern in Users.jsx. The server has no permission rule to hint at here (this whole
  // page is SYSTEM_ADMIN only), so the one real reason is a race with this category's own pending rename.
  const toggleBlockedReason = (category) => (renamingId === category._id ? "Finish renaming first" : null);

  const toggleActive = async (category) => {
    setBusyId(category._id);
    setToggleError(null);
    setNotice(null);
    try {
      const { data } = await request(`/categories/${category._id}`, {
        method: "PATCH",
        body: { isActive: !category.isActive },
      });
      setCategories((current) => updateCategoryInTree(current, category._id, { isActive: data.category.isActive }));
      setNotice(`${data.category.name} is now ${data.category.isActive ? "active" : "inactive"}`);
    } catch (err) {
      setToggleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const rowProps = (category) => ({
    category,
    isRenaming: renamingId === category._id,
    renameValue,
    onRenameValueChange: setRenameValue,
    renameSubmitting,
    onSubmitRename: (e) => submitRename(e, category),
    onStartRename: () => startRename(category),
    onCancelRename: cancelRename,
    busy: busyId === category._id,
    onToggle: () => toggleActive(category),
    blockedReason: toggleBlockedReason(category),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card as="form" onSubmit={handleAddTop} title="Add a top-level category" className="space-y-3">
          <ErrorBanner error={addTopError} focusOnShow />
          <label className="block text-sm">
            <span>Name (2-60 characters)</span>
            <input
              required
              value={topName}
              onChange={(e) => setTopName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
            />
          </label>
          <Button type="submit" variant="primary" disabled={addTopSubmitting}>
            {addTopSubmitting ? "Adding..." : "Add category"}
          </Button>
        </Card>

        <Card as="form" onSubmit={handleAddChild} title="Add a subcategory" className="space-y-3">
          <ErrorBanner error={addChildError} focusOnShow />
          <label className="block text-sm">
            <span>Parent category</span>
            <select
              required
              value={childParentId}
              onChange={(e) => setChildParentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
            >
              {/* A top-level category can be inactive and still exist to pick - the server refuses an inactive parent (422). */}
              <option value="">Select a top-level category</option>
              {categories?.map((top) => (
                <option key={top._id} value={top._id}>
                  {top.name}
                  {!top.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>Name (2-60 characters)</span>
            <input
              required
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={addChildSubmitting || !categories || categories.length === 0}
          >
            {addChildSubmitting ? "Adding..." : "Add subcategory"}
          </Button>
        </Card>
      </div>

      <ErrorBanner error={loadError} />
      <ErrorBanner error={toggleError} focusOnShow />
      <ErrorBanner error={renameError} focusOnShow />
      <Notice message={notice} />

      {!loadError && categories === null && (
        <p role="status" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading...
        </p>
      )}
      {categories?.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No categories yet.
        </p>
      )}

      <div className="space-y-4">
        {categories?.map((top) => (
          <Card key={top._id}>
            <CategoryRow {...rowProps(top)} />

            {top.children.length > 0 ? (
              <ul className="mt-3 ml-4 space-y-3 border-l pl-4" style={{ borderColor: "var(--color-border)" }}>
                {top.children.map((child) => (
                  <li key={child._id}>
                    <CategoryRow {...rowProps(child)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 ml-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                No subcategories.
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
