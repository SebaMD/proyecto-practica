import { AppDataSource } from "../config/configDb.js";
import { Appointment } from "../entities/appointment.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { IsNull, Not } from "typeorm";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";

export async function createAppointmentService(data){
    const { userId, petitionId, petitionScheduleId } = data;

    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const scheduleRepository = AppDataSource.getRepository(PetitionSchedule);

    // Verificar que la hora exista y esté disponible
    const schedule = await scheduleRepository.findOne({ where: { id: petitionScheduleId, petitionId, isTaken: false } });

    if (!schedule) {
        throw new Error("La hora seleccionada no está disponible");
    }

    // Evitar doble inscripcion a la misma peticion
    const existingAppointment = await appointmentRepository.findOne({ where: { userId, petitionId } });

    if (existingAppointment) {
        throw new Error("Ya tienes una inscripción para esta petición");
    }

    schedule.isAvailable = false; //Bloquea la hora
    await scheduleRepository.save(schedule);

    const newAppointment = appointmentRepository.create({ userId, petitionId, petitionScheduleId, status: "pendiente", });

    return await appointmentRepository.save(newAppointment);
}

export async function hasAppointmentToPetitionService(userId, petitionId){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const appointment = await appointmentRepository.find({ where: [{userId, petitionId, status: "pendiente"}, {userId, petitionId, status: "aprobado"}]});

    if(appointment.length === 0) return false;

    return true;
}

export async function getAppointmentService(){
    const appointmentRepository = AppDataSource.getRepository(Appointment);

    return await appointmentRepository.find();
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
        const petitionRepository = AppDataSource.getRepository(Petition);
        const petition = await petitionRepository.findOne({ where: { id: appointment.petitionId } });
        
        if (petition) {
            petition.quotas += 1;
            await petitionRepository.save(petition);
        }
    }

    await appointmentRepository.remove(appointment);
    return true;
}

export async function updateStatusService(id, data){
    const appointmentRepository = AppDataSource.getRepository(Appointment);
    const appointment = await getAppointmentIdService(id);

    if (!appointment) throw new Error("Inscripción no encontrada");

    const Status = appointment.status;
    appointment.status = data.status;
    appointment.reviewedAt = new Date();

    if (data.status === "rechazado") appointment.rejectReason = data.rejectReason;

    const petitionRepository = AppDataSource.getRepository(Petition);
    const petition = await petitionRepository.findOne({ where: { id: appointment.petitionId } });
    
    if (petition) {
        if ((Status === "pendiente" || Status === "aprobado") && data.status === "rechazado") {
            petition.quotas += 1;
            await petitionRepository.save(petition);
        }
    }

    return await appointmentRepository.save(appointment);
}

export async function getPetitionsByPrerequisitesService() {
    const petitionRepository = AppDataSource.getRepository(Petition);

    const petitions = await petitionRepository.find({
        where: [
            { prerrequisites: IsNull() }, 
            { prerrequisites: "" }         
        ]
    });

    return petitions.length > 0 ? petitions : null;
}