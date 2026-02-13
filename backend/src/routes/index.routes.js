import { Router } from "express";
import authRoutes from "./auth.routes.js";
import periodRoutes from "./period.routes.js";
import petitionRoutes from "./petition.routes.js";
import petitionScheduleRoutes from "./petitionSchedule.routes.js";
import appointmentRoutes from "./appointment.routes.js";
import requestRoutes from "./request.routes.js";
import userRoutes from "./user.routes.js";
import { verifyRoles } from "../middleware/authorization.middleware.js";

export function routerApi(app){
    const router = Router();
    app.use("/api", router);

    router.use("/auth", authRoutes);
    router.use("/periods", verifyRoles(["funcionario"]), periodRoutes);
    router.use("/petitions", verifyRoles(["funcionario"]), petitionRoutes);
    router.use("/petitionSchedules", verifyRoles(["funcionario"]), petitionScheduleRoutes);
    router.use("/appointments", appointmentRoutes);
    router.use("/requests", requestRoutes);
    router.use("/users", userRoutes);
}