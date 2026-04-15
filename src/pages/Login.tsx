import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoBody2 from '../assets/logobody2.jpeg';
import '../App.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      const token = credentialResponse.credential;
      if (!token) throw new Error("No token received");

      // Verify token with backend
      const res = await fetch('http://localhost:8000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        throw new Error("Fallo la autenticación con el servidor.");
      }

      const data = await res.json();
      
      login(data.access_token, {
        name: data.name,
        email: data.email,
        role: data.role
      });

      if (data.role === 'Admin') {
        navigate('/admin');
      } else if (data.role === 'Coach') {
        navigate('/coach');
      } else {
        navigate('/mi-rutina');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error iniciando sesión');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111', color: '#fff' }}>
      <img src={logoBody2} alt="BODY BY JA" style={{ width: 180, borderRadius: 20, marginBottom: 30 }} />
      <h1 className="brand-logo" style={{ color: '#fff', fontSize: '3rem', margin: 0 }}>
        BODY BY <span style={{ color: '#c5a021' }}>J.A.</span>
      </h1>
      <p style={{ letterSpacing: '4px', textTransform: 'uppercase', fontSize: '12px', color: '#c5a021', marginBottom: 50, fontWeight: 800 }}>
        Control de Acceso
      </p>

      <div style={{ background: '#222', padding: 40, borderRadius: 20, textAlign: 'center', border: '1px solid #333' }}>
        <h3 style={{ marginBottom: 30, color: '#f0f0f0' }}>Iniciar Sesión / Acceder a tu Plan</h3>
        
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => {
            setErrorMsg('El inicio de sesión falló. Por favor, intenta de nuevo.');
          }}
          useOneTap
          theme="filled_black"
          shape="pill"
        />

        {errorMsg && (
          <div style={{ marginTop: 20, color: '#ef4444', fontSize: '13px', background: '#fee2e2', padding: '10px', borderRadius: 8, border: '1px solid #fca5a5' }}>
            {errorMsg}
          </div>
        )}
      </div>

      <p style={{ marginTop: 50, color: '#666', fontSize: '12px' }}>
        © {new Date().getFullYear()} Body by J.A. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default Login;
