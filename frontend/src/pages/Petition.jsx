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
} from "@services/petitionSchedule.service";
import PetitionCard from "@components/Petition";
import PetitionSchedule from "@components/PetitionSchedule";
import { showErrorAlert } from "@helpers/sweetAlert";
import { useAuth } from "@context/AuthContext";
import { Navbar } from "@components/Navbar";
import { Badge } from "@components/Badge";
import { PlusCircle, CheckCircle } from "lucide-react";
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

const Petition = () => {
    const [loading, setLoading] = useState(false);
    const [petitions, setPetitions] = useState([]);
    const [selectedPetition, setSelectedPetition] = useState(null);
    const [schedulesByPetition, setSchedulesByPetition] = useState({});
    const [selectedDateByPetition, setSelectedDateByPetition] = useState({});
    const [selectedScheduleIdByPetition, setSelectedScheduleIdByPetition] = useState({});

    const { user } = useAuth();
    const isFuncionario = user.role === "funcionario";

    const fetchPetitions = async () => {
        try {
            setLoading(true);
            const result = await getPetitions();
            if (result.success) {
                const data = result.data || [];
                setPetitions(data);
                if (isFuncionario) {
                    await hydrateSchedulesForPetitions(data);
                }
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

    useEffect(() => {
        fetchPetitions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openViewSchedule = (petition) => {
        setSelectedPetition(petition);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openDefineScheduleDialog = async (petition) => {
        const { value: date } = await Swal.fire({
            title: `Definir horarios - ${petition.name}`,
            html: `
                <div class="text-left flex flex-col gap-2">
                    <label class="text-sm font-medium">Fecha</label>
                    <input id="scheduleDate" type="date" class="swal2-input" value="${new Date().toISOString().slice(0, 10)}" />
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
                return selectedDate;
            },
        });

        if (!date) return;

        let existing = [];
        const resultExisting = await getPetitionSchedules(petition.id, date);
        if (resultExisting.success) existing = resultExisting.data || [];

        const existingKeys = new Set(
            existing.map((s) => slotKey(s.startTime.slice(0, 5), s.endTime.slice(0, 5)))
        );

        const slotOptions = PREDEFINED_SLOTS.map(([startTime, endTime]) => {
            const key = slotKey(startTime, endTime);
            const checked = existingKeys.has(key) ? "checked" : "";
            const disabled = existingKeys.has(key) ? "disabled" : "";
            const extraClass = existingKeys.has(key) ? "bg-green-50 border-green-200" : "bg-white";

            return `
                <label class="text-sm border rounded-md px-2 py-1 flex items-center gap-2 ${extraClass}">
                    <input type="checkbox" data-slot="${key}" ${checked} ${disabled} />
                    <span>${startTime} - ${endTime}</span>
                </label>
            `;
        }).join("");

        const { value: selectedKeys } = await Swal.fire({
            title: `Selecciona horarios (${date})`,
            html: `
                <div class="text-left flex flex-col gap-2">
                    <p class="text-sm text-gray-600">Marca las horas que quieras crear para esta Peticion.</p>
                    <div class="grid grid-cols-2 gap-2">${slotOptions}</div>
                    <p class="text-xs text-gray-500">Las horas ya creadas aparecen marcadas y bloqueadas.</p>
                </div>
            `,
            width: 700,
            showCancelButton: true,
            confirmButtonText: "Guardar horarios",
            cancelButtonText: "Cancelar",
            preConfirm: () => {
                const checked = Array.from(document.querySelectorAll("input[data-slot]:checked"))
                    .map((el) => el.getAttribute("data-slot"));

                const newOnes = checked.filter((key) => !existingKeys.has(key));

                if (newOnes.length === 0) {
                    Swal.showValidationMessage("No seleccionaste horarios nuevos");
                    return false;
                }

                return newOnes;
            },
        });

        if (!selectedKeys) return;

        const toCreate = selectedKeys.map((key) => {
            const [startTime, endTime] = key.split("-");
            return { startTime, endTime };
        });

        const results = await Promise.allSettled(
            toCreate.map((slot) =>
                createPetitionSchedule({
                    petitionId: petition.id,
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
                title: "Horarios creados correctamente",
                timer: 2200,
                position: "bottom-end",
                showConfirmButton: false,
            });
        }

        await loadSchedulesForPetition(petition.id);
    };

    const openDatePickerDialog = async (petition) => {
        const allSchedules = schedulesByPetition[petition.id] || [];
        const dates = [...new Set(allSchedules.map((s) => s.date))].sort();

        if (dates.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Sin fechas",
                text: "Esta Peticion a�n no tiene horarios definidos.",
            });
            return;
        }

        const options = Object.fromEntries(dates.map((d) => [d, d]));

        const { value } = await Swal.fire({
            title: `Fecha - ${petition.name}`,
            input: "select",
            inputOptions: options,
            inputValue: selectedDateByPetition[petition.id] || dates[0],
            showCancelButton: true,
            confirmButtonText: "Seleccionar",
            cancelButtonText: "Cancelar",
        });

        if (!value) return;

        setSelectedDateByPetition((prev) => ({ ...prev, [petition.id]: value }));
        setSelectedScheduleIdByPetition((prev) => ({ ...prev, [petition.id]: null }));
    };

    const openSchedulePickerDialog = async (petition) => {
        const allSchedules = schedulesByPetition[petition.id] || [];
        const selectedDate = selectedDateByPetition[petition.id];

        if (!selectedDate) {
            await openDatePickerDialog(petition);
            return;
        }

        const daySchedules = allSchedules
            .filter((s) => s.date === selectedDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (daySchedules.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Sin horarios",
                text: "No hay horarios para la fecha seleccionada.",
            });
            return;
        }

        const options = Object.fromEntries(
            daySchedules.map((s) => [String(s.id), `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)} (${s.status})`])
        );

        const { value } = await Swal.fire({
            title: `Horario - ${selectedDate}`,
            input: "select",
            inputOptions: options,
            inputValue: String(selectedScheduleIdByPetition[petition.id] || daySchedules[0].id),
            showCancelButton: true,
            confirmButtonText: "Seleccionar",
            cancelButtonText: "Cancelar",
        });

        if (!value) return;

        setSelectedScheduleIdByPetition((prev) => ({ ...prev, [petition.id]: Number(value) }));
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

        const availableCount = daySchedules.filter((s) => s.status === "disponible").length;
        const configuredDailyQuotas = Number(petition.dailyQuotas || 0);
        const availableByQuota = Math.min(availableCount, configuredDailyQuotas);

        let estado = "Sin horarios";
        if (selectedSchedule) {
            estado = selectedSchedule.status;
        } else if (daySchedules.length > 0) {
            if (daySchedules.some((s) => s.status === "disponible")) estado = "disponible";
            else if (daySchedules.some((s) => s.status === "pendiente")) estado = "pendiente";
            else estado = "tomada";
        }

        return {
            selectedDate,
            dateLabel: selectedDate || "Sin fechas",
            scheduleLabel: selectedSchedule
                ? `${selectedSchedule.startTime.slice(0, 5)} - ${selectedSchedule.endTime.slice(0, 5)}`
                : daySchedules.length > 0
                    ? `${daySchedules[0].startTime.slice(0, 5)} - ${daySchedules[0].endTime.slice(0, 5)}`
                    : "Sin horarios",
            cuposLabel: `${availableByQuota}/${configuredDailyQuotas}`,
            estado,
        };
    };

    const handleCreate = async () => {
        const formData = await petitionDialog();
        if (!formData) return;

        const response = await createPetition(formData);
        if (!response.success) {
            showErrorAlert("Error", response.message);
            return;
        }

        await fetchPetitions();
        await openDefineScheduleDialog(response.data);
    };

    const handleEdit = async (petition) => {
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

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="pt-20 p-4">
                <div className="bg-white border rounded-xl p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Peticiones</h1>
                            <p className="text-gray-600">Administracion de peticiones del sistema</p>
                        </div>

                        {isFuncionario && (
                            <button
                                onClick={handleCreate}
                                className="bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Nueva Peticion
                            </button>
                        )}
                    </div>

                    {!isFuncionario && selectedPetition && (
                        <div className="border rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="font-semibold text-lg">Horarios - {selectedPetition.name}</h2>
                                <button
                                    onClick={() => setSelectedPetition(null)}
                                    className="text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <PetitionSchedule petitionId={selectedPetition.id} />
                        </div>
                    )}

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
                                        <th className="p-3 text-center">Horario</th>
                                        <th className="p-3 text-center">Cupos</th>
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
                                                    <button
                                                        onClick={() => openDatePickerDialog(petition)}
                                                        className="px-3 py-1.5 text-xs border rounded-md text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                                    >
                                                        {row.dateLabel}
                                                    </button>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => openSchedulePickerDialog(petition)}
                                                        className="px-3 py-1.5 text-xs border rounded-md text-blue-700 border-blue-200 hover:bg-blue-50"
                                                    >
                                                        {row.scheduleLabel}
                                                    </button>
                                                </td>
                                                <td className="p-3 text-center font-semibold">{row.cuposLabel}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        row.estado === "disponible"
                                                            ? "bg-green-100 text-green-700"
                                                            : row.estado === "pendiente"
                                                                ? "bg-yellow-100 text-yellow-700"
                                                                : row.estado === "tomada"
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
                                                            className="px-3 py-1.5 text-xs border rounded-md text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                                        >
                                                            Horas
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(petition)}
                                                            className="px-3 py-1.5 text-xs border rounded-md text-blue-700 border-blue-200 hover:bg-blue-50"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(petition)}
                                                            className="px-3 py-1.5 text-xs border rounded-md text-red-700 border-red-200 hover:bg-red-50"
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
                            {petitions.map((petition) => (
                                <PetitionCard
                                    key={petition.id}
                                    petition={petition}
                                    onSelect={openViewSchedule}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
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

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Cupos diarios (1 a 15)</label>
                <input id="dailyQuotas" type="number" min="1" max="15"
                    class="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    value="${existingPetition?.dailyQuotas || 1}" />
            </div>
        </div>
        `,
        confirmButtonText: isEdit ? "Guardar cambios" : "Crear",
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
            const dailyQuotas = Number(document.getElementById("dailyQuotas").value);

            if (!name || name.length < 3) {
                return Swal.showValidationMessage("Nombre minimo 3 caracteres"), false;
            }
            if (!description || description.length < 10) {
                return Swal.showValidationMessage("Descripcion minimo 10 caracteres"), false;
            }
            if (!objectives || objectives.length < 10) {
                return Swal.showValidationMessage("Objetivos minimo 10 caracteres"), false;
            }
            if (!Number.isInteger(dailyQuotas) || dailyQuotas < 1 || dailyQuotas > 15) {
                return Swal.showValidationMessage("Cupos diarios debe ser un entero entre 1 y 15"), false;
            }
            if (prerrequisites.length > 255) {
                return Swal.showValidationMessage("Prerrequisitos maximo 255 caracteres"), false;
            }

            return {
                name,
                description,
                objectives,
                prerrequisites,
                dailyQuotas,
            };
        },
    });

    return formValues || null;
}
