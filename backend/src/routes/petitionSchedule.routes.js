import { Router } from "express";
import { createPetitionSchedule, getPetitionSchedules, updatePetitionSchedule, deletePetitionSchedule } from "../controllers/petitionSchedule.controller.js";
import { authenticateJwt } from "../middleware/authentication.middleware.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.post("/", verifyRoles(["funcionario"]), createPetitionSchedule);
router.get("/", verifyRoles(["ciudadano", "supervisor", "funcionario"]),getPetitionSchedules);
router.patch("/:id", verifyRoles(["funcionario"]), updatePetitionSchedule);
router.delete("/:id", verifyRoles(["funcionario"]), deletePetitionSchedule);

export default router;
