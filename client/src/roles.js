export const ROLES = Object.freeze({
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  IT_MANAGER: "IT_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  ASSET_MANAGER: "ASSET_MANAGER",
  EMPLOYEE: "EMPLOYEE",
});

// Mirrors MANAGEABLE_ROLES in server/src/utils/permissions.js (D3.3). It only decides which options and buttons the UI
// offers. The server enforces the rule on every request and answers 403 if this ever drifts out of date.
const MANAGEABLE_ROLES = Object.freeze({
  [ROLES.SYSTEM_ADMIN]: Object.values(ROLES),
  [ROLES.IT_MANAGER]: [ROLES.TECHNICIAN, ROLES.ASSET_MANAGER, ROLES.EMPLOYEE],
});

export const manageableRoles = (actorRole) => MANAGEABLE_ROLES[actorRole] ?? [];

export const roleLabel = (role) => role.replaceAll("_", " ");
