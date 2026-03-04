import { AppDataSource } from "../config/configDb.js";
import { Appointment } from "../entities/appointment.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { IsNull, In } from "typeorm";
import { getIO } from "../socket.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";
import { Request } from "../entities/request.entity.js";

const GLOBAL_DAILY_QUOTA = 15;
const SLOT_CAPACITY = 2;

function emitScheduleUpdated(schedule) {
    try {
        const io = getIO();

        io.emit("schedule:updated", {
            scheduleId: schedule.id,
            petitionId: schedule.petitionId,
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: schedule.status,
        });
    } catch (error) {
        console.error("Socket emit error (schedule:updated):", error.message);
    }
}

function timeToMinutes(time) {
    const [hour = 0, minute = 0] = String(time || "00:00").split(":").map(Number);
    return (hour * 60) + minute;
}

async function getSameSlotSchedules(scheduleRepository, schedule) {
    return await scheduleRepository.find({
        where: {
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
        },
    });
}

async function getSameSlotOccupancy(appointmentRepository, sameSlotSchedules) {
    if (!sameSlotSchedules.length) {
        return { activeCount: 0, pendingCount: 0 };
    }

    const scheduleIds = sameSlotSchedules.map((s) => s.id);

    const activeCount = await appointmentRepository.count({
        where: {
            petitionScheduleId: In(scheduleIds),
            status: In(["pendiente", "aprobado"]),
        },
    });

    const pendingCount = await appointmentRepository.count({
        where: {
            petitionScheduleId: In(scheduleIds),
            status: "pendiente",
        },
    });

    return { activeCount, pendingCount };
}

function getStatusByOccupancy(activeCount, pendingCount) {
    if (activeCount <= 0) return "disponible";
    if (activeCount >= SLOT_CAPACITY) return pendingCount > 0 ? "pendiente" : "tomada";
    return "pendiente";
}

async function syncSameSlotStatus(scheduleRepository, appointmentRepository, baseSchedule) {
    const sameSlotSchedules = await getSameSlotSchedules(scheduleRepository, baseSchedule);
    const { activeCount, pendingCount } = await getSameSlotOccupancy(appointmentRepository, sameSlotSchedules);
    const nextStatus = getStatusByOccupancy(activeCount, pendingCount);

    for (const item of sameSlotSchedules) {
        item.status = nextStatus;
        await scheduleRepository.save(item);
        emitScheduleUpdated(item);
    }
}

async function countActiveAppointmentsForDate(scheduleRepository, appointmentRepository, date) {
    const schedulesForDate = await scheduleRepository.find({
        where: { date },
        select: ["id"],
    });

    if (!schedulesForDate.length) return 0;

    const scheduleIds = schedulesForDate.map((s) => s.id);

    const appointmentsUsed = await appointmentRepository.count({
        where: {
            petitionScheduleId: In(scheduleIds),
            status: In(["pendiente", "aprobado"]),
        },
    });

    const requestRepository = AppDataSource.getRepository(Request);
    const requestsUsed = await requestRepository.count({
        where: {
            requestDate: date,
            status: In(["pendiente", "aprobado"]),
        },
    });

    return appointmentsUsed + requestsUsed;
}

