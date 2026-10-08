import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "../../lib/theme.js";

// Mount ONE <Toaster /> near the root (App.jsx does), then call toast from anywhere:
//   toast.success("Saved"); toast.error("Could not save", { description: "..." }); toast("Plain message");
// Toasts are announced politely to screen readers, can be dismissed, and stop their timer while hovered or focused.
// Use them for the outcome of something the user just did, never for anything they must act on (that belongs in the page).
export { toast };

export default function Toaster(props) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="bottom-right"
      closeButton
      style={{
        "--normal-bg": "var(--surface)",
        "--normal-text": "var(--text)",
        "--normal-border": "var(--border)",
        "--border-radius": "8px",
        fontFamily: "var(--font-sans)",
      }}
      toastOptions={{ style: { boxShadow: "var(--popover-shadow)", fontSize: "13px" } }}
      {...props}
    />
  );
}
