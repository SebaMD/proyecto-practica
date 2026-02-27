import { AppDataSource } from "../config/configDb.js";
import { Request } from "../entities/request.entity.js";
import { User } from "../entities/user.entity.js";
import { In, Between } from "typeorm";

const GLOBAL_RENEWAL_DAILY_QUOTA = 10;

function getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export async function getRenewalQuotaService() {
    const requestRepository = AppDataSource.getRepository(Request);
    const { start, end } = getTodayRange();

    const used = await requestRepository.count({
        where: [
            { status: "pendiente", createdAt: Between(start, end) },
            { status: "aprobado", createdAt: Between(start, end) },
        ],
    });

    return {
        used,
        available: Math.max(0, GLOBAL_RENEWAL_DAILY_QUOTA - used),
        max: GLOBAL_RENEWAL_DAILY_QUOTA,
    };
}

async function attachCitizenData(requests) {
    if (!Array.isArray(requests) || requests.length === 0) return requests;

    const citizenIds = [...new Set(requests.map((r) => r.citizenId).filter(Boolean))];
    if (citizenIds.length === 0) return requests;

    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find({
        where: {
            id: In(citizenIds),
        },
    });

    const userMap = new Map(
        users.map((u) => [u.id, { id: u.id, username: u.username, email: u.email, rut: u.rut }])
    );

    return requests.map((request) => ({
        ...request,
        citizen: userMap.get(request.citizenId) || null,
    }));
}

export async function createRequestService(data) {
    const requestRepository = AppDataSource.getRepository(Request);
    const newRequest = requestRepository.create(data);
    return await requestRepository.save(newRequest);
}

export async function getRequestsService() {
    const requestRepository = AppDataSource.getRepository(Request);
    const requests = await requestRepository.find();
    return await attachCitizenData(requests);
}

export async function getRequestByIdService(id) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id: parseInt(id) });

    if (!request) throw new Error("Solicitud no encontrada");
    const [requestWithCitizen] = await attachCitizenData([request]);
    return requestWithCitizen;
}

export async function hasRequestOfPetitionService(citizenId, petitionId) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.find({
        where: [
            { citizenId, petitionId, status: "pendiente" },
            { citizenId, petitionId, status: "aprobado" },
        ],
    });

    return request.length > 0;
}

export async function reviewRequestService(id, data) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id: parseInt(id) });

    if (!request) throw new Error("Solicitud no encontrada");

    request.status = data.status;
    request.reviewerId = data.reviewerId;
    request.reviewedAt = new Date();
    request.rejectReason = null;
    request.pickupDate = null;
    request.pickupTime = null;

    if (data.status === "rechazado") {
        request.rejectReason = data.rejectReason;
    }

    if (data.status === "aprobado") {
        request.pickupDate = data.pickupDate;
        request.pickupTime = data.pickupTime;
    }

    const savedRequest = await requestRepository.save(request);
    const [requestWithCitizen] = await attachCitizenData([savedRequest]);
    return requestWithCitizen;
}

export async function deleteRequest(id) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id });

    if (!request) return false;

    await requestRepository.delete(request);
    return true;
}

export async function cancelPendingRequestByCitizenService(id, citizenId) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id: parseInt(id) });

    if (!request) throw new Error("Solicitud no encontrada");
    if (Number(request.citizenId) !== Number(citizenId)) {
        throw new Error("La solicitud no pertenece al ciudadano");
    }
    if (request.status !== "pendiente") {
        throw new Error("Solo se pueden cancelar solicitudes pendientes");
    }

    await requestRepository.delete(request.id);
    return true;
}
