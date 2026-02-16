import { 
    handleErrorClient, 
    handleErrorServer, 
    handleSuccess 
} from "../handlers/responseHandlers.js";
import { createPetitionScheduleService, getPetitionSchedulesService } from "../services/petitionSchedule.service.js";
import { petitionScheduleValidation } from "../validations/petitionSchedule.validation.js";

export async function createPetitionSchedule(req, res) {
    try {
        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo funcionarios pueden crear horarios");
        }

        const { error, value } = petitionScheduleValidation.validate(req.body, { abortEarly: false, stripUnknown: true });

        if (error) return handleErrorClient(res, 400, "Error de validación", error.details.map(e => e.message).join(", "));

        const schedule = await createPetitionScheduleService(value);

        return handleSuccess(res, 201, "Horario creado correctamente", schedule);
    } catch (error) {
        return handleErrorServer(res, 500, error.message);
    }
}

export async function getPetitionSchedules(req, res) {
    try {
        const { petitionId, date } = req.query;

        const schedules = await getPetitionSchedulesService(
            petitionId,
            date
        );

        return res.status(200).json({
            message: schedules.length === 0 ? "No hay horarios disponibles" : "Horarios disponibles",
            data: schedules
        });
    } catch (error) {
        return handleErrorServer(res, 500, error.message);
    }
}

