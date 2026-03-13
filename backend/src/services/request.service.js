import { AppDataSource } from "../config/configDb.js";
import { Request } from "../entities/request.entity.js";
import { User } from "../entities/user.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { In } from "typeorm";
import { Appointment } from "../entities/appointment.entity.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";

const GLOBAL_DAILY_QUOTA = 15;
const SLOT_CAPACITY = 2;
const PICKUP_SLOTS = [
    ["08:00", "08:30"],
    ["08:30", "09:00"],
    ["09:00", "09:30"],
    ["09:30", "10:00"],
    ["10:00", "10:30"],
    ["10:30", "11:00"],
    ["11:00", "11:30"],
    ["11:30", "12:00"],
    ["12:00", "12:30"],
    ["12:30", "13:00"],
];

function toMinutes(time) {
    const [h = 0, m = 0] = String(time || "00:00").split(":").map(Number);
    return (h * 60) + m;
}

function add30Minutes(time) {
    const total = toMinutes(time) + 30;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

function getConsumedDateForRequest(request) {
    if (!request) return null;
    if (request.status === "aprobado" && request.pickupDate) return request.pickupDate;
    return request.requestDate;
}

function normalizeDateOnly(value) {
    return String(value || "").slice(0, 10);
}

function getSlotKey(date, startTime, endTime) {
    return `${date}|${startTime}|${endTime}`;
}

export async function getPickupAvailabilityByDateService(date, citizenId = null) {
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const requestRepository = AppDataSource.getRepository(Request);
    const normalizedCitizenId = citizenId ? Number(citizenId) : null;

    const occupancy = new Map();
    const blockedForCitizen = new Set();

    const activeAppointments = await appointmentRepository.find({
        where: {
            status: In(["pendiente", "aprobado"]),
        },
        relations: {
            schedule: true,
        },
    });

    for (const appointment of activeAppointments) {
        const schedule = appointment?.schedule;
        if (!schedule || schedule.date !== date) continue;
        const startTime = String(schedule.startTime).slice(0, 5);
        const endTime = String(schedule.endTime).slice(0, 5);
        const key = getSlotKey(date, startTime, endTime);
        occupancy.set(key, Number(occupancy.get(key) || 0) + 1);

        if (normalizedCitizenId && Number(appointment.userId) === normalizedCitizenId) {
            blockedForCitizen.add(key);
        }
    }

    if (normalizedCitizenId) {
        const approvedRequests = await requestRepository.find({
            where: {
                citizenId: normalizedCitizenId,
                status: "aprobado",
            },
            select: ["pickupDate", "pickupTime"],
        });

        for (const request of approvedRequests) {
            if (!request?.pickupDate || !request?.pickupTime) continue;
            if (String(request.pickupDate) !== String(date)) continue;

            const startTime = String(request.pickupTime).slice(0, 5);
            const endTime = add30Minutes(startTime);
            blockedForCitizen.add(getSlotKey(date, startTime, endTime));
        }
    }

    return PICKUP_SLOTS.map(([startTime, endTime]) => {
        const key = getSlotKey(date, startTime, endTime);
        const used = Number(occupancy.get(key) || 0);
        const remaining = Math.max(0, SLOT_CAPACITY - used);
        const isBlockedForCitizen = blockedForCitizen.has(key);
        return {
            date,
            startTime,
            endTime,
            used,
            slotCapacity: SLOT_CAPACITY,
            slotRemaining: remaining,
            available: remaining > 0 && !isBlockedForCitizen,
            blockedForCitizen: isBlockedForCitizen,
        };
    });
}

async function attachCitizenData(requests) {
    if (!Array.isArray(requests) || requests.length === 0) return requests;

    const citizenIds = [...new Set(requests.map((r) => r.citizenId).filter(Boolean))];
    const reviewerIds = [...new Set(requests.map((r) => r.reviewerId).filter(Boolean))];
    const petitionIds = [...new Set(requests.map((r) => r.petitionId).filter(Boolean))];

    const userRepository = AppDataSource.getRepository(User);
    const petitionRepository = AppDataSource.getRepository(Petition);

    const allUserIds = [...new Set([...citizenIds, ...reviewerIds])];
    const users = allUserIds.length > 0
        ? await userRepository.find({
            where: {
                id: In(allUserIds),
            },
        })
        : [];

    const userMap = new Map(
        users.map((u) => [u.id, { id: u.id, username: u.username, email: u.email, rut: u.rut }])
    );

    const petitions = petitionIds.length > 0
        ? await petitionRepository.find({
            where: {
                id: In(petitionIds),
            },
            select: ["id", "name"],
        })
        : [];

    const petitionMap = new Map(
        petitions.map((p) => [p.id, { id: p.id, name: p.name }])
    );

    return requests.map((request) => ({
        ...request,
        citizen: userMap.get(request.citizenId) || null,
        reviewer: userMap.get(request.reviewerId) || null,
        petition: petitionMap.get(request.petitionId) || null,
    }));
}

export async function createRequestService(data) {
    const requestRepository = AppDataSource.getRepository(Request);
    const newRequest = requestRepository.create(data);
    return await requestRepository.save(newRequest);
}

export async function hasCitizenReservationOnDateService(citizenId, date, excludedRequestId = null) {
    if (!citizenId || !date) return false;
    const normalizedDate = normalizeDateOnly(date);

    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const requestRepository = AppDataSource.getRepository(Request);

    const activeAppointments = await appointmentRepository.find({
        where: {
            userId: citizenId,
            status: In(["pendiente", "aprobado"]),
        },
        relations: {
            schedule: true,
        },
    });

    const hasAppointmentOnDate = activeAppointments.some(
        (appointment) => normalizeDateOnly(appointment?.schedule?.date) === normalizedDate
    );

    if (hasAppointmentOnDate) {
        return true;
    }

    const activeRequests = await requestRepository.find({
        where: {
            citizenId,
            status: In(["pendiente", "aprobado"]),
        },
        select: ["id", "status", "requestDate", "pickupDate"],
    });

    return activeRequests.some((request) => {
        if (excludedRequestId && Number(request.id) === Number(excludedRequestId)) {
            return false;
        }
        return normalizeDateOnly(getConsumedDateForRequest(request)) === normalizedDate;
    });
}

export async function countGlobalUsedForDateService(date, excludedRequestId = null) {
    if (!date) return 0;

    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const requestRepository = AppDataSource.getRepository(Request);
    const activeAppointments = await appointmentRepository.find({
        where: {
            status: In(["pendiente", "aprobado"]),
        },
        relations: {
            schedule: true,
        },
    });

    const appointmentsUsed = activeAppointments.filter(
        (appointment) => appointment?.schedule?.date === date
    ).length;

    const activeRequests = await requestRepository.find({
        where: {
            status: In(["pendiente", "aprobado"]),
        },
        select: ["id", "status", "requestDate", "pickupDate"],
    });

    const activeRequestsUsed = activeRequests.filter((request) => {
        if (excludedRequestId && Number(request.id) === Number(excludedRequestId)) {
            return false;
        }
        return getConsumedDateForRequest(request) === date;
    }).length;

    return appointmentsUsed + activeRequestsUsed;
}

export async function getRequestDateUsageService() {
    const requestRepository = AppDataSource.getRepository(Request);
    const pendingRequests = await requestRepository.find({
        where: {
            status: "pendiente",
        },
        select: ["requestDate"],
    });

    const usage = {};
    pendingRequests.forEach((request) => {
        const date = request?.requestDate;
        if (!date) return;
        usage[date] = Number(usage[date] || 0) + 1;
    });

    const response = Object.entries(usage).map(([date, used]) => ({
        date,
        used,
        available: Math.max(0, GLOBAL_DAILY_QUOTA - used),
        max: GLOBAL_DAILY_QUOTA,
    }));

    return response.sort((a, b) => a.date.localeCompare(b.date));
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
        const pickupDate = data.pickupDate;
        const pickupTime = data.pickupTime;
        const pickupEndTime = add30Minutes(pickupTime);
        const appointmentRepository = AppDataSource.getRepository(Appointment);
        const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
        if (request.requestDate && pickupDate !== request.requestDate) {
            throw new Error("La fecha de retiro debe coincidir con la fecha solicitada por el ciudadano");
        }

        const hasReservationOnDate = await hasCitizenReservationOnDateService(request.citizenId, pickupDate, request.id);
        if (hasReservationOnDate) {
            throw new Error("El ciudadano ya tiene una reserva activa para la fecha seleccionada");
        }

        const existingSchedule = await scheduleRepository.findOne({
            where: {
                petitionId: request.petitionId,
                date: pickupDate,
                startTime: pickupTime,
                endTime: pickupEndTime,
            },
        });
        if (!existingSchedule) {
            throw new Error("La hora seleccionada no existe en la petición para esa fecha");
        }

        const globalUsed = await countGlobalUsedForDateService(pickupDate, request.id);
        if (globalUsed >= GLOBAL_DAILY_QUOTA) {
            throw new Error(`No hay cupos disponibles para la fecha ${pickupDate}. Máximo diario: ${GLOBAL_DAILY_QUOTA}`);
        }

        const activeAppointments = await appointmentRepository.find({
            where: {
                status: In(["pendiente", "aprobado"]),
            },
            relations: {
                schedule: true,
            },
        });

        const occupiedCount = activeAppointments.filter((appointment) => {
            const schedule = appointment?.schedule;
            if (!schedule) return false;
            if (schedule.date !== pickupDate) return false;

            const start = String(schedule.startTime).slice(0, 5);
            const end = String(schedule.endTime).slice(0, 5);
            return start === pickupTime && end === pickupEndTime;
        }).length;

        if (occupiedCount >= SLOT_CAPACITY) {
            throw new Error("Ese horario ya fue tomado por una inscripción");
        }

        const sameCitizenAppointment = activeAppointments.some((appointment) => {
            const schedule = appointment?.schedule;
            if (!schedule) return false;
            if (Number(appointment.userId) !== Number(request.citizenId)) return false;
            if (schedule.date !== pickupDate) return false;

            const start = String(schedule.startTime).slice(0, 5);
            const end = String(schedule.endTime).slice(0, 5);
            return start === pickupTime && end === pickupEndTime;
        });

        if (sameCitizenAppointment) {
            throw new Error("El ciudadano ya tiene una cita asignada en ese mismo horario");
        }

        const sameCitizenApprovedRequest = await requestRepository.findOne({
            where: {
                citizenId: request.citizenId,
                status: "aprobado",
                pickupDate,
                pickupTime,
            },
        });

        if (sameCitizenApprovedRequest) {
            throw new Error("El ciudadano ya tiene una cita asignada en ese mismo horario");
        }

        request.pickupDate = pickupDate;
        request.pickupTime = pickupTime;
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

export async function archiveReviewedRequestByFuncionarioService(id, reviewerId) {
    const requestRepository = AppDataSource.getRepository(Request);
    const request = await requestRepository.findOneBy({ id: parseInt(id) });

    if (!request) throw new Error("Solicitud no encontrada");
    if (request.status === "pendiente") {
        throw new Error("Solo se pueden archivar solicitudes revisadas");
    }
    if (Number(request.reviewerId) !== Number(reviewerId)) {
        throw new Error("La solicitud no pertenece a las revisiones del funcionario");
    }

    if (request.status === "aprobado") {
        const pickupDate = request.pickupDate;
        const pickupTime = request.pickupTime;
        if (!pickupDate || !pickupTime) {
            throw new Error("No se pudo validar la hora de atención para archivar");
        }

        const pickupEndTime = add30Minutes(pickupTime);
        const [year, month, day] = String(pickupDate).split("-").map(Number);
        const [hour, minute] = String(pickupEndTime).split(":").map(Number);
        const endDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);

        if (new Date() < endDateTime) {
            throw new Error("Solo puedes archivar cuando haya pasado la fecha y hora de atención");
        }
    }

    request.archived = true;
    const savedRequest = await requestRepository.save(request);
    const [requestWithCitizen] = await attachCitizenData([savedRequest]);
    return requestWithCitizen;
}
