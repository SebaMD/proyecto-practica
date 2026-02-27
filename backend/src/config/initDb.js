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
            {
                username: "Martin elgueda",
                email: "melgueda@gmail.com",
                rut: "21898000-6",
                password: await bcrypt.hash("Martin123.", 10),
                role: "ciudadano",
            },
            {
                username: "Carlos Gana",
                email: "cgana@gmail.com",
                rut: "21898000-7",
                password: await bcrypt.hash("Carlos123.", 10),
                role: "ciudadano",
            },
            {
                username: "Carlos Domingues",
                email: "cdomingues@gmail.com",
                rut: "21898000-8",
                password: await bcrypt.hash("Carlos123.", 10),
                role: "ciudadano",
            },
            {
                username: "Cristopher Candia",
                email: "ccandia@gmail.com",
                rut: "21898000-9",
                password: await bcrypt.hash("Cris123.", 10),
                role: "ciudadano",
            },
            {
                username: "Andres Vivar",
                email: "avivar@gmail.com",
                rut: "21898123-5",
                password: await bcrypt.hash("Andres123.", 10),
                role: "ciudadano",
            },
            {
                username: "Emanuel Quezada",
                email: "equezada@gmail.com",
                rut: "21898321-5",
                password: await bcrypt.hash("Emanuel123.", 10),
                role: "ciudadano",
            },
            {
                username: "Pablo Albornoz",
                email: "palbornoz@gmail.com",
                rut: "21898231-5",
                password: await bcrypt.hash("Pablo123.", 10),
                role: "ciudadano",
            },
            {
                username: "Rosa Zapata",
                email: "rzapata@gmail.com",
                rut: "21898431-5",
                password: await bcrypt.hash("Rosa123.", 10),
                role: "ciudadano",
            },
            {
                username: "Boris Medina",
                email: "bmedina@gmail.com",
                rut: "21898981-5",
                password: await bcrypt.hash("Boris123.", 10),
                role: "ciudadano",
            },
            {
                username: "Luis Medina",
                email: "lmedina@gmail.com",
                rut: "21898672-5",
                password: await bcrypt.hash("Luis123.", 10),
                role: "ciudadano",
            },
            {
                username: "Estefania Enriques",
                email: "eenriques@gmail.com",
                rut: "21898458-5",
                password: await bcrypt.hash("Estefi123.", 10),
                role: "ciudadano",
            },
            {
                username: "Antonella Medina",
                email: "amedina@gmail.com",
                rut: "21898927-5",
                password: await bcrypt.hash("Anto123.", 10),
                role: "ciudadano",
            },
            {
                username: "Maritxu Cuevas",
                email: "mcuevas@gmail.com",
                rut: "21898071-5",
                password: await bcrypt.hash("Mari123.", 10),
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
            startDate: "2026-03-11T01:00:00.000Z",
            closingDate: "2026-03-12T01:00:00.000Z",
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
                dailyQuotas: 10,
            },
            {
                name: "Licencia de Conducir Clase C",
                description: "Permite conducir motocicletas y triciclos motorizados.",
                objectives: "Evaluar conocimientos teóricos y habilidades prácticas para conducción segura de motocicletas.",
                prerrequisites: "Tener 18 años cumplidos, cédula de identidad vigente.",
                dailyQuotas: 10,
            },
            {
                name: "Licencia de Conducir Clase A2",
                description: "Habilita para conducir taxis, ambulancias y transporte público de pasajeros.",
                objectives: "Verificar experiencia previa, conocimientos avanzados y aptitudes psicotécnicas.",
                prerrequisites: "Tener 20 años o más, poseer licencia Clase B por al menos 2 años, hoja de vida del conductor sin infracciones graves.",
                dailyQuotas: 10,
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