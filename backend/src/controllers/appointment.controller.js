import {
    handleErrorClient,
    handleErrorServer,
    handleSuccess,
} from "../handlers/responseHandlers.js";
import { 
    createAppointmentBodyValidation, 
    updateStatusValidation 
} from "../validations/appointment.validation.js";
import { 
    createAppointmentService, 
    getAppointmentService, 
    getAppointmentIdService, 
    deleteAppointmentIdService, 
    updateStatusService, 
    hasAppointmentToPetitionService, 
    getPetitionsByPrerequisitesService,
    archiveReviewedAppointmentBySupervisorService,
} from "../services/appointment.service.js";
import {
    generateAppointmentsReportService,
    getSupervisorReportDatesService,
} from "../services/report.service.js";
import jwt from "jsonwebtoken";

import { checkActivePeriodService } from "../services/period.service.js";

export async function createAppointment(req, res){
    try {
        // Verificar si hay periodo activo para los ciudadanos
        // Si no hay periodo, bloqueamos la inscripción con error 403
        const isPeriodActive = await checkActivePeriodService();
        if (!isPeriodActive) {
            return handleErrorClient(res, 403, "El proceso de inscripción no está disponible para los ciudadanos en este momento.");
        }

        const authHeader = req.headers["authorization"];
        if (!authHeader) return handleErrorClient(res, 401, "No autorizado", "No se proporcionó token");

        const token = authHeader.split(" ")[1];
        const payload = jwt.decode/*o "verify"?*/(token, process.env.JWT_SECRET);

        const data = {...req.body, userId: payload.id}; //!ojo el userId no es tan necesario ya que lo ve por el id del token
        
        const { error } = createAppointmentBodyValidation.validate(data);

        if(error) return handleErrorClient(res, 400, "Parametros invalidos", error.message);

        const hasAppointment = await hasAppointmentToPetitionService(payload.id, data.petitionId);
        if(hasAppointment) return handleErrorClient(res, 409, "Ya existe una solicitud a la peticion indicada");

        const newAppointment = await createAppointmentService(data);

        handleSuccess(res, 201, "Inscripcion creada exitosamente", newAppointment);
    } catch (error) {
        const knownBusinessError =
            error.message?.includes("Ya tienes") ||
            error.message?.includes("No hay cupos disponibles") ||
            error.message?.includes("maximo de") ||
            error.message?.includes("no esta disponible");

        if (knownBusinessError) {
            return handleErrorClient(res, 409, error.message);
        }

        handleErrorServer(res, 500, "Error al crear la solicitud", error.message);
    }
}

export async function getAppointment(req, res){
    try {
        let appointments = await getAppointmentService();
        
        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        if (payload.role === "ciudadano"){
            appointments = appointments.filter((appointment) => appointment.userId === payload.id);
        } else if (payload.role === "supervisor") {
            appointments = appointments.filter(
                (appointment) =>
                    appointment.status === "pendiente" ||
                    (
                        appointment.supervisorId === payload.id &&
                        !appointment.archivedBySupervisor
                    )
            );
        }

        if(appointments.length < 1) return handleSuccess(res, 404, "No se encontro ninguna inscripcion");

        handleSuccess(res, 200, "Inscripciones obtenidas exitosamente", appointments);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener las solicitudes", error.message);
    }
}

export async function archiveReviewedAppointmentBySupervisor(req, res) {
    try {
        const { id } = req.params;
        const authHeader = req.headers["authorization"];
        if (!authHeader) return handleErrorClient(res, 401, "Token no proporcionado");

        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        const archivedAppointment = await archiveReviewedAppointmentBySupervisorService(id, payload.id);
        handleSuccess(res, 200, "Inscripcion archivada exitosamente", archivedAppointment);
    } catch (error) {
        if (
            error.message === "Inscripcion no encontrada" ||
            error.message === "Solo se pueden archivar inscripciones revisadas" ||
            error.message === "La inscripcion no pertenece a las revisiones del supervisor" ||
            error.message === "Solo puedes archivar cuando haya pasado la fecha y hora de atencion" ||
            error.message === "No se pudo validar la hora de atencion para archivar"
        ) {
            return handleErrorClient(res, 409, error.message);
        }

        handleErrorServer(res, 500, "Error al archivar la inscripcion", error.message);
    }
}

export async function getAppointmentId(req, res){
    try {
        const { id } = req.params;
        const appointment = await getAppointmentIdService(id);

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        if(payload.role === "ciudadano" && appointment.userId !== payload.id){
            return handleErrorClient(res, 403, "La solicitud no corresponde al ciudadano");
        }

        handleSuccess(res, 200, "Inscripcion encontrada", appointment);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener la solicitud", error.message);
    }
}

export async function deleteAppointmentId(req, res){
    try {
        const { id } = req.params;

        // Verificar periodo al eliminar
        // Si el periodo cerró, el ciudadano no puede borrar su inscripción
        const isPeriodActive = await checkActivePeriodService();
        if (!isPeriodActive) {
            return handleErrorClient(res, 403, "El periodo ha cerrado. No puedes anular inscripciones.");
        }

        const appointment = await deleteAppointmentIdService(id);

        if(!appointment) return handleErrorClient(res, 404, "Inscripción no encontrada");

        handleSuccess(res, 200, "Inscripcion eliminada exitosamente", appointment); 
    } catch (error) {
        handleErrorServer(res, 500, "Error al eliminar la inscripcion", error.message);
    }
}

