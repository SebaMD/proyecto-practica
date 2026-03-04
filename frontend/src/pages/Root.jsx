import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "@context/AuthContext";

const ROUTE_ORDER = [
    "/home",
    "/petitions",
    "/periods",
    "/requests",
    "/appointments",
    "/users",
    "/profile",
];

const getRouteIndex = (pathname) => {
    const foundIndex = ROUTE_ORDER.findIndex((route) => pathname.startsWith(route));
    return foundIndex === -1 ? Number.MAX_SAFE_INTEGER : foundIndex;
};

function Root() {
    const location = useLocation();
    const previousPathRef = useRef(location.pathname);
    const [directionClass, setDirectionClass] = useState("route-transition-right");

    const transitionClass = useMemo(
        () => `route-transition ${directionClass}`,
        [directionClass]
    );

    useEffect(() => {
        const previousPath = previousPathRef.current;
        const currentPath = location.pathname;

        const prevIndex = getRouteIndex(previousPath);
        const currentIndex = getRouteIndex(currentPath);

        if (currentIndex < prevIndex) {
            setDirectionClass("route-transition-left");
        } else if (currentIndex > prevIndex) {
            setDirectionClass("route-transition-right");
        }

        previousPathRef.current = currentPath;
    }, [location.pathname]);

    return (
        <AuthProvider>
            <div key={location.pathname} className={transitionClass}>
                <Outlet />
            </div>
        </AuthProvider>
    );
}

export default Root;
