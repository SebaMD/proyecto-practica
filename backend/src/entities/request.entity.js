"use strict";

import { EntitySchema } from "typeorm";

export const Request = new EntitySchema({
    name: "Request",
    tableName: "requests",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: "increment",
        },
        citizenId: {
            type: "int",
            nullable: false,
        },
        petitionId: {
            type: "int",
            nullable: false,
        },
        description: {
            type: "varchar",
            length: 300,
            nullable: false,
        },
        status: {
            type: "enum",
            enum: ["aprobado", "rechazado", "pendiente"],
            default: "pendiente",
        },
        rejectReason: {
            type: "varchar",
            length: 300,
            nullable: true,
            default: null,
        },
        reviewerId: {
            type: "int",
            nullable: true,
            default: null,
        },
        reviewedAt: {
            type: "timestamp",
            nullable: true,
            default: null,
        },
        createdAt: {
            type: "timestamp",
            createDate: true,
            default: () => "CURRENT_TIMESTAMP",
        },
        updatedAt: {
            type: "timestamp",
            updateDate: true,
            default: () => "CURRENT_TIMESTAMP",
        },
    },
    relations: {
        citizenId: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "userId",
            },
            onDelete: "CASCADE",
        },
        reviewerId: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "reviewerId",
            },
            onDelete: "SET NULL",
        }
    }
});