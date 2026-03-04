import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CalendarDays, Clock, Save } from "lucide-react";
import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import {
    getPetitionSchedules,
    createPetitionSchedule,
} from "@services/petitionSchedule.service";
import { createAppointment, getAppointments } from "@services/appointment.service";
import { getActivePeriod } from "@services/period.service";
import { showErrorAlert } from "@helpers/sweetAlert";
import socket from "@services/socket.service";

const PREDEFINED_SLOTS = [
    ["08:00", "08:30"],
    ["08:30", "09:00"],
    ["09:00", "09:30"],
    ["09:30", "10:00"],
    ["10:00", "10:30"],
    ["10:30", "11:00"],
    ["11:00", "11:30"],
    ["11:30", "12:00"],
    ["12:00", "12:30"],
    ["12:30", "13:00"],
];

const slotKey = (startTime, endTime) => `${startTime}-${endTime}`;

export function PetitionSchedule({
    petitionId,
    onSelect = null,
    preferredDate = null,
    globalDateQuotaMap = {},
    onDateChange = null,
    onCloseRequested = null,
}) {
    const { user } = useAuth();
    const isFuncionario = user.role === "funcionario";
    const isCiudadano = user.role === "ciudadano";

    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [taking, setTaking] = useState(false);
    const [schedules, setSchedules] = useState([]);
    const [allSchedules, setAllSchedules] = useState([]);
    const [citizenAppointments, setCitizenAppointments] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const isFilteredByParentDate = Boolean(preferredDate);

    const existingKeys = useMemo(
        () => new Set(schedules.map((s) => slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)))),
        [schedules]
    );

    const availableDates = useMemo(
        () => [...new Set(allSchedules.map((s) => s.date))].sort(),
        [allSchedules]
    );

    const dateCards = useMemo(() => {
        return availableDates.map((dateValue) => {
            const dayItems = allSchedules.filter((s) => s.date === dateValue);
            const available = dayItems.reduce(
                (acc, s) => acc + Number(s.slotRemaining ?? (s.status === "disponible" ? 1 : 0)),
                0
            );
            const pending = dayItems.filter((s) => s.status === "pendiente").length;
            const taken = dayItems.filter((s) => s.status === "tomada").length;

            return {
                date: dateValue,
                total: dayItems.length,
                available,
                pending,
                taken,
            };
        });
    }, [allSchedules, availableDates]);

    const schedulesForSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        return allSchedules
            .filter((s) => s.date === selectedDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [allSchedules, selectedDate]);

    const selectedDateGlobalQuota = useMemo(() => {
        if (!selectedDate) return null;
        return globalDateQuotaMap?.[selectedDate] || null;
    }, [globalDateQuotaMap, selectedDate]);

    useEffect(() => {
        if (!petitionId || !selectedDate || typeof onDateChange !== "function") return;
        onDateChange(selectedDate);
    }, [petitionId, selectedDate, onDateChange]);

    const fetchSchedulesByDate = async () => {
        if (!petitionId || !date) return;
        try {
            setLoading(true);
            const result = await getPetitionSchedules(petitionId, date);
            if (result.success) {
                const data = result.data || [];
                setSchedules(data);

                const prechecked = data.map((s) => slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)));
                setSelectedKeys(prechecked);
            } else {
                setSchedules([]);
                setSelectedKeys([]);
            }
        } catch (error) {
            showErrorAlert("Error", "No se pudieron cargar los horarios", error);
            setSchedules([]);
            setSelectedKeys([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllSchedules = async () => {
        if (!petitionId) return;
        try {
            setLoading(true);
            const result = await getPetitionSchedules(petitionId);
            if (result.success) {
                const data = result.data || [];
                setAllSchedules(data);

                setSelectedDate((prev) => {
                    const dates = [...new Set(data.map((s) => s.date))].sort();

                    if (preferredDate && dates.includes(preferredDate)) {
                        return preferredDate;
                    }

                    if (prev && data.some((s) => s.date === prev)) return prev;

                    return dates[0] || null;
                });
            } else {
                setAllSchedules([]);
                setSelectedDate(null);
            }
        } catch (error) {
            showErrorAlert("Error", "No se pudieron cargar los horarios", error);
            setAllSchedules([]);
            setSelectedDate(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchCitizenPeriod = async () => {
        if (!isCiudadano) return;
        const period = await getActivePeriod();
        setActivePeriod(period || null);
    };

    const fetchCitizenAppointments = async () => {
        if (!isCiudadano) return;
        const result = await getAppointments();
        if (!result.success) {
            setCitizenAppointments([]);
            return;
        }
        setCitizenAppointments(result.data || []);
    };

    useEffect(() => {
        if (isFuncionario) {
            fetchSchedulesByDate();
            return;
        }
        fetchAllSchedules();
        fetchCitizenPeriod();
        fetchCitizenAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petitionId, date, isFuncionario, preferredDate]);

    useEffect(() => {
        const handleScheduleUpdated = (payload) => {
            if (!payload || Number(payload.petitionId) !== Number(petitionId)) return;

            if (isFuncionario) {
                fetchSchedulesByDate();
            } else {
                fetchAllSchedules();
                fetchCitizenAppointments();
            }
        };

        socket.on("schedule:updated", handleScheduleUpdated);

        return () => {
            socket.off("schedule:updated", handleScheduleUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petitionId, isFuncionario, date]);

    useEffect(() => {
        const handleRequestUsageUpdated = () => {
            if (isFuncionario) {
                fetchSchedulesByDate();
            } else {
                fetchAllSchedules();
            }
        };

        socket.on("request:usage-updated", handleRequestUsageUpdated);

        return () => {
            socket.off("request:usage-updated", handleRequestUsageUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petitionId, isFuncionario, date]);

    const toggleSlot = (startTime, endTime) => {
        const key = slotKey(startTime, endTime);

        if (existingKeys.has(key)) return;

        setSelectedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const saveSelectedSlots = async () => {
        if (!isFuncionario) return;

        const toCreate = PREDEFINED_SLOTS
            .map(([startTime, endTime]) => ({ startTime, endTime, key: slotKey(startTime, endTime) }))
            .filter((slot) => selectedKeys.includes(slot.key) && !existingKeys.has(slot.key));

        if (toCreate.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Sin cambios",
                text: "No hay horarios nuevos para guardar.",
            });
            return;
        }

        try {
            setSaving(true);
            const results = await Promise.allSettled(
                toCreate.map((slot) =>
                    createPetitionSchedule({
                        petitionId,
                        date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    })
                )
            );

            const ok = results.filter((r) => r.status === "fulfilled" && r.value?.success).length;
            const fail = results.length - ok;

            if (fail > 0) {
                Swal.fire({
                    icon: "warning",
                    title: "Guardado parcial",
                    text: `Se crearon ${ok} horario(s), pero ${fail} fallaron.`,
                });
            } else {
                Swal.fire({
                    toast: true,
                    icon: "success",
                    title: "Horarios guardados",
                    timer: 2200,
                    position: "bottom-end",
                    showConfirmButton: false,
                });
            }

            fetchSchedulesByDate();
        } catch (error) {
            showErrorAlert("Error", "No se pudieron guardar los horarios", error);
        } finally {
            setSaving(false);
        }
    };

    const takeSchedule = async (schedule) => {
        if (!isCiudadano) return;
        if (!activePeriod) {
            Swal.fire({
                icon: "warning",
                title: "Periodo cerrado",
                text: "Solo puedes tomar horas cuando el periodo est\u00E9 activo.",
            });
            return;
        }

        const confirm = await Swal.fire({
            title: "Tomar hora",
            text: `\u00BFConfirmas la hora ${schedule.startTime.slice(0, 5)} - ${schedule.endTime.slice(0, 5)} del ${schedule.date}?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Tomar hora",
            cancelButtonText: "Cancelar",
        });

        if (!confirm.isConfirmed) return;

        try {
            setTaking(true);
            const result = await createAppointment({
                petitionId,
                petitionScheduleId: schedule.id,
            });

            if (!result.success) {
                showErrorAlert("Error", result.message || "No se pudo tomar la hora");
                return;
            }

            Swal.fire({
                toast: true,
                icon: "success",
                title: "Hora tomada correctamente",
                timer: 2400,
                position: "bottom-end",
                showConfirmButton: false,
            });

            await fetchAllSchedules();

            const filledLastDailyQuota =
                Number.isFinite(selectedDateGlobalQuota?.available) &&
                Number(selectedDateGlobalQuota.available) === 1;

            if (filledLastDailyQuota && typeof onCloseRequested === "function") {
                onCloseRequested();
            }
        } catch (error) {
            showErrorAlert("Error", "No se pudo tomar la hora", error);
        } finally {
            setTaking(false);
        }
    };

    const getType = (status) => {
        if (status === "disponible") return "success";
        if (status === "pendiente") return "pending";
        return "error";
    };

    const timeToMinutes = (time) => {
        const [hour = 0, minute = 0] = String(time || "00:00").split(":").map(Number);
        return (hour * 60) + minute;
    };

    const hasCitizenTimeConflict = (schedule) => {
        if (!isCiudadano || !schedule) return false;

        const nextStart = timeToMinutes(schedule.startTime);
        const nextEnd = timeToMinutes(schedule.endTime);

        return citizenAppointments.some((appointment) => {
            if (!appointment || !["pendiente", "aprobado"].includes(appointment.status)) return false;

            const existingSchedule = appointment.schedule;
            if (!existingSchedule) return false;
            if (existingSchedule.date !== schedule.date) return false;

            const existingStart = timeToMinutes(existingSchedule.startTime);
            const existingEnd = timeToMinutes(existingSchedule.endTime);

            return nextStart < existingEnd && existingStart < nextEnd;
        });
    };

    const isCitizenOwnerOfPendingSlot = (schedule) => {
        if (!isCiudadano || !schedule) return false;

        return citizenAppointments.some((appointment) => {
            if (!appointment || appointment.status !== "pendiente") return false;
            const existingSchedule = appointment.schedule;
            if (!existingSchedule) return false;
            const sameDateTime =
                existingSchedule.date === schedule.date &&
                String(existingSchedule.startTime).slice(0, 5) === String(schedule.startTime).slice(0, 5) &&
                String(existingSchedule.endTime).slice(0, 5) === String(schedule.endTime).slice(0, 5);

            if (!sameDateTime) return false;

            // Amarillo solo en la peticion que realmente tomo el ciudadano.
            return Number(appointment.petitionId) === Number(schedule.petitionId);
        });
    };

    const getCitizenAppointmentForSlot = (schedule) => {
        if (!isCiudadano || !schedule) return null;

        return (
            citizenAppointments.find((appointment) => {
                if (!appointment) return false;

                const existingSchedule = appointment.schedule;
                if (!existingSchedule) return false;

                const sameDateTime =
                    existingSchedule.date === schedule.date &&
                    String(existingSchedule.startTime).slice(0, 5) === String(schedule.startTime).slice(0, 5) &&
                    String(existingSchedule.endTime).slice(0, 5) === String(schedule.endTime).slice(0, 5);

                if (!sameDateTime) return false;

                return Number(appointment.petitionId) === Number(schedule.petitionId);
            }) || null
        );
    };

    const hasActiveAppointmentInCurrentPetition = isCiudadano && citizenAppointments.some(
        (appointment) =>
            appointment &&
            Number(appointment.petitionId) === Number(petitionId) &&
            ["pendiente", "aprobado"].includes(appointment.status)
    );

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(`${dateString}T00:00:00`).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    return (
        <div className="border rounded-lg p-4 bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">
                        {(!isFuncionario && selectedDate)
                            ? `Horarios de ${formatDate(selectedDate)}`
                            : "Horarios"}
                    </h3>
                    {!isFuncionario && isFilteredByParentDate && selectedDate && (
                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">
                            fecha filtrada
                        </span>
                    )}
                </div>
                {!isFuncionario && selectedDate && (
                    <span className="text-xs text-gray-500">
                        {schedulesForSelectedDate.length} horario(s)
                    </span>
                )}
                {isFuncionario && (
                    <button
                        onClick={saveSelectedSlots}
                        disabled={saving || loading}
                        className="px-3 py-2 text-sm rounded-md bg-blue-700 text-white flex items-center gap-2 hover:bg-blue-800 disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? "Guardando..." : "Guardar seleccion"}
                    </button>
                )}
            </div>

            {isFuncionario && (
                <>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border rounded-md px-2 py-1 text-sm"
                        />
                    </div>

                    <div className="border rounded-md p-3 bg-gray-50">
                        <p className="text-sm font-medium mb-2">Selecciona horas predefinidas</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {PREDEFINED_SLOTS.map(([startTime, endTime]) => {
                                const key = slotKey(startTime, endTime);
                                const checked = selectedKeys.includes(key);
                                const alreadyCreated = existingKeys.has(key);

                                return (
                                    <label
                                        key={key}
                                        className={`text-sm border rounded-md px-2 py-1 flex items-center gap-2 ${
                                            alreadyCreated ? "bg-green-50 border-green-200" : "bg-white"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleSlot(startTime, endTime)}
                                            disabled={alreadyCreated}
                                        />
                                        <span>{startTime} - {endTime}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Las horas ya creadas aparecen marcadas y bloqueadas.
                        </p>
                    </div>
                </>
            )}

            {loading && <Badge text="Cargando..." />}

            {!loading && !isFuncionario && availableDates.length === 0 && (
                <p className="text-sm text-gray-500 italic">No hay fechas disponibles para esta peticion.</p>
            )}

            {!loading && !isFuncionario && availableDates.length > 0 && (
                <div className={isFilteredByParentDate ? "flex flex-col" : "grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4"}>
                    {!isFilteredByParentDate && (
                        <div className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                                <CalendarDays className="h-4 w-4" />
                                Fechas disponibles
                            </div>

                            <div className="flex flex-col gap-2">
                                {dateCards.map((item) => (
                                    <button
                                        key={item.date}
                                        onClick={() => setSelectedDate(item.date)}
                                        className={`w-full text-left border rounded-lg p-3 transition ${
                                            selectedDate === item.date
                                                ? "bg-blue-50 border-blue-300"
                                                : "bg-white border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatDate(item.date)}
                                            </p>
                                        <span className="text-xs text-gray-500">
                                            {globalDateQuotaMap?.[item.date]
                                                ? `${globalDateQuotaMap[item.date].available}/${globalDateQuotaMap[item.date].max}`
                                                : `${item.available} cupo(s)`}
                                        </span>
                                    </div>

                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {item.available > 0 && (
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-700">
                                                    {item.available} disponibles
                                                </span>
                                            )}
                                            {item.pending > 0 && (
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                                    {item.pending} pendientes
                                                </span>
                                            )}
                                            {item.taken > 0 && (
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-700">
                                                    {item.taken} tomadas
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {schedulesForSelectedDate.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No hay horarios para esta fecha.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {schedulesForSelectedDate.map((s) => {
                                const slotRemaining = Number(s.slotRemaining ?? (s.status === "disponible" ? 1 : 0));
                                const available = slotRemaining > 0;
                                const hasConflict = hasCitizenTimeConflict(s);
                                const mySlotAppointment = getCitizenAppointmentForSlot(s);
                                const isMyPendingSlot = s.status === "pendiente" && isCitizenOwnerOfPendingSlot(s);
                                const isOtherCitizenPendingSlot = isCiudadano && s.status === "pendiente" && !isMyPendingSlot;
                                const isPendingButStillAvailable = isOtherCitizenPendingSlot && available;
                                const showPartialAvailableBadge = isPendingButStillAvailable;
                                const isBlockedByDateQuota =
                                    isCiudadano &&
                                    available &&
                                    Number.isFinite(selectedDateGlobalQuota?.available) &&
                                    selectedDateGlobalQuota.available <= 0;
                                const canTake =
                                    isCiudadano &&
                                    available &&
                                    !hasConflict &&
                                    !isBlockedByDateQuota &&
                                    !hasActiveAppointmentInCurrentPetition;
                                const badgeType = mySlotAppointment?.status === "aprobado"
                                    ? "info"
                                    : mySlotAppointment?.status === "rechazado"
                                        ? "neutral"
                                    : isBlockedByDateQuota
                                    ? "error"
                                    : isOtherCitizenPendingSlot && !available
                                        ? "error"
                                    : isPendingButStillAvailable
                                            ? "success"
                                        : getType(s.status);
                                const badgeText = mySlotAppointment?.status === "aprobado"
                                    ? "aprobado"
                                    : mySlotAppointment?.status === "rechazado"
                                        ? "rechazado"
                                    : isBlockedByDateQuota
                                    ? "sin cupo fecha"
                                    : isOtherCitizenPendingSlot && !available
                                        ? "reservada"
                                    : isPendingButStillAvailable
                                        ? "disponible"
                                        : s.status;

                                return (
                                    <div key={s.id} className="border rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-gray-600">
                                                    {slotRemaining}/{Number(s.slotCapacity ?? 1)}
                                                </span>
                                                {showPartialAvailableBadge ? (
                                                    <span className="text-xs px-2 py-1 flex items-center justify-center rounded-md border border-emerald-300 bg-emerald-200 text-emerald-900 font-medium">
                                                        disponible
                                                    </span>
                                                ) : (
                                                    <Badge type={badgeType} text={badgeText} showIcon={false} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            {isCiudadano && isBlockedByDateQuota && (
                                                <button
                                                    type="button"
                                                    disabled
                                                    title="No hay cupos disponibles para esta fecha"
                                                    className="px-2 py-1 text-xs rounded-md border border-red-200 bg-red-50 text-red-700 cursor-not-allowed"
                                                >
                                                    Cupo fecha lleno
                                                </button>
                                            )}

                                            {canTake && (
                                                <button
                                                    onClick={() => takeSchedule(s)}
                                                    disabled={taking}
                                                    className="px-2 py-1 text-xs rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                                                >
                                                    Tomar hora
                                                </button>
                                            )}

                                            {!isCiudadano && onSelect && available && (
                                                <button
                                                    onClick={() => onSelect(s)}
                                                    className="px-2 py-1 text-xs rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                                                >
                                                    Seleccionar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {!loading && isFuncionario && schedules.length === 0 && (
                <p className="text-sm text-gray-500 italic">No hay horarios para esta fecha.</p>
            )}

            {!loading && isFuncionario && schedules.length > 0 && (
                <div className="flex flex-col gap-2">
                    {schedules.map((s) => (
                        <div key={s.id} className="border rounded-md px-3 py-2 flex items-center justify-between">
                            <div className="text-sm">
                                {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge type={getType(s.status)} text={s.status} showIcon={false} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PetitionSchedule;
