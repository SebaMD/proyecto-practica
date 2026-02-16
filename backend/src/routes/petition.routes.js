"use strict";

import { Router } from "express";
import { authenticateJwt } from "../middleware/authentication.middleware.js";
import {
    getAllPetitions,
    getPetitionById,
    createPetition,
    updatePetition,
    deletePetition,
} from "../controllers/petition.controller.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.get("/", verifyRoles(["funcionario", "ciudadano"]), getAllPetitions);                    
router.get("/:id", verifyRoles(["funcionario", "ciudadano"]), getPetitionById);                 
router.post("/", verifyRoles(["funcionario"]), createPetition);                    
router.patch("/:id", verifyRoles(["funcionario"]), updatePetition);                
router.delete("/:id", verifyRoles(["funcionario"]), deletePetition);               

export default router;