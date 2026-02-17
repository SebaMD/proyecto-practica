import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout as logoutService } from "@services/auth.service";
import { useAuth } from "@context/AuthContext";

/* eslint-disable react-hooks/exhaustive-deps */
const Logout = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();

    useEffect(() => {
        (async () => {
            try {
                await logoutService();
                setUser(null);
            } catch (error) {
                console.error("Error", error?.message || "No se pudo cerrar sesión");
            } finally {
                navigate("/auth");
            }
        })();
    }, []);

    return null;
};

export default Logout;