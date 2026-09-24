import { ROLES, ROLE_VALUES } from "./constants.js";
import { ApiError } from "./ApiError.js";

// Which roles each role may create/modify/assign (D3.3). Every role has an entry so a lookup never returns undefined.
export const MANAGEABLE_ROLES = Object.freeze({
  ...Object.fromEntries(ROLE_VALUES.map((role) => [role, Object.freeze([])])),
  [ROLES.SYSTEM_ADMIN]: ROLE_VALUES,
  [ROLES.IT_MANAGER]: Object.freeze([ROLES.TECHNICIAN, ROLES.ASSET_MANAGER, ROLES.EMPLOYEE]),
});

// Department ids are ObjectIds: `===` compares object identity and would always be false, so use .equals().
// A missing department on either side is never a match, otherwise two department-less users would "share" one.
export const sameDepartment = (actor, target) => {
  if (!actor.department || !target.department) return false;
  return actor.department.equals(target.department);
};

export const canViewUser = (actor, target) => {
  if (actor.role === ROLES.SYSTEM_ADMIN) return true;
  if (actor.role === ROLES.IT_MANAGER) return sameDepartment(actor, target);
  return false;
};

// Viewing is necessary but not sufficient: the target's role must also be one the actor may manage.
export const canManageUser = (actor, target) =>
  canViewUser(actor, target) && (MANAGEABLE_ROLES[actor.role] ?? []).includes(target.role);

// Role check only. It says nothing about department: the caller must also check the department
// a new/edited user is being placed in.
export const canAssignRole = (actor, role) => (MANAGEABLE_ROLES[actor.role] ?? []).includes(role);

// Filter for list queries. Throws rather than returning {} or { department: null }:
// an empty filter would expose every user, and a null one would match every department-less user.
export const userScopeFilter = (actor) => {
  if (actor.role === ROLES.SYSTEM_ADMIN) return {};
  if (actor.role === ROLES.IT_MANAGER && actor.department) return { department: actor.department };
  throw ApiError.forbidden();
};
