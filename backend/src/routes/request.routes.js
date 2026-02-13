import { Router } from "express";
import {
    createRequest,
    getRequestById,
    getRequests,
    reviewRequest,
} from "../controllers/request.controller.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.get("/", verifyRoles(["funcionario"]), getRequests);//! Da resultado bueno, pero no devuelve nada, deveria decir que no hay ninguna requests, cuando si existe la muestra bien
router.get("/:id", verifyRoles(["funcionario"]), getRequestById);

router.post("/", verifyRoles(["ciudadano"]), createRequest);

router.patch("/review/:id", verifyRoles(["funcionario"]), reviewRequest);

export default router;
