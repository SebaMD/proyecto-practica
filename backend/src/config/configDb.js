"use strict";

import { DataSource } from "typeorm";
import { User } from "../entities/user.entity.js";
import { Petition } from "../entities/petition.entity.js";
import { PetitionSchedule } from "../entities/petitionSchedule.entity.js";
import { Appointment } from "../entities/appointment.entity.js";
import { Period } from "../entities/period.entity.js";
import { Request } from "../entities/request.entity.js";
import { DATABASE, DB_USERNAME, HOST, PASSWORD, DB_PORT } from "./configEnv.js";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: `${HOST}`,
    port: DB_PORT,
    username: `${DB_USERNAME}`,
    password: `${PASSWORD}`,
    database: `${DATABASE}`,
    entities: [
        User,
        Petition,
        PetitionSchedule,
        Appointment,
        Period,
        Request
    ],
    synchronize: true,
    logging: false,
});

export async function connectDb() {
    try{
        await AppDataSource.initialize();
        console.log("=> Conexion exitosa a la base de datos!");
    }catch(error){
        console.error("Error al conectar con la base de datos: ", error);
        process.exit(1);
    }
}