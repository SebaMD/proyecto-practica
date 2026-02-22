import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import { Pencil, Trash2, Users, BookOpen } from "lucide-react";

export function Petition({
    petition,
    isCompact = false,
    onEdit = null,
    onDelete = null,
    onDefine = null,
    onSelect = null,
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
    const handleSelect = () => onSelect && onSelect(petition);

    if (isCompact) {
        return (
            <div className="border rounded-lg p-3 bg-white">
                <p className="font-medium text-sm">{petition.name}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{petition.description}</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-4 bg-white flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-base">{petition.name}</h3>
                    <p className="text-sm text-gray-600">{petition.description}</p>
                </div>

                <Badge
                    type={hasPrerequisites ? "pending" : "success"}
                    text={hasPrerequisites ? "Con prerrequisitos" : "Sin prerrequisitos"}
                    showIcon={false}
                />
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{petition.dailyQuotas ?? 0} cupos diarios</span>
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

            <div className="flex gap-2 justify-end">
                {(isCiudadano || isSupervisor) && onSelect && (
                    <button
                        onClick={handleSelect}
                        className="px-3 py-1.5 text-sm border rounded-md hover:bg-blue-50 text-blue-700 border-blue-200"
                    >
                        Ver horarios
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