export async function updateStatus(req, res){
    try {
        const MAX_APPROVALS_PER_SUPERVISOR_PER_DAY = 5;
        const data = req.body;
        const { id } = req.params;

        const authHeader = req.headers["authorization"];
        if(!authHeader) return handleErrorClient(res, 401, "Token no proporcionado");

        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        const appointment = await getAppointmentIdService(id);
        if(appointment.status !== "pendiente"){
            return handleErrorClient(res, 400, "La inscripcion ya fue revisada");
        }

        const { error } = updateStatusValidation.validate(data);
        if ( error ) return handleErrorClient(res, 400, "Parametros invalidos", error.message);

        if (data.status === "aprobado") {
            const allAppointments = await getAppointmentService();
            const currentAppointment = allAppointments.find((a) => a.id === Number(id));

            if (!currentAppointment?.schedule?.date) {
                return handleErrorClient(res, 400, "No se pudo validar la fecha de la inscripcion");
            }

            const approvedCountSameDate = allAppointments.filter(
                (a) =>
                    a.status === "aprobado" &&
                    a.supervisorId === payload.id &&
                    a.schedule?.date === currentAppointment.schedule.date
            ).length;

            if (approvedCountSameDate >= MAX_APPROVALS_PER_SUPERVISOR_PER_DAY) {
                return handleErrorClient(
                    res,
                    409,
                    `El supervisor ya alcanzó el máximo de ${MAX_APPROVALS_PER_SUPERVISOR_PER_DAY} aprobaciones para la fecha ${currentAppointment.schedule.date}`
                );
            }
        }

        const updateStatus = await updateStatusService(id, data, payload.id);
        handleSuccess(res, 200, "Solicitud revisada exitosamente", updateStatus);
    } catch (error) {
        handleErrorServer(res, 500, "Error al revisar la inscripcion", error.message);
    }
}

export async function getPetitionsByPrerequisites(req, res){
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        let petitions = await getPetitionsByPrerequisitesService();

        if (petitions.length === 0) {
            return handleErrorClient(res, 404, "No se encontraron peticiones sin requisitos previos.");
        }

        return handleSuccess(res, 200, "Peticiones sin requisitos obtenidos exitosamente", petitions);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener las peticiones", error.message);
    }
}

export async function getAppointmentsByPetition(req, res){
    try {
        const { id } = req.params;

        const petitionId = parseInt(id);
        if (isNaN(petitionId)) {
            return handleErrorClient(res, 400, "ID de la peticion inválido");
        }

        let appointments = await getAppointmentService();

        appointments = appointments.filter(
            (appointment) => appointment.petitionId === petitionId
        );

        return handleSuccess(
            res,
            200,
            appointments.length === 0
            ? "No hay inscripciones para esta peticion"
            : "Inscripciones encontradas",
            appointments
        );
    } catch (error) {
        return handleErrorServer(
            res,
            500,
            "Error al obtener las inscripciones",
            error.message
        );
    }
}

export async function exportAppointmentsReport(req, res) {
    try {
        const { date } = req.query;

        if (!date) {
            return handleErrorClient(res, 400, "La fecha es obligatoria");
        }

        const authHeader = req.headers["authorization"];
        if (!authHeader) return handleErrorClient(res, 401, "Token no proporcionado");

        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        const workbook = await generateAppointmentsReportService(payload.id, date);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=mis-revisiones-${date}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        if (error.message?.includes("La exportacion solo esta disponible cuando el periodo este cerrado")) {
            return handleErrorClient(res, 403, error.message);
        }
        if (
            error.message?.includes("No existe un periodo cerrado para exportar") ||
            error.message?.includes("La fecha no pertenece al ultimo periodo cerrado") ||
            error.message?.includes("No hay citas aprobadas para esa fecha") ||
            error.message?.includes("No hay citas revisadas para esa fecha")
        ) {
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al exportar el reporte", error.message);
    }
}

export async function getSupervisorReportDates(req, res) {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) return handleErrorClient(res, 401, "Token no proporcionado");

        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        const dates = await getSupervisorReportDatesService(payload.id);
        handleSuccess(
            res,
            200,
            dates.length > 0
                ? "Fechas de reporte obtenidas exitosamente"
                : "No hay fechas disponibles para exportar en el ultimo periodo cerrado",
            dates
        );
    } catch (error) {
        if (error.message?.includes("La exportacion solo esta disponible cuando el periodo este cerrado")) {
            return handleSuccess(res, 200, "Exportacion bloqueada mientras el periodo este activo", []);
        }
        if (error.message?.includes("No existe un periodo cerrado para exportar")) {
            return handleSuccess(res, 200, "No hay periodos cerrados para exportar", []);
        }
        handleErrorServer(res, 500, "Error al obtener fechas de reporte", error.message);
    }
}

