import { 
    handleErrorClient, 
    handleErrorServer, 
    handleSuccess 
} from "../handlers/responseHandlers.js";
import { createPetitionScheduleService, getPetitionSchedulesService, updatePetitionScheduleService, deletePetitionScheduleService } from "../services/petitionSchedule.service.js";
import { petitionScheduleValidation, petitionScheduleUpdateValidation } from "../validations/petitionSchedule.validation.js";
import { checkActivePeriodService } from "../services/period.service.js";

export async function createPetitionSchedule(req, res) {
    try {
        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo funcionarios pueden crear horarios");
        }

        const activePeriod = await checkActivePeriodService();
        if (activePeriod) {
            return handleErrorClient(
                res,
                409,
                "No se pueden modificar horarios mientras hay un período activo."
            );
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

export async function updatePetitionSchedule(req, res){
    try{

        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo funcionarios pueden actualizar horarios");
        }

        const activePeriod = await checkActivePeriodService();
        if (activePeriod) {
            return handleErrorClient(
                res,
                409,
                "No se pueden modificar horarios mientras hay un período activo."
            );
        }

        const {id} = req.params;

        const { error, value } = petitionScheduleUpdateValidation.validate(req.body, {abortEarly: false, stripUnknown: true});

        if(error){
            return handleErrorClient(res, 400, "Error de validacion", error.details.map((e) => e.message).join(", "));
        }

        const updatedSchedule = await updatePetitionScheduleService(Number(id), value);

        return handleSuccess(res, 200, "Horario actualizado correctamente", updatedSchedule);
    }catch (error){
        return handleErrorServer(res, 500, error.message);
    }
}

export async function deletePetitionSchedule(req, res){
    try{
        if (req.user.role !== "funcionario") {
            return handleErrorClient(res, 403, "Solo funcionarios pueden eliminar horarios");
        }

        const activePeriod = await checkActivePeriodService();
        if (activePeriod) {
            return handleErrorClient(
                res,
                409,
                "No se pueden modificar horarios mientras hay un período activo."
            );
        }

        const {id} = req.params;

        const deletedSchedule = await deletePetitionScheduleService(Number(id));

        if(!deletedSchedule){
            return handleErrorClient(res, 404, "Horario no encontrado");
        }

        return handleSuccess(res, 200, "Horario eliminado correctamente");
    }catch(error){
        return handleErrorServer(res, 500, error.message);
    }
}