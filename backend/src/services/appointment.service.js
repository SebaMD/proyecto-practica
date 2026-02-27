import { AppDataSource } from "../config/configDb.js";
import { Appointment } from "../entities/appointment.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { IsNull, In } from "typeorm";
import { getIO } from "../socket.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";

const GLOBAL_DAILY_QUOTA = 10;

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
        // Evita romper logica principal si socket falla
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

async function syncSameSlotStatus(scheduleRepository, baseSchedule, nextStatus) {
    const sameSlotSchedules = await getSameSlotSchedules(scheduleRepository, baseSchedule);

    for (const item of sameSlotSchedules) {
        item.status = nextStatus;
        await scheduleRepository.save(item);
        emitScheduleUpdated(item);
    }
}

async function countOccupiedUniqueSlotsForDate(scheduleRepository, date) {
    const occupiedSchedules = await scheduleRepository.find({
        where: {
            date,
            status: In(["pendiente", "tomada"]),
        },
    });

    const uniqueSlots = new Set(
        occupiedSchedules.map((s) => `${s.date}|${s.startTime}|${s.endTime}`)
    );

    return uniqueSlots.size;
}

export async function createAppointmentService(data){
    const { userId, petitionId, petitionScheduleId } = data;

    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    // Verificar que la hora exista y estÃ© disponible
    const schedule = await scheduleRepository.findOne({ where: { id: petitionScheduleId, petitionId } });

    if (!schedule || schedule.status !== "disponible") {
        throw new Error("La hora no estÃ¡ disponible");
    }

    // Evitar doble inscripcion a la misma peticion
    const existingAppointment = await appointmentRepository.findOne({  
        where: [
            { userId, petitionId, status: "pendiente" },
            { userId, petitionId, status: "aprobado" },
        ], 
    });

    if (existingAppointment) {
        throw new Error("Ya tienes una inscripciÃ³n para esta peticiÃ³n");
    }


    // Evitar tomar la misma franja horaria en otra peticion (misma fecha + traslape)
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
    const petitionQuota = await scheduleRepository.count({
        where: {
            petitionId,
            date: schedule.date,
        },
    });

    if (petitionQuota < 1) {
        throw new Error("La peticion no tiene horarios configurados para esa fecha");
    }

    const occupiedCountForPetitionDate = await scheduleRepository.count({
        where: {
            petitionId,
            date: schedule.date,
            status: In(["pendiente", "tomada"]),
        },
    });

    if (occupiedCountForPetitionDate >= petitionQuota) {
        throw new Error(`No hay cupos disponibles para esta peticion en la fecha ${schedule.date}`);
    }

    const occupiedCountForDate = await countOccupiedUniqueSlotsForDate(scheduleRepository, schedule.date);

    if (occupiedCountForDate >= GLOBAL_DAILY_QUOTA) {
        throw new Error(`No hay cupos disponibles para la fecha ${schedule.date}. MÃƒÂ¡ximo diario: ${GLOBAL_DAILY_QUOTA}`);
    }

    const occupiedSameSlot = await scheduleRepository.count({
        where: {
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: In(["pendiente", "tomada"]),
        },
    });

    if (occupiedSameSlot > 0) {
        throw new Error("Esa franja horaria ya fue tomada para esa fecha");
    }

    // Bloqueamos la franja completa (misma fecha + hora) en todas las peticiones
    await syncSameSlotStatus(scheduleRepository, schedule, "pendiente");

    const newAppointment = appointmentRepository.create({ userId, petitionId, petitionScheduleId, status: "pendiente" });
    const savedAppointment = await appointmentRepository.save(newAppointment);

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
            await syncSameSlotStatus(scheduleRepository, schedule, "disponible");
        }
    }

    await appointmentRepository.remove(appointment);
    return true;
}

export async function updateStatusService(id, data, supervisorId){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
    const appointment = await getAppointmentIdService(id);

    if (!appointment) throw new Error("InscripciÃ³n no encontrada");

    const Status = appointment.status;

    appointment.status = data.status;
    appointment.reviewedAt = new Date();
    appointment.supervisorId = supervisorId;

    if (data.status === "rechazado") appointment.rejectReason = data.rejectReason;

    const schedule = await scheduleRepository.findOne({ where: { id: appointment.petitionScheduleId } });

    if(!schedule) throw new Error("Horario no encontrado");

    if(data.status === "aprobado"){
        await syncSameSlotStatus(scheduleRepository, schedule, "tomada");
    }

    if(data.status === "rechazado" && Status === "pendiente"){
        await syncSameSlotStatus(scheduleRepository, schedule, "disponible");
    }

    return await appointmentRepository.save(appointment);
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
