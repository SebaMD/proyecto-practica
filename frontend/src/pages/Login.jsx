import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import useLogin from "@hooks/useLogin";
import { login, logout, register } from "@services/auth.service";
import { useAuth } from "@context/AuthContext";

const NAME_REGEX = /^[\p{L} ]+$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUT_REGEX = /^\d{7,8}-[\dKk]$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,128}$/;

function normalizeName(name = "") {
    return String(name).trim().replace(/\s+/g, " ");
}

function normalizeEmail(email = "") {
    return String(email).trim().toLowerCase();
}

function normalizeRut(rut = "") {
    return String(rut).trim().toUpperCase();
}

function isValidRut(rut = "") {
    const normalizedRut = normalizeRut(rut);
    const match = normalizedRut.match(/^(\d{7,8})-([\dK])$/);
    if (!match) return false;

    const body = match[1];
    const verifierDigit = match[2];

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i -= 1) {
        sum += Number(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = 11 - (sum % 11);
    const expectedDigit =
        remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

    return verifierDigit === expectedDigit;
}

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { setUser } = useAuth();
    const { errorEmail, errorPassword, errorData, handleInputChange } = useLogin();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        handleInputChange();

        try {
            await logout();
            const result = await login(email, password);

            if (result.success) {
                setUser(result.user);
                navigate("/home");
            } else {
                errorData(result.message || "Credenciales incorrectas");
            }
        } catch (err) {
            console.error("Login error:", err);
            errorData("Error inesperado al iniciar sesión");
        }

        setLoading(false);
    };

    const handleOpenRegisterDialog = async () => {
        const { value: formValues } = await Swal.fire({
            title: "Solicitar registro",
            html: `
                <div class="text-left flex flex-col gap-2">
                    <label class="text-sm font-medium">Nombre completo</label>
                    <input id="registerUsername" class="swal2-input m-0" placeholder="Nombre y apellido" />
                    <label class="text-sm font-medium mt-1">Email</label>
                    <input id="registerEmail" type="email" class="swal2-input m-0" placeholder="correo@ejemplo.com" />
                    <label class="text-sm font-medium mt-1">RUT</label>
                    <input id="registerRut" class="swal2-input m-0" placeholder="12345678-9" />
                    <label class="text-sm font-medium mt-1">Contraseña</label>
                    <div style="display:flex;align-items:center;width:100%;margin-top:4px;border:1px solid #d1d5db;border-radius:8px;background:#fff;padding:0 12px;">
                        <input id="registerPassword" type="password" placeholder="Mínimo 8, una mayúscula, un número y un símbolo" style="width:100%;border:0;outline:none;background:transparent;padding:12px 0;box-shadow:none;" />
                        <button id="toggleRegisterPassword" type="button" style="border:0;background:transparent;padding:0;margin-left:12px;color:#6b7280;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;">Ver</button>
                    </div>
                    <label class="text-sm font-medium mt-1">Confirmar contraseña</label>
                    <div style="display:flex;align-items:center;width:100%;margin-top:4px;border:1px solid #d1d5db;border-radius:8px;background:#fff;padding:0 12px;">
                        <input id="registerConfirmPassword" type="password" placeholder="Repite tu contraseña" style="width:100%;border:0;outline:none;background:transparent;padding:12px 0;box-shadow:none;" />
                        <button id="toggleRegisterConfirmPassword" type="button" style="border:0;background:transparent;padding:0;margin-left:12px;color:#6b7280;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;">Ver</button>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Enviar solicitud",
            cancelButtonText: "Cancelar",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                const bindToggle = (inputId, buttonId) => {
                    const input = document.getElementById(inputId);
                    const button = document.getElementById(buttonId);
                    if (!input || !button) return;

                    button.textContent = "Ver";
                    button.addEventListener("click", () => {
                        const isPassword = input.type === "password";
                        input.type = isPassword ? "text" : "password";
                        button.textContent = isPassword ? "Ocultar" : "Ver";
                    });
                };

                bindToggle("registerPassword", "toggleRegisterPassword");
                bindToggle("registerConfirmPassword", "toggleRegisterConfirmPassword");
            },
            preConfirm: () => {
                const username = normalizeName(document.getElementById("registerUsername")?.value);
                const emailValue = normalizeEmail(document.getElementById("registerEmail")?.value);
                const rut = normalizeRut(document.getElementById("registerRut")?.value);
                const passwordValue = document.getElementById("registerPassword")?.value?.trim();
                const confirmPasswordValue = document.getElementById("registerConfirmPassword")?.value?.trim();

                if (!username || username.length < 3) {
                    Swal.showValidationMessage("El nombre debe tener al menos 3 caracteres");
                    return false;
                }
                if (!NAME_REGEX.test(username)) {
                    Swal.showValidationMessage("El nombre solo puede contener letras y espacios");
                    return false;
                }
                if (!emailValue || !EMAIL_REGEX.test(emailValue)) {
                    Swal.showValidationMessage("El email debe tener formato válido (ej: correo@dominio.com)");
                    return false;
                }
                if (!RUT_REGEX.test(rut || "")) {
                    Swal.showValidationMessage("El RUT debe ir sin puntos y con guion (ej: 12345678-9)");
                    return false;
                }
                if (!isValidRut(rut)) {
                    Swal.showValidationMessage("El RUT no es válido");
                    return false;
                }
                if (!passwordValue || !PASSWORD_REGEX.test(passwordValue)) {
                    Swal.showValidationMessage("La contraseña debe tener mínimo 8, una mayúscula, un número y un carácter especial");
                    return false;
                }
                if (!confirmPasswordValue) {
                    Swal.showValidationMessage("Debes confirmar la contraseña");
                    return false;
                }
                if (passwordValue !== confirmPasswordValue) {
                    Swal.showValidationMessage("Las contraseñas no coinciden");
                    return false;
                }

                return { username, email: emailValue, rut, password: passwordValue };
            },
        });

        if (!formValues) return;

        const result = await register(formValues);
        if (!result.success) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo enviar la solicitud",
                text: result.message || "Intenta nuevamente",
                confirmButtonText: "Cerrar",
            });
            return;
        }

        await Swal.fire({
            icon: "success",
            title: "Solicitud enviada",
            text: "Tu cuenta quedó pendiente de aprobación por un administrador. Se te informará por correo si fue aprobada o rechazada.",
            confirmButtonText: "Entendido",
        });
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-600 via-emerald-500 to-yellow-400 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-md transform transition-all hover:scale-105 border-t-4 border-red-500">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-linear-to-r from-blue-700 via-emerald-600 to-red-600 mb-8">
                        Iniciar sesión
                    </h1>

                    {errorEmail && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center font-semibold">
                            {errorEmail}
                        </div>
                    )}
                    {errorPassword && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center font-semibold">
                            {errorPassword}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); handleInputChange(); }}
                            placeholder="usuario@ejemplo.com"
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Contraseña</label>
                        <div className="flex items-center rounded-lg border-2 border-gray-200 bg-white px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition-all duration-300">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); handleInputChange(); }}
                                placeholder="**********"
                                required
                                className="w-full bg-transparent outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="ml-3 text-sm font-medium text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? "Ocultar" : "Ver"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-linear-to-r from-blue-600 via-emerald-500 to-red-500 hover:from-blue-700 hover:via-emerald-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:opacity-50"
                    >
                        {loading ? "Cargando..." : "Iniciar sesión"}
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenRegisterDialog}
                        className="w-full border border-blue-300 text-blue-700 font-semibold py-3 px-6 rounded-xl hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                        Registrarse
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;


