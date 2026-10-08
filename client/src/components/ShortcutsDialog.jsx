import { Dialog, DialogContent, Kbd } from "./ui/index.js";
import { SHORTCUTS } from "../lib/shortcuts.js";

export default function ShortcutsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Keyboard shortcuts" description="Single-key shortcuts are off while you type in a field.">
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <li key={s.keys.join("+")} className="flex items-center justify-between gap-4 py-2">
              <span>{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) =>
                  k === "then" ? (
                    <span key={i} className="px-0.5 text-xs text-muted">
                      then
                    </span>
                  ) : (
                    <Kbd key={i}>{k}</Kbd>
                  )
                )}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
