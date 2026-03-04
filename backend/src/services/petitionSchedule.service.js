import { AppDataSource } from "../config/configDb.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { Appointment } from "../entities/appointment.entity.js";
import { Request } from "../entities/request.entity.js";
import { In } from "typeorm";
import { getIO } from "../socket.js";

const SLOT_CAPACITY = 2;

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function parseLocalDate(dateString) {
    const [year, month, day] = String(dateString).split("-").map(Number);
    return new Date(year, month - 1, day);
}

function isPastDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = parseLocalDate(dateString);
    target.setHours(0, 0, 0, 0);

    return target < today;
}

function isTodayDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = parseLocalDate(dateString);
    target.setHours(0, 0, 0, 0);

    return target.getTime() === today.getTime();
}

function isWeekendDate(dateString) {
    const [year, month, day] = String(dateString).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    return weekday === 0 || weekday === 6;
}

function emitScheduleUpdated(schedule, action = "updated"){
    try{
        const io = getIO();
        io.emit("schedule:updated", {
            action,
            scheduleId: schedule.id,
            petitionId: schedule.petitionId,
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: schedule.status,
        });
    }catch(error){
        console.error("Socket error:", error.message);
    }
}

function normalizeTime(timeValue) {
    return String(timeValue || "").slice(0, 5);
}

async function buildSlotUsageMap(dates) {
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

    const allowedDates = new Set(dates || []);
    const usageMap = new Map();

    for (const appointment of activeAppointments) {
        const schedule = appointment.schedule;
        if (!schedule) continue;
        if (allowedDates.size > 0 && !allowedDates.has(schedule.date)) continue;

        const key = `${schedule.date}|${normalizeTime(schedule.startTime)}|${normalizeTime(schedule.endTime)}`;
        usageMap.set(key, (usageMap.get(key) || 0) + 1);
    }

    const approvedRequests = await requestRepository.find({
        where: {
            status: "aprobado",
        },
        select: ["pickupDate", "pickupTime"],
    });

    for (const request of approvedRequests) {
        const pickupDate = request?.pickupDate;
        const pickupTime = String(request?.pickupTime || "").slice(0, 5);
        if (!pickupDate || !pickupTime) continue;
        if (allowedDates.size > 0 && !allowedDates.has(pickupDate)) continue;

        const [hour, minute] = pickupTime.split(":").map(Number);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
        const endMinutes = (hour * 60) + minute + 30;
        const endHour = String(Math.floor(endMinutes / 60)).padStart(2, "0");
        const endMinute = String(endMinutes % 60).padStart(2, "0");
        const pickupEndTime = `${endHour}:${endMinute}`;

        const key = `${pickupDate}|${pickupTime}|${pickupEndTime}`;
        usageMap.set(key, (usageMap.get(key) || 0) + 1);
    }

    return usageMap;
}

function enrichSchedulesWithCapacity(schedules, slotUsageMap) {
    return schedules.map((schedule) => {
        const slotKey = `${schedule.date}|${normalizeTime(schedule.startTime)}|${normalizeTime(schedule.endTime)}`;
        const slotUsed = Number(slotUsageMap.get(slotKey) || 0);
        const slotRemaining = Math.max(0, SLOT_CAPACITY - slotUsed);

        return {
            ...schedule,
            slotUsed,
            slotCapacity: SLOT_CAPACITY,
            slotRemaining,
        };
    });
}

