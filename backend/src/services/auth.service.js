import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/configDb.js";
import { User } from "../entities/user.entity.js";

export async function loginService(data){
    const userRepository = AppDataSource.getRepository(User);

    const { email, password } = data;

    const user = await userRepository.findOne({ where: { email } });

    if(!user){
        throw new Error("credenciales incorrectas");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if(!isPasswordValid){
        throw new Error("Usuario o contraseña incorrectos");
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            rut: user.rut,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    return{
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            rut: user.rut,
            role: user.role
        }
    };
}

export async function registerService(data){
    const userRepository = AppDataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = userRepository.create({
        username: data.username,
        email: data.email,
        rut: data.rut,
        password: hashedPassword,
        role: data.role || "alumno",
    });

    return await userRepository.save(newUser);   
}