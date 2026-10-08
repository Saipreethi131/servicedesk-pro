import { Card, EmptyState } from "../ui/index.js";
import InfoTip from "./InfoTip.jsx";

// Horizontal bars as a list: label, count, and a bar scaled to the biggest row. The count is printed, so the bar is a
// helper for comparing, not the only carrier of the number.
export default function BarList({ title, items, info, emptyText }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <Card title={title} action={info && <InfoTip>{info}</InfoTip>}>
      {items.length === 0 ? (
        <EmptyState title={emptyText} className="py-6" />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-3 text-13">
                <span className="truncate text-fg">{item.label}</span>
                <span className="font-medium text-fg">{item.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
