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
import { periodBodyValidation, periodActiveUpdateValidation } from "../validations/period.validation.js";

const isPeriodActiveNow = (period) => {
    const now = new Date();
    const startDate = new Date(period.startDate);
    const closingDate = new Date(period.closingDate);
    return startDate <= now && closingDate >= now;
};

export async function createPeriod(req, res) {
    try {
        const { body } = req;
        const { error, value } = periodBodyValidation.validate(body);

        if (error) {
            return handleErrorClient(res, 400, "Parametros invalidos", error.message);
        }

        const overlap = await checkPeriodOverlapService(value.startDate, value.closingDate);

        if (overlap) {
            return handleErrorClient(res, 400, "Ya existe un periodo activo en esas fechas");
        }

        const newPeriod = await createPeriodService(value);
        handleSuccess(res, 201, "Periodo creado exitosamente", newPeriod);
    } catch (error) {
        handleErrorServer(res, 500, "Error al crear el periodo", error.message);
    }
}

export async function getPeriods(req, res) {
    try {
        const periods = await getPeriodService();
        handleSuccess(res, 200, "Periodos obtenidos exitosamente", periods);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener los periodos", error.message);
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
        handleErrorServer(res, 500, "Error al obtener el periodo", error.message);
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
                return handleErrorClient(res, 400, "Parametros invalidos", error.message);
            }

            const newClosingDate = new Date(value.closingDate);
            const now = new Date();
            const existingStartDate = new Date(existingPeriod.startDate);

            if (newClosingDate <= now) {
                return handleErrorClient(
                    res,
                    400,
                    "La fecha de termino del periodo activo debe ser posterior a la fecha actual"
                );
            }

            if (newClosingDate <= existingStartDate) {
                return handleErrorClient(
                    res,
                    400,
                    "La fecha de termino debe ser posterior a la fecha de inicio"
                );
            }

            const periodUpdate = await updatePeriodService(id, {
                ...existingPeriod,
                closingDate: value.closingDate,
            });
            return handleSuccess(res, 200, "Periodo actualizado exitosamente", periodUpdate);
        }

        const { error, value } = periodBodyValidation.validate(body);
        if (error) {
            return handleErrorClient(res, 400, "Parametros invalidos", error.message);
        }

        const overlap = await checkPeriodOverlapService(value.startDate, value.closingDate, id);

        if (overlap) {
            return handleErrorClient(res, 400, "Ya existe un periodo activo en esas fechas");
        }

        const periodUpdate = await updatePeriodService(id, value);
        handleSuccess(res, 200, "Periodo actualizado exitosamente", periodUpdate);
    } catch (error) {
        if (error.message === "Period no encontrado") {
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al actualizar el periodo", error.message);
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
                "No se puede eliminar un periodo activo. Solo puedes modificar su fecha de termino."
            );
        }

        const result = await deletePeriodService(id);
        handleSuccess(res, 200, result.message);
    } catch (error) {
        if (error.message === "Period no encontrado") {
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al eliminar el periodo", error.message);
    }
}

export async function getActivePeriod(req, res) {
    try {
        const period = await checkActivePeriodService();

        if (!period) {
            return handleSuccess(res, 200, "No hay periodo activo", null);
        }

        return handleSuccess(res, 200, "Periodo activo", period);
    } catch (error) {
        console.error("Error al obtener periodo activo:", error);
        handleErrorServer(res, 500, "Error al obtener el periodo activo", error.message);
    }
}
