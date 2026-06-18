import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../api';

const TermsModal = () => {
  const { token, acceptTermsInContext, setIsLoading } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDataPolicy, setAcceptedDataPolicy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms || !acceptedDataPolicy) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/accept-terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ version: 'v1.0' })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al aceptar los términos.');
      }

      acceptTermsInContext();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al registrar tu aceptación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <style>{`
        .legal-scroll-box::-webkit-scrollbar {
          width: 5px;
        }
        .legal-scroll-box::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        .legal-scroll-box::-webkit-scrollbar-thumb {
          background: rgba(162, 209, 73, 0.45);
          border-radius: 4px;
        }
        .legal-scroll-box::-webkit-scrollbar-thumb:hover {
          background: rgba(162, 209, 73, 0.7);
        }
        .accept-btn:not(:disabled):hover {
          background-color: #91be3f !important;
          transform: translateY(-1.5px);
          box-shadow: 0 4px 12px rgba(162, 209, 73, 0.3) !important;
        }
        .accept-btn:not(:disabled):active {
          transform: translateY(0);
        }
        .modal-fade-in {
          animation: modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div style={styles.container} className="modal-fade-in">
        <div style={styles.header}>
          <h2 style={styles.title}>Términos Legales y Privacidad</h2>
          <p style={styles.subtitle}>
            Para continuar usando <strong>Body Logic</strong>, lee y acepta los términos de uso y las políticas de datos personales.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Scrollable Terms & Conditions */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>1. Términos y Condiciones de Uso</h3>
            <div style={styles.scrollBox} className="legal-scroll-box">
              <p style={{ marginTop: 0 }}><strong>BIENVENIDO A LA PLATAFORMA BODY LOGIC</strong></p>
              <p>Al acceder y utilizar esta aplicación de entrenamiento físico y acondicionamiento deportivo, aceptas cumplir y estar sujeto a los siguientes términos:</p>
              <p><strong>1. Declaración de Salud:</strong> El entrenamiento deportivo y la fuerza conllevan riesgos inherentes de esfuerzo muscular, fatiga y lesiones. Declaras voluntariamente que te encuentras en un estado de salud apto para realizar actividad física. Es tu responsabilidad consultar a un médico si presentas alguna condición médica previa. Exoneras a Body Logic y sus entrenadores ante cualquier incidente físico o lesión que resulte del desarrollo de las rutinas proporcionadas.</p>
              <p><strong>2. Uso del Servicio:</strong> El acceso otorgado es personal e intransferible. Te comprometes a no reproducir, copiar, distribuir, ni vender el contenido del sitio web, código de software, ni los planes de entrenamiento.</p>
              <p style={{ marginBottom: 0 }}><strong>3. Vigencia:</strong> El acceso a la visualización de rutinas está sujeto al pago y vigencia del plan contratado. Finalizada la vigencia, el acceso será restringido hasta coordinar la renovación con tu respectivo entrenador.</p>
            </div>
          </div>

          {/* Scrollable Data Treatment Policy */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>2. Política de Tratamiento de Datos Personales</h3>
            <div style={styles.scrollBox} className="legal-scroll-box">
              <p style={{ marginTop: 0 }}><strong>AUTORIZACIÓN DE TRATAMIENTO DE DATOS (LEY 1581 DE 2012)</strong></p>
              <p>En cumplimiento de lo previsto por la Ley Estatutaria 1581 de 2012 de la República de Colombia, autorizas libre, expresa y previamente a <strong>Body Logic</strong> para recolectar, almacenar, organizar, utilizar, procesar, transmitir y transferir tus datos de carácter personal.</p>
              <p><strong>Categoría de Datos Tratados:</strong> Para la correcta personalización de los planes de entrenamiento deportivo, Body Logic solicita información que incluye datos de identificación general (nombre, correo electrónico) y datos catalogados como <strong>datos sensibles de salud</strong> (edad, peso, metas deportivas, autoevaluación de fatiga y estrellas asignadas al entrenamiento).</p>
              <p><strong>Finalidades del Tratamiento de Datos:</strong></p>
              <ul style={{ margin: '4px 0', paddingLeft: '15px' }}>
                <li>Elaborar y actualizar programas de entrenamiento físico personalizados.</li>
                <li>Monitorear la evolución deportiva y retroalimentación de las rutinas.</li>
                <li>Hacer seguimiento al historial de mediciones corporales ingresados.</li>
                <li>Remitir alertas, notificaciones de vencimiento y de publicación de rutinas.</li>
              </ul>
              <p style={{ marginBottom: 0 }}><strong>Derechos del Titular:</strong> Tienes derecho a acceder de forma gratuita a tus datos, actualizarlos, rectificarlos y solicitar la supresión de la base de datos comunicándote directamente con el administrador de la plataforma.</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={styles.checkboxInput}
                required
              />
              <span style={styles.checkboxText}>
                Acepto de manera expresa los <strong>Términos y Condiciones de Uso</strong>.
              </span>
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={acceptedDataPolicy}
                onChange={(e) => setAcceptedDataPolicy(e.target.checked)}
                style={styles.checkboxInput}
                required
              />
              <span style={styles.checkboxText}>
                Autorizo el tratamiento de mis datos según la <strong>Política de Datos (Ley 1581 de 2012)</strong>.
              </span>
            </label>
          </div>

          {error && <div style={styles.errorMessage}>{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            className="accept-btn"
            disabled={!acceptedTerms || !acceptedDataPolicy}
            style={{
              ...styles.submitButton,
              ...((!acceptedTerms || !acceptedDataPolicy) ? styles.submitButtonDisabled : {})
            }}
          >
            Aceptar y Continuar
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 15, 12, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 99999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
  },
  container: {
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
    border: '1px solid #d1d5db',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px 12px 24px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center' as const,
  },
  title: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#111827',
    letterSpacing: '0.2px',
  },
  subtitle: {
    margin: '6px 0 0 0',
    fontSize: '0.62rem',
    color: '#4b5563',
    lineHeight: '1.4',
  },
  form: {
    padding: '14px 24px 24px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
    overflowY: 'auto' as const,
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#2d4739',
  },
  scrollBox: {
    height: '110px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '10px 14px',
    overflowY: 'auto' as const,
    border: '1px solid #e5e7eb',
    fontSize: '0.58rem',
    color: '#374151',
    lineHeight: '1.45',
    textAlign: 'justify' as const,
  },
  checkboxContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '4px',
    padding: '12px 14px',
    backgroundColor: '#e5e7eb',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  checkboxInput: {
    marginTop: '2px',
    width: '15px',
    height: '15px',
    accentColor: '#2d4739',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '0.62rem',
    color: '#1f2937',
    lineHeight: '1.4',
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: '0.6rem',
    backgroundColor: '#fee2e2',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    textAlign: 'center' as const,
  },
  submitButton: {
    backgroundColor: '#a2d149',
    color: '#070a08',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 10px rgba(162, 209, 73, 0.2)',
    outline: 'none',
  },
  submitButtonDisabled: {
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    border: '1px solid #d1d5db',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

export default TermsModal;
