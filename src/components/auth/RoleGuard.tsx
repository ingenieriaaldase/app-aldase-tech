import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // User authorized but not for this role
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 mb-6">No tienes permisos para ver esta sección.</p>
                <button
                    onClick={() => window.history.back()}
                    className="text-primary-600 hover:underline"
                >
                    Volver atrás
                </button>
            </div>
        );
    }

    return <>{children}</>;
};
