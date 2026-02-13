import Joi from "joi";

export const createRequestBodyValidation = Joi.object({
    petitionId: Joi.number().required().integer().min(0).messages({
        "any.required": "El ID de la peticion es obligatorio.",
        "number.base": "El ID de la peticion debe ser un número.",
        "number.integer": "El ID de la peticion debe ser un número entero.",
        "number.min": "El ID de la peticion debe ser un entero positivo.",
    }),
    description: Joi.string().trim().required().min(5).max(300).messages({
        "any.required": "La descripción es obligatoria.",
        "string.base": "La descripción debe ser de tipo String.",
        "string.empty": "La descripción no puede estar vacía.",
        "string.min": "La descripción debe contener al menos 5 caracteres.",
        "string.max": "La descripción puede contener hasta 300 caracteres.",
    }),
})
.unknown(false)
.options({ abortEarly: false })
.messages({ "object.unknown": "No se permiten campos adicionales." });

export const reviewRequestValidation = Joi.object({
    status: Joi.string()
        .required()
        .lowercase()
        .valid("aprobado", "rechazado", "pendiente")
        .messages({
            "any.required": "El estado es obligatorio.",
            "any.only": 'Solo se permiten estados "aprobado", "rechazado" y "pendiente"',
            "string.lowercase": "El estado debe estar en minúsculas",
        }),
    rejectReason: Joi.when("status", {
        is: "rechazado",
        then: Joi.string().required()
        .trim()
        .min(5)
        .max(300)
        .messages({
            "any.required": "El comentario del revisor es obligatorio al rechazar la solicitud.",
            "string.base": "El comentario del revisor debe ser de tipo String.",
            "string.min": "El comentario del revisor debe contener al menos 5 caracteres.",
            "string.max": "El comentario del revisor puede contener hasta 300 caracteres.",
        }),
    })
})
.unknown(false)
.options({ abortEarly: false })
.messages({ "object.unknown": "No se permiten campos adicionales." });
