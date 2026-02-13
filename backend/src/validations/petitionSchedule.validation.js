import Joi from "joi";

export const petitionScheduleValidation = Joi.object({
    petitionId: Joi.number().integer().required(),

    date: Joi.date().required(),

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