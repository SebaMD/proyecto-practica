import { showErrorAlert, showSuccessToast } from "@helpers/sweetAlert";
import {
  archiveReviewedRequest,
  getPickupAvailabilityByDate,
  reviewRequest,
  cancelOwnRequest,
} from "@services/request.service";
import { getPetitionById } from "@services/petition.service";
import socket from "@services/socket.service";
import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import { Archive, Calendar, CalendarCheck, Eye, Trash2 } from "lucide-react";
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
      text: "Esta acción cancelará tu solicitud pendiente de renovación.",
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

  const handleArchiveRequest = async () => {
    const result = await archiveReviewedRequest(request.id);
    if (!result.success) {
      showErrorAlert("Error", result.message || "No se pudo archivar la solicitud");
      return;
    }

    showSuccessToast("Solicitud archivada exitosamente");
    fetchCallback?.();
  };

  const canArchiveReviewedRequest = (() => {
    if (!isFuncionario || request.status === "pendiente") return false;
    if (request.status === "rechazado") return true;

    const pickupDate = request?.pickupDate;
    const pickupTime = String(request?.pickupTime || "").slice(0, 5);
    if (!pickupDate || !pickupTime) return false;

    const [year, month, day] = String(pickupDate).split("-").map(Number);
    const [hour, minute] = String(pickupTime).split(":").map(Number);
    const startDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
    return new Date() >= endDateTime;
  })();

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
      <div
        className="relative border border-gray-300 px-6 py-4 rounded-md bg-white pr-16 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      >
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
            <div className="mt-2 inline-flex w-fit items-center gap-1 p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
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
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleViewDetails}
              className="px-3 py-1 text-sm inline-flex items-center gap-2 rounded-xl border border-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600"
            >
              <Eye className="h-4 w-4" />
              Ver
            </button>

            {canArchiveReviewedRequest && (
              <button
                onClick={handleArchiveRequest}
                className="px-3 py-1 text-sm inline-flex items-center gap-2 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Archive className="h-4 w-4" />
                Archivar
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return null;
}

async function requestDetailsDialog(request, petition, canReview) {
  const citizenData = request?.citizen ||
    (typeof request?.citizenId === "object" && request?.citizenId !== null ? request.citizenId : null);
  const canApproveWithSchedule = canReview && request.status === "pendiente";
  const defaultPickupDate = request?.requestDate || new Date().toISOString().slice(0, 10);

  const detailResult = await Swal.fire({
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
          <p class="text-sm text-gray-700 mt-1"><strong>Fecha solicitada:</strong> ${request.requestDate || "-"}</p>
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
      </div>
    `,
    showConfirmButton: canReview && request.status === "pendiente",
    confirmButtonText: "Asignar hora",
    showDenyButton: canReview && request.status === "pendiente",
    denyButtonText: "Rechazar",
    showCancelButton: true,
    cancelButtonText: "Cerrar",
    allowOutsideClick: false,
    allowEscapeKey: false,
    preDeny: async () => {
      const rejectReason = await reviewCommentDialog();
      if (!rejectReason) return false;
      return { status: "rechazado", rejectReason };
    },
  });

  if (detailResult.isDenied && detailResult.value) {
    return detailResult.value;
  }

  if (!detailResult.isConfirmed) return null;
  if (!canApproveWithSchedule) return null;

  const assignResult = await Swal.fire({
    title: "Asignar hora",
    width: 760,
    html: `
      <div class="text-left flex flex-col gap-3">
        <div class="border rounded-lg p-3 bg-gray-50">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Fecha retiro (fija)</p>
          <input id="pickupDateSelect" type="date" value="${defaultPickupDate}" disabled class="swal2-input" style="width:100%; margin:6px 0 0 0; background:#f3f4f6;" />
        </div>
        <div class="border rounded-lg p-3">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Horarios disponibles</p>
          <div id="pickupSlotsGrid" class="grid grid-cols-2 gap-2"></div>
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: "Aprobar",
    showCancelButton: true,
    cancelButtonText: "Volver",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      const dateSelect = document.getElementById("pickupDateSelect");
      const grid = document.getElementById("pickupSlotsGrid");
      if (!dateSelect || !grid) return;

      Swal.getPopup().selectedPickupSlot = null;

      const loadAndRenderSlots = async (dateValue) => {
        grid.innerHTML = `<div class="col-span-2 text-sm text-gray-500">Cargando horarios...</div>`;
        Swal.getPopup().selectedPickupSlot = null;

        const citizenId =
          typeof request?.citizenId === "object" && request?.citizenId !== null
            ? request.citizenId.id
            : request?.citizenId;

        const result = await getPickupAvailabilityByDate(dateValue, citizenId);
        if (!result.success) {
          grid.innerHTML = `<div class="col-span-2 text-sm text-red-600">${result.message || "No se pudieron cargar los horarios."}</div>`;
          return;
        }

        const slots = (result.data || []).sort((a, b) =>
          String(a.startTime).localeCompare(String(b.startTime))
        );

        if (!slots.length) {
          grid.innerHTML = `<div class="col-span-2 text-sm text-amber-700">No hay horarios configurados para retiro.</div>`;
          return;
        }

        grid.innerHTML = slots.map((slot) => {
          const start = String(slot.startTime).slice(0, 5);
          const end = String(slot.endTime).slice(0, 5);
          const key = `${start}|${end}`;
          const remaining = Number(slot.slotRemaining ?? 0);
          const capacity = Number(slot.slotCapacity ?? 2);
          const isBlockedForCitizen = Boolean(slot.blockedForCitizen);
          const isAvailable = remaining > 0 && !isBlockedForCitizen;
          return `
            <button
              type="button"
              class="pickup-slot-btn border rounded-md px-3 py-2 text-left text-sm flex items-center gap-2 ${isAvailable ? "bg-white hover:bg-blue-50" : isBlockedForCitizen ? "bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed"}"
              data-slot="${key}"
              data-available="${isAvailable ? "1" : "0"}"
              ${isAvailable ? "" : "disabled"}
            >
              <span class="inline-block h-4 w-4 rounded-sm border border-gray-500 shrink-0"></span>
              <span>${start} - ${end}</span>
              <span class="ml-auto text-xs ${isAvailable ? "text-gray-600" : isBlockedForCitizen ? "text-amber-700" : "text-red-600"}">${isBlockedForCitizen ? "Ya la tiene" : `${remaining}/${capacity}`}</span>
            </button>
          `;
        }).join("");

        const buttons = grid.querySelectorAll(".pickup-slot-btn[data-available='1']");
        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const alreadySelected = btn.dataset.selected === "1";

            buttons.forEach((node) => {
              node.dataset.selected = "0";
              node.classList.remove("ring-2", "ring-blue-500", "bg-blue-50");
              const box = node.querySelector("span");
              if (box) {
                box.classList.remove("bg-blue-600", "border-blue-600");
                box.classList.add("border-gray-500");
              }
            });

            if (alreadySelected) {
              Swal.getPopup().selectedPickupSlot = null;
              return;
            }

            btn.dataset.selected = "1";
            btn.classList.add("ring-2", "ring-blue-500", "bg-blue-50");
            const box = btn.querySelector("span");
            if (box) {
              box.classList.remove("border-gray-500");
              box.classList.add("bg-blue-600", "border-blue-600");
            }
            Swal.getPopup().selectedPickupSlot = btn.dataset.slot || null;
          });
        });
      };

      const onScheduleUpdated = () => {
        const currentDate = dateSelect.value || defaultPickupDate;
        loadAndRenderSlots(currentDate);
      };

      loadAndRenderSlots(dateSelect.value || defaultPickupDate);
      socket.on("schedule:updated", onScheduleUpdated);
      Swal.getPopup()._onScheduleUpdated = onScheduleUpdated;
    },
    willClose: () => {
      const popup = Swal.getPopup();
      if (popup?._onScheduleUpdated) {
        socket.off("schedule:updated", popup._onScheduleUpdated);
      }
    },
    preConfirm: () => {
      const pickupDate = document.getElementById("pickupDateSelect")?.value?.trim();
      if (!pickupDate) {
        Swal.showValidationMessage("Debes seleccionar una fecha de retiro");
        return false;
      }

      const pickupSlot = Swal.getPopup()?.selectedPickupSlot;
      if (!pickupSlot) {
        Swal.showValidationMessage("Debes seleccionar un horario disponible");
        return false;
      }

      const [pickupTime] = pickupSlot.split("|");
      return {
        status: "aprobado",
        pickupDate,
        pickupTime,
      };
    },
  });

  return assignResult.value || null;
}

async function reviewCommentDialog() {
  const { value } = await Swal.fire({
    title: "Motivo de rechazo",
    input: "textarea",
    inputPlaceholder: "Escribe el motivo...",
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    allowOutsideClick: false,
    allowEscapeKey: false,
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
