"use strict";

import { Petition } from "../entities/petition.entity.js";
import { Appointment } from "../entities/appointment.entity.js";
import { AppDataSource } from "../config/configDb.js";
import {
    handleErrorClient,
    handleErrorServer,
} from "../handlers/responseHandlers.js";
import { petitionBodyValidation } from "../validations/petition.validation.js";
import { createPetitionService } from "../services/petition.service.js";

export async function getAllPetitions(req, res) {
    try {
        const petitionRepository = AppDataSource.getRepository(Petition);

        const petitions = await petitionRepository.find({ order: { createdAt: "DESC" } });

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
        const { id } = req.params;
        const petitionRepository = AppDataSource.getRepository(Petition);

        const petition = await petitionRepository.findOne({
            where: { id: parseInt(id) }
        });

        if (!petition) {
            return handleErrorClient(res, 404, "Peticion no encontrada.");
        }

        return res.status(200).json({ message: "Peticion encontrada:", data: petition });
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

        const petitionRepository = AppDataSource.getRepository(Petition);

        const newPetition = await createPetitionService(value);

        await petitionRepository.save(newPetition);

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

        const petitionRepository = AppDataSource.getRepository(Petition);
        const petition = await petitionRepository.findOne({ where: { id: parseInt(id/*, 10*/) } });

        if (!petition) {
            return handleErrorClient(res, 404, "Peticion no encontrada.");
        }

        Object.assign(petition, value);
        await petitionRepository.save(petition);

        return res.status(200).json({
            message: "Peticion actualizada exitosamente",
            data: petition,
        });
    } catch (error) {
        console.error("Error al actualizar la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}


export async function deletePetition(req, res) {
    try {
        const { id } = req.params;

        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo los funcionarios pueden eliminar peticiones.");
        }

        const petitionRepository = AppDataSource.getRepository(Petition);
        const petition = await petitionRepository.findOne({ where: { id: parseInt(id/*, 10*/) } });

        if (!petition) {
            return handleErrorClient(res, 404, "Peticion no encontrada.");
        }

        const inscriptionRepository = AppDataSource.getRepository(Appointment);
        const approvedAppointments = await inscriptionRepository.find({
            where: {
                petitionId: parseInt(id),
                status: "aprobado"
            }
        });

        if (approvedAppointments.length > 0) {
            return handleErrorClient(
                res, 
                400, 
                "No se puede eliminar la peticion porque tiene ciudadanos inscritos.");
        }

        await petitionRepository.delete({ id: parseInt(id) });

        return res.status(200).json({ message: "Peticion eliminada exitosamente." });
    } catch (error) {
        console.error("Error al eliminar la peticion:", error);
        return handleErrorServer(res, 500, error.message);
    }
}