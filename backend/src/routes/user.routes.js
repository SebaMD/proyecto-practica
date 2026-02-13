"use strict";

import { Router } from "express";
import {
    deleteUser,
    editUser,
    getUserById,
    getUsers,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", editUser);
router.delete("/:id", deleteUser);

export default router;