export async function createAppointmentService(data){
    const { userId, petitionId, petitionScheduleId } = data;

    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    const schedule = await scheduleRepository.findOne({ where: { id: petitionScheduleId, petitionId } });

    if (!schedule) {
        throw new Error("La hora no esta disponible");
    }

    const existingAppointment = await appointmentRepository.findOne({
        where: [
            { userId, petitionId, status: "pendiente" },
            { userId, petitionId, status: "aprobado" },
        ],
    });

    if (existingAppointment) {
        throw new Error("Ya tienes una inscripcion para esta peticion");
    }

    const citizenAppointments = await appointmentRepository.find({
        where: [
            { userId, status: "pendiente" },
            { userId, status: "aprobado" },
        ],
        relations: {
            schedule: true,
        },
    });

    const nextStart = timeToMinutes(schedule.startTime);
    const nextEnd = timeToMinutes(schedule.endTime);

    const hasTimeConflict = citizenAppointments.some((appointment) => {
        const existingSchedule = appointment.schedule;
        if (!existingSchedule) return false;
        if (existingSchedule.date !== schedule.date) return false;

        const existingStart = timeToMinutes(existingSchedule.startTime);
        const existingEnd = timeToMinutes(existingSchedule.endTime);

        return nextStart < existingEnd && existingStart < nextEnd;
    });

    if (hasTimeConflict) {
        throw new Error("Ya tienes una inscripcion en ese horario para la misma fecha");
    }

    const occupiedCountForDate = await countActiveAppointmentsForDate(
        scheduleRepository,
        appointmentRepository,
        schedule.date
    );

    if (occupiedCountForDate >= GLOBAL_DAILY_QUOTA) {
        throw new Error(`No hay cupos disponibles para la fecha ${schedule.date}. Maximo diario: ${GLOBAL_DAILY_QUOTA}`);
    }

    const sameSlotSchedules = await getSameSlotSchedules(scheduleRepository, schedule);
    const { activeCount: occupiedSameSlot } = await getSameSlotOccupancy(appointmentRepository, sameSlotSchedules);

    if (occupiedSameSlot >= SLOT_CAPACITY) {
        throw new Error(`Esa franja horaria ya alcanzo el maximo de ${SLOT_CAPACITY} cupos`);
    }

    const newAppointment = appointmentRepository.create({ userId, petitionId, petitionScheduleId, status: "pendiente" });
    const savedAppointment = await appointmentRepository.save(newAppointment);

    await syncSameSlotStatus(scheduleRepository, appointmentRepository, schedule);

    return savedAppointment;
}

export async function hasAppointmentToPetitionService(userId, petitionId){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const appointment = await appointmentRepository.find({ where: [{userId, petitionId, status: "pendiente"}, {userId, petitionId, status: "aprobado"}]});

    if(appointment.length === 0) return false;

    return true;
}

export async function getAppointmentService(){
    const appointmentRepository = AppDataSource.getRepository(Appointment);

    return await appointmentRepository.find({
        relations: {
            citizen: true,
            schedule: true,
            petition: {
                supervisor: true,
            },
            supervisor: true,
        },
        order: {
            createdAt: "DESC",
        },
    });
}

export async function getAppointmentIdService(id){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const appointment = await appointmentRepository.findOneBy({ id: parseInt(id) });

    if (!appointment) throw new Error("Inscripcion no encontrada");

    return appointment;
}

export async function deleteAppointmentIdService(id){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const appointment = await appointmentRepository.findOneBy({ id });

    if(!appointment) return false;

    if(appointment.status === "aprobado") throw new Error("No se puede eliminar una inscripcion aprobada");

    if (appointment.status === "pendiente") {
        const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
        const schedule = await scheduleRepository.findOne({
            where: { id: appointment.petitionScheduleId }
        });

        if (schedule) {
            await appointmentRepository.remove(appointment);
            await syncSameSlotStatus(scheduleRepository, appointmentRepository, schedule);
            return true;
        }
    }

    await appointmentRepository.remove(appointment);
    return true;
}

export async function updateStatusService(id, data, supervisorId){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
    const appointment = await getAppointmentIdService(id);

    if (!appointment) throw new Error("Inscripcion no encontrada");

    const previousStatus = appointment.status;

    appointment.status = data.status;
    appointment.reviewedAt = new Date();
    appointment.supervisorId = supervisorId;

    if (data.status === "rechazado") {
        appointment.rejectReason = data.rejectReason;
    }

    const schedule = await scheduleRepository.findOne({ where: { id: appointment.petitionScheduleId } });

    if(!schedule) throw new Error("Horario no encontrado");

    const savedAppointment = await appointmentRepository.save(appointment);

    if (
        data.status === "aprobado" ||
        (data.status === "rechazado" && previousStatus === "pendiente")
    ) {
        await syncSameSlotStatus(scheduleRepository, appointmentRepository, schedule);
    }

    return savedAppointment;
}

export async function getPetitionsByPrerequisitesService() {
    const petitionRepository = AppDataSource.getRepository(Petition);

    return await petitionRepository.find({
        where: [
            { prerrequisites: IsNull() },
            { prerrequisites: "" }
        ]
    });
}
