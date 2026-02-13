import { loginService, registerService } from "../services/auth.service.js";
import { handleErrorClient, handleErrorServer, handleSuccess } from "../handlers/responseHandlers.js";
import {
    userLoginBodyValidation,
    userRegisterBodyValidation
} from "../validations/auth.validation.js";

export async function login(req, res){
    try{
        const { body } = req;
        const { error } = userLoginBodyValidation.validate(body);

        if(error){
            return handleErrorClient(res, 400, "Parametros invalidos", error.message);
        }

        const data = await loginService(body);
        handleSuccess(res, 200, "Inicio de sesion exitoso", data);
    }catch(error){
        return handleErrorClient(res, 401, error.message);
    }
}

export async function register(req, res){
    try{
        const { body } = req;
        const { error, value } = userRegisterBodyValidation.validate(body);

        if(error){
            return handleErrorClient(res, 400, "Parametros invalidos", error.message);
        }

        const newUser = await registerService(value);
        delete newUser.password;

        handleSuccess(res, 201, "Usuario registrado exitosamente", newUser);
    }catch(error){
        if(error.code === "23505"){
            if(error.detail?.includes("email")){
                return handleErrorClient(res, 409, "El email ya esta registrado");
            }
            if(error.detail?.includes("rut")){
                return handleErrorClient(res, 409, "El rut ya esta registrado");
            }
            return handleErrorClient(res, 409, "Ya existe un usuario con estos datos");
        }else{
            return handleErrorServer(res, 500, "Error interno del servidor", error.message);
        }
    }
}

export async function logout(req, res){
    try{
        res.clearCookie("jwt", { httpOnly: true});
        handleSuccess(res, 200, "Sesion cerrada exitosamente");
    }catch(error){
        handleErrorServer(res, 500, "Error interno del servidor", error.message);
    }
}