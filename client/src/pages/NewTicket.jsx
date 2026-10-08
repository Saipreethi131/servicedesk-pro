import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { request } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ROLES } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";
import { MOD_KEY } from "../lib/shortcuts.js";
import { priorityLabel } from "../lib/labels.js";
import useUnsavedChangesWarning from "../lib/useUnsavedChangesWarning.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import SegmentedChoice from "../components/tickets/SegmentedChoice.jsx";
import WhatHappensNext from "../components/tickets/WhatHappensNext.jsx";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  Input,
  Kbd,
  PageHeader,
  PriorityIcon,
  Select,
  Textarea,
  toast,
} from "../components/ui/index.js";

const REQUESTER_MIN_CHARS = 2;
const REQUESTER_DEBOUNCE_MS = 300;

// The server's own limits (ticket model): the client only mirrors them to explain a problem before the round trip.
const TITLE_MIN = 5;
const TITLE_MAX = 200;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 5000;

// One-line help for each level, shown on the Impact / Urgency cards. Wording only; the priority itself always comes from the
// server's matrix (see previewPriority). A value the server adds later simply has no description.
const IMPACT_HELP = {
  LOW: "Only affects you, or a small task",
  MEDIUM: "Affects you and your team",
  HIGH: "Affects a whole department or many people",
};
const URGENCY_HELP = {
  LOW: "Can wait, no deadline",
  MEDIUM: "Needed within the next few days",
  HIGH: "Blocking work right now",
};

// The values arrive in the server's order. priorityLabel is only a sentence-caser ("HIGH" -> "High"), reused for these levels.
const toOptions = (values, help) => values?.map((value) => ({ value, label: priorityLabel(value), description: help[value] })) ?? null;

