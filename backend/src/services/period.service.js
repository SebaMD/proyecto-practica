import { AppDataSource } from "../config/configDb.js";
import { Period } from "../entities/period.entity.js";
import { LessThanOrEqual, MoreThanOrEqual, Not } from "typeorm";

export async function createPeriodService(data){
    const periodRepository = AppDataSource.getRepository(Period);
    const newPeriod = periodRepository.create(data);

    return await periodRepository.save(newPeriod);
}

export async function getPeriodService(){
    const periodRepository = AppDataSource.getRepository(Period);

    return await periodRepository.find({
        order: { startDate: "DESC" },
    });
}

export async function getPeriodByIdService(id){
    const periodRepository = AppDataSource.getRepository(Period);
    const period = await periodRepository.findOneBy({ id: parseInt(id) });

    if(!period) throw new Error("Period no encontrado");

    return period;
}

export async function updatePeriodService(id, data){
    const periodRepository = AppDataSource.getRepository(Period);
    const period = await getPeriodByIdService(id);

    periodRepository.merge(period, data);

    return await periodRepository.save(period);
}

export async function deletePeriodService(id) {
    const periodRepository = AppDataSource.getRepository(Period);

    await getPeriodByIdService(id);

    const result = await periodRepository.delete(id);

    if (result.affected === 0) throw new Error("No se pudo eliminar el período.");

    return { message: "Período eliminado exitosamente" };
}

// Verificar solapamiento de fechas 
export async function checkPeriodOverlapService(fechaInicio, fechaCierre, excludeId = null) {
    const periodRepository = AppDataSource.getRepository(Period);
    
    const whereClause = {
        startDate: LessThanOrEqual(fechaCierre),
        closingDate: MoreThanOrEqual(fechaInicio)
    };

    if (excludeId) {
        whereClause.id = Not(parseInt(excludeId));
    }

    return await periodRepository.findOne({
        where: whereClause
    });
}

export async function checkActivePeriodService() {
    const periodRepository = AppDataSource.getRepository(Period);
    const now = new Date();

    const activePeriod = await periodRepository.findOne({
        where: {
        startDate: LessThanOrEqual(now),
        closingDate: MoreThanOrEqual(now),
        },
    });

    return activePeriod;
}