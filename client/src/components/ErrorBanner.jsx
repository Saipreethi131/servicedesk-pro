import { useEffect, useRef } from "react";

// Shows the server's own message. Field-level messages are listed too, unless they only repeat the main one.
// focusOnShow: for the result of something the user just did (a failed submit). role="alert" makes screen readers read the
// message, but keyboard focus would stay on the button; this moves it to the message. Not for load errors, which would
// take focus from wherever the user is.
export default function ErrorBanner({ error, focusOnShow = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (error && focusOnShow) ref.current?.focus();
  }, [error, focusOnShow]);

  if (!error) return null;

  const details = (error.errors ?? []).filter((e) => e.message && e.message !== error.message);

  return (
    <div
      ref={ref}
      tabIndex={-1} // focusable from code, but not a stop in the Tab order
      role="alert"
      className="rounded-md border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        borderColor: "color-mix(in srgb, var(--color-danger) 30%, white)",
        backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, white)",
        color: "var(--color-danger)",
      }}
    >
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
