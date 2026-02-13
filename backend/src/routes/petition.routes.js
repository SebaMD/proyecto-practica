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

const router = Router();

router.use(authenticateJwt);

router.get("/", getAllPetitions);                    
router.get("/:id", getPetitionById);                 
router.post("/", createPetition);                    
router.patch("/:id", updatePetition);                
router.delete("/:id", deletePetition);               

export default router;