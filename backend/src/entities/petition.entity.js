"use strict";

import { EntitySchema } from 'typeorm';

export const Petition = new EntitySchema({
    name: "Petition",
    tableName: "petitions",
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true,
        },
        name: {
            type: "varchar",
            length: 255,
            nullable: false,
        },
        description: {
            type: "text",
            nullable: false,
        },
        objectives: {
            type: "text",
            nullable: false,
        },
        prerrequisites: {
            type: "text",
            nullable: true,
        },
        dailyQuotas: {
            type: "int",
            nullable: false,
            comment: "Cupos máximos por día"
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
        supervisor: {
            type: "many-to-one",
            target: "User",
            nullable: true, 
            joinColumn: { name: "supervisorId" },
            onDelete: "SET NULL",
        }
    }
});