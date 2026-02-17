import { useAuth } from "@context/AuthContext";
import { Navbar } from "@components/Navbar";
import {
    GraduationCap,
    IdCard,
    Mail,
    User,
    UserCog,
    FilePenLine
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAppoinment } from "@services/appoinment.service";
import { getPetition } from "@services/petition.service";
import { showErrorAlert } from "@helpers/sweetAlert";

const Profile = () => {
    const { user } = useAuth();

    const isCiudadano = user.role === "ciudadano";
    const isSupervisor = user.role === "supervisor";
    const isFuncionario = user.role === "funcionario";

    const [appointmentCount, setAppointmentCount] = useState(0);
    const [petitionCount, setPetitionCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchAppointments = async () => {
        if (!isCiudadano) return;

        try {
            setLoading(true);
            const result = await getAppoinment();

            if (result.success) {
                setAppointmentCount(result.data?.length || 0);
            }
        } catch (error) {
            showErrorAlert("Error", "No se pudieron cargar tus inscripciones", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPetitions = async () => {
        if (!isSupervisor && !isFuncionario) return;

        try {
            setLoading(true);
            const result = await getPetition();

            if (result.success) {
                setPetitionCount(result.data?.length || 0);
            }
        } catch (error) {
            showErrorAlert("Error", "No se pudieron cargar las peticiones", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        fetchPetitions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const roleText = {
        ciudadano: "Ciudadano",
        supervisor: "Supervisor",
        funcionario: "Funcionario",
        administrador: "Administrador",
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <main className="pt-20 px-6">
                <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-6 max-w-5xl mx-auto">

                    {/* Título */}
                    <div>
                        <h1 className="font-bold text-2xl">Mi perfil</h1>
                        <p className="text-gray-600">Revisa la información de tu perfil</p>
                    </div>

                    <div className="flex flex-row gap-4 flex-wrap">

                        {/* Información personal */}
                        <div className="flex flex-col p-4 rounded-md border border-gray-300 shadow-sm flex-1">
                            <h3 className="font-medium text-xl mb-2">Información Personal</h3>

                            <InfoItem icon={User} label="Nombre" value={user.username} />
                            <InfoItem icon={IdCard} label="RUT" value={user.rut} />
                            <InfoItem icon={Mail} label="Email" value={user.email} />
                            <InfoItem icon={UserCog} label="Rol" value={roleText[user.role]} />
                        </div>

                        {/* Información del sistema */}
                        {(isCiudadano || isSupervisor || isFuncionario) && (
                        <div className="flex flex-col p-4 rounded-md border border-gray-300 shadow-sm flex-1">
                            <h3 className="font-medium text-xl mb-2">Información del Sistema</h3>

                            {isCiudadano && (
                            <InfoItem
                                icon={FilePenLine}
                                label="Mis inscripciones"
                                value={
                                    loading
                                    ? "Cargando..."
                                    : `${appointmentCount} inscripción${appointmentCount === 1 ? "" : "es"}`
                                }
                            />
                            )}

                            {(isSupervisor || isFuncionario) && (
                            <InfoItem
                                icon={GraduationCap}
                                label="Peticiones gestionadas"
                                value={
                                    loading
                                    ? "Cargando..."
                                    : `${petitionCount} petición${petitionCount === 1 ? "" : "es"}`
                                }
                            />
                            )}
                        </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

const InfoItem = ({ icon, label, value }) => {
    const Icon = icon;

    return (
        <div className="flex flex-row items-center gap-2 border-b border-gray-300 py-3 last:border-none">
            <span className="bg-blue-100 rounded-sm p-2">
                <Icon className="text-blue-600 h-5 w-5" />
            </span>
            <div className="flex flex-col">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="font-medium">{value}</span>
            </div>
        </div>
    );
};


export default Profile;
