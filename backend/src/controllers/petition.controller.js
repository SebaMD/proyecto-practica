import {
    handleErrorClient,
    handleErrorServer,
} from "../handlers/responseHandlers.js";
import { petitionBodyValidation } from "../validations/petition.validation.js";
import { 
    createPetitionService,
    deletePetitionService,
    getPetitionByIdService,
    getPetitionsService,
    updatePetitionService 
} from "../services/petition.service.js";

export async function getAllPetitions(req, res) {
    try {
        const petitions = await getPetitionsService();

        return res.status(200).json({
            message: petitions.length === 0 ? "No hay peticiones disponibles." : "Peticiones encontradas:",
            data: petitions
        });
    } catch (error) {
        console.error("Error al obtener la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}

export async function getPetitionById(req, res) {
    try {
        const petitions = await getPetitionByIdService(req.params.id);

        if (!petitions) {
            return handleErrorClient(res, 404, "Peticion no encontrada.");
        }

        return res.status(200).json({ message: "Peticion encontrada:", data: petitions });
    } catch (error) {
        console.error("Error al obtener la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}

export async function createPetition(req, res) {
    try {
        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo los funcionarios pueden crear peticiones.");
        }

        const { error, value } = petitionBodyValidation.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const messages = error.details.map(detail => detail.message);
            return handleErrorClient(res, 400, "Error de validación", messages.join(", "));
        }

        const newPetition = await createPetitionService(value);

        return res.status(201).json({
            message: "Peticion creada exitosamente.",
            data: newPetition
        });
    } catch (error) {
        console.error("Error al crear la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}

export async function updatePetition(req, res) {
    try {
        const { id } = req.params;

        const updateSchema = petitionBodyValidation.fork(
            ["name", "description", "objectives", "prerrequisites", "dailyQuotas"],
            (schema) => schema.optional()
        );

        const { error, value } = updateSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const messages = error.details.map(detail => detail.message);
            return handleErrorClient(res, 400, "Error de validación", messages.join(", "));
        }

        const petitions = await updatePetitionService(id, value);

        if (!petitions) {
            return handleErrorClient(res, 404, "Peticion no encontrada.");
        }

        return res.status(200).json({
            message: "Peticion actualizada exitosamente",
            data: petitions,
        });
    } catch (error) {
        console.error("Error al actualizar la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}

export async function deletePetition(req, res) {
    try {
        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo los funcionarios pueden eliminar peticiones.");
        }

        const petition = await deletePetitionService(req.params.id);

        return res.status(200).json({
            data: petition,
        });
    } catch (error) {
        console.error("Error al eliminar la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}