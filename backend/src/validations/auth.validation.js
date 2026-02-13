"use strict";

import Joi from "joi";

export const userRegisterBodyValidation = Joi.object({
    username: Joi.string()
        .required()
        .min(2)
        .max(75)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,75}/)
        .messages({
            "string.base": "El nombre de usuario debe ser de tipo String",
            "string.empty": "El nombre de usuario no pude estar vacio",
            "string.min": "El nombre de usuario debe tener al menos 2 caracteres",
            "string.max": "EL nombre de usuario no puede exceder los 75 caracteres",
            "string.pattern": "El nombre de usuario solo deve tener letras",
            "any.required": "El nombre de usuario es obligatorio"
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.email": "Debe ser un email valido",
            "string.empty": "El email no puede estar vacio",
            "any.required": "El email es obligatorio"
        }),
    rut: Joi.string()
        .pattern(/^\d{7,8}-[\dkK]$/)
        .required()
        .messages({
            "string.pattern.base": "El Rut debe tener formato 12345678-9 o 12345678-k",
            "string.empty": "El Rut no puede estar vacio",
            "any.required": "El Rut es obligatorio"
        }),
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            "string.pattern.base": "La contraseña debe tener al menos 6 caracteres",
            "string.empty": "La contraseña no puede estar vacia",
            "any.required": "La contraseña es obligatoria"
        }),
    role: Joi.string()
        .valid("administrador", "funcionario", "supervisor", "ciudadano")
        .optional()
        .default("ciudadano")
        .messages({
            "any.only": "El rol debe ser: administrador, supervisor, funcionario, ciudadano"
        })
}).options({
    stripUnknown: true
});

export const userLoginBodyValidation = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.email": "Debe ser un email valido",
            "string.empty": "El email no puede estar vacio",
            "any.required": "El email es obligatorio"
        }),
    password: Joi.string()
    .required()
    .messages({
        "string.empty": "La contraseña no puede estar vacia",
        "any.required": "La contraseña es obligatoria"
    })
}).options({
    stripUnknown: true
});