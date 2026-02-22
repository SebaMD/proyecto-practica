import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@context/AuthContext";
import { Navbar } from "@components/Navbar";
import { Badge } from "@components/Badge";
import HomeCard from "@components/HomeCard";

import {
    CalendarRange,
    FilePenLine,
    GraduationCap,
    MessageSquareText,
    Users,
} from "lucide-react";

import { getAppointments } from "@services/appointment.service";
import { getRequests } from "@services/request.service";
import { getPetitions } from "@services/petition.service";
import { getActivePeriod } from "@services/period.service";
import { getUsers } from "@services/user.service";

const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isCiudadano = user.role === "ciudadano";
    const isSupervisor = user.role === "supervisor";
    const isFuncionario = user.role === "funcionario";
    const isAdmin = user.role === "administrador";

    const [loading, setLoading] = useState(false);

    const [petitionCounter, setPetitionCounter] = useState(0);
    const [appointmentCounter, setAppointmentCounter] = useState(0);
    const [requestCounter, setRequestCounter] = useState(0);
    const [userCounter, setUserCounter] = useState(0);

    const [activePeriod, setActivePeriod] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);

            const tasks = [
                getPetitions(), // ciudadano, supervisor, funcionario
            ];

            if (isCiudadano || isSupervisor) tasks.push(getAppointments());
            if (isCiudadano || isFuncionario) tasks.push(getRequests());
            if (isFuncionario || isCiudadano) tasks.push(getActivePeriod());
            if (isAdmin) tasks.push(getUsers());

            const results = await Promise.all(tasks);

            // 1) petitions (siempre primer resultado)
            const petitionsResult = results[0];
            if (petitionsResult?.success) {
                setPetitionCounter(petitionsResult.data?.length || 0);
            }

            // puntero para resultados opcionales
            let idx = 1;

            if (isCiudadano || isSupervisor) {
                const appointmentsResult = results[idx++];
                if (appointmentsResult?.success) {
                    setAppointmentCounter(appointmentsResult.data?.length || 0);
                }
            }

            if (isCiudadano || isFuncionario) {
                const requestsResult = results[idx++];
                if (requestsResult?.success) {
                    setRequestCounter(requestsResult.data?.length || 0);
                }
            }

            if (isFuncionario || isCiudadano) {
                const activePeriodResult = results[idx++];
                setActivePeriod(activePeriodResult || null);
            }

            if (isAdmin) {
                const usersResult = results[idx++];
                if (usersResult?.success) {
                    setUserCounter(usersResult.data?.length || 0);
                }
            }
        } catch (error) {
            console.error("Error en Home => fetchData():", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("es-CL", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const getDescriptionText = () => {
        if (isCiudadano) return "Gestiona tus solicitudes, peticiones e inscripciones";
        if (isSupervisor) return "Gestiona peticiones e inscripciones asignadas";
        if (isFuncionario) return "Gestiona periodos, solicitudes y peticiones del sistema";
        if (isAdmin) return "Gestiona usuarios del sistema";
        return "Panel principal";
    };

    const getSummaryText = () => {
        if (isCiudadano) return "Revisa el estado de tus solicitudes, peticiones e inscripciones";
        if (isSupervisor) return "Revisa peticiones y gestión de inscripciones";
        if (isFuncionario) return "Revisa periodos activos, solicitudes y peticiones";
        if (isAdmin) return "Revisa la administración de usuarios";
        return "";
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="pt-20 p-4 flex flex-col">
                <div className="bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6">
                    <div>
                        <h1 className="font-bold text-2xl">Inicio</h1>
                        <p className="text-gray-600">{getDescriptionText()}</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-4">
                        <Badge text="Cargando..." />
                        </div>
                    ) : (
                        <>
                        <div className="flex flex-col gap-3 items-start border-2 border-gray-200 rounded-lg p-4 shadow-xs">
                            <div>
                                <h2 className="font-semibold text-lg">Estado del proceso</h2>
                                <p className="text-gray-500">Información relevante para tu rol</p>
                            </div>

                            {(isFuncionario || isCiudadano) ? (
                                <div className="w-full rounded-lg bg-blue-100/70 p-4">
                                    {activePeriod ? (
                                    <>
                                        <p className="text-md font-medium text-gray-700">Período activo</p>
                                        <p className="text-lg font-semibold text-blue-700">{activePeriod.name}</p>
                                        <p className="text-sm text-gray-600">
                                        {formatDate(activePeriod.startDate)} - {formatDate(activePeriod.closingDate)}
                                        </p>
                                    </>
                                    ) : (
                                    <>
                                        <p className="text-md font-medium text-gray-700">Período activo</p>
                                        <p className="text-lg font-semibold text-gray-500 italic">No hay período activo</p>
                                    </>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full rounded-lg bg-gray-100 p-4">
                                    <p className="text-md font-medium text-gray-700">Período activo</p>
                                    <p className="text-lg font-semibold text-gray-500 italic">
                                        Visible en detalle para funcionarios
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="text-lg font-medium">Resumen de actividades</h2>
                            <p className="text-gray-600">{getSummaryText()}</p>
                        </div>

                        <div className="flex flex-row gap-6 flex-wrap">
                            {isCiudadano && (
                            <>
                                <HomeCard
                                icon={MessageSquareText}
                                counter={requestCounter}
                                text={requestCounter === 1 ? "solicitud registrada" : "solicitudes registradas"}
                                color="sky"
                                btnText="Ir a solicitudes"
                                onClick={() => navigate("/requests")}
                                />
                                <HomeCard
                                icon={GraduationCap}
                                counter={petitionCounter}
                                text={petitionCounter === 1 ? "petición disponible" : "peticiones disponibles"}
                                color="blue"
                                btnText="Ir a peticiones"
                                onClick={() => navigate("/petitions")}
                                />
                                <HomeCard
                                icon={FilePenLine}
                                counter={appointmentCounter}
                                text={appointmentCounter === 1 ? "inscripción registrada" : "inscripciones registradas"}
                                color="purple"
                                btnText="Ir a inscripciones"
                                onClick={() => navigate("/appointments")}
                                />
                            </>
                            )}

                            {isSupervisor && (
                            <>
                                <HomeCard
                                icon={GraduationCap}
                                counter={petitionCounter}
                                text={petitionCounter === 1 ? "petición asignada" : "peticiones asignadas"}
                                color="blue"
                                btnText="Ir a peticiones"
                                onClick={() => navigate("/petitions")}
                                />
                                <HomeCard
                                icon={FilePenLine}
                                counter={appointmentCounter}
                                text={appointmentCounter === 1 ? "inscripción por revisar" : "inscripciones por revisar"}
                                color="purple"
                                btnText="Ir a inscripciones"
                                onClick={() => navigate("/appointments")}
                                />
                            </>
                            )}

                            {isFuncionario && (
                            <>
                                <HomeCard
                                icon={CalendarRange}
                                counter={activePeriod ? 1 : 0}
                                text={activePeriod ? "período activo" : "sin período activo"}
                                color="sky"
                                btnText="Ir a períodos"
                                onClick={() => navigate("/periods")}
                                />
                                <HomeCard
                                icon={MessageSquareText}
                                counter={requestCounter}
                                text={requestCounter === 1 ? "solicitud por revisar" : "solicitudes por revisar"}
                                color="blue"
                                btnText="Ir a solicitudes"
                                onClick={() => navigate("/requests")}
                                />
                                <HomeCard
                                icon={GraduationCap}
                                counter={petitionCounter}
                                text={petitionCounter === 1 ? "petición disponible" : "peticiones disponibles"}
                                color="purple"
                                btnText="Ir a peticiones"
                                onClick={() => navigate("/petitions")}
                                />
                            </>
                            )}

                            {isAdmin && (
                                <HomeCard
                                icon={Users}
                                counter={userCounter}
                                text={userCounter === 1 ? "usuario registrado" : "usuarios registrados"}
                                color="sky"
                                btnText="Ir a usuarios"
                                onClick={() => navigate("/users")}
                                flexOne={false}
                                />
                            )}
                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;

