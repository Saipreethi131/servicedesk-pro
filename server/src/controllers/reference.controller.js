import { sendSuccess } from "../utils/ApiResponse.js";
import * as referenceService from "../services/reference.service.js";

export const getReference = (req, res) => {
  sendSuccess(res, { message: "Reference data retrieved", data: referenceService.getReferenceData() });
};
