import { useEffect, useState } from "react";
import { Sidebar } from "@components/Sidebar";
import { Header } from "@components/Header";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import { getUsers, editUser, deleteUser } from "@services/user.service";
import { register } from "@services/auth.service";
import { showErrorAlert, showConfirmAlert, showSuccessToast } from "@helpers/sweetAlert";
import Swal from "sweetalert2";

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const result = await getUsers();
            setUsers(result.data);
        } catch (error) {
            console.error("Error al obtener usuarios", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Le da formato a la fecha como DD/MM/AAAA, HH:MM:SS (AM|PM)
    const dateFormatter = (date) => {
        const dateObject = new Date(date);
        return dateObject.toLocaleString();
    };

    const roleText = {
        ciudadano: "Ciudadano",
        supervisor: "Supervisor",
        administrador: "Administrador",
        funcionario: "Funcionario",
    };

    const handleAddUser = async () => {
        try {
            const formValues = await addUserDialog();
            if (!formValues) return;

            const registerResponse = await register(formValues);

            if (registerResponse.success) {
                Swal.fire({
                    toast: true,
                    title: "Usuario agregado exitosamente",
                    icon: "success",
                    timer: 5000,
                    timerProgressBar: true,
                    position: "bottom-end",
                });

                await fetchUsers();
            } else {
                if (registerResponse.message.includes("RUT")) {
                    showErrorAlert("Error", "El RUT ya está registrado");
                }

                if (registerResponse.message.includes("email")) {
                    showErrorAlert("Error", "El email ya está registrado");
                }
            }
        } catch (error) {
            console.error("Error al agregar usuario:", error);
            showErrorAlert("Error", "No se pudo agregar el usuario");
        }
    };

    const handleEditUser = async (user) => {
        try {
            const formValues = await editUserDialog(user);
            if (!formValues) return;

            const editResponse = await editUser(user.id, formValues);

            if (editResponse.success) {
                Swal.fire({
                    toast: true,
                    title: "Usuario actualizado exitosamente",
                    icon: "success",
                    timer: 5000,
                    timerProgressBar: true,
                    position: "bottom-end",
                    showConfirmButton: false,
                });

                await fetchUsers();
            } else {
                if (editResponse.message.includes("RUT")) {
                    showErrorAlert("Error", "El RUT ya está registrado");
                }

                if (editResponse.message.includes("email")) {
                    showErrorAlert("Error", "El email ya está registrado");
                }
            }
        } catch (error) {
            console.error("Error al editar usuario:", error);
            showErrorAlert("Error", "No se pudo editar el usuario");
        } 
    }

    const handleDeleteUser = async (id) => {
        await showConfirmAlert("Eliminar usuario", "¿Está seguro que desea eliminar al usuario?", "Eliminar", async () => {
        try {
            const deleteResponse = await deleteUser(id);
            
            if (deleteResponse.success) {
                showSuccessToast("Usuario eliminado exitosamente");
                await fetchUsers();
            }
        } catch (error) {
            console.error("Error al eliminar usuario: ", error);
            showErrorAlert("Error", "No se pudo eliminar el usuario");
        }
        });
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />
            <Sidebar />

            <div className="ml-72 flex flex-col p-4">
                {/* Contenido de la página */}
                <div className="bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6">
                    {/* Titulo, descripción y boton de agregar usuario */}
                    <div className="flex flex-row flex-1 justify-between items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="font-bold text-2xl">Usuarios</h1>
                            <p className="text-gray-500">Administra los usuarios del sistema</p>
                        </div>
                        <button
                            onClick={handleAddUser}
                            className="bg-green-700 text-white font-medium text-sm px-3 py-2 flex flex-row items-center gap-3 rounded-lg transition-all hover:shadow-md hover:bg-green-700/90 active:bg-green-700/80 active:scale-95 active:shadow-md"
                        >
                            <UserPlus className="h-4 w-4" />
                            Agregar Usuario
                        </button>
                    </div>

                    {/* Lista de usuarios */}
                    <div className="w-full overflow-auto border border-gray-300 rounded-lg">
                        <table className="w-full caption-bottom text-sm overflow-x-scroll">
                            <thead className="border-b border-gray-300">
                                <tr>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">ID</th>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">
                                        Nombre de usuario
                                    </th>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">Email</th>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">RUT</th>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">Rol</th>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">
                                        Fecha creación
                                    </th>
                                    <th className="min-w-10 h-12 px-4 text-left align-middle font-medium">
                                        Fecha modificación
                                    </th>
                                    <th className="min-w-10 h-12 px-4 text-center align-middle font-medium">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                <tr>
                                    <td colSpan={10} className="text-center">
                                        Cargando...
                                    </td>
                                </tr>
                                ) : Array.isArray(users) && users.length > 0 ? (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="last:border-0 border-b border-gray-200 transition-all hover:bg-gray-100 hover:cursor-default"
                                    >
                                        <td className="min-w-8 p-4 align-middle">{user.id}</td>
                                        <td className="min-w-28 p-4 align-middle">{user.username}</td>
                                        <td className="min-w-40 p-4 align-middle">{user.email}</td>
                                        <td className="min-w-28 p-4 align-middle">{user.rut}</td>
                                        <td className="min-w-28 p-4 align-middle">{roleText[user.role]}</td>
                                        <td className="min-w-28 p-4 align-middle">
                                            {dateFormatter(user.created_at)}
                                        </td>
                                        <td className="min-w-28 p-4 align-middle">
                                            {dateFormatter(user.updated_at)}
                                        </td>
                                        <td className="min-w-16 p-4 flex flex-row justify-center items-center gap-2">
                                            {user.role !== "administrador" ? (
                                            <>
                                                <button onClick={() => handleEditUser(user)} className="rounded-4xl p-2 transition-all hover:bg-gray-300/50 active:bg-gray-300">
                                                    <Edit2 className="text-blue-700 h-5 w-5" />
                                                </button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="rounded-4xl p-2 transition-all hover:bg-gray-300/50 active:bg-gray-300">
                                                    <Trash2 className="text-red-700 h-5 w-5" />
                                                </button>
                                            </>
                                            ) : <span className="text-sm text-gray-600 italic">No disponible</span>}
                                        </td>
                                    </tr>
                                ))
                                ) : (
                                <tr>
                                    <td colSpan={10} className="text-center">
                                        No hay usuarios registrados
                                    </td>
                                </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

async function addUserDialog() {
    const { value: formValues } = await Swal.fire({
        html:
        '<div class="text-start">' +
        '<p class="font-bold text-md mb-1">Agregar Usuario</p>' +
        '<p class="text-sm text-gray-500">Completa la información para agregar un nuevo usuario.</p>' +
        '<div class="flex flex-col gap-4 mt-4">' +
        // Input nombre
        '<div class="flex flex-col gap-0.5">' +
        '<label for="username" class="text-sm font-medium">Nombre de Usuario</label>' +
        '<input type="text" id="username" placeholder="Luis Campos" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" autcomplete/>' +
        "</div>" +
        // Input email
        '<div class="flex flex-col gap-0.5">' +
        '<label for="email" class="text-sm font-medium">Email</label>' +
        '<input type="email" id="email" placeholder="luis@gmail.com" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" />' +
        "</div>" +
        // Input contraseña
        '<div class="flex flex-col gap-0.5">' +
        '<label for="password" class="text-sm font-medium">Contraseña</label>' +
        '<input type="password" id="password" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" />' +
        "</div>" +
        // Input RUT
        '<div class="flex flex-col gap-0.5">' +
        '<label for="rut" class="text-sm font-medium">RUT</label>' +
        '<input type="text" id="rut" placeholder="11222333-K" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" />' +
        "</div>" +
        // Input rol
        '<div class="flex flex-col gap-0.5">' +
        '<label for="role" class="text-sm font-medium">Rol</label>' +
        '<select id="role" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700">' +
        '<option value="ciudadano" selected>Ciudadano</option>' +
        '<option value="supervisor">Supervisor</option>' +
        '<option value="funcionario">Funcionario</option>' +
        "</select>" +
        // Fin formulario
        "</div>" +
        "</div>" +
        "</div>",
        confirmButtonText: "Agregar",
        confirmButtonColor: "oklch(52.7% 0.154 150.069)",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        showCloseButton: true,

        preConfirm: () => {
            const username = document.getElementById("username").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const rut = document.getElementById("rut").value.trim();
            const role = document.getElementById("role").value.trim();

            const usernameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,75}/;
            const rutRegex = /^\d{7,8}-[\dkK]$/;
            const roles = ["administrador", "funcionario", "supervisor", "ciudadano"];

            if (!username) {
                Swal.showValidationMessage("El nombre es obligatorio");
                return false;
            }

            if (username.length < 2 || username.length > 75) {
                Swal.showValidationMessage("El nombre de usuario debe tener entre 2 y 75 caracteres");
                return false;
            }

            if (!usernameRegex.test(username)) {
                Swal.showValidationMessage("Solo se permiten letras y espacios en el nombre de usuario");
                return false;
            }

            if (!email) {
                Swal.showValidationMessage("El email es obligatorio");
                return false;
            }

            if (email.length < 5 || email.length > 254) {
                Swal.showValidationMessage("El email debe tener entre 5 a 254 caracteres");
                return false;
            }

            if (!password) {
                Swal.showValidationMessage("La contraseña es obligatoria");
                return false;
            }

            if (password.length < 6) {
                Swal.showValidationMessage("La contraseña debe tener al menos 6 caracteres");
                return false;
            }

            if (!rut) {
                Swal.showValidationMessage("El rut es obligatorio");
                return false;
            }

            if (!rutRegex.test(rut)) {
                Swal.showValidationMessage("El RUT debe ser ingresado sin puntos y con guión");
                return false;
            }

            if (!role) {
                Swal.showValidationMessage("El rol es obligatorio");
                return false;
            }

            if (!roles.includes(role)) {
                Swal.showValidationMessage("Debe seleccionar un rol válido");
                return false;
            }

            return { username, email, password, rut, role };
        },
    });

    if (formValues) {
        return {
            username: formValues.username,
            email: formValues.email,
            password: formValues.password,
            rut: formValues.rut,
            role: formValues.role,
        };
    }

    return null;
}

