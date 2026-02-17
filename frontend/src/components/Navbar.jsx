import { useAuth } from "@context/AuthContext";
import {
    GraduationCap,
    House,
    MessageSquareText,
    User,
    Users,
    FilePenLine,
    Bolt,
    IdCardLanyard,
    UserCog,
    CalendarRange
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
        title: "Periodos", 
        icon: CalendarRange, 
        route: "/periods", 
        roles: ["funcionario", "administrador"] 
    },
    { 
        title: "Solicitudes", 
        icon: MessageSquareText, 
        route: "/requests", 
        roles: ["ciudadano", "funcionario"] 
    },
    { 
        title: "Peticiones", 
        icon: GraduationCap, 
        route: "/petitions", 
        roles: ["ciudadano", "supervisor", "funcionario"] 
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
        route: "/inscription", 
        roles: ["ciudadano"] 
    },
    { 
        title: "Gestión Inscripciones", 
        icon: FilePenLine, 
        route: "/inscription", 
        roles: ["supervisor"] 
    },
];

export function Navbar() {
    const location = useLocation().pathname;
    const { user } = useAuth();

    const roleText = {
        administrador: "Administrador",
        funcionario: "Funcionario",
        supervisor: "Supervisor",
        ciudadano: "Ciudadano",
    };

    let RoleIcon;
    if (user.role === "administrador") RoleIcon = Bolt;
    if (user.role === "ciudadano") RoleIcon = GraduationCap;
    if (user.role === "supervisor") RoleIcon = IdCardLanyard;
    if (user.role === "funcionario") RoleIcon = UserCog;

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
                    {menuItems.map((item) => {
                        if (!item.roles.includes(user.role)) return null;

                        const Icon = item.icon;
                        const isActive = location === item.route;

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

                {/* Perfil */}
                <NavLink
                    to="/profile"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-100 hover:bg-blue-700/50 hover:text-white"
                    >
                    <User className="h-4 w-4" />
                    Perfil
                </NavLink>
            </div>
        </header>
    );
}
