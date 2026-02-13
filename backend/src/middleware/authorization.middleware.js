"use strict";

import jwt from "jsonwebtoken";
import { handleErrorClient, handleErrorServer } from "../handlers/responseHandlers.js";

export function getUserRole(req){
    const authHeader = req.headers["authorization"];

    if(!authHeader || !authHeader.startsWith("Bearer")) {
        console.error("No se provee el header de autorizacion.");
        return null;
    }

    const token = authHeader.split(" ")[1];

    try{
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.role;
    }catch(error){
        return null;
    }
}

const roleNames = {
    administrador: "Administrador",
    funcionario: "Funcionario",
    supervisor: "Supervisor",
    ciudadano: "Ciudadano",
};

export function verifyRoles(roles){
    return (req, res, next) => {
        try{
            const userRole = getUserRole(req);

            if(!userRole) return handleErrorClient(res, 401, "Token invalido o expirado");

            if(!roles.includes(userRole)){
                const validRolesNames = roles.map((role) => roleNames[role]).join(", ");

                return handleErrorClient(res, 403, `Acceso denegado: se necesitan privilegios de ${validRolesNames}`)
            }

            next();
        }catch(error){
            return handleErrorServer(res, 500, "Error interno del servidor", error);
        }
    };
}