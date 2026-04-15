
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('Admin' | 'Coach' | 'Client')[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    // Si no está logueado, lo mandamos al login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user) {
    if (!allowedRoles.includes(user.role)) {
      // Si está logueado pero no tiene el rol correcto, al landing base o su ruta principal
      if (user.role === 'Client') {
        return <Navigate to="/mi-rutina" replace />;
      } else if (user.role === 'Admin') {
        return <Navigate to="/admin" replace />;
      } else {
        return <Navigate to="/coach" replace />;
      }
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
