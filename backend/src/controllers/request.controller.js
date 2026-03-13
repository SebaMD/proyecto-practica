import {
    handleErrorClient,
    handleErrorServer,
    handleSuccess,
} from "../handlers/responseHandlers.js";
import {
    createRequestService,
    getRequestsService,
    getRequestByIdService,
    reviewRequestService,
    hasRequestOfPetitionService,
    cancelPendingRequestByCitizenService,
    countGlobalUsedForDateService,
    getRequestDateUsageService,
    getPickupAvailabilityByDateService,
    archiveReviewedRequestByFuncionarioService,
    hasCitizenReservationOnDateService,
} from "../services/request.service.js";
import {
    createRequestBodyValidation,
    reviewRequestValidation,
} from "../validations/request.validation.js";
import {
    generateRequestsReportService,
    getRequestReportDatesService,
} from "../services/report.service.js";
import jwt from "jsonwebtoken";
import { checkActivePeriodService } from "../services/period.service.js";
import { getIO } from "../socket.js";

const GLOBAL_DAILY_QUOTA = 15;

const emitRequestUsageUpdated = async () => {
    try {
        const io = getIO();
        const usage = await getRequestDateUsageService();
        io.emit("request:usage-updated", usage);
    } catch (error) {
        console.error("Socket emit error (request:usage-updated):", error.message);
    }
};

export async function createRequest(req, res) {
    try {
        const isPeriodActive = await checkActivePeriodService();
        if (!isPeriodActive) {
            return handleErrorClient(
                res,
                403,
                "El proceso de renovación no está disponible para los ciudadanos en este momento."
            );
        }

        const { body } = req;
        const { error } = createRequestBodyValidation.validate(body);
        if (error) return handleErrorClient(res, 400, "Parámetros inválidos", error.message);

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);
        body.citizenId = payload.id;

        const hasRequest = await hasRequestOfPetitionService(payload.id, body.petitionId);
        if (hasRequest) {
            return handleErrorClient(res, 409, "Ya existe una solicitud activa o aprobada para la petición indicada");
        }
        const hasCitizenReservationOnSameDate = await hasCitizenReservationOnDateService(payload.id, body.requestDate);
        if (hasCitizenReservationOnSameDate) {
            return handleErrorClient(res, 409, "Ya tienes una reserva activa para la fecha seleccionada");
        }
        const globalUsed = await countGlobalUsedForDateService(body.requestDate);
        if (globalUsed >= GLOBAL_DAILY_QUOTA) {
            return handleErrorClient(
                res,
                409,
                `No hay cupos disponibles para la fecha ${body.requestDate}. Máximo diario: ${GLOBAL_DAILY_QUOTA}`
            );
        }

        const newRequest = await createRequestService(body);
        await emitRequestUsageUpdated();
        handleSuccess(res, 201, "Solicitud creada exitosamente", newRequest);
    } catch (error) {
        if (
            error.message?.includes("Ya tienes una reserva activa") ||
            error.message?.includes("Ya existe una solicitud activa") ||
            error.message?.includes("No hay cupos disponibles")
        ) {
            return handleErrorClient(res, 409, error.message);
        }

        handleErrorServer(res, 500, "Error al crear la solicitud", error.message);
    }
}

export async function getRequests(req, res) {
    try {
        let requests = await getRequestsService();

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        if (payload.role === "ciudadano") {
            requests = requests.filter((request) => {
                const citizenId =
                    typeof request.citizenId === "object" && request.citizenId !== null
                        ? request.citizenId.id
                        : request.citizenId;

                return citizenId === payload.id;
            });
        } else if (payload.role === "funcionario") {
            requests = requests.filter(
                (request) => request.status === "pendiente" || !request.archived
            );
        }

        if (requests.length === 0) return handleSuccess(res, 200, "No hay solicitudes disponibles");
        handleSuccess(res, 200, "Solicitudes obtenidas exitosamente", requests);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener las solicitudes", error.message);
    }
}

export async function archiveReviewedRequestByFuncionario(req, res) {
    try {
        const { id } = req.params;
        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        const archivedRequest = await archiveReviewedRequestByFuncionarioService(id, payload.id);
        handleSuccess(res, 200, "Solicitud archivada exitosamente", archivedRequest);
    } catch (error) {
        if (
            error.message === "Solicitud no encontrada" ||
            error.message === "Solo se pueden archivar solicitudes revisadas" ||
            error.message === "La solicitud no pertenece a las revisiones del funcionario" ||
            error.message === "Solo puedes archivar cuando haya pasado la fecha y hora de atencion" ||
            error.message === "No se pudo validar la hora de atencion para archivar"
        ) {
            return handleErrorClient(res, 409, error.message);
        }

        handleErrorServer(res, 500, "Error al archivar la solicitud", error.message);
    }
}

