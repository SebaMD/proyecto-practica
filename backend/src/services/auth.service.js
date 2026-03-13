import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/configDb.js";
import { User } from "../entities/user.entity.js";
import { normalizeEmail, normalizeRut, normalizeUsername } from "../validations/auth.helpers.js";

export async function loginService(data) {
    const userRepository = AppDataSource.getRepository(User);
    const { password } = data;
    const email = normalizeEmail(data.email);

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
        throw new Error("Credenciales incorrectas");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Email o contraseña incorrectos");
    }

    if (user.accountStatus === "pendiente") {
        throw new Error("Tu cuenta está pendiente de aprobación por un administrador");
    }

    if (user.accountStatus === "rechazado") {
        throw new Error("Tu cuenta fue rechazada. Contacta a administración");
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            rut: user.rut,
            role: user.role,
            accountStatus: user.accountStatus,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            rut: user.rut,
            role: user.role,
            accountStatus: user.accountStatus,
        },
    };
}

export async function registerService(data) {
    const userRepository = AppDataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = userRepository.create({
        username: normalizeUsername(data.username),
        email: normalizeEmail(data.email),
        rut: normalizeRut(data.rut),
        password: hashedPassword,
        role: "ciudadano",
        accountStatus: "pendiente",
    });

    return await userRepository.save(newUser);
}
