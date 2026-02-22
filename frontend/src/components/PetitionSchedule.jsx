import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CalendarDays, Clock, Save } from "lucide-react";
import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import {
    getPetitionSchedules,
    createPetitionSchedule,
} from "@services/petitionSchedule.service";
import { createAppointment } from "@services/appointment.service";
import { getActivePeriod } from "@services/period.service";
import { showErrorAlert } from "@helpers/sweetAlert";

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

export function PetitionSchedule({ petitionId, onSelect = null }) {
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
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);

    const existingKeys = useMemo(
        () => new Set(schedules.map((s) => slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)))),
        [schedules]
    );

    const availableDates = useMemo(
        () => [...new Set(allSchedules.map((s) => s.date))].sort(),
        [allSchedules]
    );

    const schedulesForSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        return allSchedules
            .filter((s) => s.date === selectedDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [allSchedules, selectedDate]);

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
                    if (prev && data.some((s) => s.date === prev)) return prev;
                    const firstDate = [...new Set(data.map((s) => s.date))].sort()[0] || null;
                    return firstDate;
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

    useEffect(() => {
        if (isFuncionario) {
            fetchSchedulesByDate();
            return;
        }
        fetchAllSchedules();
        fetchCitizenPeriod();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petitionId, date, isFuncionario]);

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

    return (
        <div className="border rounded-lg p-4 bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold">Horarios</h3>
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

            {!isFuncionario && isCiudadano && (
                <div className={`rounded-md border p-3 ${activePeriod ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    <p className="text-sm font-medium">
                        {activePeriod ? "Periodo activo" : "Periodo cerrado"}
                    </p>
                    <p className="text-xs text-gray-600">
                        {activePeriod
                            ? "Puedes seleccionar una fecha y tomar una hora disponible."
                            : "No puedes tomar horas hasta que exista un periodo activo."}
                    </p>
                </div>
            )}

            {loading && <Badge text="Cargando..." />}

            {!loading && !isFuncionario && availableDates.length === 0 && (
                <p className="text-sm text-gray-500 italic">No hay fechas disponibles para esta peticion.</p>
            )}

            {!loading && !isFuncionario && availableDates.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <CalendarDays className="h-4 w-4" />
                        Fechas disponibles
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {availableDates.map((d) => (
                            <button
                                key={d}
                                onClick={() => setSelectedDate(d)}
                                className={`px-3 py-1.5 text-sm border rounded-md ${
                                    selectedDate === d
                                        ? "bg-blue-100 text-blue-700 border-blue-300"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    <div className="border rounded-md p-3 bg-gray-50">
                        <p className="text-sm font-medium mb-2">Horarios de {selectedDate || "-"}</p>

                        {schedulesForSelectedDate.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No hay horarios para esta fecha.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {schedulesForSelectedDate.map((s) => {
                                    const available = s.status === "disponible";
                                    const canTake = isCiudadano && available;

                                    return (
                                        <div key={s.id} className="border rounded-md p-2 bg-white flex items-center justify-between gap-2">
                                            <div className="text-sm font-medium">
                                                {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge type={getType(s.status)} text={s.status} showIcon={false} />

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
