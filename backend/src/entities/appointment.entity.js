"use strict";

import { EntitySchema } from "typeorm";

export const Appointment = new EntitySchema({
    name: "Appointment",
    tableName: "appointments",
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true,
        },
        userId: {
            type: "int",
            nullable: false,
        },
        petitionId: {
            type: "int",
            nullable: false,
        },
        petitionScheduleId: {
            type: "int",
            nullable: false,
        },
        supervisorId: {
            type: "int",
            nullable: true,
        },
        status: {
            type: "enum",
            enum: ["pendiente", "aprobado", "rechazado"],
            default: "pendiente",
            nullable: false,
        },
        rejectReason: {
            type: "text",
            nullable: true,
        },
        reviewedAt: {
            type: "timestamp",
            nullable: true,
            default: null,
        },
        createdAt: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
        },
        updatedAt: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
        },
    },
    relations: {
        citizen: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "userId",
            },
            onDelete: "CASCADE",
        },
        petition: {
            type: "many-to-one",
            target: "Petition",
            joinColumn: {
                name: "petitionId",
            },
            onDelete: "CASCADE",
        },
        schedule:{
            type: "many-to-one",
            target: "PetitionSchedule",
            joinColumn: { name: "petitionScheduleId" },
            onDelete: "CASCADE",
        },
        supervisor: {
            type: "many-to-one",
            target: "User",
            joinColumn: { 
                name: "supervisorId" 
            },
            onDelete: "CASCADE",
        }
    }
});