const PREVIEW_TONE = { CRITICAL: "danger", HIGH: "warning" };

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

  const [touched, setTouched] = useState({}); // fields the user has left (or changed); their errors are shown
  const [attempted, setAttempted] = useState(false); // a submit was tried: every error is shown
  const [focusTick, setFocusTick] = useState(0); // bumped on a failed submit, to move focus to the first problem
  const [confirmLeave, setConfirmLeave] = useState(false);

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
    touch("category");
  };

  // Client-side preview only, read from the matrix the server sent (D5.1: PRIORITY_MATRIX, served by /reference), so the table
  // is not copied here. The server still derives the authoritative priority on submit; this never travels in the request body.
  const previewPriority = impact && urgency ? reference?.matrix?.[impact]?.[urgency] : null;

  // ---- Validation: the same rules the server enforces (length limits, required category/impact/urgency), phrased for people.
  const errors = {};
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  if (!cleanTitle) errors.title = "Enter a title";
  else if (cleanTitle.length < TITLE_MIN) errors.title = `Title must be at least ${TITLE_MIN} characters`;
  else if (cleanTitle.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
  if (!cleanDescription) errors.description = "Describe the problem";
  else if (cleanDescription.length < DESCRIPTION_MIN) errors.description = `Description must be at least ${DESCRIPTION_MIN} characters`;
  else if (cleanDescription.length > DESCRIPTION_MAX) errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer`;
  if (!topCategoryId) errors.category = "Choose a category";
  else if (hasChildren && !childCategoryId) errors.subcategory = "Choose a subcategory";
  if (!impact) errors.impact = "Choose an impact";
  if (!urgency) errors.urgency = "Choose an urgency";

  const touch = (field) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const shown = (field) => (touched[field] || attempted ? errors[field] : undefined);

  // Text fields validate when the user leaves them; the pickers have no meaningful "leave", so they validate on change.
  const blurProps = (field) => ({ onBlur: () => touch(field) });

  // After a failed submit, focus the first field that is showing an error.
  useEffect(() => {
    if (focusTick === 0) return;
    // Only elements that can take focus: text fields, the select triggers (buttons), and the first card of an invalid group.
    document
      .querySelector(
        'form input[aria-invalid="true"], form textarea[aria-invalid="true"], form button[aria-invalid="true"], ' +
          'form [role="radiogroup"][aria-invalid="true"] [role="radio"]'
      )
      ?.focus();
  }, [focusTick]);

  const dirty = Boolean(title || description || topCategoryId || impact || urgency || requester);
  useUnsavedChangesWarning(dirty && !submitting);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length > 0) {
      setFocusTick((n) => n + 1);
      return;
    }
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
      toast.success(`TKT-${data.ticket.ticketNumber} created`);
      navigate(`/tickets/${data.ticket._id}`, { replace: true });
    } catch (err) {
      setError(err); // 400/422 field errors, 403, 404 category...: the server's own wording
      setSubmitting(false);
    }
  };

  // Ctrl/Cmd+Enter from any field submits, through the form's own submit handler (so validation and the guard apply).
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!submitting) event.currentTarget.requestSubmit();
    }
  };

  const cancel = () => (dirty ? setConfirmLeave(true) : navigate("/tickets"));

  const categoriesLoaded = categories !== null;
  const noCategories = categoriesLoaded && categories.length === 0;

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,720px)_18rem] lg:justify-center">
      <div className="min-w-0">
        <PageHeader title="New ticket" description="Tell us what is wrong and we will route it to the right team." />

        <Card as="form" noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
          <ErrorBanner error={error} focusOnShow />
          <ErrorBanner error={categoriesError} />
          <ErrorBanner error={referenceError} />

          <Input
            label="Title"
            hint={`${cleanTitle.length}/${TITLE_MAX}`}
            error={shown("title")}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            {...blurProps("title")}
          />

          <Textarea
            label="Description"
            hint={`${cleanDescription.length}/${DESCRIPTION_MAX}`}
            error={shown("description")}
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            {...blurProps("description")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              required
              value={topCategoryId}
              onValueChange={handleTopChange}
              disabled={!categoriesLoaded || noCategories}
              placeholder={categoriesLoaded ? "Select a category" : "Loading..."}
              options={(categories ?? []).map((c) => ({ value: c._id, label: c.name }))}
              error={shown("category")}
            />
            {/* Cascading: waits for a parent; absent when the parent is itself a leaf (no children). */}
            {(!topCategoryId || hasChildren) && (
              <Select
                label="Subcategory"
                required
                value={childCategoryId}
                onValueChange={(value) => {
                  setChildCategoryId(value);
                  touch("subcategory");
                }}
                disabled={!hasChildren}
                placeholder={hasChildren ? "Select a subcategory" : "Choose a category first"}
                options={(selectedTop?.children ?? []).map((c) => ({ value: c._id, label: c.name }))}
                error={shown("subcategory")}
              />
            )}
          </div>
          {noCategories && (
            <p className="text-13 text-muted">No categories exist yet. An administrator needs to add one before a ticket can be filed.</p>
          )}

          <SegmentedChoice
            label="Impact"
            options={toOptions(reference?.impacts, IMPACT_HELP)}
            value={impact}
            onChange={(v) => {
              setImpact(v);
              touch("impact");
            }}
            error={shown("impact")}
          />
          <SegmentedChoice
            label="Urgency"
            options={toOptions(reference?.urgencies, URGENCY_HELP)}
            value={urgency}
            onChange={(v) => {
              setUrgency(v);
              touch("urgency");
            }}
            error={shown("urgency")}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-subtle px-3 py-2" aria-live="polite">
            <span className="text-13 font-medium text-fg">Priority</span>
            {previewPriority ? (
              <Badge tone={PREVIEW_TONE[previewPriority] ?? "neutral"} icon={<PriorityIcon priority={previewPriority} size={12} />}>
                {priorityLabel(previewPriority)}
              </Badge>
            ) : (
              <span className="text-13 text-muted-strong">Choose an impact and an urgency to see it</span>
            )}
            <span className="ml-auto text-xs text-muted-strong">Set from impact and urgency</span>
          </div>

          {canFileForSomeoneElse && (
            <div className="text-sm">
              <p className="mb-1.5 text-13 font-medium text-fg">File on behalf of</p>
              {requester ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    {requester.name} ({requester.role}, {requester.department?.name ?? "no department"})
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRequester(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={requesterQuery}
                    onChange={(e) => setRequesterQuery(e.target.value)}
                    placeholder="Myself - or type a name to search"
                    aria-label="Search for a requester"
                  />
                  <ErrorBanner error={requesterError} />
                  {requesterResults &&
                    (requesterResults.length === 0 ? (
                      <p className="mt-1.5 text-13 text-muted">No matching users</p>
                    ) : (
                      <ul className="mt-1.5 divide-y divide-border rounded-md border border-border">
                        {requesterResults.map((u) => (
                          <li key={u._id}>
                            <button
                              type="button"
                              onClick={() => {
                                setRequester(u);
                                setRequesterQuery("");
                              }}
                              className="w-full px-3 py-2 text-left text-13 hover:bg-subtle"
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

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            <span className="mr-auto hidden items-center gap-1 text-xs text-muted sm:flex">
              <Kbd>{MOD_KEY}</Kbd>
              <Kbd>&crarr;</Kbd> to create
            </span>
            <Button type="button" variant="secondary" onClick={cancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {submitting ? "Creating..." : "Create ticket"}
            </Button>
          </div>
        </Card>
      </div>

      <div className="min-w-0 lg:sticky lg:top-16">
        <WhatHappensNext />
      </div>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent
          title="Discard this ticket?"
          description="You have not created it yet. If you leave now, what you typed is lost."
          footer={
            <>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Keep editing
                </Button>
              </DialogClose>
              <Button type="button" variant="danger" onClick={() => navigate("/tickets")}>
                Discard
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}