async function editUserDialog(user) {
    const { value: formValues } = await Swal.fire({
        html:
        '<div class="text-start">' +
        '<p class="font-bold text-md mb-1">Editar Usuario</p>' +
        '<p class="text-sm text-gray-500">Completa la información para editar usuario.</p>' +
        '<div class="flex flex-col gap-4 mt-4">' +
        // Input nombre
        '<div class="flex flex-col gap-0.5">' +
        '<label for="username" class="text-sm font-medium">Nombre de Usuario</label>' +
        '<input type="text" id="username" placeholder="'+user.username+'" value="'+user.username+'" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" autcomplete/>' +
        "</div>" +
        // Input email
        '<div class="flex flex-col gap-0.5">' +
        '<label for="email" class="text-sm font-medium">Email</label>' +
        '<input type="email" id="email" placeholder="'+user.email+'" value="'+user.email+'" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" />' +
        "</div>" +
        // Input contraseña
        '<div class="flex flex-col gap-0.5">' +
        '<label for="password" class="text-sm font-medium">Contraseña</label>' +
        '<input type="password" id="password" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" />' +
        "</div>" +
        // Input RUT
        '<div class="flex flex-col gap-0.5">' +
        '<label for="rut" class="text-sm font-medium">RUT</label>' +
        '<input type="text" id="rut" placeholder="'+user.rut+'" value="'+user.rut+'" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700" />' +
        "</div>" +
        // Input rol
        '<div class="flex flex-col gap-0.5">' +
        '<label for="role" class="text-sm font-medium">Rol</label>' +
        '<select id="role" class="border border-gray-300 px-2 py-1 text-sm rounded-md outline-0 transition-all hover:shadow-sm focus:border-blue-700">' +
        '<option value="ciudadano" ' + (user.role === "ciudadano" ? 'selected' : '') + '>Ciudadano</option>' +
        '<option value="supervisor" ' + (user.role === "supervisor" ? 'selected' : '') + '>Supervisor</option>' +
        '<option value="funcionario" ' + (user.role === "funcionario" ? 'selected' : '') + '>Funcionario</option>' +
        "</select>" +
        // Fin formulario
        "</div>" +
        "</div>" +
        "</div>",
        confirmButtonText: "Editar",
        confirmButtonColor: "oklch(52.7% 0.154 150.069)",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        showCloseButton: true,

        preConfirm: () => {
            let username = document.getElementById("username").value.trim();
            let email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            let rut = document.getElementById("rut").value.trim();
            const role = document.getElementById("role").value.trim();

            const usernameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,75}/;
            const rutRegex = /^\d{7,8}-[\dkK]$/;
            const roles = ["administrador", "funcionario", "supervisor", "ciudadano"];

            if (!username) {
                username = user.username;
            }

            if (username.length < 2 || username.length > 75) {
                Swal.showValidationMessage("El nombre de usuario debe tener entre 2 y 75 caracteres");
                return false;
            }

            if (!usernameRegex.test(username)) {
                Swal.showValidationMessage("Solo se permiten letras y espacios en el nombre de usuario");
                return false;
            }

            if (!email) {
                email = user.email;
            }

            if (email.length < 5 || email.length > 254) {
                Swal.showValidationMessage("El email debe tener entre 5 a 254 caracteres");
                return false;
            }

            // La contraseña puede quedar vacía y no se cambia
            // Pero si tiene al menos un caracter, entonces se debe validar correctamente
            if (password.length > 0 && password.length < 6) {
                Swal.showValidationMessage("La contraseña debe tener al menos 6 caracteres");
                return false;
            }

            if (!rut) {
                rut = user.rut;
            }

            if (!rutRegex.test(rut)) {
                Swal.showValidationMessage("El RUT debe ser ingresado sin puntos y con guión");
                return false;
            }

            if (!role) {
                Swal.showValidationMessage("El rol es obligatorio");
                return false;
            }

            if (!roles.includes(role)) {
                Swal.showValidationMessage("Debe seleccionar un rol válido");
                return false;
            }

            return { username, email, password, rut, role };
        },
    });

    if (formValues) {
        return {
            username: formValues.username,
            email: formValues.email,
            password: formValues.password,
            rut: formValues.rut,
            role: formValues.role,
        };
    }

    return null;
}

export default Users;
