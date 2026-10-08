import { useState } from "react";
import { Lock, MessageSquare } from "lucide-react";
import { MOD_KEY } from "../../lib/shortcuts.js";
import { cn } from "../../lib/cn.js";
import ErrorBanner from "../ErrorBanner.jsx";
import { Button, Kbd, Textarea } from "../ui/index.js";

function Segment({ active, icon: Icon, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-13 font-medium transition-colors duration-[120ms]",
        active ? "bg-surface text-fg shadow-[0_0_0_1px_var(--border)]" : "text-muted-strong hover:text-fg"
      )}
      {...props}
    >
      <Icon size={13} aria-hidden="true" />
      {children}
    </button>
  );
}

// `onSubmit({ body, isInternal })` is the page's existing comment call; it resolves true on success. The Public / Internal
// toggle is only rendered when `canMarkInternal` (the same staff check the old page used); the server re-checks it.
export default function CommentComposer({ canMarkInternal, onSubmit, submitting, error }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await onSubmit({ body: body.trim(), isInternal });
    if (ok) {
      setBody("");
      setIsInternal(false);
    }
  };

  // Ctrl/Cmd+Enter submits. requestSubmit() goes through the form's own validation and submit handler, so it is exactly a
  // click on the button, and the disabled-while-sending guard applies.
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!submitting) event.currentTarget.form.requestSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <ErrorBanner error={error} focusOnShow />
      <Textarea
        label="Add a comment"
        wrapperClassName="[&>label]:sr-only"
        required
        rows={3}
        placeholder={isInternal ? "Write an internal note (staff only)..." : "Write a comment..."}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={submitting}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canMarkInternal ? (
          <div role="group" aria-label="Visibility" className="inline-flex gap-0.5 rounded-md bg-subtle p-0.5">
            <Segment active={!isInternal} icon={MessageSquare} onClick={() => setIsInternal(false)}>
              Public
            </Segment>
            <Segment active={isInternal} icon={Lock} onClick={() => setIsInternal(true)}>
              Internal
            </Segment>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
            <Kbd>{MOD_KEY}</Kbd>
            <Kbd>&crarr;</Kbd> to send
          </span>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
