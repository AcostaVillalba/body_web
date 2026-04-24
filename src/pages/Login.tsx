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
      
      if (data.is_active === false) {
        throw new Error("Su plan ha expirado. Por favor, comuníquese con su coach para renovar su acceso.");
      }

      login(data.access_token, {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.is_active
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000000ff', color: '#fff' }}>
      <img src={logoBody2} alt="BODY BY JA" style={{ width: 180, borderRadius: 20, marginBottom: 30 }} />
      <h1 className="brand-logo" style={{ color: '#fff', fontSize: '3rem', margin: 0 }}>
        BODY BY <span style={{ color: '#c5a021' }}>J.A.</span>
      </h1>
      <p style={{ letterSpacing: '4px', textTransform: 'uppercase', fontSize: '12px', color: '#c5a021', marginBottom: 50, fontWeight: 800 }}>
        Control de Acceso
      </p>

      {/* Coach Contact Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)',
        padding: '20px 32px',
        borderRadius: 16,
        textAlign: 'center',
        border: '1px solid #c5a021',
        marginBottom: 20,
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 24px rgba(197,160,33,0.12)'
      }}>
        <p style={{ fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#c5a021', fontWeight: 800, margin: '0 0 10px 0' }}>
          Tu Coach
        </p>
        <p style={{ fontSize: '18px', fontWeight: 700, color: '#f0f0f0', margin: '0 0 16px 0', letterSpacing: '0.5px' }}>
          Name coah
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Instagram */}
          <a
            href="https://www.instagram.com/jefeandrea"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#c5a021', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            {/* Instagram SVG icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="#c5a021" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" stroke="#c5a021" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="#c5a021" />
            </svg>
            @jefeandrea
          </a>
          {/* Phone */}
          <a
            href="tel:+571234567890"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#c5a021', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            {/* Phone SVG icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 10.8C7.8 13.2 9.8 15.2 12.2 16.4L14 14.6C14.3 14.3 14.7 14.2 15 14.4C16.1 14.8 17.3 15 18.5 15C19.3 15 20 15.7 20 16.5V19.5C20 20.3 19.3 21 18.5 21C9.9 21 3 14.1 3 5.5C3 4.7 3.7 4 4.5 4H7.5C8.3 4 9 4.7 9 5.5C9 6.7 9.2 7.9 9.6 9C9.7 9.3 9.6 9.7 9.4 10L6.6 10.8Z" stroke="#c5a021" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            +57 1234567890
          </a>
        </div>
      </div>

      <div style={{ background: '#222', padding: 40, borderRadius: 20, textAlign: 'center', border: '1px solid #333', width: '100%', maxWidth: 380 }}>
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
