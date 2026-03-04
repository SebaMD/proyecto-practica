import { useAuth } from "@context/AuthContext";
import { Pencil, Trash2, Users, BookOpen, Eye } from "lucide-react";

export function Petition({
    petition,
    isCompact = false,
    onEdit = null,
    onDelete = null,
    onDefine = null,
    onView = null,
    onSelect = null,
    quotaInfo = null,
    dateOptions = [],
    selectedDateValue = "",
    onDateChange = null,
    selectLabel = "Ver horarios",
    selectBlocked = false,
    selectDanger = false,
    selectSuccess = false,
    onBlockedSelect = null,
    hideDateBlock = false,
    hideHoursBlock = false,
    hideQuotaBlock = false,
    quotaLabel = "Cupo fecha",
    hideMetaTags = false,
}) {
    const { user } = useAuth();

    const isCiudadano = user.role === "ciudadano";
    const isSupervisor = user.role === "supervisor";
    const isFuncionario = user.role === "funcionario";

    if (!petition) return null;

    const hasPrerequisites =
        typeof petition.prerrequisites === "string" && petition.prerrequisites.trim().length > 0;

    const prerequisites = hasPrerequisites
        ? petition.prerrequisites.split(",").map((p) => p.trim()).filter(Boolean)
        : [];

    const handleEdit = () => onEdit && onEdit(petition);
    const handleDelete = () => onDelete && onDelete(petition);
    const handleDefine = () => onDefine && onDefine(petition);
    const handleView = () => onView && onView(petition);
    const handleSelect = () => {
        if (selectBlocked) {
            onBlockedSelect && onBlockedSelect(petition);
            return;
        }
        if (!onSelect) return;
        const effectiveDate = selectedDateValue || quotaInfo?.date || null;
        onSelect({ ...petition, preferredDate: effectiveDate });
    };
    const handleDateChange = (e) => onDateChange && onDateChange(petition, e.target.value);
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const [year, month, day] = String(dateString).slice(0, 10).split("-");
        if (!year || !month || !day) return String(dateString);
        return `${day}-${month}-${year}`;
    };

    if (isCompact) {
        return (
            <div className="border rounded-lg p-3 bg-white">
                <p className="font-medium text-sm">{petition.name}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{petition.description}</p>
            </div>
        );
    }

    return (
        <div
            className={`border rounded-lg p-4 bg-white flex flex-col gap-3 transition-all duration-200 ${
                (isCiudadano || isSupervisor) ? "hover:-translate-y-1 hover:shadow-lg" : ""
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <h3 className="font-semibold text-base">{petition.name}</h3>
                    <div className="w-full rounded-md px-3 py-2 bg-gray-50">
                        <p className="text-sm text-gray-600 break-words">{petition.description}</p>
                    </div>
                </div>


            </div>

            {(isCiudadano || isSupervisor) ? (
                <>
                    <div className={`grid gap-3 text-sm ${hideDateBlock ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                        {!hideDateBlock && (
                            <div className="rounded-md px-3 py-2 bg-gray-50">
                                <p className="text-[11px] uppercase font-semibold text-gray-500 mb-0.5">Fecha</p>
                                {onDateChange && dateOptions.length > 1 ? (
                                    <select
                                        value={selectedDateValue || quotaInfo?.date || dateOptions[0] || ""}
                                        onChange={handleDateChange}
                                        className="w-full bg-transparent text-sm font-medium text-gray-800 outline-none"
                                    >
                                        {dateOptions.map((dateValue) => (
                                            <option key={dateValue} value={dateValue}>
                                                {formatDate(dateValue)}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="font-medium text-gray-800">{formatDate(quotaInfo?.date)}</p>
                                )}
                            </div>
                        )}

                        {!hideQuotaBlock && (
                            <div className="rounded-md px-3 py-2 bg-gray-50">
                                <p className="text-[11px] uppercase font-semibold text-gray-500 mb-0.5">{quotaLabel}</p>
                                <p className="font-medium text-gray-800">
                                    {Number.isFinite(quotaInfo?.globalAvailable) && Number.isFinite(quotaInfo?.globalMax)
                                        ? `${quotaInfo.globalAvailable}/${quotaInfo.globalMax}`
                                        : "-"}
                                </p>
                            </div>
                        )}
                    </div>

                    {!hideHoursBlock && (
                        <div className="rounded-md px-3 py-2 text-sm text-gray-700 flex items-center gap-2 bg-gray-50">
                            <Users className="h-4 w-4" />
                            <span>
                                Horas disponibles: {quotaInfo ? `${quotaInfo.available}/${quotaInfo.max}` : "-"}
                            </span>
                        </div>
                    )}

                    {!hideMetaTags && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${petition.objectives ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                                {petition.objectives ? "Con objetivos" : "Sin objetivos"}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${hasPrerequisites ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                                {hasPrerequisites ? "Con prerrequisitos" : "Sin prerrequisitos"}
                            </span>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            <span>
                                {quotaInfo
                                    ? `Horas disponibles: ${quotaInfo.available}/${quotaInfo.max}${quotaInfo.date ? ` (${quotaInfo.date})` : ""}${Number.isFinite(quotaInfo.globalAvailable) ? ` | Cupos fecha: ${quotaInfo.globalAvailable}/${quotaInfo.globalMax}` : ""}`
                                    : `${petition.dailyQuotas ?? 0} cupos diarios`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4" />
                            <span>{petition.objectives ? "Con objetivos" : "Sin objetivos"}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {prerequisites.length > 0 ? (
                            prerequisites.map((pre, idx) => (
                                <span
                                    key={`${petition.id}-pre-${idx}`}
                                    className="px-2 py-1 text-xs rounded border bg-gray-50"
                                >
                                    {pre}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs italic text-gray-500">Sin prerrequisitos</span>
                        )}
                    </div>
                </>
            )}

            <div className="flex gap-2 justify-end">
                {(isCiudadano || isSupervisor) && onView && (
                    <button
                        onClick={handleView}
                        className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                        <Eye className="h-4 w-4" />
                        Ver
                    </button>
                )}

                {(isCiudadano || isSupervisor) && onSelect && (
                    <button
                        onClick={handleSelect}
                        className={`px-3 py-1.5 text-sm border rounded-md ${
                            selectSuccess
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : (selectBlocked || selectDanger)
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                : "hover:bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                    >
                        {selectLabel}
                    </button>
                )}

                {isFuncionario && (
                    <>
                        {onDefine && (
                            <button
                                onClick={handleDefine}
                                className="px-3 py-1.5 text-sm border rounded-md hover:bg-indigo-50 text-indigo-700 border-indigo-200"
                            >
                                Definir horarios
                            </button>
                        )}
                        <button
                            onClick={handleEdit}
                            className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-blue-50 text-blue-700 border-blue-200"
                        >
                            <Pencil className="h-4 w-4" />
                            Editar
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 hover:bg-red-50 text-red-700 border-red-200"
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default Petition;


