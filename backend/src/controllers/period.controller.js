import { 
    handleErrorClient, 
    handleErrorServer, 
    handleSuccess 
} from "../handlers/responseHandlers.js";
import { 
    createPeriodService, 
    getPeriodService, 
    getPeriodByIdService, 
    checkActivePeriodService, 
    updatePeriodService, 
    deletePeriodService,
    checkPeriodOverlapService
} from "../services/period.service.js";
import { periodBodyValidation } from "../validations/period.validation.js";

export async function createPeriod(req, res) {
    try {
        const { body } = req;
        const { error, value } = periodBodyValidation.validate(body);

        if (error) {
        return handleErrorClient(res, 400, "Parámetros inválidos", error.message);
        }

        const overlap = await checkPeriodOverlapService(
            value.startDate,
            value.closingDate
        );

        if (overlap) {
            return handleErrorClient(
                res, 
                400, 
                "Ya existe un periodo activo en esas fechas"
            );
        }

        const newPeriod = await createPeriodService(value);
        handleSuccess(res, 201, "Período creado exitosamente", newPeriod);
    } catch (error) {
        handleErrorServer(res, 500, "Error al crear el período", error.message);
    }
}

export async function getPeriods(req, res) {
    try {
        const periods = await getPeriodService();
        handleSuccess(res, 200, "Períodos obtenidos exitosamente", periods);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener los períodos", error.message);
    }
}

export async function getPeriodById(req, res) {
    try {
        const { id } = req.params;
        const period = await getPeriodByIdService(id);
        handleSuccess(res, 200, "Período encontrado", period);
    } catch (error) {
        if (error.message === "Período no encontrado") {
        return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al obtener el período", error.message);
    }
}

export async function updatePeriod(req, res) {
    try {
        const { id } = req.params;
        const { body } = req;

        const { error, value } = periodBodyValidation.validate(body);
        if (error) {
        return handleErrorClient(res, 400, "Parámetros inválidos", error.message);
        }

        const overlap = await checkPeriodOverlapService(
            value.startDate,
            value.closingDate,
            id
        );

        if (overlap) {
            return handleErrorClient(
                res, 
                400, 
                "Ya existe un period activo en esas fechas"
            );
        }

        const periodUpdate = await updatePeriodService(id, value);
        handleSuccess(res, 200, "Período actualizado exitosamente", periodUpdate);
    } catch (error) {
        if (error.message === "Período no encontrado") {
        return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al actualizar el período", error.message);
    }
}

export async function deletePeriod(req, res) {
    try {
        const { id } = req.params;
        const result = await deletePeriodService(id);
        handleSuccess(res, 200, result.message);
    } catch (error) {
        if (error.message === "Período no encontrado") {
        return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al eliminar el período", error.message);
    }
}

export async function getActivePeriod(req, res) {
    try {
        const period = await checkActivePeriodService();

        if (!period) {
            return handleSuccess(res, 200, "No hay período activo", null);
        }

        return handleSuccess(res, 200, "Periodo activo", period);
    } catch (error) {
        console.error("Error al obtener período activo:", error);
        handleErrorServer(res, 500, "Error al obtener el período activo", error.message);
    }
}