import { useNavigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { LogOut } from "lucide-react";

export function Header() {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
            <div className="flex h-16 items-center justify-between px-6">
                <h2 className="text-lg font-semibold text-gray-800">
                    Hola, <span className="text-blue-600">{user.username}</span>
                </h2>
                <button
                    onClick={() => navigate("/logout")}
                    className="flex items-center gap-2 rounded-full border-2 border-gray-300 px-3 py-1 font-medium hover:bg-gray-50"
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}
