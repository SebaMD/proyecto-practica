import { Router } from "express";
import { createPetitionSchedule, getPetitionSchedules } from "../controllers/petitionSchedule.controller.js";
import { authenticateJwt } from "../middleware/authentication.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.post("/", createPetitionSchedule);
router.get("/", getPetitionSchedules);

export default router;
