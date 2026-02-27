import { Router } from "express";
import {
    cancelOwnRequest,
    createRequest,
    getRenewalQuota,
    getRequestById,
    getRequests,
    reviewRequest,
} from "../controllers/request.controller.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.get("/", verifyRoles(["funcionario", "ciudadano"]), getRequests);
router.get("/renewal-quota", verifyRoles(["funcionario", "ciudadano"]), getRenewalQuota);
router.get("/:id", verifyRoles(["funcionario"]), getRequestById);

router.post("/", verifyRoles(["ciudadano"]), createRequest);
router.delete("/:id", verifyRoles(["ciudadano"]), cancelOwnRequest);

router.patch("/review/:id", verifyRoles(["funcionario"]), reviewRequest);

export default router;
