import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import { getRequests, createRequest } from "@services/request.service";
import { getPetitions } from "@services/petition.service";

import { showErrorAlert } from "@helpers/sweetAlert";
import { useAuth } from "@context/AuthContext";

import { Navbar } from "@components/Navbar";
import { Request as RequestCard } from "@components/Request";
import { Badge } from "@components/Badge";

import {
    CheckCircle,
    MessageSquareDashedIcon,
    MessageSquarePlus,
} from "lucide-react";

const Requests = () => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);

    const [showPending, togglePending] = useState(true);
    const [showApproved, toggleApproved] = useState(true);
    const [showRejected, toggleRejected] = useState(true);

    const [pendingCounter, setPendingCounter] = useState(0);
    const [approvedCounter, setApprovedCounter] = useState(0);
    const [rejectedCounter, setRejectedCounter] = useState(0);

    const { user } = useAuth();
    const isCiudadano = user.role === "ciudadano";

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

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleCreateRequest = async () => {
        try {
            const formValues = await createRequestDialog();
            if (!formValues) return;

            const response = await createRequest(formValues);

            if (response.success) {
                Swal.fire({
                    toast: true,
                    icon: "success",
                    title: "Solicitud creada exitosamente",
                    timer: 4000,
                    position: "bottom-end",
                    showConfirmButton: false,
                });
                fetchRequests();
        } else {
            showErrorAlert("Error", response.message);
        }
        } catch (error) {
            console.error("Error al crear solicitud:", error);
            showErrorAlert("Error", "No se pudo crear la solicitud");
        }
    };

    const badgeAction = (id) => {
        if (id === "pending") togglePending((p) => !p);
        if (id === "approved") toggleApproved((p) => !p);
        if (id === "rejected") toggleRejected((p) => !p);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="pt-20 p-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6">
                    {/* TÍTULO */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Solicitudes</h1>
                            <p className="text-gray-600">
                                {isCiudadano ? "Solicita inscripciones excepcionales." : "Revisa y responde solicitudes de la peticion."}
                            </p>
                        </div>

                        {isCiudadano && (
                        <button
                            onClick={handleCreateRequest}
                            className="bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700/90"
                        >
                            <MessageSquarePlus size={16} />
                            Nueva Solicitud
                        </button>
                        )}
                    </div>

                    {/* BADGES */}
                    <div className="flex gap-4 items-center">
                        {loading && <Badge text="Cargando..." />}

                        {pendingCounter > 0 && (
                        <Badge
                            type="pending"
                            text={`${pendingCounter} pendiente(s)`}
                            badgeId="pending"
                            callback={!isCiudadano && badgeAction}
                            canToggleActive={!isCiudadano}
                        />
                        )}

                        {approvedCounter > 0 && (
                        <Badge
                            type="success"
                            text={`${approvedCounter} aprobada(s)`}
                            badgeId="approved"
                            callback={!isCiudadano && badgeAction}
                            canToggleActive={!isCiudadano}
                        />
                        )}

                        {rejectedCounter > 0 && (
                        <Badge
                            type="error"
                            text={`${rejectedCounter} rechazada(s)`}
                            badgeId="rejected"
                            callback={!isCiudadano && badgeAction}
                            canToggleActive={!isCiudadano}
                        />
                        )}
                    </div>

                    {/* VISTA ciudadano */}
                    {!loading && isCiudadano && (
                        <div className="flex gap-6">
                            <div className="flex-2">
                                <h3 className="text-xl font-semibold mb-4">Pendientes</h3>
                                {pendingCounter > 0 ? (
                                requests.map(
                                    (r) =>
                                    r.status === "pendiente" && (
                                        <RequestCard key={r.id} request={r} />
                                    )
                                )
                                ) : (
                                <p className="text-gray-500 italic">
                                    No tienes solicitudes pendientes
                                </p>
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-4">Historial</h3>
                                {approvedCounter || rejectedCounter ? (
                                requests.map(
                                    (r) =>
                                    r.status !== "pendiente" && (
                                        <RequestCard
                                        key={r.id}
                                        request={r}
                                        isCompact
                                        />
                                    )
                                )
                                ) : (
                                <p className="text-gray-500 italic flex items-center gap-2">
                                    <MessageSquareDashedIcon size={18} />
                                    Aún no hay solicitudes revisadas
                                </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VISTA FUNCIONARIO */}
                    {!loading && !isCiudadano && requests.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold mb-4">
                                Listado de solicitudes
                            </h3>

                            <div className="border rounded-lg overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b">
                                        <tr>
                                        <th className="p-3 text-left">Ciudadano</th>
                                        <th className="p-3 text-left">Peticion</th>
                                        <th className="p-3 text-center">Estado</th>
                                        <th className="p-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((r) => {
                                        if (r.status === "pendiente" && showPending)
                                            return (
                                            <RequestCard
                                                key={r.id}
                                                request={r}
                                                fetchCallback={fetchRequests}
                                            />
                                            );

                                        if (r.status === "aprobado" && showApproved)
                                            return <RequestCard key={r.id} request={r} />;

                                        if (r.status === "rechazado" && showRejected)
                                            return <RequestCard key={r.id} request={r} />;

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
                        No hay solicitudes por revisar
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Requests;

/* =========================
DIALOG CREAR SOLICITUD
========================= */

async function createRequestDialog() {
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

    const petitions = result.data;

    const { value } = await Swal.fire({
        title: "Crear solicitud",
        html: `
        <label class="text-sm font-medium">Peticion</label>
        <select id="petition" class="swal2-input">
            ${petitions
            .map((e) => `<option value="${e.id}">${e.name}</option>`)
            .join("")}
        </select>

        <label class="text-sm font-medium">Motivo</label>
        <textarea id="description" class="swal2-textarea"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Crear",
        preConfirm: () => {
        const petitionId = Number(
            document.getElementById("petition").value
        );
        const description =
            document.getElementById("description").value.trim();

        if (!description || description.length < 5 || description.length > 300) {
            Swal.showValidationMessage(
            "La descripción debe tener entre 5 y 300 caracteres"
            );
            return false;
        }

        return { petitionId, description };
        },
    });

    return value || null;
}
