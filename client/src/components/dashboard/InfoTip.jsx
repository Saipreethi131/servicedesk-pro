import { Info } from "lucide-react";
import { Tooltip } from "../ui/index.js";

// The "(i)" next to a derived number. The text says where the number comes from. 24px target, reachable by keyboard.
export default function InfoTip({ children, label = "About this number" }) {
  return (
    <Tooltip content={children}>
      <button type="button" aria-label={label} className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:text-fg">
        <Info size={13} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

// The wording used everywhere. `loaded < total` means the list was cut off, so the figure covers only the newest tickets.
export const derivedNote = ({ loaded, total }) =>
  loaded < total
    ? `Calculated from tickets you can see, based on the last ${loaded} of ${total} tickets.`
    : "Calculated from tickets you can see.";
