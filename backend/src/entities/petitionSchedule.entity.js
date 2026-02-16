"use strict";

import { EntitySchema } from "typeorm";

export const PetitionSchedule = new EntitySchema({
    name: "PetitionSchedule",
    tableName: "petition_schedules",
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true,
        },
        petitionId: {
            type: "int",
            nullable: false,
        },
        date: {
            type: "date",
            nullable: false,
            comment: "Fecha de atención (YYYY-MM-DD)",
        },
        startTime: {
            type: "time",
            nullable: false,
        },
        status: {
            type: "enum",
            enum: ["disponible", "pendiente", "tomada"],
            default: "disponible",
            nullable: false,
        },
        endTime: {
            type: "time",
            nullable: false,
        },
        createdAt: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
        },
    },

    relations: {
        petition: {
            type: "many-to-one",
            target: "Petition",
            joinColumn: {
                name: "petitionId",
            },
            onDelete: "CASCADE",
        },
    },
});
