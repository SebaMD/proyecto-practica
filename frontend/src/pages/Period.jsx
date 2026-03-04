import { useEffect, useState } from "react";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/flatpickr.min.css";
import { Navbar } from "@components/Navbar";
import { CalendarPlus, Edit2, Trash2 } from "lucide-react";
import {
    getPeriods,
    createPeriod,
    updatePeriod,
    deletePeriod,
} from "@services/period.service";
import { showErrorAlert, showSuccessAlert } from "@helpers/sweetAlert";
import Swal from "sweetalert2";

const Period = () => {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPeriods = async () => {
        try {
            setLoading(true);
            const data = await getPeriods();
            setPeriods(Array.isArray(data) ? data : []);
        } catch (error) {
            showErrorAlert("Error", "No se pudieron cargar los periodos", error);
            setPeriods([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const isPeriodActive = (period) => {
        if (!period) return false;
        const now = new Date();
        const startDate = new Date(period.startDate);
        const closingDate = new Date(period.closingDate);
        return startDate <= now && closingDate >= now;
    };

    const toLocalDateTime = (value) => {
        if (!value) return "";
        const d = new Date(value);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    };

    const getNowLocalDateTime = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mi = String(now.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    };

    const getDateOnly = (value) => String(value || "").slice(0, 10);

    const openPeriodModal = async (period = null) => {
        const isEdit = !!period;
        const isEditActivePeriod = isEdit && isPeriodActive(period);
        const minDateTime = getNowLocalDateTime();

        const blockedDaysByOtherPeriods = periods
            .filter((p) => Number(p.id) !== Number(period?.id))
            .flatMap((p) => {
                const start = new Date(p.startDate);
                const end = new Date(p.closingDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);

                const dates = [];
                const cursor = new Date(start);
                while (cursor <= end) {
                    const yyyy = cursor.getFullYear();
                    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
                    const dd = String(cursor.getDate()).padStart(2, "0");
                    dates.push(`${yyyy}-${mm}-${dd}`);
                    cursor.setDate(cursor.getDate() + 1);
                }
                return dates;
            });

        const uniqueBlockedDays = [...new Set(blockedDaysByOtherPeriods)];

        const result = await Swal.fire({
            title: isEdit ? "Editar periodo" : "Crear periodo",
            html: `
                <div class="flex flex-col gap-4 text-left">
                    <div>
                        <label class="text-sm font-medium">Nombre</label>
                        <input id="name" class="swal2-input m-0" value="${period?.name || ""}" ${isEditActivePeriod ? "disabled" : ""}>
                    </div>
                    <div>
                        <label class="text-sm font-medium">Fecha inicio</label>
                        <input id="startDate" class="swal2-input m-0" value="${toLocalDateTime(period?.startDate)}" ${isEditActivePeriod ? "disabled" : ""}>
                    </div>
                    <div>
                        <label class="text-sm font-medium">Fecha termino</label>
                        <input id="closingDate" class="swal2-input m-0" value="${toLocalDateTime(period?.closingDate)}">
                    </div>
                    <p class="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-2">
                        Reglas: no fechas pasadas y no fechas usadas por otros periodos.
                    </p>
                    ${
                        isEditActivePeriod
                            ? '<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-2">Periodo activo: solo se permite modificar la fecha de termino.</p>'
                            : ""
                    }
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: isEdit ? "Guardar" : "Crear",
            cancelButtonText: "Cancelar",
            didOpen: () => {
                const startInput = document.getElementById("startDate");
                const closingInput = document.getElementById("closingDate");

                const disableRules = [
                    ...uniqueBlockedDays,
                ];

                const onDayCreate = (_dObj, _dStr, _fp, dayElem) => {
                    if (dayElem.classList.contains("flatpickr-disabled")) {
                        dayElem.style.textDecoration = "line-through";
                        dayElem.style.opacity = "1";
                        dayElem.style.textDecorationColor = "#dc2626";
                        dayElem.style.color = "#dc2626";
                        dayElem.style.backgroundColor = "#fef2f2";
                        dayElem.style.borderColor = "#fecaca";
                    }
                };

                if (startInput && !isEditActivePeriod) {
                    flatpickr(startInput, {
                        locale: Spanish,
                        enableTime: true,
                        time_24hr: true,
                        dateFormat: "Y-m-d H:i",
                        minDate: minDateTime,
                        disableMobile: true,
                        disable: disableRules,
                        onDayCreate,
                    });
                }

                if (closingInput) {
                    flatpickr(closingInput, {
                        locale: Spanish,
                        enableTime: true,
                        time_24hr: true,
                        dateFormat: "Y-m-d H:i",
                        minDate: minDateTime,
                        disableMobile: true,
                        disable: disableRules,
                        onDayCreate,
                    });
                }
            },
            preConfirm: async () => {
                const name = document.getElementById("name").value.trim();
                const startDate = document.getElementById("startDate").value;
                const closingDate = document.getElementById("closingDate").value;

                if (!closingDate) {
                    Swal.showValidationMessage("La fecha de termino es obligatoria");
                    return false;
                }

                if (!isEditActivePeriod && (!name || !startDate)) {
                    Swal.showValidationMessage("Todos los campos son obligatorios");
                    return false;
                }

                if (new Date(closingDate) < new Date(minDateTime)) {
                    Swal.showValidationMessage("La fecha de termino no puede ser anterior a la actual");
                    return false;
                }

                if (uniqueBlockedDays.includes(getDateOnly(closingDate))) {
                    Swal.showValidationMessage("La fecha de termino cae en un rango usado por otro periodo");
                    return false;
                }

                if (!isEditActivePeriod) {
                    if (new Date(startDate) < new Date(minDateTime)) {
                        Swal.showValidationMessage("La fecha de inicio no puede ser anterior a la actual");
                        return false;
                    }

                    if (uniqueBlockedDays.includes(getDateOnly(startDate))) {
                        Swal.showValidationMessage("La fecha de inicio cae en un rango usado por otro periodo");
                        return false;
                    }

                    if (new Date(closingDate) <= new Date(startDate)) {
                        Swal.showValidationMessage("La fecha de termino debe ser posterior a la de inicio");
                        return false;
                    }
                } else if (new Date(closingDate) <= new Date(period.startDate)) {
                    Swal.showValidationMessage("La fecha de termino debe ser posterior a la de inicio");
                    return false;
                }

                try {
                    if (isEdit) {
                        if (isEditActivePeriod) {
                            await updatePeriod(period.id, {
                                closingDate: new Date(closingDate).toISOString(),
                            });
                        } else {
                            await updatePeriod(period.id, {
                                name,
                                startDate: new Date(startDate).toISOString(),
                                closingDate: new Date(closingDate).toISOString(),
                            });
                        }
                    } else {
                        await createPeriod({
                            name,
                            startDate: new Date(startDate).toISOString(),
                            closingDate: new Date(closingDate).toISOString(),
                        });
                    }
                    return true;
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.message || "Error al guardar el periodo");
                    return false;
                }
            },
        });

        if (result.isConfirmed) {
            showSuccessAlert("Exito", isEdit ? "Periodo actualizado" : "Periodo creado");
            fetchPeriods();
        }
    };

    const handleDelete = async (id) => {
        const targetPeriod = periods.find((p) => Number(p.id) === Number(id));
        if (targetPeriod && isPeriodActive(targetPeriod)) {
            showErrorAlert(
                "Periodo activo",
                "No se puede eliminar un periodo activo. Solo puedes modificar su fecha de termino."
            );
            return;
        }

        const result = await Swal.fire({
            title: "Eliminar periodo?",
            text: "Esta accion no se puede deshacer",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
        });

        if (result.isConfirmed) {
            try {
                await deletePeriod(id);
                showSuccessAlert("Eliminado", "Periodo eliminado correctamente");
                fetchPeriods();
            } catch {
                showErrorAlert("Error", "No se pudo eliminar el periodo");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="pt-20 p-6">
                <div className="bg-white border rounded-xl p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold">Gestion de periodos</h1>
                            <p className="text-gray-500 text-sm">
                                Define los rangos de fechas para la toma de horas
                            </p>
                        </div>

                        <button
                            onClick={() => openPeriodModal()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                        >
                            <CalendarPlus className="h-4 w-4" />
                            Nuevo periodo
                        </button>
                    </div>

                    <div className="overflow-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 text-left">Nombre</th>
                                    <th className="p-4 text-left">Inicio</th>
                                    <th className="p-4 text-left">Termino</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center">
                                            Cargando...
                                        </td>
                                    </tr>
                                ) : periods.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-gray-500">
                                            No hay periodos registrados
                                        </td>
                                    </tr>
                                ) : (
                                    periods.map((p) => (
                                        <tr key={p.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 font-medium">{p.name}</td>
                                            <td className="p-4">{formatDate(p.startDate)}</td>
                                            <td className="p-4">{formatDate(p.closingDate)}</td>
                                            <td className="p-4 flex justify-center gap-2">
                                                <button
                                                    onClick={() => openPeriodModal(p)}
                                                    className="p-2 text-blue-600 hover:bg-gray-200 rounded-full"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    disabled={isPeriodActive(p)}
                                                    title={isPeriodActive(p) ? "Periodo activo: no se puede eliminar" : ""}
                                                    className={`p-2 rounded-full ${
                                                        isPeriodActive(p)
                                                            ? "text-gray-400 cursor-not-allowed"
                                                            : "text-red-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Period;
