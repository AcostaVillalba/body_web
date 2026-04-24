import React, { useState, useEffect, useRef } from 'react';

interface ExerciseImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}

const ExerciseImage = React.memo(({ src, alt, style }: ExerciseImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  const fallbackSrc = `https://placehold.co/600x400/111/c5a021?text=${encodeURIComponent(alt)}&font=montserrat`;

  // Determinamos si es un video basado en la URL
  const isVideo = src && (src.toLowerCase().includes('.webm') || src.toLowerCase().includes('.mp4'));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (mediaRef.current) {
      observer.observe(mediaRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      ref={mediaRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        minHeight: '200px', 
        display: 'flex', 
        overflow: 'hidden',
        background: '#f8fafc',
        ...style 
      }}
    >
      {/* CSS Skeleton Loader */}
      {!isLoaded && !hasError && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: 'inherit' 
        }}>
          <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '12px', zIndex: 1 }}>Cargando...</span>
        </div>
      )}
      
      {isInView && (
        hasError ? (
          <img
            src={fallbackSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: isLoaded ? 'block' : 'none', 
              objectFit: 'cover', 
              borderRadius: 'inherit' 
            }}
            onLoad={() => setIsLoaded(true)}
          />
        ) : isVideo ? (
          <video
            src={src}
            title={alt}
            autoPlay
            loop
            muted
            playsInline
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: isLoaded ? 'block' : 'none', 
              objectFit: 'cover', 
              borderRadius: 'inherit' 
            }}
            onLoadedData={() => setIsLoaded(true)}
            onError={() => { setHasError(true); setIsLoaded(true); }}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: isLoaded ? 'block' : 'none', 
              objectFit: 'cover', 
              borderRadius: 'inherit' 
            }}
            onLoad={() => setIsLoaded(true)}
            onError={() => { setHasError(true); setIsLoaded(true); }}
          />
        )
      )}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
});

ExerciseImage.displayName = 'ExerciseImage';

export default ExerciseImage;
