import React from 'react';
import { X, Info, Users, Target, ShieldCheck } from 'lucide-react';
import './InfoModal.css';
import logoBody2 from '../assets/logobody2.png';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="info-modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={24} />
        </button>

        <div className="info-modal-content">
          <header className="info-modal-header">
            <img src={logoBody2} alt="Body Logic Logo" className="info-modal-logo" />
            <h1 className="info-modal-title">Sobre <span className="accent">Body Logic</span></h1>
          </header>

          <section className="info-modal-section">
            <h2 className="info-modal-subtitle">¿Qué es Body Logic?</h2>
            <p className="info-modal-text">
              Body Logic es una plataforma integral diseñada para optimizar la gestión del fitness y el bienestar personal. 
              Nuestra tecnología permite centralizar el control de entrenamientos y planes personalizados en un solo lugar, 
              facilitando la interacción directa entre coaches y atletas. No es solo una herramienta de seguimiento, es un 
              ecosistema digital creado para quienes buscan transformar su estilo de vida de manera inteligente y profesional.
            </p>
          </section>

          <section className="info-modal-section">
            <h2 className="info-modal-subtitle">¿Por qué fue creado?</h2>
            <p className="info-modal-text">
              Nacimos de la necesidad de cerrar la brecha entre la planificación deportiva y la ejecución del usuario. 
              Body Logic fue desarrollado para:
            </p>

            <div className="info-modal-features">
              <div className="info-modal-feature">
                <div className="feature-icon-container">
                  <Users className="feature-icon" size={20} />
                </div>
                <div className="feature-info">
                  <h3>Empoderar a los Coaches</h3>
                  <p>Ofreciendo herramientas robustas para gestionar clientes, vender planes y monitorear progresos de forma eficiente.</p>
                </div>
              </div>

              <div className="info-modal-feature">
                <div className="feature-icon-container">
                  <Target className="feature-icon" size={20} />
                </div>
                <div className="feature-info">
                  <h3>Resultados a Medida</h3>
                  <p>Bajo la filosofía de "Resultados diseñados a tu medida", buscamos que cada usuario tenga acceso a un plan que realmente se adapte a sus objetivos y necesidades de movilidad.</p>
                </div>
              </div>

              <div className="info-modal-feature">
                <div className="feature-icon-container">
                  <ShieldCheck className="feature-icon" size={20} />
                </div>
                <div className="feature-info">
                  <h3>Calidad Profesional</h3>
                  <p>Un estándar de excelencia en cada rutina, asegurando que la técnica y la salud sean siempre la prioridad.</p>
                </div>
              </div>
            </div>
          </section>

          <footer className="info-modal-footer">
            <p>© 2026 Body Logic. Todos los derechos reservados.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
