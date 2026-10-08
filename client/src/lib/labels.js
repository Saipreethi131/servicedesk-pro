// Human wording for the server's enums. The server owns the values; these only decide how they read. Anything not listed
// still renders (sentence-cased), so a value the server adds later does not break a screen.

const sentence = (value) => {
  const text = String(value).replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const ROLE_LABELS = Object.freeze({
  SYSTEM_ADMIN: "System Admin",
  IT_MANAGER: "IT Manager",
  TECHNICIAN: "Technician",
  ASSET_MANAGER: "Asset Manager",
  EMPLOYEE: "Employee",
});

export const roleLabel = (role) => ROLE_LABELS[role] ?? sentence(role);
export const statusLabel = (status) => sentence(status); // "WAITING_ON_REQUESTER" -> "Waiting on requester"
export const priorityLabel = (priority) => sentence(priority); // "HIGH" -> "High"

// "Ada Lovelace" -> "AL", "Ada" -> "A", "" -> "?"
export const initials = (name) => {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};
