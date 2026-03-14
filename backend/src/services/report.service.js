import ExcelJS from "exceljs";
import { getAppointmentService } from "./appointment.service.js";
import { getRequestsService } from "./request.service.js";
import { checkActivePeriodService } from "./period.service.js";

function formatDate(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    return date.toLocaleString("es-CL");
}

function normalizeDateOnly(dateValue) {
    if (!dateValue) return "";
    return String(dateValue).slice(0, 10);
}

function getLatestDates(dates, limit = 10) {
    return [...new Set((dates || []).filter(Boolean))]
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limit)
        .sort();
}

async function ensureExportClosedOrThrow() {
    const activePeriod = await checkActivePeriodService();
    if (activePeriod) {
        throw new Error("La exportacion solo esta disponible cuando el periodo este cerrado");
    }
}

export async function generateAppointmentsReportService(supervisorId, date) {
    await ensureExportClosedOrThrow();
    const normalizedDate = normalizeDateOnly(date);

    const allAppointments = await getAppointmentService();

    const filteredAppointments = allAppointments.filter((appointment) => {
        const appointmentDate = normalizeDateOnly(appointment?.schedule?.date);
        return (
            Number(appointment.supervisorId) === Number(supervisorId) &&
            (appointment.status === "aprobado" || appointment.status === "rechazado") &&
            appointmentDate === normalizedDate
        );
    });

    if (filteredAppointments.length === 0) {
        throw new Error("No hay citas revisadas para esa fecha");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mis revisiones");

    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Ciudadano", key: "citizen", width: 28 },
        { header: "RUT", key: "rut", width: 18 },
        { header: "Peticion", key: "petition", width: 30 },
        { header: "Fecha", key: "date", width: 15 },
        { header: "Horario", key: "time", width: 18 },
        { header: "Estado", key: "status", width: 15 },
        { header: "Creada", key: "createdAt", width: 24 },
        { header: "Revisada", key: "reviewedAt", width: 24 },
        { header: "Motivo rechazo", key: "rejectReason", width: 40 },
    ];

    filteredAppointments.forEach((appointment) => {
        worksheet.addRow({
            id: appointment.id,
            citizen: appointment.citizen?.username || appointment.citizen?.email || "-",
            rut: appointment.citizen?.rut || "-",
            petition: appointment.petition?.name || "-",
            date: normalizeDateOnly(appointment.schedule?.date) || "-",
            time: appointment.schedule
                ? `${String(appointment.schedule.startTime).slice(0, 5)} - ${String(appointment.schedule.endTime).slice(0, 5)}`
                : "-",
            status: appointment.status || "-",
            createdAt: formatDate(appointment.createdAt),
            reviewedAt: formatDate(appointment.reviewedAt),
            rejectReason: appointment.rejectReason || "-",
        });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    return workbook;
}

export async function getSupervisorReportDatesService(supervisorId) {
    await ensureExportClosedOrThrow();
    const allAppointments = await getAppointmentService();

    const dates = getLatestDates(
        allAppointments
            .filter(
                (appointment) =>
                    Number(appointment.supervisorId) === Number(supervisorId) &&
                    (appointment.status === "aprobado" || appointment.status === "rechazado")
            )
            .map((appointment) => normalizeDateOnly(appointment.schedule.date))
    );

    return dates;
}

export async function generateRequestsReportService(date) {
    await ensureExportClosedOrThrow();
    const normalizedDate = normalizeDateOnly(date);

    const allRequests = await getRequestsService();

    const filteredRequests = allRequests.filter((request) => {
        return (
            normalizeDateOnly(request?.requestDate) === normalizedDate &&
            (request.status === "aprobado" || request.status === "rechazado")
        );
    });

    if (filteredRequests.length === 0) {
        throw new Error("No hay solicitudes para esa fecha");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Renovaciones");

    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Ciudadano", key: "citizen", width: 28 },
        { header: "RUT", key: "rut", width: 18 },
        { header: "Peticion", key: "petition", width: 30 },
        { header: "Motivo", key: "description", width: 40 },
        { header: "Fecha solicitada", key: "requestDate", width: 18 },
        { header: "Fecha retiro", key: "pickupDate", width: 18 },
        { header: "Hora retiro", key: "pickupTime", width: 16 },
        { header: "Estado", key: "status", width: 15 },
        { header: "Revisado por", key: "reviewer", width: 28 },
        { header: "Creada", key: "createdAt", width: 24 },
        { header: "Revisada", key: "reviewedAt", width: 24 },
        { header: "Motivo rechazo", key: "rejectReason", width: 40 },
    ];

    filteredRequests.forEach((request) => {
        worksheet.addRow({
            id: request.id,
            citizen: request.citizen?.username || request.citizen?.email || "-",
            rut: request.citizen?.rut || "-",
            petition: request.petition?.name || `Peticion #${request.petitionId}`,
            description: request.description || "-",
            requestDate: normalizeDateOnly(request.requestDate) || "-",
            pickupDate: normalizeDateOnly(request.pickupDate) || "-",
            pickupTime: request.pickupTime || "-",
            status: request.status || "-",
            reviewer: request.reviewer?.username || request.reviewer?.email || request.reviewerId || "-",
            createdAt: formatDate(request.createdAt),
            reviewedAt: formatDate(request.reviewedAt),
            rejectReason: request.rejectReason || "-",
        });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    return workbook;
}

export async function getRequestReportDatesService() {
    await ensureExportClosedOrThrow();
    const allRequests = await getRequestsService();

    const dates = getLatestDates(
        allRequests
            .filter((request) => request.status === "aprobado" || request.status === "rechazado")
            .map((request) => normalizeDateOnly(request.requestDate))
    );

    return dates;
}
