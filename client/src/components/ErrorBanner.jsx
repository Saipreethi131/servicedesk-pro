// Shows the server's own message. Field-level messages are listed too, unless they only repeat the main one.
export default function ErrorBanner({ error }) {
  if (!error) return null;

  const details = (error.errors ?? []).filter((e) => e.message && e.message !== error.message);

  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <p>{error.message}</p>
      {details.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {details.map((e, i) => (
            <li key={i}>{e.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
