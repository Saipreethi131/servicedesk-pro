import { IMPACT_VALUES, URGENCY_VALUES, PRIORITY_VALUES, TICKET_STATUS_VALUES } from "../utils/constants.js";
import { PRIORITY_MATRIX } from "../utils/priority.js";

// Everything the client would otherwise have to copy from the server (D5.3). matrix is read as matrix[impact][urgency].
export const getReferenceData = () => ({
  impacts: IMPACT_VALUES,
  urgencies: URGENCY_VALUES,
  priorities: PRIORITY_VALUES,
  ticketStatuses: TICKET_STATUS_VALUES,
  matrix: PRIORITY_MATRIX,
});
