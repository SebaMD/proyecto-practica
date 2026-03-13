import Joi from "joi";

// Cambio pendiente para después de las pruebas:
// para exigir una duración mínima de 2 días.
// const PERIOD_MIN_DURATION_MS = 2 * 24 * 60 * 60 * 1000;

export const periodBodyValidation = Joi.object({   
    name: Joi.string()
        .min(5)
        .max(255)
        .required()
        .messages({
            "string.min": "El nombre debe tener al menos 5 caracteres.",
            "string.empty": "El nombre es obligatorio.",
            "any.required": "El nombre es obligatorio.",
        }),
    startDate: Joi.date()
        .iso()
        .min(new Date()) 
        .required()
        .messages({
            "date.base": "La fecha de inicio debe ser una fecha válida (ISO).",
            "date.min": "La fecha de inicio no puede ser anterior al día de hoy.",
            "any.required": "La fecha de inicio es obligatoria.",
        }),
    closingDate: Joi.date()
        .iso()
        .greater(Joi.ref("startDate")) 
        // .custom((value, helpers) => {
        //     const startDate = new Date(helpers.state.ancestors[0].startDate);
        //     const closingDate = new Date(value);
        //     if ((closingDate.getTime() - startDate.getTime()) < PERIOD_MIN_DURATION_MS) {
        //         return helpers.message("El período debe tener una duración mínima de 2 días.");
        //     }
        //     return value;
        // }, "minimum period duration")
        .required()
        .messages({
            "date.greater": "La fecha de cierre debe ser posterior a la fecha de inicio.",
            "any.required": "La fecha de cierre es obligatoria.",
        }),
})
.unknown(true) 
.messages({
    "object.unknown": "No se permiten propiedades adicionales.",
});

export const periodActiveUpdateValidation = Joi.object({
    closingDate: Joi.date()
        .iso()
        .required()
        .messages({
            "date.base": "La fecha de cierre debe ser una fecha valida (ISO).",
            "any.required": "La fecha de cierre es obligatoria.",
        }),
})
    .unknown(false)
    .messages({
        "object.unknown": "Solo se permite modificar la fecha de termino del periodo activo.",
    });
