import { Router } from "express";
import * as referenceController from "../controllers/reference.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Any signed-in role may read this, so there is no authorize(). Plain authenticate(): a user who must change their
// password is refused here too (D2.8).
router.use(authenticate());

router.get("/", referenceController.getReference);

export default router;
