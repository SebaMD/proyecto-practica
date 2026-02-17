/* Componente que representa una pequeña caja como indicador
Recibe parametros:
- type: Texto, por defecto "neutral", puede ser "success", "error", "pending", "info", "danger", "neutral"
- text: Texto, si no se especifica, queda como "(sin texto)"
- showIcon: Boolean, por defecto true, controla si se muestra o no el icono
- callback: Función que se ejecutará al hacer click, null por defecto
- badgeId: Texto, ID que identifica al Badge, util si se quieren asociar acciones al hacer click, vacio por defecto
- canToggleActive: Boolean, falso por defecto, controla si al hacer click puede cambiar el diseño activo/inactivo

--- Detalle de diseños ---
- Diseño activo: Tendra color de fondo, sin bordes, y el texto en semi negrita.
- Diseño inactivo: Tendra solo bordes, y el texto normal

- Colores por tipo
    - success: Verde
    - error: Rojo
    - pending: Ambar (icono de reloj)
    - info: Azul
    - danger: Ambar (icono de advertencia)
    - neutral: Gris (sin icono)

*/

import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { useState } from "react";

export function Badge({
    type = "neutral",
    text = "",
    showIcon = true,
    callback = null,
    badgeId = "",
    canToggleActive = false,
}) {
    let Icon;
    let colorAttributes;

    const [isActive, setActive] = useState(true);

    if (type === "pending") {
        Icon = Clock;
        colorAttributes = isActive
        ? "bg-amber-100 text-amber-600 border-amber-100 font-medium"
        : "border-amber-200 text-amber-600 font-normal";
    } else if (type === "error") {
        Icon = XCircle;
        colorAttributes = isActive
        ? "bg-red-100 text-red-600 border-red-100 font-medium "
        : "border-red-200 text-red-600 font-normal";
    } else if (type === "success") {
        Icon = CheckCircle2;
        colorAttributes = isActive
        ? "bg-green-100 text-green-600 border-green-100 font-medium "
        : "border-green-200 text-green-600 font-normal";
    } else if (type === "info") {
        Icon = Info;
        colorAttributes = isActive
        ? "bg-blue-100 text-blue-600 border-blue-100 font-medium "
        : "border-blue-200 text-blue-600 font-normal";
    } else if (type === "danger") {
        Icon = AlertTriangle;
        colorAttributes = isActive
        ? "bg-amber-100 text-amber-600 border-amber-100 font-medium "
        : "border-amber-200 text-amber-600 font-normal";
    } else {
        // neutral o tipo desconocido
        colorAttributes = "bg-gray-200 text-gray-700 border-gray-200";
    }

    if (text.length === 0) text = "(sin texto)";

    const handleClick = () => {
        if (callback) {
            // Cambia el diseño solo si canToggleActive = true
            canToggleActive && setActive((prev) => !prev);

            // Asegurarse que la función recibe el parámetro badgeId
            callback(badgeId);
        }
    };

    return (
        <button
            id={badgeId}
            onClick={handleClick}
            className={
                "text-xs px-2 py-1 flex gap-2 items-center justify-center rounded-md border " +
                colorAttributes +
                " transition-all hover:brightness-95"
            }
            >
            {Icon && showIcon && <Icon className="h-4 w-4 pointer-events-none" />}
            {text}
        </button>
    );
}
