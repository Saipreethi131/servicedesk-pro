import { useState } from "react";
import { roleLabel, priorityLabel } from "../../lib/labels.js";
import ErrorBanner from "../ErrorBanner.jsx";
import { Button, Dialog, DialogClose, DialogContent, Input, Select } from "../ui/index.js";

// Managers pick who to assign. The list is the server's own (assignable-users) and the transition request is the same as
// before: { toStatus: "ASSIGNED", assigneeId }; the server still validates the chosen id.
export function AssignDialog({ open, onOpenChange, assignable, assignableError, submitting, error, onConfirm }) {
  const [selected, setSelected] = useState("");

  const handleOpenChange = (next) => {
    if (!next) setSelected("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Assign ticket"
        description="Choose who should work on this ticket."
        footer={
          <>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" form="assign-form" variant="primary" loading={submitting} disabled={!selected}>
              {submitting ? "Assigning..." : "Assign"}
            </Button>
          </>
        }
      >
        <form
          id="assign-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) onConfirm(selected);
          }}
        >
          <ErrorBanner error={error} focusOnShow />
          {assignableError ? (
            <ErrorBanner error={assignableError} />
          ) : assignable === null ? (
            <p role="status" className="text-muted">
              Loading assignees...
            </p>
          ) : assignable.length === 0 ? (
            <p className="text-muted">No eligible assignees in this department</p>
          ) : (
            <Select
              label="Assignee"
              value={selected}
              onValueChange={setSelected}
              placeholder="Select an assignee..."
              options={assignable.map((u) => ({ value: u._id, label: `${u.name} (${roleLabel(u.role)})` }))}
            />
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// The priority override keeps its flow: a new value and a required reason, posted to /priority-override as before.
// `onSubmit({ value, reason })` resolves true when it worked, which closes the dialog.
export function OverrideDialog({ open, onOpenChange, priorities, submitting, error, onSubmit }) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const handleOpenChange = (next) => {
    if (!next) {
      setValue("");
      setReason("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (await onSubmit({ value, reason })) handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Change priority"
        description="The derived priority is kept. Your change and reason are logged on the ticket."
        footer={
          <>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" form="override-form" variant="primary" loading={submitting}>
              {submitting ? "Saving..." : "Override priority"}
            </Button>
          </>
        }
      >
        <form id="override-form" onSubmit={handleSubmit} className="space-y-3">
          <ErrorBanner error={error} focusOnShow />
          <Select
            label="New priority"
            required
            value={value}
            onValueChange={setValue}
            placeholder="Select"
            options={priorities.map((p) => ({ value: p, label: priorityLabel(p) }))}
          />
          <Input label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
