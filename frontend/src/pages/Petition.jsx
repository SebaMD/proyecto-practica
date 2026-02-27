import { useEffect, useState } from "react";
import {
    getPetitions,
    createPetition,
    updatePetition,
    deletePetition,
} from "@services/petition.service";
import {
    createPetitionSchedule,
    getPetitionSchedules,
    deletePetitionSchedule,
} from "@services/petitionSchedule.service";
import PetitionCard from "@components/Petition";
import PetitionSchedule from "@components/PetitionSchedule";
import { showErrorAlert } from "@helpers/sweetAlert";
import { useAuth } from "@context/AuthContext";
import { Navbar } from "@components/Navbar";
import { Badge } from "@components/Badge";
import { PlusCircle, CheckCircle } from "lucide-react";
import { getActivePeriod } from "@services/period.service";
import socket from "@services/socket.service";
import Swal from "sweetalert2";

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
const GLOBAL_DAILY_QUOTA = 10;

const Petition = () => {
    const [loading, setLoading] = useState(false);
    const [petitions, setPetitions] = useState([]);
    const [selectedPetition, setSelectedPetition] = useState(null);
    const [schedulesByPetition, setSchedulesByPetition] = useState({});
    const [selectedDateByPetition, setSelectedDateByPetition] = useState({});
    const [selectedCitizenDateByPetition, setSelectedCitizenDateByPetition] = useState({});
    const [selectedScheduleIdByPetition, setSelectedScheduleIdByPetition] = useState({});
    const [selectedCitizenDate, setSelectedCitizenDate] = useState("");

    const { user } = useAuth();
    const isFuncionario = user.role === "funcionario";

    const isCiudadano = user.role === "ciudadano";
    const isSupervisor = user.role === "supervisor";

    const [activePeriod, setActivePeriod] = useState(null);
    const isFuncionarioLockedByActivePeriod = isFuncionario && !!activePeriod;

    const fetchPetitions = async () => {
        try {
            setLoading(true);
            const result = await getPetitions();
            if (result.success) {
                const data = result.data || [];
                setPetitions(data);
                await hydrateSchedulesForPetitions(data);
            } else {
                showErrorAlert("Error", result.message);
            }
        } catch (error) {
            console.error(error);
            showErrorAlert("Error", "No se pudieron obtener las peticiones");
        } finally {
            setLoading(false);
        }
    };

    const fetchActivePeriod = async () => {
        try {
            const period = await getActivePeriod();
            setActivePeriod(period || null);
        } catch (error) {
            console.error("Error al obtener periodo activo:", error);
            setActivePeriod(null);
        }
    };

    const hydrateSchedulesForPetitions = async (petitionList) => {
        const responses = await Promise.all(
            petitionList.map(async (p) => {
                const res = await getPetitionSchedules(p.id);
                return { petitionId: p.id, schedules: res.success ? res.data || [] : [] };
            })
        );

        const newSchedulesMap = {};
        responses.forEach(({ petitionId, schedules }) => {
            newSchedulesMap[petitionId] = schedules;
        });
        setSchedulesByPetition(newSchedulesMap);

        setSelectedDateByPetition((prev) => {
            const next = { ...prev };
            responses.forEach(({ petitionId, schedules }) => {
                const dates = [...new Set(schedules.map((s) => s.date))].sort();
                if (!next[petitionId] && dates.length > 0) {
                    next[petitionId] = dates[0];
                }
            });
            return next;
        });
    };

    const loadSchedulesForPetition = async (petitionId) => {
        const result = await getPetitionSchedules(petitionId);
        const schedules = result.success ? result.data || [] : [];

        setSchedulesByPetition((prev) => ({ ...prev, [petitionId]: schedules }));

        const dates = [...new Set(schedules.map((s) => s.date))].sort();
        setSelectedDateByPetition((prev) => ({
            ...prev,
            [petitionId]: prev[petitionId] && dates.includes(prev[petitionId]) ? prev[petitionId] : dates[0] || null,
        }));
    };

    const availableDatesForFilter = [...new Set(Object.values(schedulesByPetition).flat().map((s) => s.date))].sort();

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        fetchPetitions();
        fetchActivePeriod();
    }, []);
    /* eslint-enable react-hooks/exhaustive-deps */

    useEffect(() => {
        const handleScheduleUpdated = async (payload) => {
            if (!payload?.petitionId) return;

            const petitionId = Number(payload.petitionId);

            await loadSchedulesForPetition(petitionId);

            // Si quieres refrescar tambiÃ©n la lista completa (mÃ¡s pesado), usa fetchPetitions()
            // await fetchPetitions();
        };

        socket.on("schedule:updated", handleScheduleUpdated);

        return () => {
            socket.off("schedule:updated", handleScheduleUpdated);
        };
    }, []);


    const openViewSchedule = (petition) => {
        const rememberedDate = selectedCitizenDateByPetition[petition.id] || null;
        setSelectedPetition({
            ...petition,
            preferredDate: selectedCitizenDate || petition.preferredDate || rememberedDate || null,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleViewPetitionDetails = async (petition) => {
        const prerequisites = petition.prerrequisites?.trim()
            ? petition.prerrequisites
            : "Sin prerrequisitos";

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

                    <div class="border rounded-lg p-3">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Objetivos</p>
                        <p class="text-sm text-gray-800 whitespace-pre-wrap">${petition.objectives || "-"}</p>
                    </div>

                    <div class="border rounded-lg p-3 bg-gray-50">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Prerrequisitos</p>
                        <p class="text-sm text-gray-800">${prerequisites}</p>
                    </div>
                </div>
            `,
            confirmButtonText: "Cerrar",
        });
    };

    const openDefineScheduleDialog = async (petition) => {
        if (isFuncionarioLockedByActivePeriod) {
            showErrorAlert("Bloqueado", "No puedes modificar horarios mientras hay un perÃ­odo activo.");
            return;
        }

        const result = await Swal.fire({
            title: `Horas - ${petition.name}`,
            text: "¿Que quieres hacer?",
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: "Editar",
            denyButtonText: "Agregar fecha",
            cancelButtonText: "Cancelar",
        });

        if (result.isConfirmed) {
            await openEditDateSchedulesDialog(petition);
            return;
        }

        if (result.isDenied) {
            await openAddDateSchedulesDialog(petition);
            return;
        }
    };

    const getTodayLocalDate = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const isWeekendDate = (dateString) => {
        if (!dateString) return false;
        const [y, m, d] = String(dateString).split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const day = date.getDay();
        return day === 0 || day === 6;
    };


    const openAddDateSchedulesDialog = async (petition) => {
        const today = getTodayLocalDate();
        const existingDates = [...new Set((schedulesByPetition[petition.id] || []).map((s) => s.date))].sort();
        const existingDatesSet = new Set(existingDates);
        const existingDatesText = existingDates.length > 0 ? existingDates.join(", ") : "Ninguna";

        const { value: date } = await Swal.fire({
            title: `Agregar fecha - ${petition.name}`,
            html: `
                <div class="text-left flex flex-col gap-2">
                    <label class="text-sm font-medium">Fecha</label>
                    <input id="scheduleDate" type="date" min="${today}" class="swal2-input" value="${today}" />
                    <p class="text-xs text-gray-500">
                        Fechas ya creadas: ${existingDatesText}
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Continuar",
            cancelButtonText: "Cancelar",
            preConfirm: () => {
                const selectedDate = document.getElementById("scheduleDate")?.value;
                if (!selectedDate) {
                    Swal.showValidationMessage("Debes seleccionar una fecha");
                    return false;
                }
                if (selectedDate < today) {
                    Swal.showValidationMessage("No puedes seleccionar una fecha pasada");
                    return false;
                }
                if (isWeekendDate(selectedDate)) {
                    Swal.showValidationMessage("No puedes seleccionar sabado o domingo. Elige un dia habil.");
                    return false;
                }
                if (existingDatesSet.has(selectedDate)) {
                    Swal.showValidationMessage("Esa fecha ya existe. Usa la opciÃ³n Editar para modificar sus horarios.");
                    return false;
                }
                return selectedDate;
            },
        });

        if (!date) return;

        const resultExisting = await getPetitionSchedules(petition.id, date);
        const existing = resultExisting.success ? (resultExisting.data || []) : [];

        await openSlotsSelectorDialog({ petition, date, existing, requireAtLeastOne: true });
    };

    const openEditDateSchedulesDialog = async (petition) => {
        const allSchedules = schedulesByPetition[petition.id] || [];
        const dates = [...new Set(allSchedules.map((s) => s.date))].sort();

        if (dates.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Sin fechas",
                text: "Esta peticion aun no tiene fechas con horarios.",
            });
            return;
        }

        const options = Object.fromEntries(dates.map((d) => [d, d]));
        const { value: date } = await Swal.fire({
            title: `Editar horarios - ${petition.name}`,
            input: "select",
            inputOptions: options,
            inputValue: dates[0],
            showCancelButton: true,
            confirmButtonText: "Continuar",
            cancelButtonText: "Cancelar",
        });

        if (!date) return;

        const normalizedDate = String(date).slice(0, 10);

        const resultExisting = await getPetitionSchedules(petition.id, normalizedDate);
        const existing = resultExisting.success ? (resultExisting.data || []) : [];
        await openSlotsSelectorDialog({ petition, date: normalizedDate, existing, requireAtLeastOne: false });
    };

    const openSlotsSelectorDialog = async ({ petition, date, existing, requireAtLeastOne = true }) => {
        const existingKeys = new Set(
            existing.map((s) => slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)))
        );

        const slotOptions = PREDEFINED_SLOTS.map(([startTime, endTime]) => {
            const key = slotKey(startTime, endTime);
            const checked = existingKeys.has(key) ? "checked" : "";

            return `
                <label class="text-sm border rounded-md px-2 py-1 flex items-center gap-2 bg-white hover:bg-gray-50">
                    <input type="checkbox" data-slot="${key}" ${checked} />
                    <span>${startTime} - ${endTime}</span>
                </label>
            `;
        }).join("");

        const { value: selectedKeys } = await Swal.fire({
            title: `Horarios (${date})`,
            html: `
                <div class="text-left flex flex-col gap-2">
                    <p class="text-sm text-gray-600">
                        Marca para agregar y desmarca para quitar horarios de esta fecha.
                    </p>
                    <div class="grid grid-cols-2 gap-2">${slotOptions}</div>
                </div>
            `,
            width: 700,
            showCancelButton: true,
            confirmButtonText: requireAtLeastOne ? "Crear" : "Guardar",
            cancelButtonText: "Cancelar",
            preConfirm: () => {
                const checked = Array.from(document.querySelectorAll("input[data-slot]:checked"))
                    .map((el) => el.getAttribute("data-slot"));

                if (requireAtLeastOne && checked.length === 0) {
                    Swal.showValidationMessage("Debes seleccionar al menos un horario");
                    return false;
                }

                return checked;
            },
        });

        if (!selectedKeys) return;
        await saveScheduleDiff({ petition, date, existing, selectedKeys });
    };

    const saveScheduleDiff = async ({ petition, date, existing, selectedKeys }) => {
        const existingMap = new Map(
            existing.map((s) => [slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)), s])
        );
        const selectedSet = new Set(selectedKeys);

        const toCreate = selectedKeys
            .filter((key) => !existingMap.has(key))
            .map((key) => {
                const [startTime, endTime] = key.split("-");
                return { startTime, endTime };
            });

        const toDelete = existing.filter(
            (s) => !selectedSet.has(slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)))
        );

        const [createResults, deleteResults] = await Promise.all([
            Promise.allSettled(
                toCreate.map((slot) =>
                    createPetitionSchedule({
                        petitionId: petition.id,
                        date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    })
                )
            ),
            Promise.allSettled(toDelete.map((s) => deletePetitionSchedule(s.id))),
        ]);

        const createOk = createResults.filter((r) => r.status === "fulfilled" && r.value?.success).length;
        const deleteOk = deleteResults.filter((r) => r.status === "fulfilled" && r.value?.success).length;
        const createFail = createResults.length - createOk;
        const deleteFail = deleteResults.length - deleteOk;

        if (createFail > 0 || deleteFail > 0) {
            const failureMessages = [
                ...createResults
                    .filter((r) => r.status === "fulfilled" && !r.value?.success)
                    .map((r) => r.value?.message),
                ...deleteResults
                    .filter((r) => r.status === "fulfilled" && !r.value?.success)
                    .map((r) => r.value?.message),
                ...createResults
                    .filter((r) => r.status === "rejected")
                    .map((r) => r.reason?.message),
                ...deleteResults
                    .filter((r) => r.status === "rejected")
                    .map((r) => r.reason?.message),
            ].filter(Boolean);

            const detail = failureMessages[0] || "No se pudo aplicar uno o mÃ¡s cambios.";
            const isPastDateError = /fecha pasada/i.test(detail);

            Swal.fire({
                icon: "warning",
                title: isPastDateError ? "No se puede modificar una fecha pasada" : "Guardado parcial",
                html: isPastDateError
                    ? ""
                    : `
                    <div class="text-left">
                        <p class="text-sm text-gray-700 mb-2">${detail}</p>
                        ${createOk || deleteOk ? `<p class="text-xs text-gray-500">Se aplicaron algunos cambios antes del error.</p>` : ""}
                    </div>
                `,
            });
        } else {
            Swal.fire({
                toast: true,
                icon: "success",
                title: "Horarios actualizados correctamente",
                timer: 2200,
                position: "bottom-end",
                showConfirmButton: false,
            });
        }

        await loadSchedulesForPetition(petition.id);
    };

    const getRowInfo = (petition) => {
        const allSchedules = schedulesByPetition[petition.id] || [];
        const dates = [...new Set(allSchedules.map((s) => s.date))].sort();
        const selectedDate = selectedDateByPetition[petition.id] || dates[0] || null;
        const daySchedules = selectedDate
            ? allSchedules
                .filter((s) => s.date === selectedDate)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
            : [];

        const selectedScheduleId = selectedScheduleIdByPetition[petition.id];
        const selectedSchedule = daySchedules.find((s) => s.id === selectedScheduleId) || null;
        const effectiveSelectedSchedule = selectedSchedule || daySchedules[0] || null;

        const availableCount = daySchedules.filter((s) => s.status === "disponible").length;
        const globalQuota = getGlobalQuotaByDate(selectedDate);
        const petitionQuota = getPetitionQuotaByDate(petition, selectedDate);
        const effectiveAvailable = Math.min(availableCount, petitionQuota.available);

        let estado = "sin horarios";
        if (daySchedules.length > 0) {
            if (globalQuota.available <= 0) {
                estado = "Sin cupos fecha";
            } else if (effectiveAvailable <= 0) {
                estado = "Sin horas";
            } else {
                estado = "disponible";
            }
        }

        return {
            selectedDate,
            dateOptions: dates,
            dateLabel: selectedDate ? formatDate(selectedDate) : "Sin fechas",
            dateQuotaLabel: `${globalQuota.available}/${globalQuota.max}`,
            scheduleOptions: daySchedules.map((s) => ({
                id: s.id,
                label: `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`,
            })),
            selectedScheduleId: effectiveSelectedSchedule ? String(effectiveSelectedSchedule.id) : "",
            scheduleLabel: effectiveSelectedSchedule
                ? `${effectiveSelectedSchedule.startTime.slice(0, 5)} - ${effectiveSelectedSchedule.endTime.slice(0, 5)}`
                : "Sin horarios",
            scheduleQuotaLabel: `${effectiveAvailable}/${petitionQuota.max}`,
            estado,
        };
    };

    const handleFuncionarioDateChange = (petition, dateValue) => {
        if (!petition?.id || !dateValue) return;

        setSelectedDateByPetition((prev) => ({ ...prev, [petition.id]: dateValue }));
        setSelectedScheduleIdByPetition((prev) => ({ ...prev, [petition.id]: null }));
    };

    const handleFuncionarioScheduleChange = (petition, scheduleId) => {
        if (!petition?.id || !scheduleId) return;
        setSelectedScheduleIdByPetition((prev) => ({ ...prev, [petition.id]: Number(scheduleId) }));
    };

    const handleCreate = async () => {
        if (isFuncionarioLockedByActivePeriod) {
            showErrorAlert("Bloqueado", "No puedes crear peticiones mientras hay un perÃ­odo activo.");
            return;
        }

        const formData = await petitionDialog();
        if (!formData) return;

        const response = await createPetition(formData);
        if (!response.success) {
            showErrorAlert("Error", response.message);
            return;
        }

        await fetchPetitions();
        await openAddDateSchedulesDialog(response.data);
    };

    const handleEdit = async (petition) => {
        if (isFuncionarioLockedByActivePeriod) {
            showErrorAlert("Bloqueado", "No puedes editar peticiones mientras hay un perÃ­odo activo.");
            return;
        }

        const formData = await petitionDialog(petition);
        if (!formData) return;

        const response = await updatePetition(petition.id, formData);
        if (response.success) {
            Swal.fire({
                toast: true,
                icon: "success",
                title: "Peticion actualizada",
                timer: 3000,
                position: "bottom-end",
                showConfirmButton: false,
            });
            fetchPetitions();
        } else {
            showErrorAlert("Error", response.message);
        }
    };

    const handleDelete = async (petition) => {
        if (isFuncionarioLockedByActivePeriod) {
            showErrorAlert("Bloqueado", "No puedes eliminar peticiones mientras hay un perÃ­odo activo.");
            return;
        }

        const confirm = await Swal.fire({
            title: "Eliminar Peticion",
            text: `Seguro que deseas eliminar "${petition.name}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#ef4444",
        });

        if (!confirm.isConfirmed) return;

        const response = await deletePetition(petition.id);
        if (response.success) {
            Swal.fire({
                toast: true,
                icon: "success",
                title: "Peticion eliminada",
                timer: 3000,
                position: "bottom-end",
                showConfirmButton: false,
            });

            if (selectedPetition?.id === petition.id) {
                setSelectedPetition(null);
            }

            fetchPetitions();
        } else {
            showErrorAlert("Error", response.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const normalized = String(dateString).slice(0, 10);
        const [year, month, day] = normalized.split("-");
        if (!year || !month || !day) return normalized;
        return `${day}-${month}-${year}`;
    };

    const getGlobalQuotaByDate = (date) => {
        if (!date) {
            return { available: GLOBAL_DAILY_QUOTA, max: GLOBAL_DAILY_QUOTA };
        }

        const allSchedules = Object.values(schedulesByPetition).flat();
        const occupiedSchedules = allSchedules.filter(
            (s) => s.date === date && (s.status === "pendiente" || s.status === "tomada")
        );
        const uniqueOccupiedSlots = new Set(
            occupiedSchedules.map((s) => `${s.date}|${s.startTime}|${s.endTime}`)
        ).size;

        return {
            available: Math.max(0, GLOBAL_DAILY_QUOTA - uniqueOccupiedSlots),
            max: GLOBAL_DAILY_QUOTA,
        };
    };

    const getPetitionQuotaByDate = (petition, date) => {
        const petitionSchedules = schedulesByPetition[petition.id] || [];
        const petitionQuota = petitionSchedules.filter((s) => s.date === date).length;
        if (!date) {
            return { available: petitionQuota, max: petitionQuota };
        }
        const occupied = petitionSchedules.filter(
            (s) => s.date === date && (s.status === "pendiente" || s.status === "tomada")
        ).length;

        return {
            available: Math.max(0, petitionQuota - occupied),
            max: petitionQuota,
        };
    };

    const getCitizenQuotaInfo = (petition, preferredDate = "") => {
        const petitionSchedules = schedulesByPetition[petition.id] || [];

        if (petitionSchedules.length === 0) {
            return {
                available: GLOBAL_DAILY_QUOTA,
                max: GLOBAL_DAILY_QUOTA,
                date: null,
            };
        }

        const dates = [...new Set(petitionSchedules.map((s) => s.date))].sort();
        const targetDate =
            preferredDate && dates.includes(preferredDate)
                ? preferredDate
                : (dates[0] || null);
        const globalQuota = getGlobalQuotaByDate(targetDate);
        const petitionQuota = getPetitionQuotaByDate(petition, targetDate);
        const availableSchedules = petitionSchedules.filter(
            (s) => s.date === targetDate && s.status === "disponible"
        ).length;

        return {
            available: Math.min(availableSchedules, petitionQuota.available),
            max: petitionQuota.max,
            globalAvailable: globalQuota.available,
            globalMax: globalQuota.max,
            date: targetDate,
        };
    };

    const handleCitizenPetitionDateChange = (petitionId, dateValue) => {
        if (!petitionId || !dateValue) return;
        setSelectedCitizenDateByPetition((prev) => ({
            ...prev,
            [petitionId]: dateValue,
        }));
    };

    const handleCitizenCardDateChange = (petition, dateValue) => {
        if (!petition?.id || !dateValue) return;
        handleCitizenPetitionDateChange(petition.id, dateValue);
    };

    const visiblePetitionsForCitizen = petitions.filter((petition) => {
        if (!selectedCitizenDate) return true;

        const schedules = schedulesByPetition[petition.id] || [];
        return schedules.some((s) => s.date === selectedCitizenDate);
    });
    const isCitizenPeriodClosed = isCiudadano && !activePeriod;

    const globalDateQuotaMap = Object.fromEntries(
        availableDatesForFilter.map((dateValue) => {
            const quota = getGlobalQuotaByDate(dateValue);
            return [dateValue, quota];
        })
    );

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="pt-20 p-4">
                <div className="bg-white border rounded-xl p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Peticiones</h1>
                            <p className="text-gray-600">Administracion de peticiones del sistema</p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                            {(isCiudadano || isSupervisor) && (
                                <div className={`border rounded-lg px-4 py-2 min-w-[380px] ${ activePeriod ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
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

                            {(isCiudadano || isSupervisor) && (
                                <div className="border rounded-lg px-3 py-2 bg-white min-w-[220px]">
                                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                        Filtrar por fecha
                                    </label>
                                    <select
                                        value={selectedCitizenDate}
                                        onChange={(e) => setSelectedCitizenDate(e.target.value)}
                                        className="w-full border rounded-md px-2 py-1 text-sm"
                                    >
                                        <option value="">Todas las fechas</option>
                                        {availableDatesForFilter.map((dateValue) => (
                                            <option key={dateValue} value={dateValue}>
                                                {formatDate(dateValue)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {isFuncionario && (
                                <div className="flex items-start gap-3">
                                    {isFuncionarioLockedByActivePeriod && (
                                        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-2 max-w-[360px]">
                                            <p className="text-sm font-semibold text-amber-700">
                                                Edicion bloqueada por periodo activo
                                            </p>
                                            <p className="text-xs text-amber-800">
                                                No puedes crear, editar ni eliminar peticiones u horarios mientras exista un periodo activo.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleCreate}
                                        disabled={isFuncionarioLockedByActivePeriod}
                                        title={isFuncionarioLockedByActivePeriod ? "Bloqueado mientras hay un perÃ­odo activo" : ""}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                                            isFuncionarioLockedByActivePeriod
                                                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                                : "bg-blue-700 text-white hover:bg-blue-800"
                                        }`}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        Nueva Peticion
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        {loading && <Badge text="Cargando" />}
                        {!loading && petitions.length === 0 && (
                            <p className="text-gray-600 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                No hay peticiones registradas
                            </p>
                        )}
                        {!loading && petitions.length > 0 && (
                            <Badge type="info" text={`${petitions.length} Peticion(es)`} />
                        )}
                    </div>

                    {!loading && petitions.length > 0 && isFuncionario && (
                        <div className="w-full border border-gray-300 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="border-b border-gray-300 bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left">Nombre</th>
                                        <th className="p-3 text-left">Descripcion</th>
                                        <th className="p-3 text-center">Fecha</th>
                                        <th className="p-3 text-center">Cupos fecha</th>
                                        <th className="p-3 text-center">Horario</th>
                                        <th className="p-3 text-center">Cupos horario</th>
                                        <th className="p-3 text-center">Estado</th>
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {petitions.map((petition) => {
                                        const row = getRowInfo(petition);
                                        return (
                                            <tr key={petition.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                                <td className="p-3 font-medium">{petition.name}</td>
                                                <td className="p-3 text-gray-600">{petition.description}</td>
                                                <td className="p-3 text-center">
                                                    {row.dateOptions.length > 1 ? (
                                                        <select
                                                            value={row.selectedDate || ""}
                                                            onChange={(e) => handleFuncionarioDateChange(petition, e.target.value)}
                                                            className="px-2 py-1.5 text-xs border rounded-md text-indigo-700 border-indigo-200 bg-white"
                                                        >
                                                            {row.dateOptions.map((dateValue) => (
                                                                <option key={dateValue} value={dateValue}>
                                                                    {formatDate(dateValue)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="px-3 py-1.5 text-xs border rounded-md text-gray-700 border-gray-200 bg-gray-50 inline-block">
                                                            {row.dateLabel}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-semibold">{row.dateQuotaLabel}</td>
                                                <td className="p-3 text-center">
                                                    {row.scheduleOptions.length > 1 ? (
                                                        <select
                                                            value={row.selectedScheduleId}
                                                            onChange={(e) => handleFuncionarioScheduleChange(petition, e.target.value)}
                                                            className="px-2 py-1.5 text-xs border rounded-md text-blue-700 border-blue-200 bg-white"
                                                        >
                                                            {row.scheduleOptions.map((scheduleOption) => (
                                                                <option key={scheduleOption.id} value={String(scheduleOption.id)}>
                                                                    {scheduleOption.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="px-3 py-1.5 text-xs border rounded-md text-gray-700 border-gray-200 bg-gray-50 inline-block">
                                                            {row.scheduleLabel}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-semibold">{row.scheduleQuotaLabel}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        String(row.estado || "").toLowerCase().includes("disponible")
                                                            ? "bg-green-100 text-green-700"
                                                            : (
                                                                String(row.estado || "").toLowerCase().includes("sin cupo") ||
                                                                String(row.estado || "").toLowerCase().includes("sin hora")
                                                            )
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                        {row.estado}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => openDefineScheduleDialog(petition)}
                                                            disabled={isFuncionarioLockedByActivePeriod}
                                                            title={isFuncionarioLockedByActivePeriod ? "Bloqueado mientras hay un perÃ­odo activo" : ""}
                                                            className={`px-3 py-1.5 text-xs border rounded-md ${
                                                                isFuncionarioLockedByActivePeriod
                                                                    ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
                                                                    : "text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                                            }`}
                                                        >
                                                            Horas
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(petition)}
                                                            disabled={isFuncionarioLockedByActivePeriod}
                                                            title={isFuncionarioLockedByActivePeriod ? "Bloqueado mientras hay un perÃ­odo activo" : ""}
                                                            className={`px-3 py-1.5 text-xs border rounded-md ${
                                                                isFuncionarioLockedByActivePeriod
                                                                    ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
                                                                    : "text-blue-700 border-blue-200 hover:bg-blue-50"
                                                            }`}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(petition)}
                                                            disabled={isFuncionarioLockedByActivePeriod}
                                                            title={isFuncionarioLockedByActivePeriod ? "Bloqueado mientras hay un perÃ­odo activo" : ""}
                                                            className={`px-3 py-1.5 text-xs border rounded-md ${
                                                                isFuncionarioLockedByActivePeriod
                                                                    ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
                                                                    : "text-red-700 border-red-200 hover:bg-red-50"
                                                            }`}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && petitions.length > 0 && !isFuncionario && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visiblePetitionsForCitizen.map((petition) => (
                                (() => {
                                    const petitionDateOptions = [...new Set((schedulesByPetition[petition.id] || []).map((s) => s.date))].sort();
                                    const localSelectedDate =
                                        selectedCitizenDate ||
                                        selectedCitizenDateByPetition[petition.id] ||
                                        petitionDateOptions[0] ||
                                        "";
                                    const quotaInfo = getCitizenQuotaInfo(petition, localSelectedDate);
                                    const isDateQuotaClosed = isCiudadano && Number(quotaInfo?.globalAvailable ?? 0) <= 0;
                                    const isHoursClosed = isCiudadano && !isDateQuotaClosed && Number(quotaInfo?.available ?? 0) <= 0;
                                    const selectLabel = isCitizenPeriodClosed
                                        ? "Periodo cerrado"
                                        : isDateQuotaClosed
                                            ? "Sin cupos"
                                            : isHoursClosed
                                                ? "Sin horas"
                                                : "Ver horarios";

                                    return (
                                <PetitionCard
                                    key={petition.id}
                                    petition={petition}
                                    quotaInfo={quotaInfo}
                                    dateOptions={petitionDateOptions}
                                    selectedDateValue={localSelectedDate}
                                    onDateChange={selectedCitizenDate ? null : handleCitizenCardDateChange}
                                    onView={handleViewPetitionDetails}
                                    onSelect={openViewSchedule}
                                    selectBlocked={isCitizenPeriodClosed || isDateQuotaClosed}
                                    selectDanger={isHoursClosed}
                                    selectLabel={selectLabel}
                                    onBlockedSelect={() => {
                                        if (isCitizenPeriodClosed) {
                                            return Swal.fire({
                                                icon: "warning",
                                                title: "Periodo cerrado",
                                                text: "Solo puedes tomar horas cuando el periodo este activo.",
                                                confirmButtonText: "Entendido",
                                            });
                                        }

                                        return Swal.fire({
                                            icon: "warning",
                                            title: "Sin cupos en esta fecha",
                                            text: "No hay cupos disponibles para esta fecha. Prueba con otra fecha.",
                                            confirmButtonText: "Entendido",
                                        });
                                    }}
                                />
                                    );
                                })()
                            ))}
                        </div>
                    )}

                    {!loading && !isFuncionario && petitions.length > 0 && visiblePetitionsForCitizen.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                            No hay peticiones con horarios para la fecha seleccionada.
                        </p>
                    )}
                </div>
            </div>

            {!isFuncionario && selectedPetition && (
                <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
                    <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border shadow-xl p-4 md:p-5">
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                                <h2 className="font-semibold text-lg">Ver horarios</h2>
                                <p className="text-sm text-gray-600">{selectedPetition.name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPetition(null)}
                                className="text-sm text-gray-600 hover:text-gray-900 border rounded-md px-3 py-1.5"
                            >
                                Cerrar
                            </button>
                        </div>

                        <PetitionSchedule
                            petitionId={selectedPetition.id}
                            preferredDate={selectedPetition.preferredDate || null}
                            globalDateQuotaMap={globalDateQuotaMap}
                            onDateChange={(dateValue) => handleCitizenPetitionDateChange(selectedPetition.id, dateValue)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Petition;

async function petitionDialog(existingPetition = null) {
    const isEdit = !!existingPetition;

    const { value: formValues } = await Swal.fire({
        html: `
        <div class="text-start flex flex-col gap-3">
            <h2 class="text-lg font-bold">
                ${isEdit ? "Editar Peticion" : "Nueva Peticion"}
            </h2>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Nombre</label>
                <input id="name" type="text" class="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    value="${existingPetition?.name || ""}" />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Descripcion</label>
                <textarea id="description" class="border border-gray-300 rounded-md px-2 py-1 text-sm">${existingPetition?.description || ""}</textarea>
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Objetivos</label>
                <textarea id="objectives" class="border border-gray-300 rounded-md px-2 py-1 text-sm">${existingPetition?.objectives || ""}</textarea>
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Prerrequisitos (opcional)</label>
                <input id="prerrequisites" type="text" class="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    value="${existingPetition?.prerrequisites || ""}" />
            </div>

        </div>
        `,
        confirmButtonText: isEdit ? "Guardar cambios" : "Definir fecha/hora",
        confirmButtonColor: "#2563eb",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        showCloseButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const name = document.getElementById("name").value.trim();
            const description = document.getElementById("description").value.trim();
            const objectives = document.getElementById("objectives").value.trim();
            const prerrequisites = document.getElementById("prerrequisites").value.trim();
            if (!name || name.length < 3) {
                return Swal.showValidationMessage("Nombre minimo 3 caracteres"), false;
            }
            if (!description || description.length < 10) {
                return Swal.showValidationMessage("Descripcion minimo 10 caracteres"), false;
            }
            if (!objectives || objectives.length < 10) {
                return Swal.showValidationMessage("Objetivos minimo 10 caracteres"), false;
            }
            if (prerrequisites.length > 255) {
                return Swal.showValidationMessage("Prerrequisitos maximo 255 caracteres"), false;
            }

            return {
                name,
                description,
                objectives,
                prerrequisites,
                dailyQuotas: existingPetition?.dailyQuotas ?? 15,
            };
        },
    });

    return formValues || null;
}
