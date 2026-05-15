import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [shouldRender, setShouldRender] = useState(isLoading);

  useEffect(() => {
    if (!isLoading) {
      // Wait for the fade-out animation to finish before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400); // Reduced duration for faster transition
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div className={`loading-screen-overlay ${!isLoading ? 'fade-out' : ''}`}>
      {/* Background Video */}
      <div className="loading-video-container">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          preload="auto"
          className="loading-video"
        >
          <source src={`${import.meta.env.BASE_URL}videos/loading.webm`} type="video/webm" />
        </video>
        <div className="loading-overlay"></div>
      </div>

      {/* Content */}
      <div className="loading-content">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <div className="loading-pulse"></div>
        </div>
        
        <h2 className="loading-text">Cargando tu experiencia personalizada...</h2>
        
        <div className="loading-progress-bar">
          <div className="loading-progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
