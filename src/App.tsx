import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import TermsModal from './components/TermsModal';

// Lazy loading components for better performance
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'));
const ClientRoutine = lazy(() => import('./pages/ClientRoutine'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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

const AppContent = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  
  // Bloquear acceso si está autenticado pero no ha aceptado los términos vigentes
  const showTermsModal = isAuthenticated && user && !user.terms_accepted;

  if (showTermsModal) {
    return (
      <>
        <LoadingScreen isLoading={isLoading} />
        <TermsModal />
      </>
    );
  }
  
  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      <Router>
        <Suspense fallback={null}>
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
        </Suspense>
      </Router>
    </>
  );
};

function App() {
  console.log("App component rendered");

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
