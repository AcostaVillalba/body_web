
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import CoachDashboard from './pages/CoachDashboard';
import ClientRoutine from './pages/ClientRoutine';
import AdminDashboard from './pages/AdminDashboard'; // Nuevo import

// Component to handle root path redirect based on auth status
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (user?.role === 'Admin') {
    return <Navigate to="/admin" replace />;
  } else if (user?.role === 'Coach') {
    return <Navigate to="/coach" replace />;
  } else {
    return <Navigate to="/mi-rutina" replace />;
  }
};

function App() {
  console.log("App component rendered");
  // Configuración segura usando el .env de Vite (variables prefijadas con VITE_)
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "FALTA_COLOCAR_ID_EN_EL_ARCHIVO_ENV";

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Rutas de Administrador/Entrenador */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Coach']} />}>
              <Route path="/coach" element={<CoachDashboard />} />
            </Route>

            {/* Rutas de Administrador */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            
            {/* Rutas de Cliente */}
            <Route element={<ProtectedRoute allowedRoles={['Client', 'Coach', 'Admin']} />}>
              <Route path="/mi-rutina" element={<ClientRoutine />} />
            </Route>

            {/* Redirección por defecto */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
