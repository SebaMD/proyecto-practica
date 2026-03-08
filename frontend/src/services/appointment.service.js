import axios from "./root.service.js";

/**
 * Obtener inscripciones (appointments)
 * - ciudadano: solo las suyas
 * - supervisor: las que debe revisar
 */
export async function getAppointments() {
    try {
        const response = await axios.get("/appointments");

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Inscripciones obtenidas correctamente",
        };
    } catch (error) {
        console.error("Error en getAppointments():", error);
        return {
            success: false,
            message: error.response?.data?.message || "Error al obtener las inscripciones",
        };
    }
}

/**
 * Obtener una inscripción por ID
 */
export async function getAppointmentById(id) {
    try {
        const response = await axios.get(`/appointments/${id}`);

        return {
            success: true,
            data: response.data.data,
        };
    } catch (error) {
        console.error("Error en getAppointmentById():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo obtener la inscripción",
        };
    }
}

/**
 * Crear una inscripción (tomar una hora)
 * ciudadano
 */
export async function createAppointment(data) {
    try {
        const response = await axios.post("/appointments", data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Hora tomada correctamente",
        };
    } catch (error) {
        console.error("Error en createAppointment():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo tomar la hora",
        };
    }
}

/**
 * Revisar inscripción (aprobar / rechazar)
 * supervisor
 */
export async function updateAppointmentStatus(id, data) {
    try {
        const response = await axios.patch( `/appointments/status/${id}`, data);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Inscripción revisada correctamente",
        };
    } catch (error) {
        console.error("Error en updateAppointmentStatus():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo revisar la inscripción",
        };
    }
}

/**
 * Eliminar inscripción
 * (solo si tu backend lo permite, si no, puedes eliminar esta función)
 */
export async function deleteAppointment(id) {
    try {
        const response = await axios.delete(`/appointments/${id}`);

        return {
            success: true,
            message: response.data.message || "Inscripción eliminada correctamente",
        };
    } catch (error) {
        console.error("Error en deleteAppointment():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo eliminar la inscripción",
        };
    }
}

export async function archiveReviewedAppointment(id) {
    try {
        const response = await axios.patch(`/appointments/archive/${id}`);

        return {
            success: true,
            data: response.data.data,
            message: response.data.message || "Inscripcion archivada correctamente",
        };
    } catch (error) {
        console.error("Error en archiveReviewedAppointment():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo archivar la inscripcion",
        };
    }
}

export async function exportAppointmentsReport(date) {
    try {
        const response = await axios.get("/appointments/export", {
            params: { date },
            responseType: "blob",
        });

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error("Error en exportSupervisorAppointmentsReport():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudo exportar el reporte",
        };
    }
}

export async function getSupervisorReportDates() {
    try {
        const response = await axios.get("/appointments/export/dates");

        return {
            success: true,
            data: response.data.data || [],
            message: response.data.message,
        };
    } catch (error) {
        console.error("Error en getSupervisorReportDates():", error);
        return {
            success: false,
            message: error.response?.data?.message || "No se pudieron obtener las fechas del reporte",
        };
    }
}
