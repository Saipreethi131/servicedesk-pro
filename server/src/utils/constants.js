// Frozen so no code can add or change a role at runtime.
export const ROLES = Object.freeze({
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  IT_MANAGER: "IT_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  ASSET_MANAGER: "ASSET_MANAGER",
  EMPLOYEE: "EMPLOYEE",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));
