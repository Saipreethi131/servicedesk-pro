import { ApiError } from "./ApiError.js";
import { IMPACT, URGENCY, PRIORITY, IMPACT_VALUES, URGENCY_VALUES } from "./constants.js";

// Priority = impact x urgency (D5.1). Read it as PRIORITY_MATRIX[impact][urgency]. Kept in code, not the database: a
// change needs a deploy, which is accepted because every ticket stores the priority it was created with.
export const PRIORITY_MATRIX = Object.freeze({
  [IMPACT.HIGH]: Object.freeze({
    [URGENCY.HIGH]: PRIORITY.CRITICAL,
    [URGENCY.MEDIUM]: PRIORITY.HIGH,
    [URGENCY.LOW]: PRIORITY.MEDIUM,
  }),
  [IMPACT.MEDIUM]: Object.freeze({
    [URGENCY.HIGH]: PRIORITY.HIGH,
    [URGENCY.MEDIUM]: PRIORITY.MEDIUM,
    [URGENCY.LOW]: PRIORITY.LOW,
  }),
  [IMPACT.LOW]: Object.freeze({
    [URGENCY.HIGH]: PRIORITY.MEDIUM,
    [URGENCY.MEDIUM]: PRIORITY.LOW,
    [URGENCY.LOW]: PRIORITY.LOW,
  }),
});

// Pure: no database, no req/res, so the ticket service and the P10 AI suggestion can both call it.
export const derivePriority = (impact, urgency) => {
  // Checked against the enum lists, not by looking the value up in the matrix: a lookup would accept "constructor",
  // "__proto__" or an array like ["HIGH"], because object keys are coerced to strings. includes() compares strictly.
  const errors = [];
  if (!IMPACT_VALUES.includes(impact)) {
    errors.push({ field: "impact", message: `Impact must be one of: ${IMPACT_VALUES.join(", ")}` });
  }
  if (!URGENCY_VALUES.includes(urgency)) {
    errors.push({ field: "urgency", message: `Urgency must be one of: ${URGENCY_VALUES.join(", ")}` });
  }
  if (errors.length > 0) throw ApiError.badRequest("Invalid impact or urgency", errors);

  return PRIORITY_MATRIX[impact][urgency];
};
