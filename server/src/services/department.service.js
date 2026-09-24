import Department from "../models/Department.js";
import { ApiError } from "../utils/ApiError.js";
import { userScopeFilter } from "../utils/permissions.js";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;

export const listDepartments = async (actor) => {
  // Reuses the actor's department scope instead of restating it: SYSTEM_ADMIN -> {}, IT_MANAGER with a
  // department -> { department }, anyone else (including an IT_MANAGER with none) -> 403 (D3.4, fail closed).
  const scope = userScopeFilter(actor);

  const filter = { isActive: true };
  if (scope.department) filter._id = scope.department; // for a manager, "their departments" is just their own

  return Department.find(filter)
    .select("name") // _id is included by default; nothing else leaves the service
    .sort({ name: 1 })
    .collation({ locale: "en" }) // natural order: the default binary sort puts every lowercase name after every uppercase one
    .lean();
};

export const createDepartment = async (input) => {
  if (typeof input.name !== "string") {
    throw ApiError.badRequest("name must be a string", [{ field: "name", message: "name must be a string" }]);
  }

  const name = input.name.trim();
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    throw ApiError.validation([
      { field: "name", message: `name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters` },
    ]);
  }

  // No findOne() pre-check: two simultaneous requests would both pass it. The unique index decides,
  // and its 11000 error reaches errorHandler as a 409.
  const department = await Department.create({ name });
  return { _id: department._id, name: department.name };
};
