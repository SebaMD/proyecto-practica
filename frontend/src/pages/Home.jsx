import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@context/AuthContext";
import { Navbar } from "@components/Navbar";
import { Badge } from "@components/Badge";
import HomeCard from "@components/HomeCard";

import {
    CalendarRange,
    FilePenLine,
    FileText,
    FileSearchCorner,
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
    const [supervisorPendingCounter, setSupervisorPendingCounter] = useState(0);
    const [supervisorReviewedCounter, setSupervisorReviewedCounter] = useState(0);
    const [requestCounter, setRequestCounter] = useState(0);
    const [funcionarioPendingCounter, setFuncionarioPendingCounter] = useState(0);
    const [funcionarioReviewedCounter, setFuncionarioReviewedCounter] = useState(0);
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
            if (isFuncionario || isCiudadano || isSupervisor) tasks.push(getActivePeriod());
            if (isAdmin) tasks.push(getUsers());

            const results = await Promise.all(tasks);

            // petitions (siempre primer resultado)
            const petitionsResult = results[0];
            if (petitionsResult?.success) {
                setPetitionCounter(petitionsResult.data?.length || 0);
            }

            // puntero para resultados opcionales
            let idx = 1;

            if (isCiudadano || isSupervisor) {
                const appointmentsResult = results[idx++];
                if (appointmentsResult?.success) {
                    const appointmentsData = appointmentsResult.data || [];
                    setAppointmentCounter(appointmentsData.length || 0);

                    if (isSupervisor) {
                        setSupervisorPendingCounter(
                            appointmentsData.filter((a) => a.status === "pendiente").length
                        );
                        setSupervisorReviewedCounter(
                            appointmentsData.filter(
                                (a) =>
                                    Number(a.supervisorId) === Number(user.id) &&
                                    (a.status === "aprobado" || a.status === "rechazado")
                            ).length
                        );
                    }
                }
            }

            if (isCiudadano || isFuncionario) {
                const requestsResult = results[idx++];
                if (requestsResult?.success) {
                    const requestsData = requestsResult.data || [];
                    setRequestCounter(requestsData.length || 0);

                    if (isFuncionario) {
                        setFuncionarioPendingCounter(
                            requestsData.filter((r) => r.status === "pendiente").length
                        );
                        setFuncionarioReviewedCounter(
                            requestsData.filter(
                                (r) => r.status === "aprobado" || r.status === "rechazado"
                            ).length
                        );
                    }
                }
            }

            if (isFuncionario || isCiudadano || isSupervisor) {
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

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
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
        <div className="h-screen overflow-hidden bg-gray-100">
            <Navbar />

            <div className="h-full pt-20 p-4 flex flex-col gap-4 overflow-hidden">
                <section className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white min-h-[345px]">

                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: "url('/municipalidad--santa-juana.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-blue-900/35" />

                    <div className="relative z-10 h-full p-6 md:p-8 flex flex-col md:flex-row items-start md:items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="h-20 w-20 md:h-24 md:w-24 flex items-center justify-center p-2">
                                <img
                                    src="/logo-escudo.png"
                                    alt="Escudo Municipalidad"
                                    className="h-full w-full object-contain drop-shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:drop-shadow-lg"
                                />
                            </div>

                            <div className="text-white">
                                <p className="text-xs md:text-sm uppercase tracking-wide text-blue-100/90 font-semibold">
                                    Inicio
                                </p>
                                <p className="text-sm md:text-base text-blue-100 font-medium">
                                    Portal de atencion ciudadana
                                </p>
                                <h2 className="text-xl md:text-3xl font-bold leading-tight">
                                    Gestion de horas para licencia de conducir
                                </h2>
                                <p className="text-sm md:text-base text-blue-100 mt-2 max-w-2xl">
                                    {getDescriptionText()}
                                </p>
                                <p className="text-xs md:text-sm text-blue-100/90 mt-1 max-w-2xl">
                                    {getSummaryText()}
                                </p>
                            </div>
                        </div>

                        <div className="px-4 py-3 min-w-[220px] flex items-center justify-center">
                            <img
                                src="/logo-municipalidad.png"
                                alt="Logo Municipalidad de Santa Juana"
                                className="max-h-24 md:max-h-28 w-auto object-contain drop-shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:drop-shadow-lg"
                            />
                        </div>
                    </div>
                </section>

                <div className="bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6">
                    {loading ? (
                        <div className="flex justify-center p-4">
                        <Badge text="Cargando..." />
                        </div>
                    ) : (
                        <>
                        {!isAdmin && (
                        <div className="flex flex-col gap-3 items-start border-2 border-gray-200 rounded-lg p-4 shadow-xs">
                            <div>
                                <h2 className="font-semibold text-lg">Estado del proceso</h2>
                                <p className="text-gray-500">Información relevante para tu rol</p>
                            </div>

                            {(isFuncionario || isCiudadano || isSupervisor || isAdmin) ? (
                                <div className="w-full rounded-lg bg-blue-100/70 p-4">
                                    {activePeriod ? (
                                    <>
                                        <p className="text-base font-medium text-gray-700">Periodo activo</p>
                                        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-2xl font-bold text-blue-700 break-words">{activePeriod.name}</p>
                                                <p className="mt-1 text-lg font-semibold text-gray-700">
                                                    {formatDate(activePeriod.startDate)} - {formatDate(activePeriod.closingDate)}
                                                </p>
                                            </div>
                                            <div className="md:min-w-[280px] md:text-right">
                                                <p className="text-sm font-medium uppercase tracking-wide text-blue-700/80">Horario del periodo</p>
                                                <p className="text-xl font-bold text-gray-800">
                                                    {formatTime(activePeriod.startDate)} - {formatTime(activePeriod.closingDate)}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                    ) : (
                                    <>
                                        <p className="text-base font-medium text-gray-700">Periodo activo</p>
                                        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-xl font-semibold text-gray-500 italic">No hay periodo activo</p>
                                            </div>
                                            {(isCiudadano || isSupervisor) && (
                                                <div className="md:min-w-[280px] md:text-right">
                                                    <p className="text-sm font-medium uppercase tracking-wide text-blue-700/80">Aviso por correo</p>
                                                    <p className="text-base font-semibold text-gray-700">
                                                        {isSupervisor
                                                            ? "Te llegara un correo cuando definan las fechas y horarios de la duracion del periodo."
                                                            : "Te llegara un correo cuando definan las fechas y horarios de la duracion del periodo."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
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
                        )}

                        <div>
                            <h2 className="text-lg font-medium">Resumen de actividades</h2>
                            <p className="text-gray-600">{getSummaryText()}</p>
                        </div>

                        <div className="flex flex-row gap-6 flex-wrap">
                            {isCiudadano && (
                            <>
                                <HomeCard
                                icon={FileText}
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
                                btnText="Ir a mis inscripciones"
                                onClick={() => navigate("/appointments")}
                                />
                                <HomeCard
                                icon={MessageSquareText}
                                counter={requestCounter}
                                text={requestCounter === 1 ? "solicitud registrada" : "solicitudes registradas"}
                                color="sky"
                                btnText="Ir a solicitudes"
                                onClick={() => navigate("/requests")}
                                />
                            </>
                            )}

                            {isSupervisor && (
                            <>
                                <HomeCard
                                icon={FileText}
                                counter={petitionCounter}
                                text={petitionCounter === 1 ? "petición asignada" : "peticiones asignadas"}
                                color="blue"
                                btnText="Ir a peticiones"
                                onClick={() => navigate("/petitions")}
                                />
                                <HomeCard
                                icon={FileSearchCorner}
                                counter={supervisorPendingCounter}
                                text={supervisorPendingCounter === 1 ? "pendiente por revisar" : "pendientes por revisar"}
                                color="purple"
                                btnText="Ir a pendientes"
                                onClick={() => navigate("/appointments?view=pending")}
                                />
                                <HomeCard
                                icon={FilePenLine}
                                counter={supervisorReviewedCounter}
                                text={supervisorReviewedCounter === 1 ? "revision realizada" : "mis revisiones"}
                                color="sky"
                                btnText="Ir a mis revisiones"
                                onClick={() => navigate("/appointments?view=reviews")}
                                />
                            </>
                            )}

                            {isFuncionario && (
                            <>
                                <HomeCard
                                icon={FileText}
                                counter={petitionCounter}
                                text={petitionCounter === 1 ? "petición  disponible" : "peticiones disponibles"}
                                color="purple"
                                btnText="Ir a peticiones"
                                onClick={() => navigate("/petitions")}
                                />
                                <HomeCard
                                icon={CalendarRange}
                                counter={activePeriod ? 1 : 0}
                                text={activePeriod ? "periodo  activo" : "sin periodo  activo"}
                                color="sky"
                                btnText="Ir a periodos"
                                onClick={() => navigate("/periods")}
                                />
                                <HomeCard
                                icon={FileSearchCorner}
                                counter={funcionarioPendingCounter}
                                text={funcionarioPendingCounter === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                                color="blue"
                                btnText="Ir a pendientes"
                                onClick={() => navigate("/requests?view=pending")}
                                />
                                <HomeCard
                                icon={MessageSquareText}
                                counter={funcionarioReviewedCounter}
                                text={funcionarioReviewedCounter === 1 ? "solicitud revisada" : "solicitudes revisadas"}
                                color="emerald"
                                btnText="Ir a revisadas"
                                onClick={() => navigate("/requests?view=reviews")}
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



