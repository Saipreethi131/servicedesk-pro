import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge resolves conflicting utilities ("px-2 px-3" -> "px-3"). It must be told about our custom 13px size, or it
// would read `text-13` as a text COLOUR and drop it whenever a real colour (`text-muted`) is also present.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["13"] }],
    },
  },
});

// cn("px-2", cond && "px-3", props.className): the one way components build a class string.
export const cn = (...inputs) => twMerge(clsx(inputs));
