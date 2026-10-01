// Success counterpart of ErrorBanner.
export default function Notice({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-md border px-3 py-2 text-sm"
      style={{ borderColor: "color-mix(in srgb, var(--color-success) 30%, white)", backgroundColor: "color-mix(in srgb, var(--color-success) 10%, white)", color: "var(--color-success)" }}
    >
      {message}
    </div>
  );
}
