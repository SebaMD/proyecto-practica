import { AppDataSource } from "../config/configDb.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { getIO } from "../socket.js";

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function isPastDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);

    return target < today;
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

export async function createPetitionScheduleService(data) {
    const { petitionId, date, startTime, endTime } = data;

    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
    const petitionRepository = AppDataSource.getRepository(Petition);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const petition = await petitionRepository.findOne({ where: { id: petitionId } });
    if (isPastDate(date)) throw new Error("No se puede crear un horario en una fecha pasada");
    if (isWeekendDate(date)) throw new Error("No se pueden crear horarios en fin de semana (sabado o domingo)");
    if (!petition) throw new Error("La petición no existe");

    // Validar rango horario 08:00 - 13:00
    if (startTime < "08:00" || endTime > "13:00") {
        throw new Error("Las horas deben estar entre 08:00 y 13:00");
    }

    if (endMinutes <= startMinutes) {
        throw new Error("La hora de término debe ser mayor a la de inicio");
    }

    if (endMinutes - startMinutes !== 30) {
        throw new Error("El horario debe ser exactamente de 30 minutos");
    }

    // Validar solapamiento
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

    return await scheduleRepository.find({
        where,
        order: {
            date: "ASC",
            startTime: "ASC",
        },
    });
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

