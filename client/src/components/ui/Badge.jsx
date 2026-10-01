// Colors are read from the CSS custom properties in index.css via var(), so index.css stays the one place
// that defines the palette; this just picks which variable applies to which value.
const VARIANT_COLOR_VAR = {
  priority: (value) => `var(--color-priority-${String(value).toLowerCase()})`,
  status: (value) => `var(--color-status-${String(value).toLowerCase()})`,
  active: (value) => (value ? "var(--color-success)" : "var(--color-text-muted)"),
  role: () => "var(--color-text-muted)", // no severity to signal for a role, so always the neutral tone
};

const formatLabel = (value) => String(value).replaceAll("_", " ");

// variant: "role" | "status" | "priority" | "active". value: the enum string, or a boolean for "active".
// children overrides the auto-generated label (rarely needed; formatLabel covers every current case).
export default function Badge({ variant, value, children }) {
  const color = (VARIANT_COLOR_VAR[variant] ?? VARIANT_COLOR_VAR.role)(value);
  const label = children ?? (variant === "active" ? (value ? "Active" : "Inactive") : formatLabel(value));

  return (
    <span className="badge" style={{ "--badge-color": color }}>
      {label}
    </span>
  );
}
