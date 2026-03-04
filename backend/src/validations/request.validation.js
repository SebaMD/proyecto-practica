import Joi from "joi";

export const createRequestBodyValidation = Joi.object({
    petitionId: Joi.number().required().integer().min(1).messages({
        "any.required": "El ID de la peticion es obligatorio.",
        "number.base": "El ID de la peticion debe ser un numero.",
        "number.integer": "El ID de la peticion debe ser un numero entero.",
        "number.min": "El ID de la peticion debe ser un entero positivo.",
    }),
    description: Joi.string().trim().required().min(5).max(300).messages({
        "any.required": "La descripcion es obligatoria.",
        "string.base": "La descripcion debe ser de tipo String.",
        "string.empty": "La descripcion no puede estar vacia.",
        "string.min": "La descripcion debe contener al menos 5 caracteres.",
        "string.max": "La descripcion puede contener hasta 300 caracteres.",
    }),
    requestDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            "any.required": "La fecha de solicitud es obligatoria.",
            "string.pattern.base": "La fecha de solicitud debe tener formato YYYY-MM-DD.",
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
            "string.lowercase": "El estado debe estar en minusculas",
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
        otherwise: Joi.any().optional(),
    }),
    pickupDate: Joi.when("status", {
        is: "aprobado",
        then: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .required()
            .messages({
                "any.required": "La fecha de retiro es obligatoria al aprobar la solicitud.",
                "string.pattern.base": "La fecha de retiro debe tener formato YYYY-MM-DD.",
            }),
        otherwise: Joi.any().optional(),
    }),
    pickupTime: Joi.when("status", {
        is: "aprobado",
        then: Joi.string()
            .pattern(/^\d{2}:\d{2}$/)
            .required()
            .messages({
                "any.required": "La hora de retiro es obligatoria al aprobar la solicitud.",
                "string.pattern.base": "La hora de retiro debe tener formato HH:mm.",
            }),
        otherwise: Joi.any().optional(),
    }),
})
.unknown(false)
.options({ abortEarly: false })
.messages({ "object.unknown": "No se permiten campos adicionales." });
