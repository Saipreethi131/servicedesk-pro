import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "../../lib/cn.js";
import { initials } from "../../lib/labels.js";

// Initials in a soft coloured circle (or the image, if `src` loads). The colour comes from the name, so the same person always
// gets the same colour. Text and background are a soft/ink pair, so every colour is readable. The name is the accessible name.
const TONES = [
  "bg-accent-soft text-accent-ink",
  "bg-success-soft text-success-ink",
  "bg-warning-soft text-warning-ink",
  "bg-danger-soft text-danger-ink",
  "bg-info-soft text-info-ink",
  "bg-subtle text-muted-strong",
];

const SIZES = {
  20: "size-5 text-[10px]",
  24: "size-6 text-xs",
  32: "size-8 text-13",
};

const toneFor = (name) => {
  let sum = 0;
  for (const char of String(name ?? "")) sum += char.charCodeAt(0);
  return TONES[sum % TONES.length];
};

export default function Avatar({ name, src, size = 24, className }) {
  return (
    <RadixAvatar.Root
      role="img"
      aria-label={name}
      className={cn("inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium", SIZES[size] ?? SIZES[24], className)}
    >
      {src && <RadixAvatar.Image src={src} alt="" className="size-full object-cover" />}
      <RadixAvatar.Fallback delayMs={src ? 300 : 0} className={cn("flex size-full items-center justify-center", toneFor(name))}>
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
