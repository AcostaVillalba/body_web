import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import API_URL from '../api';
import { useAuth } from '../context/AuthContext';

interface AvatarUploadProps {
    currentAvatar?: string;
    onUploadSuccess: (newUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatar, onUploadSuccess }) => {
    const { token, user, updateProfilePicture } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [cacheBuster, setCacheBuster] = useState(Date.now());

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/api/user/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setCacheBuster(Date.now()); // Forzar recarga visual
                onUploadSuccess(data.url);
                // Si tienes una función para actualizar el estado global del usuario
                if (updateProfilePicture) {
                    updateProfilePicture(data.url);
                }
            } else {
                throw new Error('Error al subir la imagen');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error al subir la foto de perfil. Inténtalo de nuevo.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto' }}>
            <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #a2d149',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {currentAvatar ? (
                    <img 
                        src={`${currentAvatar}${currentAvatar.includes('?') ? '&' : '?'}t=${cacheBuster}`} 
                        alt="Avatar" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                ) : (
                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#a2d149' }}>
                        {user?.name?.[0].toUpperCase()}
                    </span>
                )}

                {uploading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2
                    }}>
                        <Loader2 className="animate-spin" color="#fff" size={24} />
                    </div>
                )}
            </div>

            <label style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: '#2d4739',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid #fff',
                transition: 'transform 0.2s',
                zIndex: 3
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Camera size={16} />
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                    disabled={uploading}
                />
            </label>
        </div>
    );
};

export default AvatarUpload;
