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

// Verifica si existe una solicitud en status pendiente o aprobada según el id de la peticion
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
        request.rejectReason = data.rejectReason;
    }

    const updatedRequest = await requestRepository.save(request);

    // En caso de aprobar la solicitud, se crea la inscripción
    if (request.status === "aprobado") {
        if (!data.petitionScheduleId) {
            throw new Error("petitionScheduleId es obligatorio para aprobar la solicitud");
        }

        const { citizenId, petitionId } = request;
        const appointmentRepository = AppDataSource.getRepository(Appointment);

        const newAppointment = appointmentRepository.create({
            userId: citizenId,
            petitionId,
            petitionScheduleId: data.petitionScheduleId,
            status: "pendiente",
        });

        return await appointmentRepository.save(newAppointment);
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
