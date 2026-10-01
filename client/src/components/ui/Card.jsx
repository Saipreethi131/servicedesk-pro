// `as` lets a <form> be a Card directly (so onSubmit stays on the element Card renders) instead of nesting a
// <form> inside a <section>, which would be invalid HTML.
export default function Card({ as: Tag = "section", title, className = "", children, ...props }) {
  return (
    <Tag className={`card ${className}`.trim()} {...props}>
      {title && (
        <div className="card-header">
          <h2 className="card-title">{title}</h2>
        </div>
      )}
      {children}
    </Tag>
  );
}
