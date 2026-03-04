import { Router } from "express";
import {
    cancelOwnRequest,
    createRequest,
    getPickupAvailabilityByDate,
    getRequestDateUsage,
    getRequestById,
    getRequests,
    reviewRequest,
    exportRequestsReport,
    getRequestReportDates,
} from "../controllers/request.controller.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.get("/", verifyRoles(["funcionario", "ciudadano"]), getRequests);
router.get("/date-usage", verifyRoles(["funcionario", "ciudadano", "supervisor"]), getRequestDateUsage);
router.get("/pickup-availability", verifyRoles(["funcionario"]), getPickupAvailabilityByDate);
router.get("/export", verifyRoles(["funcionario"]), exportRequestsReport);
router.get("/export/dates", verifyRoles(["funcionario"]), getRequestReportDates);

router.get("/:id", verifyRoles(["funcionario"]), getRequestById);

router.post("/", verifyRoles(["ciudadano"]), createRequest);
router.delete("/:id", verifyRoles(["ciudadano"]), cancelOwnRequest);

router.patch("/review/:id", verifyRoles(["funcionario"]), reviewRequest);

export default router;
