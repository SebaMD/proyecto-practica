"use strict";

import { EntitySchema } from "typeorm";

export const Period = new EntitySchema({
    name: "Period",
    tableName: "periods",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: "increment",
        },
        name: {
            type: "varchar",
            length: 255,
            nullable: false,
        },
        startDate: {
            type: "timestamp",
            nullable: false,
        },
        closingDate: {
            type: "timestamp",
            nullable: false,
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
});