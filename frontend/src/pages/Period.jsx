import { useEffect, useState } from "react";
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

    const openPeriodModal = async (period = null) => {
        const isEdit = !!period;

        const toInputDate = (value) => {
            if (!value) return "";
            const date = new Date(value);
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };

        const getLocalDateTimeMin = () => {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            return new Date(now.getTime() - offset).toISOString().slice(0, 16);
        };

        const minDateTime = getLocalDateTimeMin();

        const result = await Swal.fire({
            title: isEdit ? "Editar periodo" : "Crear periodo",
            html: `
                <div class="flex flex-col gap-4 text-left">
                <div>
                    <label class="text-sm font-medium">Nombre</label>
                    <input id="name" class="swal2-input m-0" value="${period?.name || ""}">
                </div>
                <div>
                    <label class="text-sm font-medium">Fecha inicio</label>
                    <input type="datetime-local" id="startDate" class="swal2-input m-0" min="${minDateTime}"
                    value="${toInputDate(period?.startDate)}">
                </div>
                <div>
                    <label class="text-sm font-medium">Fecha término</label>
                    <input type="datetime-local" id="closingDate" class="swal2-input m-0" min="${minDateTime}"
                    value="${toInputDate(period?.closingDate)}">
                </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: isEdit ? "Guardar" : "Crear",
            cancelButtonText: "Cancelar",
            preConfirm: async () => {
                const name = document.getElementById("name").value.trim();
                const startDate = document.getElementById("startDate").value;
                const closingDate = document.getElementById("closingDate").value;

                if (!name || !startDate || !closingDate) {
                    Swal.showValidationMessage("Todos los campos son obligatorios");
                    return false;
                }

                if (new Date(startDate) < new Date(minDateTime)) {
                    Swal.showValidationMessage("La fecha de inicio no puede ser anterior a la actual");
                    return false;
                }

                if (new Date(closingDate) < new Date(minDateTime)) {
                    Swal.showValidationMessage("La fecha de tÃ©rmino no puede ser anterior a la actual");
                    return false;
                }

                if (new Date(closingDate) <= new Date(startDate)) {
                    Swal.showValidationMessage(
                        "La fecha de término debe ser posterior a la de inicio"
                    );
                    return false;
                }

                const payload = {
                    name,
                    startDate: new Date(startDate).toISOString(),
                    closingDate: new Date(closingDate).toISOString(),
                };

                try {
                    if (isEdit) {
                        await updatePeriod(period.id, payload);
                    } else {
                        await createPeriod(payload);
                    }
                    return true;
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.message || "Error al guardar el periodo");
                    return false;
                }
            },
        });

        if (result.isConfirmed) {
            showSuccessAlert(
                "Éxito",
                isEdit ? "Periodo actualizado" : "Periodo creado"
            );
            fetchPeriods();
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Eliminar periodo?",
            text: "Esta acción no se puede deshacer",
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
                            <h1 className="text-xl font-bold">Gestión de Periodos</h1>
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
                                    <th className="p-4 text-left">Término</th>
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
                                                    className="p-2 text-red-600 hover:bg-gray-200 rounded-full"
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