export async function createPetitionScheduleService(data) {
    const { petitionId, date, startTime, endTime } = data;

    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
    const petitionRepository = AppDataSource.getRepository(Petition);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const petition = await petitionRepository.findOne({ where: { id: petitionId } });
    if (isPastDate(date)) throw new Error("No se puede crear un horario en una fecha pasada");
    if (isTodayDate(date)) throw new Error("No se puede crear un horario para hoy. Debe ser desde el dia siguiente");
    if (isWeekendDate(date)) throw new Error("No se pueden crear horarios en fin de semana (sabado o domingo)");
    if (!petition) throw new Error("La peticion no existe");

    if (startTime < "08:00" || endTime > "13:00") {
        throw new Error("Las horas deben estar entre 08:00 y 13:00");
    }

    if (endMinutes <= startMinutes) {
        throw new Error("La hora de termino debe ser mayor a la de inicio");
    }

    if (endMinutes - startMinutes !== 30) {
        throw new Error("El horario debe ser exactamente de 30 minutos");
    }

    const overlap = await scheduleRepository.findOne({ where: { petitionId, date, startTime } });

    if (overlap) {
        throw new Error("Este horario ya existe");
    }

    const schedule = scheduleRepository.create({
        petitionId,
        date,
        startTime,
        endTime,
        status: "disponible",
    });

    const savedSchedule = await scheduleRepository.save(schedule);
    emitScheduleUpdated(savedSchedule, "created");
    return savedSchedule;
}

export async function getPetitionSchedulesService(petitionId, date) {
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    const where = date ? { petitionId, date } : { petitionId };

    const schedules = await scheduleRepository.find({
        where,
        order: {
            date: "ASC",
            startTime: "ASC",
        },
    });

    const dates = [...new Set(schedules.map((s) => s.date))];
    const slotUsageMap = await buildSlotUsageMap(dates);

    return enrichSchedulesWithCapacity(schedules, slotUsageMap);
}

export async function updatePetitionScheduleService(id, data){
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    const updateSchedule = await scheduleRepository.findOne({ where: {id} });
    if(!updateSchedule) throw new Error("Horario no encontrado");

    if(updateSchedule.status !== "disponible"){
        throw new Error("Solo se puede editar horarios disponibles");
    }

    const nextDate = data.date ?? updateSchedule.date;
    const nextStartTime = data.startTime ?? updateSchedule.startTime;
    const nextEndTime = data.endTime ?? updateSchedule.endTime;

    if (isPastDate(nextDate)) {
        throw new Error("No se puede mover un horario a una fecha pasada");
    }
    if (isTodayDate(nextDate)) {
        throw new Error("No se puede mover un horario para hoy. Debe ser desde el dia siguiente");
    }
    if (isWeekendDate(nextDate)) {
        throw new Error("No se pueden asignar horarios en fin de semana (sabado o domingo)");
    }

    const startMinutes = timeToMinutes(nextStartTime);
    const endMinutes = timeToMinutes(nextEndTime);

    if(nextStartTime < "08:00" || nextEndTime > "13:00"){
        throw new Error("Las horas deben estar entre 08:00 y 13:00");
    }

    if(endMinutes <= startMinutes){
        throw new Error("La hora de termino debe ser mayor a la de inicio");
    }

    if(endMinutes - startMinutes !== 30){
        throw new Error("El horario debe ser exactamente de 30 minutos");
    }

    const duplicate = await scheduleRepository.findOne({ where: {petitionId: updateSchedule.petitionId, date: nextDate, startTime: nextStartTime} });

    if(duplicate && duplicate.id !== updateSchedule.id){
        throw new Error("Este horario ya existe");
    }

    updateSchedule.date = nextDate;
    updateSchedule.startTime = nextStartTime;
    updateSchedule.endTime = nextEndTime;

    const savedSchedule = await scheduleRepository.save(updateSchedule);
    emitScheduleUpdated(savedSchedule, "updated");
    return savedSchedule;
}

export async function deletePetitionScheduleService(id){
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    const deleteSchedule = await scheduleRepository.findOne({ where: {id} });

    if(!deleteSchedule) return false;

    if(deleteSchedule.status !== "disponible"){
        throw new Error("Solo se pueden eliminar horarios disponibles");
    }

    const payload = {
        id: deleteSchedule.id,
        petitionId: deleteSchedule.petitionId,
        date: deleteSchedule.date,
        startTime: deleteSchedule.startTime,
        endTime: deleteSchedule.endTime,
        status: deleteSchedule.status,
    };

    await scheduleRepository.remove(deleteSchedule);

    emitScheduleUpdated(payload, "deleted");
    return true;
}
