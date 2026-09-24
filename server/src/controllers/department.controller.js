import { sendSuccess } from "../utils/ApiResponse.js";
import { pickAllowed } from "../utils/pick.js";
import * as departmentService from "../services/department.service.js";

const CREATE_DEPARTMENT_FIELDS = ["name"]; // isActive and anything else -> 400 naming the key (D3.5)

export const listDepartments = async (req, res) => {
  const departments = await departmentService.listDepartments(req.user);
  sendSuccess(res, { message: "Departments retrieved", data: { departments } });
};

export const createDepartment = async (req, res) => {
  const input = pickAllowed(req.body, CREATE_DEPARTMENT_FIELDS);
  const department = await departmentService.createDepartment(input);
  sendSuccess(res, { statusCode: 201, message: "Department created", data: { department } });
};
