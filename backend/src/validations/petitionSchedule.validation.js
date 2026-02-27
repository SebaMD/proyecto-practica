import Joi from "joi";

export const petitionScheduleValidation = Joi.object({
    petitionId: Joi.number()
        .integer()
        .min(1)
        .required(),

    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            "string.pattern.base": "La fecha debe tener formato YYYY-MM-DD",
        }),

    startTime: Joi.string()
        .pattern(/^([0-1]\d|2[0-3]):(00|30)$/)
        .required()
        .messages({
            "string.pattern.base": "La hora debe ser en intervalos de 30 minutos (HH:00 o HH:30)",
        }),

    endTime: Joi.string()
        .pattern(/^([0-1]\d|2[0-3]):(00|30)$/)
        .required(),
});

export const petitionScheduleUpdateValidation = Joi.object({
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .messages({
            "string.pattern.base": "La fecha debe tener formato YYYY-MM-DD",
        }),
    startTime: Joi.string()
        .pattern(/^([0-1]\d|2[0-3]):(00|30)$/)
        .messages({
            "string.pattern.base": "La hora debe ser en intervalos de 30 minutos (HH:00 o HH:30)",
        }),
    endTime: Joi.string()
        .pattern(/^([0-1]\d|2[0-3]):(00|30)$/),
}).min(1);
