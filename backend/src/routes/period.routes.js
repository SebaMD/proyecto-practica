import { Router } from "express";
import { 
    createPeriod, 
    getPeriods, 
    getPeriodById, 
    updatePeriod, 
    deletePeriod,
    getActivePeriod 
} from "../controllers/period.controller.js";

import { authenticateJwt } from "../middleware/authentication.middleware.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.get("/", verifyRoles(["funcionario"]), getPeriods);
router.post("/", verifyRoles(["funcionario"]), createPeriod);

router.get("/active", verifyRoles(["funcionario", "ciudadano", "supervisor"]), getActivePeriod);

router.get("/:id", verifyRoles(["funcionario"]),getPeriodById);
router.put("/:id", verifyRoles(["funcionario"]),updatePeriod);
router.delete("/:id", verifyRoles(["funcionario"]),deletePeriod);

export default router;