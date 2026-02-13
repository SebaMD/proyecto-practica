import Joi from "joi";

export const editUserBodyValidation = Joi.object({
    username: Joi.string()
        .min(2)
        .max(75)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,75}/)
        .messages({
        "string.base": "El nombre de usuario debe ser de tipo String",
        "string.empty": "El nombre de usuario no puede estar vacío",
        "string.min": "El nombre de usuario debe tener al menos 2 caracteres",
        "string.max": "El nombre de usuario no puede exceder los 75 caracteres",
        "string.pattern": "El nombre de usuario solo debe tener letras",
        "any.required": "El nombre de usuario es obligatorio",
        }),
    email: Joi.string().email().messages({
        "string.email": "Debe ser un email válido",
        "string.empty": "El email no puede estar vacío",
        "any.required": "El email es obligatorio",
    }),
    password: Joi.string().min(6).messages({
        "string.min": "La contraseña debe tener al menos 6 caracteres",
        "string.empty": "La contraseña no puede estar vacía",
    }),
    rut: Joi.string()
        .pattern(/^\d{7,8}-[\dkK]$/)
        .messages({
        "string.pattern.base": "El RUT debe tener formato 12345678-9 o 12345678-k",
        "string.empty": "El RUT no puede estar vacío",
        "any.required": "El RUT es obligatorio",
        }),
    role: Joi.string()
        .valid("administrador", "funcionario", "supervisor", "ciudadano")
        .default("ciudadano")
        .messages({
        "any.only": "El rol debe ser: administrador, funcionario, supervisor o ciudadano",
        }),
    }).options({
    stripUnknown: true,
});
