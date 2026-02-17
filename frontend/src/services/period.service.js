import axios from "./root.service";

/**
 * Obtener todos los periodos
 * (funcionario / administrador)
 */
export const getPeriods = async () => {
    try {
        const response = await axios.get("/periods");

        if (response.status === 200) {
            return response.data.data || [];
        }

        return [];
    } catch (error) {
        console.error("Error al obtener periodos:", error);
        return [];
    }
};

/**
 * Crear un nuevo periodo
 */
export const createPeriod = async (data) => {
    try {
        const response = await axios.post("/periods", data);

        if (response.status === 201) {
            return response.data.data;
        }

        return null;
    } catch (error) {
        console.error("Error al crear periodo:", error);
        throw error;
    }
};

/**
 * Actualizar un periodo
 */
export const updatePeriod = async (id, data) => {
    try {
        const response = await axios.put(`/periods/${id}`, data);

        if (response.status === 200) {
            return response.data.data;
        }

        return null;
    } catch (error) {
        console.error("Error al actualizar periodo:", error);
        throw error;
    }
};

/**
 * Eliminar un periodo
 */
export const deletePeriod = async (id) => {
    try {
        const response = await axios.delete(`/periods/${id}`);

        return response.status === 200;
    } catch (error) {
        console.error("Error al eliminar periodo:", error);
        throw error;
    }
};

/**
 * Obtener periodo activo
 * (para mostrar disponibilidad de horas)
 */
export const getActivePeriod = async () => {
    try {
        const response = await axios.get("/periods/active");

        if (response.status === 200) {
            return response.data.data || null;
        }

        return null;
    } catch (error) {
        console.error("Error al obtener periodo activo:", error);
        return null;
    }
};
