"use strict";

import Joi from "joi";
import {
    isValidRut,
    normalizeEmail,
    normalizeRut,
    normalizeUsername,
} from "./auth.helpers.js";

const USERNAME_REGEX = /^[\p{L} ]+$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUT_REGEX = /^\d{7,8}-[\dKk]$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,128}$/;

export const userRegisterBodyValidation = Joi.object({
    username: Joi.string()
        .trim()
        .min(3)
        .max(75)
        .pattern(USERNAME_REGEX)
        .custom((value) => normalizeUsername(value), "normalize username")
        .required()
        .messages({
            "string.base": "El nombre debe ser texto",
            "string.empty": "El nombre no puede estar vacio",
            "string.min": "El nombre debe tener al menos 3 caracteres",
            "string.max": "El nombre no puede exceder 75 caracteres",
            "string.pattern.base": "El nombre solo puede contener letras y espacios",
            "any.required": "El nombre es obligatorio",
        }),
    email: Joi.string()
        .trim()
        .max(254)
        .email({ tlds: { allow: false } })
        .pattern(EMAIL_REGEX)
        .custom((value) => normalizeEmail(value), "normalize email")
        .required()
        .messages({
            "string.email": "Debe ser un email valido",
            "string.pattern.base": "El email debe incluir @ y un dominio valido",
            "string.max": "El email no puede exceder 254 caracteres",
            "string.empty": "El email no puede estar vacio",
            "any.required": "El email es obligatorio",
        }),
    rut: Joi.string()
        .trim()
        .pattern(RUT_REGEX)
        .custom((value, helpers) => {
            const normalizedRut = normalizeRut(value);
            if (!isValidRut(normalizedRut)) {
                return helpers.message("El RUT no es valido");
            }
            return normalizedRut;
        }, "rut checksum")
        .required()
        .messages({
            "string.pattern.base": "El RUT debe ir sin puntos y con guion (ej: 12345678-9)",
            "string.empty": "El RUT no puede estar vacio",
            "any.required": "El RUT es obligatorio",
        }),
    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(PASSWORD_REGEX)
        .required()
        .messages({
            "string.empty": "La contrasena no puede estar vacia",
            "string.min": "La contrasena debe tener al menos 8 caracteres",
            "string.max": "La contrasena no puede exceder 128 caracteres",
            "string.pattern.base":
                "La contrasena debe incluir una mayuscula, un numero y un caracter especial",
            "any.required": "La contrasena es obligatoria",
        }),
}).options({
    stripUnknown: true,
});

export const userLoginBodyValidation = Joi.object({
    email: Joi.string()
        .trim()
        .max(254)
        .email({ tlds: { allow: false } })
        .pattern(EMAIL_REGEX)
        .custom((value) => normalizeEmail(value), "normalize email")
        .required()
        .messages({
            "string.email": "Debe ser un email valido",
            "string.pattern.base": "El email debe incluir @ y un dominio valido",
            "string.max": "El email no puede exceder 254 caracteres",
            "string.empty": "El email no puede estar vacio",
            "any.required": "El email es obligatorio",
        }),
    password: Joi.string()
        .required()
        .messages({
            "string.empty": "La contrasena no puede estar vacia",
            "any.required": "La contrasena es obligatoria",
        }),
}).options({
    stripUnknown: true,
});
