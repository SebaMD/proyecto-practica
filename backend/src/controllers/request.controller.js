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
    getRenewalQuotaService,
    cancelPendingRequestByCitizenService,
} from "../services/request.service.js";
import {
    createRequestBodyValidation,
    reviewRequestValidation,
} from "../validations/request.validation.js";
import jwt from "jsonwebtoken";
import { checkActivePeriodService } from "../services/period.service.js";
import { getIO } from "../socket.js";

const emitRenewalQuotaUpdated = async () => {
    try {
        const io = getIO();
        const quota = await getRenewalQuotaService();
        io.emit("renewal:quota-updated", quota);
    } catch (error) {
        console.error("Socket emit error (renewal:quota-updated):", error.message);
    }
};

export async function createRequest(req, res) {
    try {
        const isPeriodActive = await checkActivePeriodService();
        if (!isPeriodActive) {
            return handleErrorClient(
                res,
                403,
                "El proceso de renovacion no esta disponible para los ciudadanos en este momento."
            );
        }

        const { body } = req;
        const { error } = createRequestBodyValidation.validate(body);
        if (error) return handleErrorClient(res, 400, "Parametros invalidos", error.message);

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);
        body.citizenId = payload.id;

        const hasRequest = await hasRequestOfPetitionService(payload.id, body.petitionId);
        if (hasRequest) {
            return handleErrorClient(res, 409, "Ya existe una solicitud activa o aprobada para la peticion indicada");
        }

        const quota = await getRenewalQuotaService();
        if (quota.available <= 0) {
            return handleErrorClient(
                res,
                409,
                `No hay cupos de renovacion disponibles hoy. Intenta nuevamente manana (maximo diario: ${quota.max}).`
            );
        }

        const newRequest = await createRequestService(body);
        await emitRenewalQuotaUpdated();
        handleSuccess(res, 201, "Solicitud creada exitosamente", newRequest);
    } catch (error) {
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
        }

        if (requests.length === 0) return handleSuccess(res, 200, "No hay solicitudes disponibles");
        handleSuccess(res, 200, "Solicitudes obtenidas exitosamente", requests);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener las solicitudes", error.message);
    }
}

export async function getRenewalQuota(req, res) {
    try {
        const quota = await getRenewalQuotaService();
        handleSuccess(res, 200, "Cupo de renovacion obtenido exitosamente", quota);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener el cupo de renovacion", error.message);
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
        if (error) return handleErrorClient(res, 400, "Parametros invalidos", error.message);

        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];
        const payload = jwt.decode(token, process.env.JWT_SECRET);
        body.reviewerId = payload.id;

        const updatedRequest = await reviewRequestService(id, body);
        await emitRenewalQuotaUpdated();
        handleSuccess(res, 200, "Solicitud revisada exitosamente", updatedRequest);
    } catch (error) {
        if (error.message === "Solicitud no encontrada") {
            handleErrorClient(res, 404, error.message);
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
        await emitRenewalQuotaUpdated();
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
