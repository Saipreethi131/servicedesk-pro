import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, FolderTree, MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";
import { request } from "../api.js";
import useDocumentTitle from "../useDocumentTitle.js";
import { cn } from "../lib/cn.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Select,
  Skeleton,
  toast,
} from "../components/ui/index.js";

// Replaces one category (top-level or a direct child - the tree is only ever two levels) by id, anywhere in the tree.
const updateCategoryInTree = (categories, id, patch) =>
  categories.map((top) =>
    top._id === id
      ? { ...top, ...patch }
      : { ...top, children: top.children.map((c) => (c._id === id ? { ...c, ...patch } : c)) }
  );

const byName = (a, b) => a.name.localeCompare(b.name);

// The "..." button of a row and its menu: Rename, and Deactivate (or Activate for an inactive one). Dim on desktop until the row
// is hovered or something inside it has focus, but always in the layout and the tab order, so keyboard users never lose it;
// on small screens it is fully visible.
function RowActions({ category, renaming, busy, onRename, onDeactivate, onActivate, suppressRefocus }) {
  return (
    // modal={false}: a small row menu does not need to hide the rest of the page from assistive technology (the default modal menu
    // does, which leaves focusable controls inside an aria-hidden region). It still closes on Esc and on an outside click, and
    // focus goes back to the button.
    <Dropdown modal={false}>
      <DropdownTrigger asChild>
        <IconButton
          label={`Actions for ${category.name}`}
          icon={MoreHorizontal}
          size="sm"
          tooltip={false}
          data-actions={category._id}
          className="shrink-0 md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100 data-[state=open]:opacity-100"
        />
      </DropdownTrigger>
      <DropdownContent
        // Choosing Rename moves focus into the rename field. Without this, Radix would then send focus back to this button.
        onCloseAutoFocus={(event) => {
          if (suppressRefocus.current) {
            event.preventDefault();
            suppressRefocus.current = false;
          }
        }}
      >
        {renaming ? (
          <DropdownItem disabled>Finish renaming first</DropdownItem>
        ) : (
          <>
            <DropdownItem
              icon={Pencil}
              onSelect={() => {
                suppressRefocus.current = true;
                onRename();
              }}
            >
              Rename
            </DropdownItem>
            <DropdownSeparator />
            {category.isActive ? (
              <DropdownItem icon={PowerOff} destructive disabled={busy} onSelect={onDeactivate}>
                Deactivate
              </DropdownItem>
            ) : (
              <DropdownItem icon={Power} disabled={busy} onSelect={onActivate}>
                Activate
              </DropdownItem>
            )}
          </>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

// Module scope (not nested inside Categories): a component declared per-render would get a new identity every time
// its parent re-renders, so React would remount it - including the rename <input>, which would lose focus on
// every keystroke once typing updated state. Everything it needs comes in as props instead of closures.
function NameOrRename({ category, isRenaming, renameValue, onRenameValueChange, renameSubmitting, onSubmitRename, onCancelRename, className }) {
  if (!isRenaming) {
    return (
      <>
        <span className={cn("min-w-0 truncate", className, !category.isActive && "text-muted-strong")}>{category.name}</span>
        {!category.isActive && <Badge>Inactive</Badge>}
      </>
    );
  }
  return (
    <form onSubmit={onSubmitRename} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        required
        autoFocus
        value={renameValue}
        onChange={(e) => onRenameValueChange(e.target.value)}
        aria-label={`New name for ${category.name}`}
        wrapperClassName="min-w-0 flex-1"
        className="w-full min-w-40"
      />
      <Button type="submit" size="sm" variant="primary" loading={renameSubmitting}>
        {renameSubmitting ? "Saving..." : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancelRename} disabled={renameSubmitting}>
        Cancel
      </Button>
    </form>
  );
}

function ParentHeader({ category, childCount, expanded, onToggleExpand, rowProps, actionProps }) {
  return (
    <div className="group flex min-h-9 items-center gap-2">
      <IconButton
        label={`${expanded ? "Collapse" : "Expand"} ${category.name}`}
        icon={expanded ? ChevronDown : ChevronRight}
        size="sm"
        tooltip={false}
        aria-expanded={expanded}
        aria-controls={`children-${category._id}`}
        onClick={onToggleExpand}
        className="shrink-0"
      />
      <NameOrRename {...rowProps} className="text-[15px] font-semibold text-fg" />
      {!rowProps.isRenaming && (
        <Badge className="shrink-0">
          {childCount}
          <span className="sr-only sm:not-sr-only">{childCount === 1 ? " subcategory" : " subcategories"}</span>
        </Badge>
      )}
      <span className="ml-auto" />
      <RowActions {...actionProps} />
    </div>
  );
}

// A child sits under its parent with a small tree connector: a vertical line down the left (cut short at the last child) and a
// short horizontal tick into the row.
function ChildRow({ category, rowProps, actionProps }) {
  return (
    <li
      className={cn(
        "relative -mr-2 pl-6 before:absolute before:top-0 before:left-0 before:h-full before:w-px before:bg-border last:before:h-1/2",
        "after:absolute after:top-1/2 after:left-0 after:h-px after:w-4 after:bg-border"
      )}
    >
      <div className="group flex min-h-9 items-center gap-2 rounded-md pr-2 pl-2 hover:bg-subtle">
        <NameOrRename {...rowProps} className="text-sm text-fg" />
        <span className="ml-auto" />
        <RowActions {...actionProps} />
      </div>
    </li>
  );
}

export default function Categories() {
  useDocumentTitle("Categories");
  const [categories, setCategories] = useState(null); // null = still loading; top-level items carry a children array
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [collapsed, setCollapsed] = useState(() => new Set()); // ids of parents folded shut; everything starts expanded

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
  const suppressRefocus = useRef(false); // see RowActions
  const lastRenamedId = useRef(null); // to put focus back on that row's actions button when the rename form goes away

  const [busyId, setBusyId] = useState(null); // the category whose activate/deactivate request is in flight
  const [toggleError, setToggleError] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null); // the category the confirm dialog is about (kept while it animates out)
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let ignore = false; // StrictMode runs this twice in dev; only the last run may set state
    request("/categories?includeInactive=true")
      .then(({ data }) => {
        if (ignore) return;
        setCategories(data.categories);
        setLoadError(null);
      })
      .catch((err) => !ignore && setLoadError(err));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // When the rename form closes (saved or cancelled), keyboard focus returns to the row it came from instead of the page top.
  useEffect(() => {
    if (renamingId !== null || !lastRenamedId.current) return;
    const id = lastRenamedId.current;
    lastRenamedId.current = null;
    requestAnimationFrame(() => document.querySelector(`[data-actions="${id}"]`)?.focus());
  }, [renamingId]);

  const handleAddTop = async (event) => {
    event.preventDefault();
    setAddTopError(null);
    setAddTopSubmitting(true);
    try {
      const { data } = await request("/categories", { method: "POST", body: { name: topName } });
      setCategories((current) =>
        [
          ...current,
          { _id: data.category._id, name: data.category.name, isActive: data.category.isActive, children: [] },
        ].sort(byName)
      );
      toast.success(`Added "${data.category.name}"`);
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
      // A parent folded shut would hide the row that was just added.
      setCollapsed((current) => {
        if (!current.has(childParentId)) return current;
        const next = new Set(current);
        next.delete(childParentId);
        return next;
      });
      toast.success(`Added "${data.category.name}"`);
      setChildName("");
    } catch (err) {
      setAddChildError(err); // 409 duplicate, 422 bad length, 400/422 bad or inactive parent...: the server's own wording
    } finally {
      setAddChildSubmitting(false);
    }
  };

  const startRename = (category) => {
    setRenameError(null);
    lastRenamedId.current = category._id;
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
    setRenameSubmitting(true);
    try {
      const { data } = await request(`/categories/${category._id}`, {
        method: "PATCH",
        body: { name: renameValue },
      });
      setCategories((current) => updateCategoryInTree(current, category._id, { name: data.category.name }));
      toast.success(`Renamed to "${data.category.name}"`);
      setRenamingId(null);
      setRenameValue("");
    } catch (err) {
      setRenameError(err); // 409 duplicate sibling name, 422 bad length...: the server's own wording
    } finally {
      setRenameSubmitting(false);
    }
  };

  // The same request as ever, for both directions. Deactivating now goes through a confirm dialog first (see below).
  const toggleActive = async (category) => {
    setBusyId(category._id);
    setToggleError(null);
    try {
      const { data } = await request(`/categories/${category._id}`, {
        method: "PATCH",
        body: { isActive: !category.isActive },
      });
      setCategories((current) => updateCategoryInTree(current, category._id, { isActive: data.category.isActive }));
      toast.success(`${data.category.name} is now ${data.category.isActive ? "active" : "inactive"}`);
    } catch (err) {
      setToggleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const confirmAndDeactivate = async () => {
    await toggleActive(confirmDeactivate);
    setConfirmOpen(false);
  };

  const toggleExpanded = (id) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rowProps = (category) => ({
    category,
    isRenaming: renamingId === category._id,
    renameValue,
    onRenameValueChange: setRenameValue,
    renameSubmitting,
    onSubmitRename: (e) => submitRename(e, category),
    onCancelRename: cancelRename,
  });
  const actionProps = (category) => ({
    category,
    renaming: renamingId === category._id,
    busy: busyId === category._id,
    onRename: () => startRename(category),
    onDeactivate: () => {
      setConfirmDeactivate(category);
      setConfirmOpen(true);
    },
    onActivate: () => toggleActive(category),
    suppressRefocus,
  });

  const retry = () => {
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="max-w-[880px] space-y-4">
      <PageHeader title="Categories" description="Top-level categories and the subcategories people choose when raising a ticket." />

      <Card title="Add a category" className="space-y-5">
        <div className="space-y-2">
          <ErrorBanner error={addTopError} focusOnShow />
          <form onSubmit={handleAddTop} aria-label="Add a top-level category" className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input label="Top-level category name (2-60 characters)" required value={topName} onChange={(e) => setTopName(e.target.value)} />
            <Button type="submit" variant="primary" loading={addTopSubmitting}>
              {addTopSubmitting ? "Adding..." : "Add category"}
            </Button>
          </form>
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <ErrorBanner error={addChildError} focusOnShow />
          <form
            onSubmit={handleAddChild}
            aria-label="Add a subcategory"
            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <Select
              label="Parent category"
              required
              value={childParentId}
              onValueChange={setChildParentId}
              placeholder="Select a top-level category"
              // A top-level category can be inactive and still exist to pick - the server refuses an inactive parent (422).
              options={(categories ?? []).map((top) => ({ value: top._id, label: `${top.name}${top.isActive ? "" : " (inactive)"}` }))}
            />
            <Input label="Subcategory name (2-60 characters)" required value={childName} onChange={(e) => setChildName(e.target.value)} />
            <Button
              type="submit"
              variant="primary"
              loading={addChildSubmitting}
              disabled={!categories || categories.length === 0 || !childParentId}
            >
              {addChildSubmitting ? "Adding..." : "Add subcategory"}
            </Button>
          </form>
        </div>
      </Card>

      <ErrorBanner error={toggleError} focusOnShow />
      <ErrorBanner error={renameError} focusOnShow />

      {loadError ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Could not load categories"
            description={loadError.message}
            action={
              <Button type="button" variant="secondary" onClick={retry}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : categories === null ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Loading categories</span>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-3 ml-6 h-5 w-1/4" />
              <Skeleton className="mt-2 ml-6 h-5 w-1/5" />
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState icon={FolderTree} title="No categories yet" description="Add a top-level category above to get started." />
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((top) => {
            const expanded = !collapsed.has(top._id);
            return (
              <Card key={top._id} className="!py-3">
                <ParentHeader
                  category={top}
                  childCount={top.children.length}
                  expanded={expanded}
                  onToggleExpand={() => toggleExpanded(top._id)}
                  rowProps={rowProps(top)}
                  actionProps={actionProps(top)}
                />

                {expanded && (
                  <div id={`children-${top._id}`} className="mt-1 ml-3.5">
                    {top.children.length > 0 ? (
                      <ul>
                        {top.children.map((child) => (
                          <ChildRow key={child._id} category={child} rowProps={rowProps(child)} actionProps={actionProps(child)} />
                        ))}
                      </ul>
                    ) : (
                      <p className="py-1.5 pl-6 text-13 text-muted">No subcategories.</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Deactivating used to happen at once; it now asks first, because it takes the category out of the ticket form. */}
      <Dialog open={confirmOpen} onOpenChange={(open) => !(busyId && !open) && setConfirmOpen(open)}>
        <DialogContent
          // The dialog opens from a menu item that closes with it, so focus goes back to that row's "..." button.
          returnFocusTo={() => document.querySelector(`[data-actions="${confirmDeactivate?._id}"]`)}
          title={`Deactivate "${confirmDeactivate?.name ?? ""}"?`}
          description="It will no longer be offered when someone raises a ticket. Tickets that already use it keep it, and you can activate it again at any time."
          footer={
            <>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={Boolean(busyId)}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" variant="danger" loading={Boolean(busyId)} onClick={confirmAndDeactivate}>
                Deactivate
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}
