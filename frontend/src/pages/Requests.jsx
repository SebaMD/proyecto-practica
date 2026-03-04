import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";

import { getRequests,
        createRequest, 
        getRequestDateUsage, 
        exportRequestsReport, 
        getRequestReportDates,
} from "@services/request.service";
import { getPetitions } from "@services/petition.service";
import { getPetitionSchedules } from "@services/petitionSchedule.service";
import { getActivePeriod } from "@services/period.service";

import { showErrorAlert } from "@helpers/sweetAlert";
import { useAuth } from "@context/AuthContext";
import socket from "@services/socket.service";

import { Navbar } from "@components/Navbar";
import { Request as RequestCard } from "@components/Request";
import PetitionCard from "@components/Petition";
import { Badge } from "@components/Badge";

import {
    CheckCircle,
    MessageSquareDashedIcon,
} from "lucide-react";

const GLOBAL_DAILY_QUOTA = 15;

const formatDate = (dateString) => {
    if (!dateString) return "-";
    const normalized = String(dateString).slice(0, 10);
    const [year, month, day] = normalized.split("-");
    if (!year || !month || !day) return normalized;
    return `${day}-${month}-${year}`;
};

const Requests = () => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [petitions, setPetitions] = useState([]);
    const [schedulesByPetition, setSchedulesByPetition] = useState({});

    const [showPending, togglePending] = useState(true);
    const [showApproved, toggleApproved] = useState(true);
    const [showRejected, toggleRejected] = useState(true);

    const [pendingCounter, setPendingCounter] = useState(0);
    const [approvedCounter, setApprovedCounter] = useState(0);
    const [rejectedCounter, setRejectedCounter] = useState(0);
    const [activePeriod, setActivePeriod] = useState(null);
    const [requestUsageByDate, setRequestUsageByDate] = useState({});
    const [requestReportDate, setRequestReportDate] = useState("");
    const [requestReportDates, setRequestReportDates] = useState([]);
    const [requestReportStatusMessage, setRequestReportStatusMessage] = useState("");

    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const isCiudadano = user.role === "ciudadano";
    const funcionarioView = searchParams.get("view"); // pending | reviews | null
    const isFuncionarioPendingView = !isCiudadano && funcionarioView !== "reviews";
    const isFuncionarioReviewsView = !isCiudadano && funcionarioView !== "pending";
    const showPendingBadge = isCiudadano || isFuncionarioPendingView;
    const showApprovedBadge = isCiudadano || isFuncionarioReviewsView;
    const showRejectedBadge = isCiudadano || isFuncionarioReviewsView;

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setPendingCounter(0);
            setApprovedCounter(0);
            setRejectedCounter(0);

            const result = await getRequests();

            if (!result.success || !result.data) {
                setRequests([]);
                return;
            }

            setRequests(result.data);

            result.data.forEach((req) => {
                if (req.status === "pendiente") setPendingCounter((p) => p + 1);
                else if (req.status === "aprobado") setApprovedCounter((p) => p + 1);
                else if (req.status === "rechazado") setRejectedCounter((p) => p + 1);
            });
        } catch (error) {
            console.error("Error al obtener solicitudes:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRenewalPetitions = async () => {
        try {
            const result = await getPetitions();
            if (!result.success) return;
            const data = result.data || [];
            setPetitions(data);
            if (isCiudadano) {
                const responses = await Promise.all(
                    data.map(async (p) => {
                        const res = await getPetitionSchedules(p.id);
                        return { petitionId: p.id, schedules: res.success ? res.data || [] : [] };
                    })
                );

                const newSchedulesMap = {};
                responses.forEach(({ petitionId, schedules }) => {
                    newSchedulesMap[petitionId] = schedules;
                });
                setSchedulesByPetition(newSchedulesMap);
            }
        } catch (error) {
            console.error("Error al obtener peticiones para renovacion:", error);
        }
    };

    const fetchActivePeriod = async () => {
        const period = await getActivePeriod();
        setActivePeriod(period || null);
    };

    const fetchRequestDateUsage = async () => {
        const result = await getRequestDateUsage();
        if (!result.success) return;

        const usageMap = {};
        (result.data || []).forEach((item) => {
            usageMap[item.date] = Number(item.used || 0);
        });
        setRequestUsageByDate(usageMap);
    };

    const refreshCitizenRequests = async () => {
        await fetchRequests();
    };

    useEffect(() => {
        const handleScheduleUpdated = async () => {
            if (!isCiudadano) return;
            await fetchRenewalPetitions();
        };

        const handleRequestUsageUpdated = async () => {
            if (isCiudadano) {
                await fetchRenewalPetitions();
                await fetchRequestDateUsage();
                return;
            }

            await fetchRequestReportDates();
        };

        socket.on("schedule:updated", handleScheduleUpdated);
        socket.on("request:usage-updated", handleRequestUsageUpdated);

        return () => {
            socket.off("schedule:updated", handleScheduleUpdated);
            socket.off("request:usage-updated", handleRequestUsageUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCiudadano]);

    const badgeAction = (id) => {
        if (id === "pending") togglePending((p) => !p);
        if (id === "approved") toggleApproved((p) => !p);
        if (id === "rejected") toggleRejected((p) => !p);
    };

    const handleCreateRequest = async (petition = null) => {
        if (isCiudadano && !activePeriod) {
            Swal.fire({
                icon: "warning",
                title: "Periodo cerrado",
                text: "No puedes solicitar renovacion mientras no exista un periodo activo.",
                confirmButtonText: "Entendido",
            });
            return;
        }

        try {
            const formValues = await createRequestDialog(petition);
            if (!formValues) return;

            const response = await createRequest(formValues);

            if (response.success) {
                Swal.fire({
                    toast: true,
                    icon: "success",
                    title: "Solicitud de renovacion creada exitosamente",
                    timer: 4000,
                    position: "bottom-end",
                    showConfirmButton: false,
                });
                fetchRequests();
                await fetchRequestReportDates();
                if (isCiudadano) {
                    fetchRenewalPetitions();
                    fetchRequestDateUsage();
                }
            } else {
                showErrorAlert("Error", response.message);
            }
        } catch (error) {
            console.error("Error al crear solicitud:", error);
            showErrorAlert("Error", "No se pudo crear la solicitud de renovacion");
        }
    };

    const handleViewPetitionDetails = async (petition) => {
        await Swal.fire({
            title: "Detalle de la peticion",
            width: 760,
            html: `
                <div class="text-left flex flex-col gap-3">
                    <div class="border rounded-lg p-3 bg-gray-50">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Nombre</p>
                        <p class="font-semibold text-gray-900">${petition.name || "-"}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Descripcion</p>
                        <p class="text-sm text-gray-800 whitespace-pre-wrap">${petition.description || "-"}</p>
                    </div>
                    <div class="border rounded-lg p-3 bg-blue-50 border-blue-200">
                        <p class="text-sm text-blue-900">La fecha y hora de retiro se asignaran segun la fecha solicitada y disponibilidad.</p>
                    </div>
                </div>
            `,
            confirmButtonText: "Cerrar",
        });
    };

    const getGlobalQuotaByDate = (date) => {
        if (!date) return { available: GLOBAL_DAILY_QUOTA, max: GLOBAL_DAILY_QUOTA };

        const allSchedules = Object.values(schedulesByPetition).flat();
        const daySchedules = allSchedules.filter((s) => s.date === date);
        const slotUsageByKey = new Map();

        daySchedules.forEach((s) => {
            const start = String(s.startTime).slice(0, 5);
            const end = String(s.endTime).slice(0, 5);
            const key = `${s.date}|${start}|${end}`;
            if (!slotUsageByKey.has(key)) {
                slotUsageByKey.set(key, Number(s.slotUsed || 0));
            }
        });

        const totalUsed = Array.from(slotUsageByKey.values()).reduce((acc, value) => acc + value, 0);
        const requestUsed = Number(requestUsageByDate[date] || 0);
        return {
            available: Math.max(0, GLOBAL_DAILY_QUOTA - (totalUsed + requestUsed)),
            max: GLOBAL_DAILY_QUOTA,
        };
    };

    const getQuotaInfoForRenewalPetition = (petition, preferredDate = "") => {
        const schedules = schedulesByPetition[petition.id] || [];
        if (!schedules.length) {
            return {
                available: 0,
                max: 0,
                globalAvailable: GLOBAL_DAILY_QUOTA,
                globalMax: GLOBAL_DAILY_QUOTA,
                date: null,
            };
        }

        const dates = [...new Set(schedules.map((s) => s.date))].sort();
        const targetDate =
            preferredDate && dates.includes(preferredDate)
                ? preferredDate
                : dates[0];

        const dateSchedules = schedules.filter((s) => s.date === targetDate);

        const available = dateSchedules.reduce(
            (acc, s) => acc + Number(s.slotRemaining ?? (s.status === "disponible" ? 1 : 0)),
            0
        );
        const max = dateSchedules.reduce((acc, s) => acc + Number(s.slotCapacity ?? 1), 0);
        const globalQuota = getGlobalQuotaByDate(targetDate);

        return {
            available,
            max,
            globalAvailable: globalQuota.available,
            globalMax: globalQuota.max,
            date: targetDate,
        };
    };

    const renewalPetitions = petitions.filter((petition) => (schedulesByPetition[petition.id] || []).length > 0);
    const isRenewalPeriodClosed = isCiudadano && !activePeriod;
    const [selectedRenewalDateByPetition, setSelectedRenewalDateByPetition] = useState({});

    const handleRenewalDateChange = (petition, dateValue) => {
        setSelectedRenewalDateByPetition((prev) => ({
            ...prev,
            [petition.id]: dateValue,
        }));
    };

    const hasActiveRenewalInPetition = (petitionId) =>
        requests.some(
            (request) =>
                Number(request?.petitionId) === Number(petitionId) &&
                ["pendiente", "aprobado"].includes(request?.status)
        );

    const fetchRequestReportDates = async () => {
        if (isCiudadano) return;

        const result = await getRequestReportDates();
        if (!result.success) {
            setRequestReportDates([]);
            setRequestReportDate("");
            setRequestReportStatusMessage(result.message || "No se pudieron obtener las fechas del reporte de solicitudes");
            return;
        }

        const dates = result.data || [];
        setRequestReportDates(dates);
        setRequestReportDate((prev) => (prev && dates.includes(prev) ? prev : dates[0] || ""));
        setRequestReportStatusMessage(result.message || "");
    };

    const handleExportRequestsReport = async () => {
        if (!requestReportDate) {
            showErrorAlert(
                "Exportacion no disponible",
                requestReportStatusMessage || "No hay fechas disponibles para exportar"
            );
            return;
        }

        const result = await exportRequestsReport(requestReportDate);

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
        link.download = `renovaciones-${requestReportDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchRequests();
        if (isCiudadano) {
            fetchRenewalPetitions();
            fetchActivePeriod();
            fetchRequestDateUsage();
        } else {
            fetchRequestReportDates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="pt-20 p-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Renovacion de licencia</h1>
                            <p className="text-gray-600">
                                {isCiudadano
                                    ? "Solicita la renovacion y espera la programacion del retiro de tu licencia."
                                    : "Revisa y responde solicitudes de renovacion de licencia."}
                            </p>
                        </div>

                        {!isCiudadano && isFuncionarioReviewsView && (
                            <div className="flex items-center gap-2">
                                <select
                                    value={requestReportDate}
                                    onChange={(e) => setRequestReportDate(e.target.value)}
                                    className="px-3 py-2 text-sm border rounded-md border-gray-300"
                                >
                                    {requestReportDates.length === 0 ? (
                                        <option value="">Sin fechas disponibles</option>
                                    ) : (
                                        requestReportDates.map((date) => (
                                            <option key={date} value={date}>
                                                {date}
                                            </option>
                                        ))
                                    )}
                                </select>

                                <button
                                    onClick={handleExportRequestsReport}
                                    className={`px-3 py-2 text-sm border rounded-md ${
                                        requestReportDate
                                            ? "text-green-700 border-green-200 hover:bg-green-50"
                                            : "text-amber-700 border-amber-200 hover:bg-amber-50"
                                    }`}
                                >
                                    Exportar Excel
                                </button>
                            </div>
                        )}

                        {isCiudadano && (
                            <div className={`border rounded-lg px-4 py-2 min-w-[380px] ${activePeriod ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <p className={`text-sm font-semibold ${activePeriod ? "text-green-700" : "text-amber-700"}`}>
                                            {activePeriod ? "Periodo activo" : "Periodo cerrado"}
                                        </p>
                                        {activePeriod ? (
                                            <p className="text-sm text-gray-800 font-medium">{activePeriod.name}</p>
                                        ) : (
                                            <p className="text-xs text-gray-600">
                                                No hay periodo activo. Vuelve a intentarlo cuando se habilite uno.
                                            </p>
                                        )}
                                    </div>

                                    {activePeriod && (
                                        <p className="text-xs text-gray-600 whitespace-nowrap">
                                            {formatDate(activePeriod.startDate)} - {formatDate(activePeriod.closingDate)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="flex gap-4 items-center">
                        {loading && <Badge text="Cargando..." />}

                        {showPendingBadge && pendingCounter > 0 && (
                            <Badge
                                type="pending"
                                text={`${pendingCounter} pendiente(s)`}
                                badgeId="pending"
                                callback={!isCiudadano && badgeAction}
                                canToggleActive={!isCiudadano}
                            />
                        )}

                        {showApprovedBadge && approvedCounter > 0 && (
                            <Badge
                                type="success"
                                text={`${approvedCounter} aprobada(s)`}
                                badgeId="approved"
                                callback={!isCiudadano && badgeAction}
                                canToggleActive={!isCiudadano}
                            />
                        )}

                        {showRejectedBadge && rejectedCounter > 0 && (
                            <Badge
                                type="error"
                                text={`${rejectedCounter} rechazada(s)`}
                                badgeId="rejected"
                                callback={!isCiudadano && badgeAction}
                                canToggleActive={!isCiudadano}
                            />
                        )}
                    </div>

                    {!loading && isCiudadano && (
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-6">
                                <div className="flex-2 min-h-0 max-h-[22rem] flex flex-col">
                                    <h3 className="text-xl font-semibold mb-4">Solicitudes pendientes</h3>
                                    {pendingCounter > 0 ? (
                                        <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-4">
                                            {requests.map(
                                                (r) =>
                                                    r.status === "pendiente" && (
                                                        <RequestCard
                                                            key={r.id}
                                                            request={r}
                                                            fetchCallback={refreshCitizenRequests}
                                                        />
                                                    )
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No tienes solicitudes de renovacion pendientes</p>
                                    )}
                                </div>

                                <div className="flex-1 min-h-0 max-h-[22rem] flex flex-col">
                                    <h3 className="text-xl font-semibold mb-4">Historial de renovaciones</h3>
                                    {approvedCounter || rejectedCounter ? (
                                        <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-4">
                                            {requests.map(
                                                (r) => r.status !== "pendiente" && <RequestCard key={r.id} request={r} isCompact />
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic flex items-center gap-2">
                                            <MessageSquareDashedIcon size={18} />
                                            Aun no hay renovaciones revisadas
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-xl font-semibold">Peticiones disponibles para renovacion</h3>
                                    {!loading && renewalPetitions.length > 0 && (
                                        <Badge type="info" text={`${renewalPetitions.length} Peticion(es)`} />
                                    )}
                                </div>

                                {!loading && renewalPetitions.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {renewalPetitions.map((petition) => {
                                        const localSelectedDate = selectedRenewalDateByPetition[petition.id] || "";
                                        const quotaInfo = getQuotaInfoForRenewalPetition(petition, localSelectedDate);
                                        const dateOptions = [...new Set((schedulesByPetition[petition.id] || []).map((s) => s.date))].sort();
                                        const isRenewalQuotaClosed = Number(quotaInfo?.globalAvailable ?? 0) <= 0;
                                        const hasOwnActiveRenewal = isCiudadano && hasActiveRenewalInPetition(petition.id);

                                        return (
                                            <PetitionCard
                                                key={`renewal-petition-${petition.id}`}
                                                petition={petition}
                                                quotaInfo={quotaInfo}
                                                dateOptions={dateOptions}
                                                selectedDateValue={localSelectedDate}
                                                onDateChange={handleRenewalDateChange}
                                                onView={handleViewPetitionDetails}
                                                onSelect={(selectedPetition) => handleCreateRequest(selectedPetition)}
                                                selectLabel={
                                                    hasOwnActiveRenewal
                                                        ? "Con cupo"
                                                        : isRenewalPeriodClosed
                                                            ? "Periodo cerrado"
                                                            : isRenewalQuotaClosed
                                                                ? "Sin cupos"
                                                                : "Solicitar renovacion"
                                                }
                                                selectBlocked={hasOwnActiveRenewal || isRenewalPeriodClosed || isRenewalQuotaClosed}
                                                selectSuccess={hasOwnActiveRenewal}
                                                onBlockedSelect={() => {
                                                    if (hasOwnActiveRenewal) {
                                                        return Swal.fire({
                                                            icon: "info",
                                                            title: "Ya tienes una solicitud",
                                                            text: "Revisa tu solicitud en Solicitudes pendientes o Historial de renovaciones.",
                                                            confirmButtonText: "Entendido",
                                                        });
                                                    }

                                                    if (isRenewalPeriodClosed) {
                                                        return Swal.fire({
                                                            icon: "warning",
                                                            title: "Periodo cerrado",
                                                            text: "No puedes solicitar renovacion mientras no exista un periodo activo.",
                                                            confirmButtonText: "Entendido",
                                                        });
                                                    }

                                                    return Swal.fire({
                                                        icon: "warning",
                                                        title: "Sin cupos hoy",
                                                        text: "No hay cupos disponibles para renovacion hoy. Intenta con otra fecha.",
                                                        confirmButtonText: "Entendido",
                                                    });
                                                }}
                                                hideHoursBlock
                                                hideMetaTags
                                            />
                                        );
                                    })}
                                    </div>
                                )}

                                {!loading && renewalPetitions.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No hay peticiones con horarios disponibles para renovacion.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && !isCiudadano && requests.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold mb-4">
                                {isFuncionarioPendingView && !isFuncionarioReviewsView
                                    ? "Solicitudes pendientes"
                                    : !isFuncionarioPendingView && isFuncionarioReviewsView
                                        ? "Solicitudes revisadas"
                                        : "Listado de renovaciones"}
                            </h3>

                            <div className="border rounded-lg overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b">
                                        <tr>
                                            <th className="p-3 text-left">Ciudadano</th>
                                            <th className="p-3 text-left">Peticion</th>
                                            <th className="p-3 text-left">Motivo</th>
                                            <th className="p-3 text-center">Estado</th>
                                            <th className="p-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((r) => {
                                            if (r.status === "pendiente" && showPending && isFuncionarioPendingView) {
                                                return (
                                                    <RequestCard
                                                        key={r.id}
                                                        request={r}
                                                        fetchCallback={async () => {
                                                            await fetchRequests();
                                                            await fetchRequestReportDates();
                                                        }}
                                                    />
                                                );
                                            }
                                            if (r.status === "aprobado" && showApproved && isFuncionarioReviewsView) {
                                                return <RequestCard key={r.id} request={r} />;
                                            }
                                            if (r.status === "rechazado" && showRejected && isFuncionarioReviewsView) {
                                                return <RequestCard key={r.id} request={r} />;
                                            }
                                            return null;
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && !isCiudadano && requests.length === 0 && (
                        <p className="text-gray-600 italic flex items-center gap-2">
                            <CheckCircle />
                            No hay renovaciones por revisar
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Requests;

async function createRequestDialog(preselectedPetition = null) {
    let petitions = [];

    if (!preselectedPetition) {
        const result = await getPetitions();
        if (!result.success) {
            showErrorAlert("Error", "No se pudieron cargar las peticiones");
            return null;
        }

        if (!result.data || result.data.length === 0) {
            Swal.fire({
                icon: "info",
                text: "No hay peticiones disponibles",
                confirmButtonText: "Volver",
            });
            return null;
        }
        petitions = result.data;
    }

    const petitionSelectorHtml = preselectedPetition
        ? `
            <div class="border rounded-lg p-3 bg-gray-50 text-left mb-3">
                <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Peticion</p>
                <p class="text-sm font-medium text-gray-800">${preselectedPetition.name}</p>
                <p class="text-xs text-gray-600 mt-1">Fecha: ${preselectedPetition.preferredDate || "-"}</p>
            </div>
        `
        : `
            <label class="text-sm font-medium">Peticion</label>
            <select id="petition" class="swal2-input">
                ${petitions.map((e) => `<option value="${e.id}">${e.name}</option>`).join("")}
            </select>
        `;

    const { value } = await Swal.fire({
        title: "Solicitar renovacion",
        html: `
        ${petitionSelectorHtml}
        <label class="text-sm font-medium">Motivo de renovacion</label>
        <input id="renewalReason" type="hidden" value="" />

        <div id="renewalReasonGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <button type="button" data-reason="extravio" class="renewal-reason-btn text-left border rounded-lg px-3 py-2 bg-white border-gray-300 text-gray-800 transition-all duration-150 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 hover:scale-[1.02]">Renovar por perdida</button>
            <button type="button" data-reason="expiracion" class="renewal-reason-btn text-left border rounded-lg px-3 py-2 bg-white border-gray-300 text-gray-800 transition-all duration-150 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 hover:scale-[1.02]">Renovar por expiracion</button>
            <button type="button" data-reason="deterioro" class="renewal-reason-btn text-left border rounded-lg px-3 py-2 bg-white border-gray-300 text-gray-800 transition-all duration-150 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 hover:scale-[1.02]">Renovar por deterioro del documento</button>
            <button type="button" data-reason="cambio_datos" class="renewal-reason-btn text-left border rounded-lg px-3 py-2 bg-white border-gray-300 text-gray-800 transition-all duration-150 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 hover:scale-[1.02]">Renovar por cambio de datos</button>
            <button type="button" data-reason="otro" class="renewal-reason-btn text-left border rounded-lg px-3 py-2 bg-white border-gray-300 text-gray-800 transition-all duration-150 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 hover:scale-[1.02] sm:col-span-2">Otro</button>
        </div>

        <div id="otherReasonWrapper" style="display:none; margin-top:8px;">
            <label class="text-sm font-medium">Especifica el motivo</label>
            <textarea
                id="otherReason"
                class="mt-2 w-full min-h-[96px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                style="margin:0; resize:none;"
                placeholder="Escribe el motivo de renovacion"
            ></textarea>
        </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Enviar solicitud",
        didOpen: () => {
            const reasonInput = document.getElementById("renewalReason");
            const otherWrapper = document.getElementById("otherReasonWrapper");
            const reasonButtons = Array.from(document.querySelectorAll(".renewal-reason-btn"));
            if (!reasonInput || !otherWrapper || reasonButtons.length === 0) return;

            const setActiveReason = (reasonValue) => {
                reasonInput.value = reasonValue;
                reasonButtons.forEach((btn) => {
                    const isActive = btn.getAttribute("data-reason") === reasonValue && !!reasonValue;
                    btn.classList.toggle("bg-blue-50", isActive);
                    btn.classList.toggle("border-blue-300", isActive);
                    btn.classList.toggle("text-blue-800", isActive);
                    btn.classList.toggle("scale-[1.02]", isActive);
                    btn.classList.toggle("bg-white", !isActive);
                    btn.classList.toggle("border-gray-300", !isActive);
                    btn.classList.toggle("text-gray-800", !isActive);
                });
                otherWrapper.style.display = reasonValue === "otro" ? "block" : "none";
                if (reasonValue !== "otro") {
                    const otherReasonInput = document.getElementById("otherReason");
                    if (otherReasonInput) otherReasonInput.value = "";
                }
            };

            reasonButtons.forEach((btn) => {
                btn.addEventListener("click", () => {
                    const clickedReason = btn.getAttribute("data-reason");
                    if (reasonInput.value === clickedReason) {
                        setActiveReason("");
                        return;
                    }
                    setActiveReason(clickedReason);
                });
            });

            setActiveReason("");
        },
        preConfirm: () => {
            const petitionId = preselectedPetition
                ? Number(preselectedPetition.id)
                : Number(document.getElementById("petition").value);
            const requestDate = preselectedPetition?.preferredDate;
            const reason = document.getElementById("renewalReason")?.value || "";
            const otherReason = document.getElementById("otherReason")?.value?.trim() || "";

            let description = "";

            if (!reason) {
                Swal.showValidationMessage("Debes seleccionar un motivo de renovacion");
                return false;
            }

            if (reason === "extravio") description = "Renovar por perdida";
            else if (reason === "expiracion") description = "Renovar por expiracion";
            else if (reason === "deterioro") description = "Renovar por deterioro del documento";
            else if (reason === "cambio_datos") description = "Renovar por cambio de datos";
            else if (reason === "otro") description = `Otro: ${otherReason}`;

            if (reason === "otro" && (!otherReason || otherReason.length < 5 || otherReason.length > 260)) {
                Swal.showValidationMessage("Si eliges 'Otro', el detalle debe tener entre 5 y 260 caracteres");
                return false;
            }

            if (!requestDate) {
                Swal.showValidationMessage("Debes seleccionar una fecha con cupos disponibles.");
                return false;
            }

            return { petitionId, description, requestDate };
        },
    });

    return value || null;
}
