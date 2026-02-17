import axios from "./root.service.js";

/**
 * Obtener horarios de una petición por fecha
 * @param {number} petitionId
 * @param {string} date (YYYY-MM-DD)
 */
export async function getPetitionSchedules(petitionId, date) {
    try {
        const response = await axios.get("/petition-schedules", {
            params: {
                petitionId,
                date,
            },
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Horarios obtenidos correctamente",
        };
    } catch (error) {
        console.error("Error en getPetitionSchedules():", error);
        return {
            success: false,
            message: error.response?.data?.message ||"Error al obtener los horarios",
        };
    }
}

/**
 * Crear un horario para una petición
 * (solo funcionario)
 */
export async function createPetitionSchedule(data) {
    try {
        const response = await axios.post("/petition-schedules", data);

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
