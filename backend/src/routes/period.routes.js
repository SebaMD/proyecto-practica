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

const router = Router();

router.use(authenticateJwt);

router.get("/", getPeriods);
router.post("/", createPeriod);

router.get("/active", getActivePeriod);

router.get("/:id", getPeriodById);
router.put("/:id", updatePeriod);
router.delete("/:id", deletePeriod);

export default router;