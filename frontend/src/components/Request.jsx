import { showErrorAlert, showSuccessToast } from "@helpers/sweetAlert";
import { reviewRequest } from "@services/request.service";
import { getPetitionById } from "@services/petition.service";
import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import { Calendar, CalendarCheck, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

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
        showErrorAlert("Error", "No se pudo cargar la petición", error);
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
      <div className="border border-gray-300 px-6 py-4 rounded-md flex flex-row justify-between items-center bg-white">
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

          {request.rejectReason && (
            <div className="mt-2 p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              <strong>Motivo rechazo:</strong> {request.rejectReason}
            </div>
          )}
        </div>

        {isCompact && (
          <button
            onClick={handleViewDetails}
            className="px-3 py-1 text-sm flex items-center gap-2 rounded-xl border border-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600"
          >
            <Eye className="h-4 w-4" />
            Ver
          </button>
        )}
      </div>
    );
  }

  if (isFuncionario) {
    return (
      <tr className="border-b border-gray-300 hover:bg-gray-50 last:border-0">
        <td className="p-3">Ciudadano #{request.citizenId}</td>
        <td className="p-3">{petition.name}</td>
        <td className="p-3 text-center">
          <Badge type={getBadgeType()} text={getBadgeText()} showIcon={false} />
        </td>
        <td className="p-3 text-center">
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
  const { value } = await Swal.fire({
    title: "Detalle de solicitud",
    html: `
      <div class="text-left text-sm space-y-2">
        <p><strong>Petición:</strong> ${petition?.name || "-"}</p>
        <p><strong>Descripción:</strong> ${request.description || "-"}</p>
        <p><strong>Creada:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
        <p><strong>Estado:</strong> ${request.status}</p>
        ${
          request.rejectReason
            ? `<p><strong>Motivo rechazo:</strong> ${request.rejectReason}</p>`
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
    preConfirm: () => ({ status: "aprobado" }),
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
