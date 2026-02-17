import axios from "./root.service.js";

/**
 * Obtener todas las peticiones
 * - funcionario / supervisor: todas
 * - ciudadano: backend ya filtra las permitidas
 */
export async function getPetitions() {
    try {
        const response = await axios.get("/petitions");

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Peticiones obtenidas correctamente",
        };
    } catch (error) {
        console.error("Error en getPetitions():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Error al obtener las peticiones",
        };
    }
}

/**
 * Obtener una petición por ID
 */
export async function getPetitionById(id) {
    try {
        const response = await axios.get(`/petitions/${id}`);

        return {
            success: true,
            data: response.data.data,
        };
    } catch (error) {
        console.error("Error en getPetitionById():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Petición no encontrada",
        };
    }
}

/**
 * Crear una nueva petición
 * (funcionario)
 */
export async function createPetition(data) {
    try {
        const response = await axios.post("/petitions", data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Petición creada correctamente",
        };
    } catch (error) {
        console.error("Error en createPetition():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo crear la petición",
        };
    }
}

/**
 * Actualizar una petición
 */
export async function updatePetition(id, data) {
    try {
        const response = await axios.patch(`/petitions/${id}`, data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Petición actualizada correctamente",
        };
    } catch (error) {
        console.error("Error en updatePetition():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo actualizar la petición",
        };
    }
}

/**
 * Eliminar una petición
 */
export async function deletePetition(id) {
    try {
        const response = await axios.delete(`/petitions/${id}`);

        return {
            success: true,
            message: response.data.message || "Petición eliminada correctamente",
        };
    } catch (error) {
        console.error("Error en deletePetition():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo eliminar la petición",
        };
    }
}
