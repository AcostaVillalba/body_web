import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoBody2 from '../assets/logobody2.png';
import '../App.css';

import API_URL from '../api';

const Login = () => {
  const { login, setIsLoading } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const msg = localStorage.getItem('plan_expired_msg');
    if (msg) {
      setErrorMsg(msg);
      localStorage.removeItem('plan_expired_msg');
    }

    const initializeGoogleSignIn = () => {
      const g = (window as any).google;
      if (g && g.accounts && g.accounts.id) {
        if (!(window as any).google_initialized) {
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
          g.accounts.id.initialize({
            client_id: clientId,
            callback: handleSuccess,
          });
          (window as any).google_initialized = true;
        }

        const buttonElem = document.getElementById('google-login-button');
        if (buttonElem) {
          g.accounts.id.renderButton(buttonElem, {
            theme: 'outline',
            shape: 'pill',
            size: 'large',
          });
        }
      }
    };

    // Load Google SDK script dynamically if not present
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    } else {
      if ((window as any).google) {
        initializeGoogleSignIn();
      } else {
        const existingOnload = script.onload;
        script.onload = (e) => {
          if (existingOnload) (existingOnload as any)(e);
          initializeGoogleSignIn();
        };
      }
    }
  }, []);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      const token = credentialResponse.credential;
      if (!token) throw new Error("No token received");

      // Set loading before starting backend verification
      setIsLoading(true);

      // Verify token with backend
      console.log("DEBUG: Enviando token al backend:", `${API_URL}/api/auth/google`);
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        setIsLoading(false);
        throw new Error("Fallo la autenticación con el servidor.");
      }

      const data = await res.json();
      
      if (data.role === 'Client' && data.is_active === false) {
        setIsLoading(false);
        throw new Error("Tu plan ha expirado, contacta con tu coach de confianza para renovar tu plan");
      }

      login(data.access_token, {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.is_active,
        profile_picture_url: data.profile_picture_url,
        terms_accepted: data.terms_accepted
      });

      // We stay in loading state while the next page fetches its data
      if (data.role === 'Admin') {
        navigate('/admin');
      } else if (data.role === 'Coach') {
        navigate('/coach');
      } else {
        navigate('/mi-rutina');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Error iniciando sesión');
    }
  };

  return (
    <div className="login-page-container">
      {/* Video Background */}
      <div className="video-bg-container">
        <video autoPlay loop muted playsInline className="video-bg">
          <source src={`${import.meta.env.BASE_URL}videos/login_bg.webm`} type="video/webm" />
        </video>
        <div className="video-bg-overlay"></div>
      </div>

      <img src={logoBody2} alt="BODY LOGIC" style={{ width: 140, marginBottom: 20, filter: 'drop-shadow(0 8px 16px rgba(162, 209, 73, 0.3))' }} />
      
      <h1 className="brand-logo" style={{ color: '#ffffff', textShadow: '0 4px 12px rgba(0,0,0,0.5)', margin: '0 0 10px 0' }}>
        BODY <span style={{ color: '#a2d149' }}>LOGIC</span>
      </h1>
      
      <p style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '11px', color: '#e5e7eb', marginBottom: 4, fontWeight: 600, textAlign: 'center', width: '100%' }}>
        Resultados diseñados a tu medida
      </p>
      
      <p style={{ letterSpacing: '4px', textTransform: 'uppercase', fontSize: '12px', color: '#a2d149', marginBottom: 40, fontWeight: 800, textAlign: 'center', width: '100%' }}>
        Control de Acceso
      </p>

      {/* Coach Contact Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: 16,
        textAlign: 'center',
        border: '1px solid rgba(162, 209, 73, 0.5)',
        marginBottom: 12,
        width: '100%',
        maxWidth: 280,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <p style={{ fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#a2d149', fontWeight: 800, margin: '0 0 10px 0' }}>
          Comunícate con nosotros
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Instagram */}
          <a
            href="https://www.instagram.com/jefeandrea"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#a2d149', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="#a2d149" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" stroke="#a2d149" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="#a2d149" />
            </svg>
            @bodylogicapp
          </a>
          {/* Phone */}
          <a
            href="tel:+571234567890"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#a2d149', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 10.8C7.8 13.2 9.8 15.2 12.2 16.4L14 14.6C14.3 14.3 14.7 14.2 15 14.4C16.1 14.8 17.3 15 18.5 15C19.3 15 20 15.7 20 16.5V19.5C20 20.3 19.3 21 18.5 21C9.9 21 3 14.1 3 5.5C3 4.7 3.7 4 4.5 4H7.5C8.3 4 9 4.7 9 5.5C9 6.7 9.2 7.9 9.6 9C9.7 9.3 9.6 9.7 9.4 10L6.6 10.8Z" stroke="#a2d149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            +57 1234567890
          </a>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '20px 20px', 
        borderRadius: 20, 
        textAlign: 'center', 
        border: '1px solid rgba(162, 209, 73, 0.3)', 
        width: '100%', 
        maxWidth: 280, 
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)' 
      }}>
        <h3 style={{ marginBottom: 15, color: '#2d4739', fontSize: '1rem' }}>Acceder a tu Plan</h3>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div id="google-login-button"></div>
        </div>

        {errorMsg && (
          <div style={{ marginTop: 20, color: '#ef4444', fontSize: '13px', background: '#fee2e2', padding: '10px', borderRadius: 8, border: '1px solid #fca5a5' }}>
            {errorMsg}
          </div>
        )}
      </div>

      <p style={{ marginTop: 50, color: '#e5e7eb', fontSize: '12px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        © {new Date().getFullYear()} Body Logic. Todos los derechos reservados.
      </p>
    </div>
  );

};

export default Login;
