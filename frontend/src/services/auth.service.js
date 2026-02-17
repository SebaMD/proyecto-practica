import axios from './root.service.js';
import cookies from 'js-cookie';

export async function login(email, password) {
    try {       
        const response = await axios.post('/auth/login', {
            email,
            password
        });
        
        const { token, user } = response.data.data;
        
        cookies.set('jwt-auth', token, { path: '/', });
        sessionStorage.setItem('usuario', JSON.stringify(user));
        
        return { success: true, user };
    } catch (error) {
        console.error("Error en el servicio de login:", error.response?.data);
        return { success: false, message: error.response?.data?.message || 'Error al conectar con el servidor' };
    }
}

export async function register(data) {
    try {
        const response = await axios.post("/auth/register", data);
        return { success: true, message: response.data };
    } catch (error) {
        console.error("Error en el servicio de register:", error.response?.data);
        return { 
            success: false, 
            message: error.response?.data?.message || "Error al conectar con el servidor" 
        }
    }
}

export async function logout() {
    try {
        await axios.post("/auth/logout");

        sessionStorage.removeItem("usuario");
        cookies.remove("jwt-auth");
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}