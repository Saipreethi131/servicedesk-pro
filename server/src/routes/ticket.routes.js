import { Router } from "express";
import * as ticketController from "../controllers/ticket.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { ROLES } from "../utils/constants.js";

const router = Router();

// Plain authenticate(): nothing here stays open to a user who must change their password (D2.8).
router.use(authenticate());

router.post("/", ticketController.createTicket);
router.get("/", ticketController.listTickets);
// Before /:id, or "requester-options" and "stats" would be read as ticket ids.
router.get("/stats", ticketController.getTicketStats);
router.get("/requester-options", ticketController.listRequesterOptions);
router.get("/:id", ticketController.getTicket);
router.get("/:id/assignable-users", ticketController.listAssignableUsers);
router.post("/:id/transition", ticketController.transitionTicket);
// Coarse gate only; IT_MANAGER's same-department restriction is applied in the service (D3.1).
router.post("/:id/priority-override", authorize(ROLES.SYSTEM_ADMIN, ROLES.IT_MANAGER), ticketController.setPriorityOverride);
router.post("/:id/comments", ticketController.createComment);
router.get("/:id/comments", ticketController.listComments);

export default router;
