import axios from "./root.service.js";

// Obtener todas las solicitudes (según rol)
export async function getRequests() {
    try {
        const response = await axios.get("/requests");

        return {
            success: true,
            data: response.data.data,
            message: response.data.message,
        };
    } catch (error) {
        console.error("Error en getRequests():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Error al obtener las solicitudes",
        };
    }
}

// Obtener solicitud por ID
export async function getRequestById(id) {
    try {
        const response = await axios.get(`/requests/${id}`);

        return {
            success: true,
            data: response.data.data,
        };
    } catch (error) {
        console.error("Error en getRequestById():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Solicitud no encontrada",
        };
    }
}

// Crear solicitud (ciudadano)
export async function createRequest(data) {
    try {
        const response = await axios.post("/requests", data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Solicitud creada correctamente",
        };
    } catch (error) {
        console.error("Error en createRequest():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo crear la solicitud",
        };
    }
}

// Revisar solicitud (funcionario / supervisor)
export async function reviewRequest(id, data) {
    try {
        const response = await axios.patch(`/requests/review/${id}`, data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Solicitud revisada correctamente",
        };
    } catch (error) {
        console.error("Error en reviewRequest():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo revisar la solicitud",
        };
    }
}
