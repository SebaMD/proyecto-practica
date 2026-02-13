import { AppDataSource } from "../config/configDb.js";
import { User } from "../entities/user.entity.js";
import bcrypt from "bcrypt";

export async function getUsersService() {
    const userRepository = AppDataSource.getRepository(User);
    return await userRepository.find({
        select: ["id", "username", "email", "rut", "role", "createdAt", "updatedAt"],
    });
}

export async function getUserByIdService(id) {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
        where: { id },
        select: ["id", "username", "email", "rut", "role", "createdAt", "updatedAt"],
    });

    if (!user) {
        throw new Error("Usuario no encontrado");
    }

    return user;
}

export async function editUserService(id, data) {
    const userRepository = AppDataSource.getRepository(User);
    const { username, email, password, rut, role } = data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.findOne({
        where: { id },
    });

    if (!user) {
        throw new Error("Usuario no encontrado");
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = hashedPassword;
    if (rut) user.rut = rut;
    if (role) user.role = role;

    const updatedUser = await userRepository.save(user);
    delete updatedUser.password;

    return updatedUser;
}

export async function deleteUserService(id) {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id } });

    if (!user) return false;

    await userRepository.remove(user);
    return true;
}
