import { AppDataSource } from "../config/configDb.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";
import { Petition } from "../entities/petition.entity.js";

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

export async function createPetitionScheduleService(data) {
    const { petitionId, date, startTime, endTime } = data;

    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);
    const petitionRepository = AppDataSource.getRepository(Petition);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const petition = await petitionRepository.findOne({ where: { id: petitionId } });
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

    return await scheduleRepository.save(schedule);
}

export async function getPetitionSchedulesService(petitionId, date) {
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    return await scheduleRepository.find({
        where: {
            petitionId,
            date,
        },
        order: {
            startTime: "ASC"
        }
    });
}