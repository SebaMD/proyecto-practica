import { useAuth } from "@context/AuthContext";
import {
    archiveReviewedAppointment,
    deleteAppointment,
    updateAppointmentStatus,
} from "@services/appointment.service";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessToast,
} from "@helpers/sweetAlert";
import { Badge } from "@components/Badge";
import { Archive, Calendar, CalendarCheck, Eye, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

export function Appointment({ appointment, onActionSuccess }) {
    const { user } = useAuth();

    const isCiudadano = user.role === "ciudadano";
    const isSupervisor = user.role === "supervisor";

    if (!appointment) return null;

    const getBadgeType = (status) => {
        if (status === "pendiente") return "pending";
        if (status === "aprobado") return "success";
        return "error";
    };

    const getBadgeText = (status) => {
        if (status === "pendiente") return "Pendiente";
        if (status === "aprobado") return "Aprobada";
        return "Rechazada";
    };

    const dateFormatter = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleString();
    };

    const handleDelete = async () => {
        await showConfirmAlert(
        "¿Eliminar hora?",
        "Esta acción eliminará tu hora agendada.",
        "Sí, eliminar",
        async () => {
            const result = await deleteAppointment(appointment.id);
            if (result.success) {
                showSuccessToast("Hora eliminada correctamente");
                onActionSuccess?.();
            } else {
                showErrorAlert("Error", result.message);
            }
        }
        );
    };

    const handleReview = async () => {
        const decision = await Swal.fire({
            title: "Revisar solicitud",
            text: "¿Deseas aprobar o rechazar esta solicitud?",
            icon: "question",
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: "Aprobar",
            denyButtonText: "Rechazar",
            cancelButtonText: "Cancelar",
        });

        if (decision.isDismissed) return;

        if (decision.isConfirmed) {
            const result = await updateAppointmentStatus(appointment.id, {status: "aprobado"});

            if (result.success) {
                showSuccessToast("Solicitud aprobada");
                onActionSuccess?.();
            } else {
                showErrorAlert("Error", result.message);
            }
            return;
        }

        if (decision.isDenied) {
            const rejectDialog = await Swal.fire({
                title: "Motivo de rechazo",
                input: "textarea",
                inputPlaceholder: "Escribe el motivo...",
                showCancelButton: true,
                confirmButtonText: "Guardar",
                cancelButtonText: "Cancelar",
                inputValidator: (value) => {
                const text = (value || "").trim();
                if (!text) return "El motivo es obligatorio";
                if (text.length < 5 || text.length > 300) {
                    return "Debe tener entre 5 y 300 caracteres";
                }
                return null;
                },
            });

            if (!rejectDialog.isConfirmed) return;

            const result = await updateAppointmentStatus(appointment.id, {
                status: "rechazado",
                rejectReason: rejectDialog.value.trim(),
            });

            if (result.success) {
                showSuccessToast("Solicitud rechazada");
                onActionSuccess?.();
            } else {
                showErrorAlert("Error", result.message);
            }
        }
    };  

    const handleArchive = async () => {
        const result = await archiveReviewedAppointment(appointment.id);
        if (result.success) {
            showSuccessToast("Inscripcion archivada");
            onActionSuccess?.();
        } else {
            showErrorAlert("Error", result.message);
        }
    };

    const handleViewDetails = async () => {
        await Swal.fire({
            title: "Detalle de la inscripción",
            width: 700,
            html: `
                <div style="text-align:left; display:flex; flex-direction:column; gap:12px;">
                    <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;">
                        <p style="font-weight:600; margin-bottom:6px;">Ciudadano</p>
                        <p><strong>Nombre:</strong> ${appointment.citizen?.username || "-"}</p>
                        <p><strong>Email:</strong> ${appointment.citizen?.email || "-"}</p>
                        <p><strong>RUT:</strong> ${appointment.citizen?.rut || "-"}</p>
                    </div>

                    <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;">
                        <p style="font-weight:600; margin-bottom:6px;">Petición</p>
                        <p><strong>Nombre:</strong> ${appointment.petition?.name || "-"}</p>
                        <p><strong>Descripción:</strong> ${appointment.petition?.description || "-"}</p>
                        <p><strong>Objetivos:</strong> ${appointment.petition?.objectives || "-"}</p>
                        <p><strong>Prerrequisitos:</strong> ${appointment.petition?.prerrequisites || "Sin prerrequisitos"}</p>
                        <p><strong>Cupos diarios:</strong> ${appointment.petition?.dailyQuotas ?? "-"}</p>
                    </div>

                    <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;">
                        <p style="font-weight:600; margin-bottom:6px;">Hora solicitada</p>
                        <p><strong>Fecha:</strong> ${appointment.schedule?.date || "-"}</p>
                        <p><strong>Horario:</strong> ${
                            appointment.schedule
                                ? `${appointment.schedule.startTime?.slice(0, 5)} - ${appointment.schedule.endTime?.slice(0, 5)}`
                                : "-"
                        }</p>
                        <p><strong>Estado:</strong> ${appointment.status || "-"}</p>
                    </div>

                    ${
                        appointment.rejectReason
                            ? `
                    <div style="padding:10px; border:1px solid #fecaca; border-radius:8px; background:#fef2f2;">
                        <p style="font-weight:600; margin-bottom:6px; color:#b91c1c;">Motivo de rechazo</p>
                        <p style="color:#7f1d1d; white-space:pre-wrap;">${appointment.rejectReason}</p>
                    </div>
                    `
                            : ""
                    }
                </div>
            `,
            confirmButtonText: "Cerrar",
        });
    };

    const handleViewPetitionInfo = async () => {
        await Swal.fire({
            title: "Detalle de la peticion",
            width: 760,
            html: `
                <div class="text-left flex flex-col gap-3">
                    <div class="border rounded-lg p-3 bg-gray-50">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Nombre</p>
                        <p class="font-semibold text-gray-900">${appointment.petition?.name || "-"}</p>
                    </div>

                    <div class="border rounded-lg p-3">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Descripcion</p>
                        <p class="text-sm text-gray-800 whitespace-pre-wrap">${appointment.petition?.description || "-"}</p>
                    </div>

                    <div class="border rounded-lg p-3">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Objetivos</p>
                        <p class="text-sm text-gray-800 whitespace-pre-wrap">${appointment.petition?.objectives || "-"}</p>
                    </div>

                    <div class="border rounded-lg p-3 bg-gray-50">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Prerrequisitos</p>
                        <p class="text-sm text-gray-800">${appointment.petition?.prerrequisites || "Sin prerrequisitos"}</p>
                    </div>
                </div>
            `,
            confirmButtonText: "Cerrar",
        });
    };


    const citizenName = appointment.citizen?.username || appointment.citizen?.email || `Ciudadano #${appointment.userId}`;

    const petitionName = appointment.petition?.name || `Petición #${appointment.petitionId}`;

    const reviewerName = appointment.supervisor?.username || appointment.supervisor?.email || (appointment.supervisorId ? `Supervisor #${appointment.supervisorId}` : "Pendiente de revisión");

    const requestedDate = appointment.schedule?.date || "-";

    const requestedHour = appointment.schedule ? `${appointment.schedule.startTime?.slice(0, 5)} - ${appointment.schedule.endTime?.slice(0, 5)}` : "-";
    const rejectReasonPreview = appointment.rejectReason
        ? appointment.rejectReason.length > 36
            ? `${appointment.rejectReason.slice(0, 36)}...`
            : appointment.rejectReason
        : "";
    const canArchiveReviewedAppointment = (() => {
        if (!isSupervisor || appointment.status === "pendiente") return false;
        if (appointment.status === "rechazado") return true;

        const date = appointment?.schedule?.date;
        const endTime = String(appointment?.schedule?.endTime || "").slice(0, 5);
        if (!date || !endTime) return false;

        const [year, month, day] = String(date).split("-").map(Number);
        const [hour, minute] = String(endTime).split(":").map(Number);
        const endDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);
        return new Date() >= endDateTime;
    })();

    return (
        <div
            className={`border border-gray-400 px-6 py-4 rounded-md bg-white flex flex-col gap-3 transition-all duration-200 ${
                isSupervisor || isCiudadano ? "hover:-translate-y-1 hover:shadow-lg" : ""
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className={`font-semibold ${isCiudadano ? "text-lg" : "text-base"}`}>
                        {isSupervisor ? `Nombre: ${citizenName}` : petitionName}
                    </p>
                    {isSupervisor && (
                        <p className="text-sm text-gray-600">
                            Petición: {petitionName}
                        </p>
                    )}
                </div>

                <Badge
                    type={getBadgeType(appointment.status)}
                    text={getBadgeText(appointment.status)}
                    showIcon
                />
            </div>

            <div className="text-sm text-gray-600 flex flex-col gap-1">
                <p>
                    <strong>Fecha solicitada:</strong> {requestedDate}
                </p>
                <p>
                    <strong>Hora solicitada:</strong> {requestedHour}
                </p>
                {isCiudadano && (
                    <p>
                        <strong>Revisado por:</strong>{" "}
                        {appointment.status === "pendiente" ? "Pendiente de revisión" : reviewerName}
                    </p>
                )}
                <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Creada: {dateFormatter(appointment.createdAt)}
                </p>
                <p className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" />
                    Revisada: {dateFormatter(appointment.reviewedAt)}
                </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                {appointment.rejectReason ? (
                    <div className="min-w-0 max-w-full inline-flex w-fit items-center gap-1 p-2 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm">
                        <strong className="shrink-0">Motivo:</strong>
                        <span className="truncate">{rejectReasonPreview}</span>
                    </div>
                ) : (
                    <div />
                )}

                <div className="flex justify-end gap-2 shrink-0">
                {isCiudadano && (
                <button
                    onClick={handleViewPetitionInfo}
                    className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                    <Eye className="h-4 w-4" />
                    Ver
                </button>
                )}

                {isCiudadano && appointment.status === "pendiente" && (
                <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-red-50 text-red-700 border-red-200"
                >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                </button>
                )}

                {isSupervisor && (
                    <button
                        onClick={handleViewDetails}
                        className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                        <Eye className="h-4 w-4" />
                        Ver
                    </button>
                )}

                {isSupervisor && canArchiveReviewedAppointment && (
                    <button
                        onClick={handleArchive}
                        className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-amber-50 text-amber-700 border-amber-200"
                    >
                        <Archive className="h-4 w-4" />
                        Archivar
                    </button>
                )}

                {isSupervisor && appointment.status === "pendiente" && (
                <button
                    onClick={handleReview}
                    className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-blue-50 text-blue-700 border-blue-200"
                >
                    <Eye className="h-4 w-4" />
                    Revisar
                </button>
                )}
                </div>
            </div>
        </div>
    );
}

export default Appointment;


