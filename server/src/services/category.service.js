import Category from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../utils/constants.js";
import { isObjectIdString } from "../utils/objectId.js";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;

const fieldError = (field, message) => ({ field, message });

// What a tree item exposes; nothing else (timestamps, __v, parent) leaves the service in the list.
const toItem = ({ _id, name, isActive }) => ({ _id, name, isActive });
const toDetail = ({ _id, name, parent, isActive }) => ({ _id, name, parent, isActive });

// The default binary sort would put every lowercase name after every uppercase one.
const byName = (query) => query.sort({ name: 1 }).collation({ locale: "en" });

// Two steps, so a caller can report every malformed field (400) before any value rule (422).
const checkNameType = (name) => {
  if (typeof name !== "string") {
    throw ApiError.badRequest("name must be a string", [fieldError("name", "name must be a string")]);
  }
};
const trimAndCheckLength = (name) => {
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) {
    throw ApiError.validation([fieldError("name", `name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters`)]);
  }
  return trimmed;
};

export const listCategories = async (actor, { includeInactive = false } = {}) => {
  if (includeInactive && actor.role !== ROLES.SYSTEM_ADMIN) {
    throw ApiError.forbidden("Only a system administrator can list inactive categories");
  }
  const visible = includeInactive ? {} : { isActive: true };

  // Two queries however many categories there are (no N+1): all top-level ones, then all children of those.
  const parents = await byName(Category.find({ parent: null, ...visible }).select("name isActive")).lean();
  if (parents.length === 0) return [];

  // Children are fetched only for the parents returned above, so with inactive ones filtered out, a child of an
  // inactive parent cannot appear (D5.6). No cascading writes are needed to get that.
  const children = await byName(
    Category.find({ parent: { $in: parents.map((p) => p._id) }, ...visible }).select("name isActive parent")
  ).lean();

  const childrenByParent = new Map();
  for (const child of children) {
    const key = String(child.parent);
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(toItem(child)); // already name-sorted by the query
  }

  return parents.map((p) => ({ ...toItem(p), children: childrenByParent.get(String(p._id)) ?? [] }));
};

export const createCategory = async (input) => {
  checkNameType(input.name);

  // parent is optional; null means the same as leaving it out (a top-level category).
  const hasParent = input.parent !== undefined && input.parent !== null;
  if (hasParent && !isObjectIdString(input.parent)) {
    throw ApiError.badRequest("parent must be a valid id", [fieldError("parent", "parent must be a valid id")]);
  }

  const name = trimAndCheckLength(input.name);

  let parent = null;
  if (hasParent) {
    const found = await Category.findById(input.parent).select("parent isActive").lean();
    if (!found) {
      throw ApiError.badRequest("parent does not exist", [fieldError("parent", "parent does not exist")]);
    }
    if (found.parent) {
      const message = "Categories are limited to two levels";
      throw ApiError.validation([fieldError("parent", message)], message);
    }
    if (!found.isActive) {
      const message = "parent category is inactive";
      throw ApiError.validation([fieldError("parent", message)], message);
    }
    parent = found._id;
  }

  // No findOne() pre-check for duplicates: two simultaneous requests would both pass it. The unique index on
  // (parent, name) decides, and its 11000 error reaches errorHandler as a 409.
  const category = await Category.create({ name, parent });
  return toDetail(category);
};

// Only name and isActive can change. parent is deliberately not touched: it is immutable (D5.4), which also means a
// top-level category can never become a child, so the two-level cap cannot be broken by an update.
export const updateCategory = async (id, input) => {
  if (!isObjectIdString(id)) throw ApiError.badRequest("Invalid category id");

  const { name, isActive } = input;
  if (name === undefined && isActive === undefined) {
    throw ApiError.badRequest("Provide at least one of: name, isActive");
  }
  if (name !== undefined) checkNameType(name);
  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw ApiError.badRequest("isActive must be a boolean", [fieldError("isActive", "isActive must be a boolean")]);
  }
  const trimmed = name === undefined ? undefined : trimAndCheckLength(name);

  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  if (trimmed !== undefined) category.name = trimmed;
  if (isActive !== undefined) category.isActive = isActive;
  await category.save(); // renaming onto a sibling's name fails the unique index: 11000 -> 409

  return toDetail(category);
};
