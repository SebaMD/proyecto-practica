import { AppDataSource } from "../config/configDb.js";
import { Petition } from "../entities/petition.entity.js";
import { Appointment } from "../entities/appointment.entity.js";
import { Request } from "../entities/request.entity.js";

export async function createRequestService(data) {
    const requestRepository = AppDataSource.getRepository(Request);

    const newRequest = requestRepository.create(data);
    return await requestRepository.save(newRequest);
    }

export async function getRequestsService() {
    const requestRepository = AppDataSource.getRepository(Request);

    return await requestRepository.find();
}

export async function getRequestByIdService(id) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id: parseInt(id) });

    if (!request) throw new Error("Solicitud no encontrada");

    return request;
}

// Verifica si existe una solicitud en estado pendiente o aprobada según el id de la peticion
export async function hasRequestOfPetitionService(citizenId, petitionId) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.find({
        where: [
        { citizenId, petitionId, status: "pendiente" },
        { citizenId, petitionId, status: "aprobado" },
        ],
    });

    if (request.length === 0) return false;

    return true;
}

export async function reviewRequestService(id, data) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await getRequestByIdService(id);

    request.status = data.status;
    request.reviewerId = data.reviewerId;
    request.reviewedAt = new Date(); // Revisado en la fecha actual

    if (data.status === "rechazado") {
        request.reviewComment = data.reviewComment;
    }

    const updatedRequest = await requestRepository.save(request);

    // En caso de aprobar la solicitud, se crea la inscripción
    if (request.status === "aprobado") {
        const { citizenId, petitionId } = request;
        const inscriptionRepository = AppDataSource.getRepository(Appointment);
        const petitionRepository = AppDataSource.getRepository(Petition);
        const petition = await petitionRepository.findOne({ where: { id: petitionId } });

        if (petition.quotas > 0) petition.quotas -= 1;
        await petitionRepository.save(petition);
        const newAppointment = inscriptionRepository.create({
        userId: citizenId,
        petitionId: petition.id,
        estado: "aprobado",
        reviewedAt: new Date(),
        });

        return await inscriptionRepository.save(newAppointment);
    }

    return updatedRequest;
}

// Implementada solo para admin!
export async function deleteRequest(id) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id });

    if (!request) return false;

    await requestRepository.delete(request);
    return true;
}
