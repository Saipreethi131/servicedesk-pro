// Pure styling wrapper: every prop (type, onClick, disabled, aria-*...) passes straight through, so call sites
// keep deciding their own behavior. variant never gets a default beyond "primary" to avoid silently restyling
// a call site that forgot to set one.
export default function Button({ variant = "primary", className = "", ...props }) {
  return <button className={`btn btn-${variant} ${className}`.trim()} {...props} />;
}
