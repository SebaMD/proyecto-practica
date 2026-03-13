import Joi from "joi";
import { isValidRut, normalizeEmail, normalizeRut, normalizeUsername } from "./auth.helpers.js";

const USERNAME_REGEX = /^[\p{L} ]+$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUT_REGEX = /^\d{7,8}-[\dKk]$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,128}$/;

export const editUserBodyValidation = Joi.object({
    username: Joi.string()
        .trim()
        .min(3)
        .max(75)
        .pattern(USERNAME_REGEX)
        .custom((value) => normalizeUsername(value), "normalize username")
        .messages({
            "string.base": "El nombre debe ser texto",
            "string.empty": "El nombre no puede estar vacío ",
            "string.min": "El nombre debe tener al menos 3 caracteres",
            "string.max": "El nombre no puede exceder 75 caracteres",
            "string.pattern.base": "El nombre solo puede contener letras y espacios",
        }),
    email: Joi.string()
        .trim()
        .max(254)
        .email({ tlds: { allow: false } })
        .pattern(EMAIL_REGEX)
        .custom((value) => normalizeEmail(value), "normalize email")
        .messages({
            "string.email": "Debe ser un email válido ",
            "string.pattern.base": "El email debe incluir @ y un dominio válido ",
            "string.max": "El email no puede exceder 254 caracteres",
            "string.empty": "El email no puede estar vacío ",
        }),
    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(PASSWORD_REGEX)
        .messages({
            "string.min": "La contraseña debe tener al menos 8 caracteres",
            "string.max": "La contraseña no puede exceder 128 caracteres",
            "string.pattern.base":
                "La contraseña debe incluir una mayúscula, un número y un carácter especial",
            "string.empty": "La contraseña no puede estar vacía ",
        }),
    rut: Joi.string()
        .trim()
        .pattern(RUT_REGEX)
        .custom((value, helpers) => {
            const normalizedRut = normalizeRut(value);
            if (!isValidRut(normalizedRut)) {
                return helpers.message("El RUT no es válido ");
            }
            return normalizedRut;
        }, "rut checksum")
        .messages({
            "string.pattern.base": "El RUT debe ir sin puntos y con gui�n (ej: 12345678-9)",
            "string.empty": "El RUT no puede estar vacío ",
        }),
    role: Joi.string()
        .valid("administrador", "funcionario", "supervisor", "ciudadano")
        .default("ciudadano")
        .messages({
            "any.only": "El rol debe ser: administrador, funcionario, supervisor o ciudadano",
        }),
    accountStatus: Joi.string()
        .valid("pendiente", "aprobado", "rechazado")
        .messages({
            "any.only": "El estado de cuenta debe ser: pendiente, aprobado o rechazado",
        }),
}).options({
    stripUnknown: true,
});
