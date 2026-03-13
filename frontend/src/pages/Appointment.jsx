import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import {
    getAppointments,
    exportAppointmentsReport,
    getSupervisorReportDates,
} from "@services/appointment.service";
import { showErrorAlert } from "@helpers/sweetAlert";
import { Navbar } from "@components/Navbar";
import { Appointment } from "@components/Appointment";
import { Badge } from "@components/Badge";
import { CheckCircle } from "lucide-react";

const Appointments = () => {
    const [loading, setLoading] = useState(false);
    const [appointments, setAppointments] = useState([]);

    const [showPending, setShowPending] = useState(true);
    const [showApproved, setShowApproved] = useState(true);
    const [showRejected, setShowRejected] = useState(true);

    const [reportDate, setReportDate] = useState("");
    const [reportDates, setReportDates] = useState([]);
    const [reportStatusMessage, setReportStatusMessage] = useState("");

    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const supervisorView = searchParams.get("view");

    const isCitizen = user.role === "ciudadano";
    const isSupervisor = user.role === "supervisor";

    const pendingAppointments = appointments.filter((a) => a.status === "pendiente");

    const myReviewedAppointments = appointments.filter(
        (a) =>
            Number(a.supervisorId) === Number(user.id) &&
            (a.status === "aprobado" || a.status === "rechazado")
    );

    const showSupervisorPendingSection = !isSupervisor || supervisorView !== "reviews";
    const showSupervisorReviewsSection = !isSupervisor || supervisorView !== "pending";
    const showPendingBadge = !isSupervisor || supervisorView !== "reviews";
    const showApprovedBadge = !isSupervisor || supervisorView !== "pending";
    const showRejectedBadge = !isSupervisor || supervisorView !== "pending";

    const pendingCount = appointments.filter(a => a.status === "pendiente").length;
    const approvedCount = appointments.filter(a => a.status === "aprobado").length;
    const rejectedCount = appointments.filter(a => a.status === "rechazado").length;

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const result = await getAppointments();

            if (!result.success) {
                setAppointments([]);
                return;
            }

            const sorted = (result.data || []).sort((a, b) => {
                const order = { pendiente: 1, aprobado: 2, rechazado: 3 };
                return order[a.status] - order[b.status];
            });
            setAppointments(sorted);
        } catch (error) {
            setAppointments([]);
            showErrorAlert("Error", "No se pudieron cargar las citas", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSupervisorReportDates = async () => {
        if (!isSupervisor) return;

        const result = await getSupervisorReportDates();
        if (!result.success) {
            setReportDates([]);
            setReportDate("");
            setReportStatusMessage(result.message || "No se pudieron obtener las fechas del reporte");
            return;
        }

        const dates = result.data || [];
        setReportDates(dates);
        setReportDate((prev) => (prev && dates.includes(prev) ? prev : dates[0] || ""));
        setReportStatusMessage(result.message || "");
    };

    const handleExportSupervisorReport = async () => {
        if (!reportDate) {
            showErrorAlert(
                "Exportacion no disponible",
                reportStatusMessage || "No hay fechas disponibles para exportar"
            );
            return;
        }

        const result = await exportAppointmentsReport(reportDate);

        if (!result.success) {
            showErrorAlert("Error", result.message);
            return;
        }

        const blob = new Blob([result.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `mis-revisiones-${reportDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchAppointments();
        if (isSupervisor) {
            fetchSupervisorReportDates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const badgeAction = (id) => {
        if (id === "pending") setShowPending(p => !p);
        if (id === "approved") setShowApproved(p => !p);
        if (id === "rejected") setShowRejected(p => !p);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar/>

            <div className="pt-20 p-4 flex flex-col">
                <div className="bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6">

                    {/* HEADER */}
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="font-bold text-2xl">Gestión de Citas</h1>
                            <p className="text-gray-600">
                                {isCitizen ? "Revisa el estado de tus citas" : "Gestiona las solicitudes de citas"}
                            </p>
                        </div>

                        {isSupervisor && showSupervisorReviewsSection && (
                            <div className="flex items-center gap-2">
                                <select
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    className="px-3 py-2 text-sm border rounded-md border-gray-300"
                                >
                                    {reportDates.length === 0 ? (
                                        <option value="">Sin fechas disponibles</option>
                                    ) : (
                                        reportDates.map((date) => (
                                            <option key={date} value={date}>
                                                {date}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <button
                                    onClick={handleExportSupervisorReport}
                                    className={`px-3 py-2 text-sm border rounded-md ${
                                        reportDate
                                            ? "text-green-700 border-green-200 hover:bg-green-50"
                                            : "text-amber-700 border-amber-200 hover:bg-amber-50"
                                    }`}
                                >
                                    Exportar Excel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* BADGES */}
                    <div className="flex gap-4">
                        {showPendingBadge && pendingCount > 0 && (
                        <Badge
                            type="pending"
                            text={`${pendingCount} pendientes`}
                            badgeId="pending"
                            callback={badgeAction}
                            canToggleActive
                        />
                        )}
                        {showApprovedBadge && approvedCount > 0 && (
                        <Badge
                            type="success"
                            text={`${approvedCount} aprobadas`}
                            badgeId="approved"
                            callback={badgeAction}
                            canToggleActive
                        />
                        )}
                        {showRejectedBadge && rejectedCount > 0 && (
                        <Badge
                            type="error"
                            text={`${rejectedCount} rechazadas`}
                            badgeId="rejected"
                            callback={badgeAction}
                            canToggleActive
                        />
                        )}
                    </div>

                    {!loading && appointments.length === 0 && (
                        <p className="text-gray-600 italic flex gap-2 items-center">
                        <CheckCircle className="h-5 w-5" />
                            No hay citas registradas.
                        </p>
                    )}

                    {/* LISTADO */}
                    {!loading && appointments.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {/* LISTADO CIUDADANO */}
                            {!loading && appointments.length > 0 && isCitizen && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {appointments.map((appointment) => {
                                        if (appointment.status === "pendiente" && showPending) {
                                            return (
                                                <Appointment
                                                    key={appointment.id}
                                                    appointment={appointment}
                                                    onActionSuccess={fetchAppointments}
                                                />
                                            );
                                        }

                                        if (appointment.status === "aprobado" && showApproved) {
                                            return (
                                                <Appointment
                                                    key={appointment.id}
                                                    appointment={appointment}
                                                    onActionSuccess={fetchAppointments}
                                                />
                                            );
                                        }

                                        if (appointment.status === "rechazado" && showRejected) {
                                            return (
                                                <Appointment
                                                    key={appointment.id}
                                                    appointment={appointment}
                                                    onActionSuccess={fetchAppointments}
                                                />
                                            );
                                        }

                                        return null;
                                    })}
                                </div>
                            )}

                            {/* LISTADO SUPERVISOR */}
                            {!loading && appointments.length > 0 && isSupervisor && (
                                <div className="flex flex-col gap-6">
                                    {showSupervisorPendingSection && (
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <h2 className="font-semibold text-lg mb-3">Pendientes por revisar</h2>

                                        {pendingAppointments.filter((a) =>
                                            (a.status === "pendiente" && showPending)
                                        ).length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No hay solicitudes pendientes.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                {pendingAppointments.map((appointment) => {
                                                    if (appointment.status === "pendiente" && showPending) {
                                                        return (
                                                            <Appointment
                                                                key={appointment.id}
                                                                appointment={appointment}
                                                                onActionSuccess={async () => {
                                                                    await fetchAppointments();
                                                                    await fetchSupervisorReportDates();
                                                                }}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    )}

                                    {showSupervisorReviewsSection && (
                                    <div className="border rounded-lg p-4 bg-white">
                                        <h2 className="font-semibold text-lg mb-3">Mis revisiones</h2>

                                        {myReviewedAppointments.filter((a) =>
                                            (a.status === "aprobado" && showApproved) ||
                                            (a.status === "rechazado" && showRejected)
                                        ).length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">Aún no has revisado solicitudes.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                {myReviewedAppointments.map((appointment) => {
                                                    if (appointment.status === "aprobado" && showApproved) {
                                                        return (
                                                            <Appointment
                                                                key={appointment.id}
                                                                appointment={appointment}
                                                                onActionSuccess={async () => {
                                                                    await fetchAppointments();
                                                                    await fetchSupervisorReportDates();
                                                                }}
                                                            />
                                                        );
                                                    }

                                                    if (appointment.status === "rechazado" && showRejected) {
                                                        return (
                                                            <Appointment
                                                                key={appointment.id}
                                                                appointment={appointment}
                                                                onActionSuccess={async () => {
                                                                    await fetchAppointments();
                                                                    await fetchSupervisorReportDates();
                                                                }}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Appointments;
