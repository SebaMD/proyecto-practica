import Joi from "joi";

export const createAppointmentBodyValidation = Joi.object({
    userId: Joi.number() //!ojo este no es tan necesario ya que lo ve por el id del token
        .required()
        .integer()
        .min(1)
        .messages({
            "any.required": "El ID del ciudadano es obligatorio.",
            "number.base": "El ID del ciudadano debe ser un número.",
            "number.integer": "El ID debe ser un número entero.",
            "number.min": "El ID debe ser un entero positivo.",
        }),
    petitionId: Joi.number()
        .required()
        .integer()
        .min(1)
        .messages({
            "any.required": "El ID de la peticion es obligatorio.",
            "number.base": "El ID de la peticion debe ser un número.",
            "number.integer": "El ID de la peticion debe ser un número entero.",
            "number.min": "El ID de la peticion debe ser un entero positivo.",
        }),
    petitionScheduleId: Joi.number()
        .required()
        .integer()
        .min(1)
        .messages({
            "any.required": "El horario es obligatorio",
            "number.base": "El horario debe ser un número",
            "number.integer": "El horario debe ser un entero",
            "number.min": "El horario debe ser mayor a 0",
    }),
})
.unknown(false)
.options({ abortEarly: false })
.messages({ "object.unknown": "No se permiten campos adicionales." });

export const updateStatusValidation = Joi.object({
    status: Joi.string()
        .required()
        .lowercase()
        .valid("aprobado", "rechazado", "pendiente")
        .messages({
            "any.required": "El estado es obligatorio.",
            "any.only": 'Solo se permiten estados "aprobado", "rechazado" y "pendiente"',
            "string.lowercase": "El estado debe estar en minúsculas",
        }),
    rejectReason: Joi.string()
        .trim()
        .min(5)
        .max(300)
        .when("status", {
            is: "rechazado",
            then: Joi.required().messages({
                "any.required": "El comentario del supervisor es obligatorio al rechazar la solicitud.",
            }),
        })
        .messages({
            "string.base": "El comentario del supervisor debe ser de tipo String.",
            "string.min": "El comentario del supervisor debe contener al menos 5 caracteres.",
            "string.max": "El comentario del supervisor puede contener hasta 300 caracteres.",
        }),
})
.unknown(false)
.options({ abortEarly: false })
.messages({ "object.unknown": "No se permiten campos adicionales." });