export async function getRequestById(req, res) {
    try {
        const { id } = req.params;
        const request = await getRequestByIdService(id);

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        if (payload.role === "ciudadano" && request.citizenId !== payload.id) {
            return handleErrorClient(res, 401, "La solicitud no corresponde al ciudadano");
        }

        handleSuccess(res, 200, "Solicitud encontrada", request);
    } catch (error) {
        if (error.message === "Solicitud no encontrada") {
            handleErrorClient(res, 404, error.message);
        } else {
            handleErrorServer(res, 500, "Error al obtener la solicitud", error.message);
        }
    }
}

export async function reviewRequest(req, res) {
    try {
        const { body } = req;
        const { id } = req.params;

        const request = await getRequestByIdService(id);
        if (request.status !== "pendiente") {
            return handleErrorClient(res, 409, "La solicitud ya fue revisada");
        }

        const { error } = reviewRequestValidation.validate(body);
        if (error) return handleErrorClient(res, 400, "Parámetros inválidos", error.message);

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);
        body.reviewerId = payload.id;

        const updatedRequest = await reviewRequestService(id, body);
        await emitRequestUsageUpdated();
        handleSuccess(res, 200, "Solicitud revisada exitosamente", updatedRequest);
    } catch (error) {
        if (error.message === "Solicitud no encontrada") {
            handleErrorClient(res, 404, error.message);
        } else if (
            error.message?.includes("ya no tiene cupos disponibles") ||
            error.message?.includes("Ese horario ya fue tomado") ||
            error.message?.includes("No hay cupos disponibles para la fecha") ||
            error.message?.includes("fecha de retiro debe coincidir") ||
            error.message?.includes("no existe en la peticion") ||
            error.message?.includes("ya tiene una cita asignada")
        ) {
            handleErrorClient(res, 409, error.message);
        } else {
            handleErrorServer(res, 500, "Error al revisar la solicitud", error.message);
        }
    }
}

export async function cancelOwnRequest(req, res) {
    try {
        const { id } = req.params;
        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);

        await cancelPendingRequestByCitizenService(id, payload.id);
        await emitRequestUsageUpdated();
        handleSuccess(res, 200, "Solicitud cancelada exitosamente");
    } catch (error) {
        if (error.message === "Solicitud no encontrada") {
            handleErrorClient(res, 404, error.message);
        } else if (
            error.message === "La solicitud no pertenece al ciudadano" ||
            error.message === "Solo se pueden cancelar solicitudes pendientes"
        ) {
            handleErrorClient(res, 409, error.message);
        } else {
            handleErrorServer(res, 500, "Error al cancelar la solicitud", error.message);
        }
    }
}

export async function getRequestDateUsage(req, res) {
    try {
        const usage = await getRequestDateUsageService();
        handleSuccess(res, 200, "Uso por fecha obtenido exitosamente", usage);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener uso por fecha", error.message);
    }
}

export async function getPickupAvailabilityByDate(req, res) {
    try {
        const { date, citizenId } = req.query;
        if (!date) return handleErrorClient(res, 400, "La fecha es obligatoria");

        const slots = await getPickupAvailabilityByDateService(date, citizenId);
        handleSuccess(res, 200, "Disponibilidad de retiro obtenida exitosamente", slots);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener disponibilidad de retiro", error.message);
    }
}

export async function exportRequestsReport(req, res) {
    try {
        const { date } = req.query;

        if (!date) {
            return handleErrorClient(res, 400, "La fecha es obligatoria");
        }

        const workbook = await generateRequestsReportService(date);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=renovaciones-${date}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        if (error.message?.includes("La exportación solo está disponible cuando el período esté cerrado")) {
            return handleErrorClient(res, 403, error.message);
        }
        if (
            error.message?.includes("No existe un período cerrado para exportar") ||
            error.message?.includes("La fecha no pertenece al último período cerrado") ||
            error.message?.includes("No hay solicitudes para esa fecha")
        ) {
            return handleErrorClient(res, 404, error.message);
        }

        handleErrorServer(res, 500, "Error al exportar el reporte de solicitudes", error.message);
    }
}

export async function getRequestReportDates(req, res) {
    try {
        const dates = await getRequestReportDatesService();
        handleSuccess(
            res,
            200,
            dates.length > 0
                ? "Fechas de solicitudes obtenidas exitosamente"
                : "No hay fechas disponibles para exportar en el último período cerrado",
            dates
        );
    } catch (error) {
        if (error.message?.includes("La exportación solo está disponible cuando el período esté cerrado")) {
            return handleSuccess(res, 200, "Exportación bloqueada mientras el período esté activo", []);
        }
        if (error.message?.includes("No existe un período cerrado para exportar")) {
            return handleSuccess(res, 200, "No hay períodos cerrados para exportar", []);
        }
        handleErrorServer(res, 500, "Error al obtener fechas de solicitudes", error.message);
    }
}

