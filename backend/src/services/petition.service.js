"use strict";

import { AppDataSource } from "../config/configDb.js";
import { Petition } from "../entities/petition.entity.js";

export async function createPetitionService(data) {
    const petitionRepository = AppDataSource.getRepository(Petition);

    const newPetition = petitionRepository.create(data);

    return await petitionRepository.save(newPetition);
}

export async function getPetitionsService() {
    const petitionRepository = AppDataSource.getRepository(Petition);
    return await petitionRepository.find({
        order: { createdAt: "DESC" }
    });
}

export async function getPetitionByIdService(id) {
    const petitionRepository = AppDataSource.getRepository(Petition);
    const petition = await petitionRepository.findOneBy({ id: parseInt(id/*, 10*/) });

    if (!petition) {
        throw new Error("Peticion no encontrada");
    }

    return petition;
}

export async function updatePetitionService(id, data) {
    const petitionRepository = AppDataSource.getRepository(Petition);
    const petition = await getPetitionByIdService(id);

    petitionRepository.merge(petition, data);
    return await petitionRepository.save(petition);
}

export async function deletePetitionService(id) {
    const petitionRepository = AppDataSource.getRepository(Petition);
    await getPetitionByIdService(id);
    const result = await petitionRepository.delete(id);

    if (result.affected === 0) {
        throw new Error("No se pudo eliminar la peticion");
    }

    return { message: "Peticion eliminada exitosamente" };
}