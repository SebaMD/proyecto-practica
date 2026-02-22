import { Router } from "express";
import { createPetitionSchedule, getPetitionSchedules } from "../controllers/petitionSchedule.controller.js";
import { authenticateJwt } from "../middleware/authentication.middleware.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.post("/", verifyRoles(["funcionario"]), createPetitionSchedule);
router.get("/", verifyRoles(["ciudadano", "supervisor", "funcionario"]),getPetitionSchedules);

export default router;
