"use strict";

import { Petition } from "../entities/petition.entity.js"
import { Period } from "../entities/period.entity.js";
import { User } from "../entities/user.entity.js";
import { AppDataSource } from "./configDb.js";
import bcrypt from "bcrypt";

export async function createInitialUsers() {
    try{
        const userRepository = AppDataSource.getRepository(User);

        const userCount = await userRepository.count();
        if(userCount > 0) return;

        const users = [
            {
                username: "Administrador",
                email: "admin@gmail.com",
                rut: "12345678-9",
                password: await bcrypt.hash("@dmin.2026", 10),
                role: "administrador",
            },
            {
                username: "Juan Espinoza",
                email: "jespinoza@gmail.com",
                rut: "11222333-4",
                password: await bcrypt.hash("Juan123.", 10),
                role: "funcionario",
            },
            {
                username: "Emilio Yañes",
                email: "eyanes@gmail.com",
                rut: "55666777-8",
                password: await bcrypt.hash("Emilio123.", 10),
                role: "supervisor",
            },
            {
                username: "Sebastián Medina",
                email: "smedina@gmail.com",
                rut: "20891000-k",
                password: await bcrypt.hash("Sebastian123.", 10),
                role: "ciudadano",
            },
            {
                username: "Anibal Candia",
                email: "acandia@gmail.com",
                rut: "21898000-5",
                password: await bcrypt.hash("Anibal123.", 10),
                role: "ciudadano",
            },
        ];

        for (const user of users) {
            await userRepository.save(userRepository.create(user));
        }
        console.log("=> Usuario iniciales creados exitosamente");
    } catch (error){
        console.error("Error al crear usuarios iniciales:", error);
        process.exit(1);
    }
}

export async function createInitialPeriod(){
    try{
        const periodRepository = AppDataSource.getRepository(Period);

        const periodCount = await periodRepository.count();

        if(periodCount > 0) return;

        const period = {
            name: "2025-2",
            startDate: "2025-12-11T01:00:00.000Z",
            closingDate: "2026-01-11T01:00:00.000Z",
        };

        await periodRepository.save(periodRepository.create(period));
        console.log("=> Period inicial creado exitosamente");
    }catch(error){
        console.error("Error al crear periodo inicial:", error);
        process.exit(1);
    }
}

export async function createInitialPetitions(){
    try{
        const petitionRepoditoy = AppDataSource.getRepository(Petition);

        const petitionCount = await petitionRepoditoy.count();
        if(petitionCount > 0) return;

        const petitions = [
            {
                name: "Licencia de Conducir Clase B",
                description: "Permite conducir vehículos motorizados particulares como automóviles y camionetas.",
                objectives: "Evaluar conocimientos teóricos, habilidades prácticas y condiciones psicotécnicas del postulante.",
                prerrequisites: "Tener 18 años cumplidos, cédula de identidad vigente, educación básica aprobada.",
                dailyQuotas: 15,
            },
            {
                name: "Licencia de Conducir Clase C",
                description: "Permite conducir motocicletas y triciclos motorizados.",
                objectives: "Evaluar conocimientos teóricos y habilidades prácticas para conducción segura de motocicletas.",
                prerrequisites: "Tener 18 años cumplidos, cédula de identidad vigente.",
                dailyQuotas: 15,
            },
            {
                name: "Licencia de Conducir Clase A2",
                description: "Habilita para conducir taxis, ambulancias y transporte público de pasajeros.",
                objectives: "Verificar experiencia previa, conocimientos avanzados y aptitudes psicotécnicas.",
                prerrequisites: "Tener 20 años o más, poseer licencia Clase B por al menos 2 años, hoja de vida del conductor sin infracciones graves.",
                dailyQuotas: 15,
            },
        ];

        for (const petition of petitions) {
            await petitionRepoditoy.save(petitionRepoditoy.create(petition));
        }
        console.log("=> Peticiones iniciales creadas exitosamente")
    }catch(error){
        console.error("Error al crear peticiones iniciales: ", error);
        process.exit(1);
    }
}