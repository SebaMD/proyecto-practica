import {
    handleErrorClient,
    handleErrorServer,
    handleSuccess,
} from "../handlers/responseHandlers.js";
import {
    createPeriodService,
    getPeriodService,
    getPeriodByIdService,
    checkActivePeriodService,
    updatePeriodService,
    deletePeriodService,
    checkPeriodOverlapService,
} from "../services/period.service.js";
import { getApprovedCitizenAndSupervisorUsersService } from "../services/user.service.js";
import { sendPeriodScheduledNotifications } from "../services/email.service.js";
import { periodBodyValidation, periodActiveUpdateValidation } from "../validations/period.validation.js";

const isPeriodActiveNow = (period) => {
    const now = new Date();
    const startDate = new Date(period.startDate);
    const closingDate = new Date(period.closingDate);
    return startDate <= now && closingDate >= now;
};

const notifyUsersWhenPeriodIsCreatedOrUpdated = async (period) => {
    if (!period) return;

    try {
        const usersToNotify = await getApprovedCitizenAndSupervisorUsersService();
        await sendPeriodScheduledNotifications(usersToNotify, period);
    } catch (error) {
        console.error("[Period Controller] No se pudieron enviar correos del período  programado:", error.message);
    }
};

const PERIOD_MIN_DURATION_MS = 2 * 24 * 60 * 60 * 1000;
const hasMinPeriodDuration = (startDate, closingDate) =>
    (new Date(closingDate).getTime() - new Date(startDate).getTime()) >= PERIOD_MIN_DURATION_MS;

export async function createPeriod(req, res) {
    try {
        const { body } = req;
        const { error, value } = periodBodyValidation.validate(body);

        if (error) {
            return handleErrorClient(res, 400, "parámetros inválidos", error.message);
        }

        const overlap = await checkPeriodOverlapService(value.startDate, value.closingDate);

        if (overlap) {
            return handleErrorClient(res, 400, "Ya existe un período  activo en esas fechas");
        }

        const newPeriod = await createPeriodService(value);
        await notifyUsersWhenPeriodIsCreatedOrUpdated(newPeriod);
        handleSuccess(res, 201, "Periodo creado exitosamente", newPeriod);
    } catch (error) {
        handleErrorServer(res, 500, "Error al crear el período ", error.message);
    }
}

export async function getPeriods(req, res) {
    try {
        const periods = await getPeriodService();
        handleSuccess(res, 200, "Periodos obtenidos exitosamente", periods);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener los períodos", error.message);
    }
}

export async function getPeriodById(req, res) {
    try {
        const { id } = req.params;
        const period = await getPeriodByIdService(id);
        handleSuccess(res, 200, "Periodo encontrado", period);
    } catch (error) {
        if (error.message === "Period no encontrado") {
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al obtener el período ", error.message);
    }
}

export async function updatePeriod(req, res) {
    try {
        const { id } = req.params;
        const { body } = req;

        const existingPeriod = await getPeriodByIdService(id);

        if (isPeriodActiveNow(existingPeriod)) {
            const { error, value } = periodActiveUpdateValidation.validate(body);
            if (error) {
                return handleErrorClient(res, 400, "parámetros inválidos", error.message);
            }

            const newClosingDate = new Date(value.closingDate);
            const now = new Date();
            const existingStartDate = new Date(existingPeriod.startDate);

            if (newClosingDate <= now) {
                return handleErrorClient(
                    res,
                    400,
                    "La fecha de término del período  activo debe ser posterior a la fecha actual"
                );
            }

            if (newClosingDate <= existingStartDate) {
                return handleErrorClient(
                    res,
                    400,
                    "La fecha de termino debe ser posterior a la fecha de inicio"
                );
            }

            if (!hasMinPeriodDuration(existingStartDate, newClosingDate)) {
                return handleErrorClient(
                    res,
                    400,
                    "El período  debe tener una duración mínima de 2 días."
                );
            }

            const periodUpdate = await updatePeriodService(id, {
                ...existingPeriod,
                closingDate: value.closingDate,
            });
            await notifyUsersWhenPeriodIsCreatedOrUpdated(periodUpdate);
            return handleSuccess(res, 200, "Periodo actualizado exitosamente", periodUpdate);
        }

        const { error, value } = periodBodyValidation.validate(body);
        if (error) {
            return handleErrorClient(res, 400, "parámetros inválidos", error.message);
        }

        const overlap = await checkPeriodOverlapService(value.startDate, value.closingDate, id);

        if (overlap) {
            return handleErrorClient(res, 400, "Ya existe un período  activo en esas fechas");
        }

        if (!hasMinPeriodDuration(value.startDate, value.closingDate)) {
            return handleErrorClient(
                res,
                400,
                "El período  debe tener una duración mínima de 2 días."
            );
        }

        const periodUpdate = await updatePeriodService(id, value);
        await notifyUsersWhenPeriodIsCreatedOrUpdated(periodUpdate);
        handleSuccess(res, 200, "Periodo actualizado exitosamente", periodUpdate);
    } catch (error) {
        if (error.message === "Period no encontrado") {
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al actualizar el período ", error.message);
    }
}

export async function deletePeriod(req, res) {
    try {
        const { id } = req.params;
        const period = await getPeriodByIdService(id);

        if (isPeriodActiveNow(period)) {
            return handleErrorClient(
                res,
                409,
                "No se puede eliminar un período  activo. Solo puedes modificar su fecha de término."
            );
        }

        const result = await deletePeriodService(id);
        handleSuccess(res, 200, result.message);
    } catch (error) {
        if (error.message === "Period no encontrado") {
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al eliminar el período ", error.message);
    }
}

export async function getActivePeriod(req, res) {
    try {
        const period = await checkActivePeriodService();

        if (!period) {
            return handleSuccess(res, 200, "No hay período  activo", null);
        }

        return handleSuccess(res, 200, "Periodo activo", period);
    } catch (error) {
        console.error("Error al obtener período  activo:", error);
        handleErrorServer(res, 500, "Error al obtener el período  activo", error.message);
    }
}
