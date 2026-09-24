// Success counterpart of ErrorBanner.
export default function Notice({ message }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
      {message}
    </div>
  );
}
