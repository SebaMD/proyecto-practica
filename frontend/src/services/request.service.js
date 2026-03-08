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

// Obtener uso de solicitudes por fecha (pendiente + aprobado)
export async function getRequestDateUsage() {
    try {
        const response = await axios.get("/requests/date-usage");
        return {
            success: true,
            data: response.data.data || [],
            message: response.data.message,
        };
    } catch (error) {
        console.error("Error en getRequestDateUsage():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Error al obtener uso por fecha",
        };
    }
}

export async function getPickupAvailabilityByDate(date, citizenId = null) {
    try {
        const response = await axios.get("/requests/pickup-availability", {
            params: citizenId ? { date, citizenId } : { date },
        });

        return {
            success: true,
            data: response.data.data || [],
            message: response.data.message,
        };
    } catch (error) {
        console.error("Error en getPickupAvailabilityByDate():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Error al obtener horarios de retiro",
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

// Cancelar solicitud pendiente (ciudadano)
export async function cancelOwnRequest(id) {
    try {
        const response = await axios.delete(`/requests/${id}`);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Solicitud cancelada correctamente",
        };
    } catch (error) {
        console.error("Error en cancelOwnRequest():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo cancelar la solicitud",
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

export async function archiveReviewedRequest(id) {
    try {
        const response = await axios.patch(`/requests/archive/${id}`);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Solicitud archivada correctamente",
        };
    } catch (error) {
        console.error("Error en archiveReviewedRequest():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo archivar la solicitud",
        };
    }
}

export async function exportRequestsReport(date) {
    try {
        const response = await axios.get("/requests/export", {
            params: { date },
            responseType: "blob",
        });

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error("Error en exportRequestsReport():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo exportar el reporte de solicitudes",
        };
    }
}

export async function getRequestReportDates() {
    try {
        const response = await axios.get("/requests/export/dates");

        return {
            success: true,
            data: response.data.data || [],
            message: response.data.message,
        };
    } catch (error) {
        console.error("Error en getRequestReportDates():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudieron obtener las fechas del reporte de solicitudes",
        };
    }
}
