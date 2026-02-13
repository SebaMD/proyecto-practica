import { Router } from "express";
import { createPetitionSchedule } from "../controllers/petitionSchedule.controller.js";
import { authenticateJwt } from "../middleware/authentication.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.post("/", createPetitionSchedule);

//!Falta

export default router;
