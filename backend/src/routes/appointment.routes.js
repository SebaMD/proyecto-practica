import { Router } from "express";
import { authenticateJwt } from "../middleware/authentication.middleware.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

import {
    createAppointment,
    getAppointment,
    getAppointmentId,
    deleteAppointmentId,
    updateStatus,
    getPetitionsByPrerequisites,
} from "../controllers/appointment.controller.js";

const router = Router();

router.use(authenticateJwt);

router.get("/", verifyRoles(["supervisor", "ciudadano"]), getAppointment); 
router.get("/filter", verifyRoles(["ciudadano", "supervisor"]), getPetitionsByPrerequisites); //! no funciona bien

router.get("/:id", verifyRoles(["ciudadano"]), getAppointmentId);

router.post("/", verifyRoles(["ciudadano"]), createAppointment); 

router.delete("/:id", verifyRoles(["ciudadano"]), deleteAppointmentId);

router.patch("/status/:id", verifyRoles(["supervisor"]), updateStatus); 

export default router;
