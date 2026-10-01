export default function PageHeader({ title, action }) {
  return (
    <div className="page-header">
      <h1 className="page-header-title">{title}</h1>
      {action}
    </div>
  );
}
