import { showErrorAlert, showSuccessToast } from "@helpers/sweetAlert";
import { reviewRequest, cancelOwnRequest } from "@services/request.service";
import { getPetitionById } from "@services/petition.service";
import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import { Calendar, CalendarCheck, Eye, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

const getTodayLocalDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function Request({ request, isCompact = false, fetchCallback = null }) {
  const [loading, setLoading] = useState(false);
  const [petition, setPetition] = useState(null);
  const { user } = useAuth();

  const isCiudadano = user.role === "ciudadano";
  const isFuncionario = user.role === "funcionario";

  useEffect(() => {
    const fetchPetition = async () => {
      if (!request?.petitionId) return;
      try {
        setLoading(true);
        const result = await getPetitionById(request.petitionId);
        if (result.success) setPetition(result.data);
      } catch (error) {
        showErrorAlert("Error", "No se pudo cargar la peticion", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPetition();
  }, [request?.petitionId]);

  const getBadgeType = () => {
    if (request.status === "pendiente") return "pending";
    if (request.status === "aprobado") return "success";
    return "error";
  };

  const getBadgeText = () => {
    if (request.status === "pendiente") return "Pendiente";
    if (request.status === "aprobado") return "Aprobada";
    return "Rechazada";
  };

  const dateFormatter = (date) => (date ? new Date(date).toLocaleString() : "-");
  const citizenName =
    request?.citizen?.username ||
    request?.citizen?.email ||
    request?.citizenId?.username ||
    request?.citizenId?.email ||
    `Ciudadano #${typeof request?.citizenId === "object" ? request?.citizenId?.id : request?.citizenId}`;

  const handleViewDetails = async () => {
    const formValues = await requestDetailsDialog(request, petition, isFuncionario);
    if (!formValues) return;

    const result = await reviewRequest(request.id, formValues);
    if (result.success) {
      showSuccessToast(
        formValues.status === "aprobado"
          ? "Solicitud aprobada exitosamente"
          : "Solicitud rechazada exitosamente"
      );
      fetchCallback?.();
    } else {
      showErrorAlert("Error", result.message || "No se pudo revisar la solicitud");
    }
  };

  const handleCancelRequest = async () => {
    const confirm = await Swal.fire({
      title: "Cancelar solicitud",
      text: "Esta accion cancelara tu solicitud pendiente de renovacion.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, cancelar",
      cancelButtonText: "Volver",
      confirmButtonColor: "#dc2626",
    });

    if (!confirm.isConfirmed) return;

    const result = await cancelOwnRequest(request.id);
    if (!result.success) {
      showErrorAlert("Error", result.message || "No se pudo cancelar la solicitud");
      return;
    }

    showSuccessToast("Solicitud cancelada exitosamente");
    fetchCallback?.();
  };

  if (loading || !petition) {
    if (isCiudadano) return <p>Cargando...</p>;
    return (
      <tr>
        <td className="p-3">Cargando...</td>
      </tr>
    );
  }

  if (isCiudadano) {
    return (
      <div className="relative border border-gray-300 px-6 py-4 rounded-md bg-white pr-16">
        <div>
          <div className="flex flex-row gap-4 items-center mb-2">
            <span className="font-semibold text-lg">{petition.name}</span>
            <Badge type={getBadgeType()} text={getBadgeText()} showIcon={false} />
          </div>

          {!isCompact && (
            <div className="text-sm flex gap-2 items-center text-gray-500 mb-1">
              <Calendar className="h-4 w-4" />
              Solicitado el {dateFormatter(request.createdAt)}
            </div>
          )}

          {request.status !== "pendiente" && (
            <div className="text-sm flex gap-2 items-center text-gray-500">
              <CalendarCheck className="h-4 w-4" />
              Revisada el {dateFormatter(request.reviewedAt)}
            </div>
          )}

          {!isCompact && (
            <div className="text-sm text-gray-600 mt-3">{request.description}</div>
          )}

          {request.status === "aprobado" && request.pickupDate && request.pickupTime && (
            <div className="mt-2 inline-flex w-fit items-center gap-1 p-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
              <strong>Retiro:</strong>
              <span>{request.pickupDate} a las {request.pickupTime}</span>
            </div>
          )}

          {request.rejectReason && (
            <div className="mt-2 p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              <strong>Motivo rechazo:</strong> {request.rejectReason}
            </div>
          )}
        </div>

        <div className="absolute right-4 bottom-4 flex flex-col justify-end items-end gap-2">
          {isCompact && (
            <button
              onClick={handleViewDetails}
              className="px-3 py-1 text-sm flex items-center gap-2 rounded-xl border border-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600"
            >
              <Eye className="h-4 w-4" />
              Ver
            </button>
          )}

          {!isCompact && request.status === "pendiente" && (
            <button
              onClick={handleCancelRequest}
              title="Cancelar solicitud"
              className="p-2 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isFuncionario) {
    return (
      <tr className="border-b border-gray-300 hover:bg-gray-50 last:border-0">
        <td className="p-3 align-middle">{citizenName}</td>
        <td className="p-3 align-middle">{petition.name}</td>
        <td className="p-3 align-middle text-gray-700">
          <p className="max-w-[340px] truncate" title={request.description || "-"}>
            {request.description || "-"}
          </p>
        </td>
        <td className="p-3 text-center align-middle">
          <div className="flex justify-center">
            <Badge type={getBadgeType()} text={getBadgeText()} showIcon={false} />
          </div>
        </td>
        <td className="p-3 text-center align-middle">
          <button
            onClick={handleViewDetails}
            className="px-3 py-1 text-sm inline-flex items-center gap-2 rounded-xl border border-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600"
          >
            <Eye className="h-4 w-4" />
            Ver
          </button>
        </td>
      </tr>
    );
  }

  return null;
}

async function requestDetailsDialog(request, petition, canReview) {
  const citizenData = request?.citizen ||
    (typeof request?.citizenId === "object" && request?.citizenId !== null ? request.citizenId : null);

  const { value } = await Swal.fire({
    title: "Detalle de solicitud",
    width: 760,
    html: `
      <div class="text-left flex flex-col gap-3">
        <div class="border rounded-lg p-3 bg-gray-50">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Ciudadano</p>
          <p class="text-sm text-gray-900"><strong>Nombre:</strong> ${citizenData?.username || "-"}</p>
          <p class="text-sm text-gray-700"><strong>Email:</strong> ${citizenData?.email || "-"}</p>
          <p class="text-sm text-gray-700"><strong>RUT:</strong> ${citizenData?.rut || "-"}</p>
        </div>

        <div class="border rounded-lg p-3">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Peticion</p>
          <p class="text-sm text-gray-700"><strong>Nombre:</strong> ${petition?.name || "-"}</p>
          <p class="text-sm text-gray-700 mt-2"><strong>Descripcion:</strong> ${petition?.description || "-"}</p>
          <p class="text-sm text-gray-700 mt-1"><strong>Objetivos:</strong> ${petition?.objectives || "-"}</p>
          <p class="text-sm text-gray-700 mt-1"><strong>Prerrequisitos:</strong> ${petition?.prerrequisites || "Sin prerrequisitos"}</p>
        </div>

        <div class="border rounded-lg p-3 bg-gray-50">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Solicitud</p>
          <p class="text-sm text-gray-700"><strong>Motivo:</strong> ${request.description || "-"}</p>
          <p class="text-sm text-gray-700 mt-1"><strong>Creada:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
          <p class="text-sm text-gray-700 mt-1"><strong>Estado:</strong> ${request.status}</p>
          ${
            request.pickupDate && request.pickupTime
              ? `<p class="text-sm text-gray-700 mt-1"><strong>Retiro:</strong> ${request.pickupDate} ${request.pickupTime}</p>`
              : ""
          }
          ${
            request.reviewedAt
              ? `<p class="text-sm text-gray-700 mt-1"><strong>Revisada:</strong> ${new Date(request.reviewedAt).toLocaleString()}</p>`
              : ""
          }
        </div>
        ${
          request.rejectReason
            ? `
              <div class="border border-red-200 rounded-lg p-3 bg-red-50">
                <p class="text-xs font-semibold text-red-700 uppercase mb-1">Motivo rechazo</p>
                <p class="text-sm text-red-800">${request.rejectReason}</p>
              </div>
            `
            : ""
        }
        ${
          canReview && request.status === "pendiente"
            ? `
              <div class="border rounded-lg p-3">
                <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Programar retiro</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-sm font-medium text-gray-700">Fecha retiro</label>
                    <input id="pickupDate" type="date" min="${getTodayLocalDate()}" class="swal2-input" style="width:100%; margin:6px 0 0 0;" />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-700">Hora retiro</label>
                    <input id="pickupTime" type="time" class="swal2-input" style="width:100%; margin:6px 0 0 0;" />
                  </div>
                </div>
              </div>
            `
            : ""
        }
      </div>
    `,
    showConfirmButton: canReview && request.status === "pendiente",
    confirmButtonText: "Aprobar",
    showDenyButton: canReview && request.status === "pendiente",
    denyButtonText: "Rechazar",
    showCancelButton: true,
    cancelButtonText: "Cerrar",
    preConfirm: () => {
      if (!(canReview && request.status === "pendiente")) return { status: "aprobado" };

      const pickupDate = document.getElementById("pickupDate")?.value?.trim();
      const pickupTime = document.getElementById("pickupTime")?.value?.trim();

      if (!pickupDate) {
        Swal.showValidationMessage("La fecha de retiro es obligatoria");
        return false;
      }
      if (!pickupTime) {
        Swal.showValidationMessage("La hora de retiro es obligatoria");
        return false;
      }

      return { status: "aprobado", pickupDate, pickupTime };
    },
    preDeny: async () => {
      const rejectReason = await reviewCommentDialog();
      if (!rejectReason) return false;
      return { status: "rechazado", rejectReason };
    },
  });

  return value || null;
}

async function reviewCommentDialog() {
  const { value } = await Swal.fire({
    title: "Motivo de rechazo",
    input: "textarea",
    inputPlaceholder: "Escribe el motivo...",
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    inputValidator: (v) => {
      const text = (v || "").trim();
      if (!text) return "El motivo es obligatorio";
      if (text.length < 5 || text.length > 300) return "Debe tener entre 5 y 300 caracteres";
      return null;
    },
  });

  return value?.trim() || null;
}

export default Request;
