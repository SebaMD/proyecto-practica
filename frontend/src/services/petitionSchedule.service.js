import axios from "./root.service.js";

export async function getPetitionSchedules(petitionId, date) {
    try {
        const params = { petitionId };
        if (date) params.date = date;

        const response = await axios.get("/petitionSchedules", { params });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Horarios obtenidos correctamente",
        };
    } catch (error) {
        console.error("Error en getPetitionSchedules():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Error al obtener los horarios",
        };
    }
}

export async function createPetitionSchedule(data) {
    try {
        const response = await axios.post("/petitionSchedules", data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Horario creado correctamente",
        };
    } catch (error) {
        console.error("Error en createPetitionSchedule():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo crear el horario",
        };
    }
}

export async function updatePetitionSchedule(id, data){
    try{
        const response = await axios.patch(`/petitionSchedules/${id}`, data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Horario actualizado correctamente",
        }
    }catch(error){
        console.error("Error en updatePetitionSchedule():", error);
        return{
            success: false,
            message: error.response?.data?.message || "No se pudo actualizar el horario",
        };
    }
}

export async function deletePetitionSchedule(id){
    try{
        const response = await axios.delete(`/petitionSchedules/${id}`);

        return{
            success: true,
            data: response.data.data ?? null,
            message: response.data.message || "Horario eliminado correctamente",
        };
    }catch (error){
        console.error("Error en deletePetitionSchedule():", error);
        return{
            success: false,
            message: error.response?.data?.message || "No se pudo eliminar el horario",
        };
    }
}
