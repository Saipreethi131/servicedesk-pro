import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { pickAllowed } from "../utils/pick.js";
import * as categoryService from "../services/category.service.js";

const CREATE_CATEGORY_FIELDS = ["name", "parent"]; // isActive and anything else -> 400 naming the key (D3.5)
const UPDATE_CATEGORY_FIELDS = ["name", "isActive"]; // parent is immutable (D5.4), so it is refused here too

// Query-string values are always strings, and repeated keys arrive as arrays; accept only the two literal spellings.
const parseIncludeInactive = (value) => {
  if (value === undefined) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw ApiError.badRequest("includeInactive must be true or false", [
    { field: "includeInactive", message: "includeInactive must be true or false" },
  ]);
};

export const listCategories = async (req, res) => {
  const includeInactive = parseIncludeInactive(req.query.includeInactive);
  const categories = await categoryService.listCategories(req.user, { includeInactive });
  sendSuccess(res, { message: "Categories retrieved", data: { categories } });
};

export const createCategory = async (req, res) => {
  const input = pickAllowed(req.body, CREATE_CATEGORY_FIELDS);
  const category = await categoryService.createCategory(input);
  sendSuccess(res, { statusCode: 201, message: "Category created", data: { category } });
};

export const updateCategory = async (req, res) => {
  const input = pickAllowed(req.body, UPDATE_CATEGORY_FIELDS);
  const category = await categoryService.updateCategory(req.params.id, input);
  sendSuccess(res, { message: "Category updated", data: { category } });
};
