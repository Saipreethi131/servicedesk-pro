import { Button } from "./ui/index.js";

// "Page 2 of 5 · 93 users" with Previous / Next. Both buttons work from `result.page` (what is on screen), not from the page
// last requested, which differs after a failed fetch. `onPage(n)` must always refetch, even for the page already requested.
export default function Pagination({ result, loading, noun, onPage }) {
  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm">
      <span className="text-muted">
        Page {result.page} of {totalPages} &middot; {result.total} {result.total === 1 ? noun : `${noun}s`}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => onPage(result.page - 1)} disabled={result.page <= 1 || loading}>
          Previous
        </Button>
        <Button type="button" variant="secondary" onClick={() => onPage(result.page + 1)} disabled={result.page >= totalPages || loading}>
          Next
        </Button>
      </div>
    </nav>
  );
}
