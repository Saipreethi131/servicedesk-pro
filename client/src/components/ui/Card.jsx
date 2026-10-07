// `as` lets a <form> be a Card directly (so onSubmit stays on the element Card renders) instead of nesting a
// <form> inside a <section>, which would be invalid HTML.
// `interactive` is for a Card that is itself a click target (e.g. wraps a Link): it adds the hover lift/shadow.
// A merely-hoverable row inside a Card (like a table row) does not need this - that is handled by .table instead.
export default function Card({ as: Tag = "section", title, interactive = false, className = "", children, ...props }) {
  return (
    <Tag className={`card${interactive ? " card-interactive" : ""} ${className}`.trim()} {...props}>
      {title && (
        <div className="card-header">
          <h2 className="card-title">{title}</h2>
        </div>
      )}
      {children}
    </Tag>
  );
}
