import Joi from "joi";

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