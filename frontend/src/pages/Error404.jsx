import { Link } from 'react-router-dom';

const Error404 = () => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-9x1 font-bold text-purple-600">404</h1>
            <h2 className="text-3x1 font-semibold text-gray-800 mt-4 mb-2">Página No Encontradas</h2>
            <p className="text-gray-600 mb-6">Lo sentimos, la página que buscas no existe.</p>
            <Link
                to="/home"
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-300"
            > Volver al Inicio
            </Link>
        </div>
    );
};

export default Error404;