import { Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "@context/AuthContext";

function Root() {
    const location = useLocation();

    return (
        <AuthProvider>
            <div key={location.pathname} className="route-transition route-transition-right">
                <Outlet />
            </div>
        </AuthProvider>
    );
}

export default Root;
