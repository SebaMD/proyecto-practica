import { useAuth } from "@context/AuthContext";
import { useState } from "react";
import {
    FileText,
    House,
    MessageSquareText,
    User,
    Users,
    FilePenLine,
    CalendarRange,
    FileSearchCorner,
    KeyRound,
    Settings
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const menuItems = [
    { 
        title: "Inicio", 
        icon: House, 
        route: "/home", 
        roles: ["ciudadano", "administrador", "supervisor", "funcionario"] 
    },
    { 
        title: "Peticiones", 
        icon: FileText, 
        route: "/petitions", 
        roles: ["ciudadano", "supervisor", "funcionario"] 
    },
    { 
        title: "Periodos", 
        icon: CalendarRange, 
        route: "/periods", 
        roles: ["funcionario"] 
    },
    { 
        title: "Usuarios", 
        icon: Users, 
        route: "/users", 
        roles: ["administrador"] 
    },
    { 
        title: "Mis Inscripciones", 
        icon: FilePenLine, 
        route: "/appointments", 
        roles: ["ciudadano"] 
    },
    { 
        title: "Solicitudes", 
        icon: MessageSquareText, 
        route: "/requests", 
        roles: ["ciudadano", "funcionario"] 
    },
    { 
        title: "Gestión Inscripciones", 
        icon: FilePenLine, 
        route: "/appointments", 
        roles: ["supervisor"] 
    },
];

export function Navbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const currentRouteWithSearch = `${location.pathname}${location.search}`;
    const { user } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const roleText = {
        administrador: "Administrador",
        funcionario: "Funcionario",
        supervisor: "Supervisor",
        ciudadano: "Ciudadano",
    };

    let RoleIcon;
    if (user.role === "administrador") RoleIcon = KeyRound;
    if (user.role === "ciudadano") RoleIcon = KeyRound;
    if (user.role === "supervisor") RoleIcon = KeyRound;
    if (user.role === "funcionario") RoleIcon = KeyRound;

    const visibleMenuItems = menuItems.flatMap((item) => {
        const isFuncionarioRequestsMenu =
            item.route === "/requests" &&
            Array.isArray(item.roles) &&
            item.roles.length === 2 &&
            item.roles.includes("ciudadano") &&
            item.roles.includes("funcionario");

        const isSupervisorAppointmentsMenu =
            item.route === "/appointments" &&
            Array.isArray(item.roles) &&
            item.roles.length === 1 &&
            item.roles[0] === "supervisor";

        if (isFuncionarioRequestsMenu) {
            return [
                {
                    ...item,
                    roles: ["ciudadano"],
                },
                {
                    ...item,
                    title: "Pendientes",
                    icon: FileSearchCorner,
                    route: "/requests?view=pending",
                    roles: ["funcionario"],
                },
                {
                    ...item,
                    title: "Revisadas",
                    route: "/requests?view=reviews",
                    roles: ["funcionario"],
                },
            ];
        }

        if (!isSupervisorAppointmentsMenu) return [item];

        return [
            {
                ...item,
                title: "Pendientes",
                icon: FileSearchCorner,
                route: "/appointments?view=pending",
            },
            {
                ...item,
                title: "Mis revisiones",
                route: "/appointments?view=reviews",
            },
        ];
    });

    return (
        <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-blue-600">
            <div className="flex h-full items-center justify-between px-6">

                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                        {RoleIcon && <RoleIcon className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white">Portal</h1>
                        <p className="text-xs text-blue-200">{roleText[user.role]}</p>
                    </div>
                </div>

                {/* Menú */}
                <nav className="flex items-center gap-1">
                    {visibleMenuItems.map((item) => {
                        if (!item.roles.includes(user.role)) return null;

                        const Icon = item.icon;
                        const isActive = item.route.includes("?")
                            ? currentRouteWithSearch === item.route
                            : currentPath === item.route;

                        return (
                            <NavLink
                                key={item.route}
                                to={item.route}
                                className={
                                isActive
                                    ? "flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm text-white"
                                    : "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-100 hover:bg-blue-700/50 hover:text-white"
                                }
                            >
                                <Icon className="h-4 w-4" />
                                {item.title}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Perfil / Sesion */}
                <div className="relative flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen((prev) => !prev)}
                        className="flex items-center justify-center rounded-md px-3 py-2 text-blue-100 hover:bg-blue-700/50 hover:text-white"
                        title="Opciones de sesion"
                        aria-label="Opciones de sesion"
                    >
                        <Settings
                            className={`h-4 w-4 transition-transform duration-200 ${
                                isSettingsOpen ? "rotate-90" : "rotate-0"
                            }`}
                        />
                    </button>

                    {isSettingsOpen && (
                        <div className="absolute right-0 top-12 z-50 min-w-[160px] rounded-md border border-blue-200 bg-white p-2 shadow-lg">
                            <a
                                href="https://new.santajuana.cl/"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsSettingsOpen(false)}
                                className="block rounded-md px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                            >
                                Ir a municipalidad
                            </a>
                            <NavLink
                                to="/logout"
                                onClick={() => setIsSettingsOpen(false)}
                                className="block rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                                Cerrar sesion
                            </NavLink>
                        </div>
                    )}

                    <NavLink
                        to="/profile"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-100 hover:bg-blue-700/50 hover:text-white"
                    >
                        <User className="h-4 w-4" />
                        Perfil
                    </NavLink>
                </div>
            </div>
        </header>
    );
}
