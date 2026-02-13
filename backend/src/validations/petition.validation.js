"use strict";

import Joi from "joi";

export const petitionBodyValidation = Joi.object({
    name: Joi.string().min(3).max(255).required().messages({
        "string.empty": "El nombre no puede estar vacío",
        "string.min": "El nombre debe tener al menos 3 caracteres",
        "string.max": "El nombre no puede tener más de 255 caracteres",
        "any.required": "El nombre es obligatorio"
    }),
    description: Joi.string().min(10).max(1000).required().messages({
        "string.empty": "La descripción no puede estar vacía",
        "string.min": "La descripción debe tener al menos 10 caracteres",
        "string.max": "La descripción no puede exceder los 1000 caracteres",
        "any.required": "La descripción es obligatoria"
    }),
    objectives: Joi.string().min(10).max(1000).required().messages({
        "string.empty": "Los objetivos no pueden estar vacíos",
        "string.min": "Los objetivos deben tener al menos 10 caracteres",
        "string.max": "Los objetivos no pueden exceder los 1000 caracteres",
        "any.required": "Los objetivos son obligatorios"
    }),
    prerrequisites: Joi.string().allow(null, "").max(255).optional().messages({
        "string.base": "Los prerrequisitos deben ser de tipo texto",
        "string.max": "Los prerrequisitos no pueden exceder los 500 caracteres"

    }),
    dailyQuotas: Joi.number().integer().min(1).max(15).required().messages({
        "number.base": "Los cupos deben ser un número",
        "number.integer": "Los cupos deben ser un número entero",
        "number.min": "Debe haber al menos 1 cupo",
        "number.max": "No puede haber más de 15 cupos",
        "any.required": "Los cupos son obligatorios"
    }),
})
.options({
    stripUnknown: true,
});
