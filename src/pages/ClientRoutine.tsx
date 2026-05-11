import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, ChevronUp, History, X, Bell, Menu, User, Award, Info, BookOpen } from 'lucide-react';
import logoBody2 from '../assets/logobody2.png';
import { EXERCISES_DB, getImageUrl } from '../data';
import ExerciseImage from '../components/ExerciseImage';
import AvatarUpload from '../components/AvatarUpload';
import API_URL from '../api';

const ClientRoutine = () => {
    const { user, token, logout } = useAuth();
    const [routineDays, setRoutineDays] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDay, setOpenDay] = useState<string | null>(null);
    const [showWeightHistory, setShowWeightHistory] = useState(false);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [coach, setCoach] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'routine' | 'profile' | 'coach' | 'rules'>('routine');
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    useEffect(() => {
        const fetchRoutine = async () => {
            try {
                const res = await fetch(`${API_URL}/api/client/my-routine`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 403) {
                    const data = await res.json();
                    if (data.detail && data.detail.includes("plan ha expirado")) {
                        localStorage.setItem('plan_expired_msg', "Tu plan ha expirado, contacta con tu coach de confianza para renovar tu plan");
                        logout();
                        return;
                    }
                }

                if (res.ok) {
                    const data = await res.json();
                    if (data.routine_data) {
                        setRoutineDays(JSON.parse(data.routine_data));
                    }
                    if (data.profile) {
                        setProfile(data.profile);
                    }
                    if (data.coach) {
                        setCoach(data.coach);
                    }
                }
            } catch (err) {
                console.error("Failed to load routine");
            } finally {
                setLoading(false);
            }
        };

        fetchRoutine();
    }, [token]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/client/weight-history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setWeightHistory(data);
                }
            } catch (err) {
                console.error("Failed to load weight history");
            }
        };

        if (token) fetchHistory();
    }, [token, showWeightHistory]);

    useEffect(() => {
        const fetchNotifs = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (err) {
                console.error("Failed to load notifications");
            }
        };

        if (token) {
            fetchNotifs();
            // Poll every 5 minutes
            const interval = setInterval(fetchNotifs, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [token]);

    const deleteNotif = async (id: number) => {
        try {
            const res = await fetch(`${API_URL}/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete notification");
        }
    };


    // Reset currentStep when changing day
    useEffect(() => {
        setCurrentStep(0);
    }, [openDay]);

    // Cerrar notificaciones al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isNotifOpen && !target.closest('.notif-trigger') && !target.closest('.notif-container')) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotifOpen]);

    const getMuscleGroup = (exerciseName: string): string => {
        if (!exerciseName) return '';
        const normalized = exerciseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const [group, exercises] of Object.entries(EXERCISES_DB)) {
            const found = exercises.some(ex =>
                ex.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized
            );
            if (found) return group;
        }
        return '';
    };

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9', color: '#111' }}><h3>Cargando tu plan...</h3></div>;
    }

    return (
        <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#f4f7f5', color: '#111', minHeight: '100vh', padding: '0', position: 'relative' }}>
            
            {/* Background Watermark */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `url(${logoBody2})`, backgroundRepeat: 'repeat', backgroundSize: '180px',
                opacity: 0.08, pointerEvents: 'none', zIndex: 0
            }} />

            {/* NEW SLIM HEADER */}
            <div style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, height: '70px', 
                background: '#2d4739', display: 'flex', alignItems: 'center', 
                justifyContent: 'space-between', padding: '0 20px', color: '#fff', 
                zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px' }}>
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={logoBody2} alt="Logo" style={{ width: 40 }} />
                        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>
                            BODY <span style={{ color: '#a2d149' }}>LOGIC</span>
                        </h1>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div className="notif-trigger" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            style={{ background: 'transparent', border: 'none', color: '#a2d149', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
                        >
                            <Bell size={24} />
                            {(notifications.length > 0 || (() => {
                                const today = new Date();
                                const end = new Date(profile?.endDate || '');
                                const diffDaysEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                const control = new Date(profile?.controlDate || '');
                                const diffDaysControl = Math.ceil((control.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                return (diffDaysEnd >= 0 && diffDaysEnd <= 3) || (diffDaysControl === 1);
                            })()) && (
                                <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid #2d4739' }}>
                                    {notifications.length + (profile ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <>
                                <div 
                                    className="notif-overlay"
                                    onClick={() => setIsNotifOpen(false)}
                                    style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1099, backdropFilter: 'blur(2px)' }} 
                                />
                                <div className="notif-container" style={{ position: 'absolute', top: 45, right: 0, width: 300, background: '#fff', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1100, border: '1px solid #e2e8f0', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
                                <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#1e293b' }}>NOTIFICACIONES</h4>
                                </div>
                                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                                    {notifications.map(n => (
                                        <div key={n.id} onClick={() => deleteNotif(n.id)} style={{ padding: 15, borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}>
                                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#1e293b' }}>Rutina Actualizada</p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748b' }}>{n.message}</p>
                                        </div>
                                    ))}
                                    {notifications.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No hay notificaciones nuevas</div>}
                                </div>
                            </div>
                            </>
                        )}
                    </div>
                    <button 
                        onClick={logout} 
                        style={{ 
                            background: '#333', color: '#f87171', border: 'none', 
                            padding: '8px 16px', borderRadius: 10, fontSize: '11px', 
                            fontWeight: 800, cursor: 'pointer', display: 'flex', 
                            alignItems: 'center', gap: 8, transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#444'}
                        onMouseOut={e => e.currentTarget.style.background = '#333'}
                    >
                        <LogOut size={14} /> SALIR
                    </button>
                </div>
            </div>

            {/* SIDEBAR MENU */}
            {isMenuOpen && (
                <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, backdropFilter: 'blur(4px)' }} />
            )}
            <div style={{ 
                position: 'fixed', top: '70px', left: isMenuOpen ? 0 : '-300px', width: '280px', height: 'calc(100vh - 70px)', 
                background: '#fff', zIndex: 1200, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                boxShadow: '4px 0 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', padding: '0' 
            }}>
                <div style={{ 
                    padding: '30px 20px', 
                    background: '#f8fafc', 
                    textAlign: 'center', 
                    borderBottom: '1px solid #f1f5f9' 
                }}>
                    <AvatarUpload 
                        currentAvatar={user?.profile_picture_url} 
                        onUploadSuccess={(url) => console.log("New avatar:", url)} 
                    />
                    <h3 style={{ margin: '15px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#2d4739' }}>
                        {user?.name}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                        Atleta Body Logic
                    </p>
                </div>

                <div style={{ flex: 1, padding: '20px 15px' }}>
                    {[
                        { id: 'routine', label: 'MI RUTINA', icon: <BookOpen size={20} /> },
                        { id: 'profile', label: 'MI PERFIL', icon: <User size={20} /> },
                        { id: 'coach', label: 'MI COACH', icon: <Award size={20} /> },
                        { id: 'rules', label: 'RECOMENDACIONES', icon: <Info size={20} /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setIsMenuOpen(false); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', 
                                marginBottom: '8px', borderRadius: '12px', border: 'none', cursor: 'pointer', 
                                fontWeight: 800, fontSize: '13px', transition: 'all 0.2s', textAlign: 'left',
                                background: activeTab === tab.id ? '#f0fdf4' : 'transparent',
                                color: activeTab === tab.id ? '#2d4739' : '#64748b',
                                borderLeft: activeTab === tab.id ? '4px solid #a2d149' : '4px solid transparent'
                            }}>
                            <span style={{ color: activeTab === tab.id ? '#a2d149' : 'inherit' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', textAlign: 'center', background: '#f8fafc' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>{user?.email}</p>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: '90px', paddingBottom: '40px', paddingLeft: '20px', paddingRight: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: `url(${logoBody2})`, backgroundRepeat: 'repeat', backgroundSize: '180px',
                    opacity: 0.12, pointerEvents: 'none', zIndex: 0
                }} />

                {activeTab === 'routine' && (
                    <>
                    {routineDays.length === 0 ? (
                        <div style={{ background: '#fff', padding: 40, borderRadius: 16, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1, marginTop: 40 }}>
                            <h3 style={{ color: '#a2d149' }}>Aún no tienes rutinas asignadas</h3>
                            <p style={{ color: '#666' }}>Tu coach publicará tu plan aquí pronto.</p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', zIndex: 1, marginTop: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 20px 0', color: '#111', textAlign: 'center' }}>Tu Semana de Entrenamiento</h2>

                            {routineDays.map((day) => (
                                <div key={day.name} style={{ marginBottom: 15 }}>
                                    {/* Accordion Header */}
                                    <button
                                        onClick={() => setOpenDay(openDay === day.name ? null : day.name)}
                                        style={{
                                            width: '100%', background: openDay === day.name ? '#a2d149' : '#fff', color: openDay === day.name ? '#fff' : '#111',
                                            padding: '18px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            border: openDay === day.name ? 'none' : '2px solid #e5e7eb', borderRadius: 12, fontWeight: 900, fontSize: '18px',
                                            textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s',
                                            boxShadow: openDay === day.name ? '0 8px 20px rgba(162, 209, 73, 0.3)' : 'none'
                                        }}
                                    >
                                        {day.name}
                                        {openDay === day.name ? <ChevronUp /> : <ChevronDown />}
                                    </button>

                                {/* Accordion Body - Single Visualizer Mode */}
                                {openDay === day.name && (
                                    <div style={{ padding: '20px 0', animation: 'fadeIn 0.3s ease-out' }}>
                                        {(() => {
                                            const totalGroups = day.groups.length;
                                            const currentGroup = day.groups[currentStep];

                                            if (!currentGroup) return <p style={{ textAlign: 'center', color: '#666' }}>No hay ejercicios en este día.</p>;

                                            const isBiserie = currentGroup.exercises.length > 1;

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    {/* Card Container */}
                                                    <div style={{
                                                        background: '#fff',
                                                        border: '2px solid #a2d149',
                                                        borderRadius: 24,
                                                        overflow: 'hidden',
                                                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                                        minHeight: '400px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        position: 'relative',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        {/* Step Header */}
                                                        <div style={{ display: 'flex', height: 45, alignItems: 'stretch' }}>
                                                            <div style={{ background: '#ef4444', color: '#fff', padding: '0 20px', fontWeight: 900, fontSize: '13px', display: 'flex', alignItems: 'center', borderRadius: '0 0 20px 0', letterSpacing: '1.5px' }}>
                                                                BLOQUE {currentStep + 1} DE {totalGroups}
                                                            </div>
                                                            {isBiserie && (
                                                                <div style={{ background: '#a2d149', color: '#fff', flex: 1, padding: 10, fontWeight: 900, fontSize: '12px', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase' }}>
                                                                    🔥 BISERIE / SUPER SERIE
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Exercises Scroll Area */}
                                                        <div style={{
                                                            padding: '25px',
                                                            flex: 1,
                                                            overflowY: 'auto',
                                                            display: 'flex',
                                                            flexDirection: isBiserie ? 'column' : 'row',
                                                            gap: '30px',
                                                            alignItems: 'center',
                                                            justifyContent: isBiserie ? 'flex-start' : 'center'
                                                        }}>
                                                            {currentGroup.exercises.map((ex: any, idx: number) => {
                                                                const currentImgUrl = getImageUrl(ex.name) || '';
                                                                return (
                                                                    <div key={ex.id} style={{
                                                                        width: '100%',
                                                                        animation: 'slideIn 0.4s ease-out',
                                                                        borderBottom: (isBiserie && idx === 0) ? '2px dashed #e5e7eb' : 'none',
                                                                        paddingBottom: (isBiserie && idx === 0) ? '25px' : '0'
                                                                    }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                                                            <div>
                                                                                {getMuscleGroup(ex.name) && (
                                                                                    <span style={{
                                                                                        fontSize: '11px', fontWeight: 800,
                                                                                        letterSpacing: '1px', textTransform: 'uppercase',
                                                                                        color: '#3394d4', background: '#e0f3f5',
                                                                                        padding: '3px 10px', borderRadius: 20,
                                                                                        marginBottom: 8, display: 'inline-block'
                                                                                    }}>
                                                                                        {getMuscleGroup(ex.name)}
                                                                                    </span>
                                                                                )}
                                                                                <div style={{ fontWeight: 900, fontSize: '22px', color: '#111', marginBottom: 10, textTransform: 'uppercase', lineHeight: 1.1 }}>
                                                                                    {isBiserie ? (idx === 0 ? 'A. ' : 'B. ') : ''}{ex.name}
                                                                                </div>
                                                                                <div style={{ display: 'inline-block', background: '#fdfaf0', border: '1px solid #f2e3b3', color: '#a38210', padding: '6px 16px', borderRadius: 30, fontWeight: 800, fontSize: '13px', marginBottom: 12 }}>
                                                                                    {ex.reps === "MIN" ? `${ex.series} Minutos` : `${ex.series} Series x ${ex.reps} Reps`}
                                                                                </div>
                                                                                {ex.note && (
                                                                                    <div style={{ fontSize: '13px', color: '#444', background: '#f8f9fa', padding: 12, borderRadius: 10, borderLeft: '4px solid #a2d149', fontWeight: 500 }}>
                                                                                        {ex.note}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {currentImgUrl && (
                                                                                <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', background: '#fafafa', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                                                    <ExerciseImage src={currentImgUrl} alt={ex.name} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>

                                                        {/* Rest Info */}
                                                        <div style={{ background: '#f1f5f9', color: '#64748b', textAlign: 'center', padding: '10px', fontWeight: 800, fontSize: '11px', letterSpacing: '1px', borderTop: '1px solid #e5e7eb' }}>
                                                            ⌛ 3 MINUTOS DE DESCANSO DESPUÉS DE ESTE BLOQUE
                                                        </div>
                                                    </div>

                                                    {/* Navigation Controls */}
                                                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                                        <button
                                                            disabled={currentStep === 0}
                                                            onClick={() => setCurrentStep(prev => prev - 1)}
                                                            style={{
                                                                flex: 1, padding: '18px', background: currentStep === 0 ? '#e5e7eb' : '#fff',
                                                                color: currentStep === 0 ? '#94a3b8' : '#2d4739', border: '2px solid',
                                                                borderColor: currentStep === 0 ? '#e5e7eb' : '#2d4739',
                                                                borderRadius: 16, fontWeight: 900, fontSize: '14px',
                                                                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                                                                transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                                            }}
                                                        >
                                                            ANTERIOR
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (currentStep === totalGroups - 1) {
                                                                    setOpenDay(null);
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                } else {
                                                                    setCurrentStep(prev => prev + 1);
                                                                }
                                                            }}
                                                            style={{
                                                                flex: 2, padding: '18px',
                                                                background: currentStep === totalGroups - 1 ? '#a2d149' : '#2d4739',
                                                                color: '#fff', border: 'none',
                                                                borderRadius: 16, fontWeight: 900, fontSize: '14px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(45, 71, 57, 0.2)'
                                                            }}
                                                        >
                                                            {currentStep === totalGroups - 1 ? 'FINALIZAR ENTRENAMIENTO' : 'SIGUIENTE EJERCICIO'}
                                                        </button>
                                                    </div>

                                                    {/* Progress Dots */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                                                        {day.groups.map((_: any, idx: number) => (
                                                            <div key={idx} style={{
                                                                width: idx === currentStep ? '24px' : '8px',
                                                                height: '8px',
                                                                borderRadius: '4px',
                                                                background: idx === currentStep ? '#a2d149' : '#cbd5e1',
                                                                transition: 'all 0.3s'
                                                            }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}

                {activeTab === 'profile' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 20px 0', color: '#111', textAlign: 'center' }}>Mi Perfil de Atleta</h2>
                        <div style={{
                            background: '#fff', padding: '30px', borderRadius: '24px', border: '2px solid #a2d149', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#a2d149', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, margin: '0 auto 10px' }}>
                                    {user?.name?.[0].toUpperCase()}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{user?.name}</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13, fontWeight: 500 }}>{user?.email}</p>
                            </div>

                            {profile ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                                    <div style={{ padding: '15px', background: '#fcfaf2', borderRadius: '15px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 5 }}>Objetivo Principal</span>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>{profile.goal}</span>
                                    </div>
                                    <div style={{ padding: '15px', background: '#fcfaf2', borderRadius: '15px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 5 }}>Peso Actual</span>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>{profile.weight} kg</span>
                                    </div>
                                    <div style={{ padding: '15px', background: '#fcfaf2', borderRadius: '15px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 5 }}>Suscripción</span>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>{profile.planType}</span>
                                    </div>
                                    <div style={{ padding: '15px', background: '#fcfaf2', borderRadius: '15px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 5 }}>Vencimiento</span>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>{profile.endDate}</span>
                                    </div>
                                    <div style={{ padding: '15px', background: '#eff6ff', borderRadius: '15px', border: '1px solid #bfdbfe', gridColumn: '1 / -1' }}>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#1e40af', fontWeight: 800, display: 'block', marginBottom: 5 }}>Próximo Control de Medidas</span>
                                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#1e40af' }}>{profile.controlDate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Aún no tienes un perfil de plan activo.</p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Tu coach registrará tus datos pronto.</p>
                                </div>
                            )}

                            <button
                                onClick={() => setShowWeightHistory(true)}
                                style={{
                                    width: '100%', marginTop: '25px', background: '#111', color: '#a2d149',
                                    padding: '15px', borderRadius: '15px', border: 'none', fontWeight: 800,
                                    fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}>
                                <History size={18} /> Ver Historial de Progresos
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'coach' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 20px 0', color: '#111', textAlign: 'center' }}>Tu Coach Personal</h2>
                        <div style={{
                            background: '#fff', padding: '40px 30px', borderRadius: '24px', border: '2px solid #2d4739', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 30 }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#2d4739', color: '#a2d149', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, margin: '0 auto 15px' }}>
                                    {coach?.name?.[0].toUpperCase() || 'C'}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{coach?.name || 'Tu Coach'}</h3>
                                <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: 14 }}>Entrenador Certificado Body Logic</p>
                            </div>

                            <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8', marginBottom: '30px', textAlign: 'center', fontStyle: 'italic' }}>
                                "Mi misión es guiarte hacia tu mejor versión, utilizando ciencia y disciplina para alcanzar tus metas de forma sostenible."
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', borderTop: '4px solid #a2d149' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2d4739', fontWeight: 800, fontSize: 14 }}>MISIÓN</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Empoderar a través del ejercicio y crear planes inteligentes para una mentalidad resiliente.</p>
                                </div>
                                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', borderTop: '4px solid #a2d149' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2d4739', fontWeight: 800, fontSize: 14 }}>VISIÓN</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Ser el catalizador del cambio y ayudar a alcanzar un bienestar físico y mental sostenible.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 20px 0', color: '#111', textAlign: 'center' }}>Protocolo de Entrenamiento</h2>
                        <div style={{
                            background: '#fff', padding: '30px', borderRadius: '24px', border: '2px solid #ef4444', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                {[
                                    { title: '1. Calentamiento', desc: 'Realiza 10 minutos de movilidad articular antes de comenzar.' },
                                    { title: '2. Técnica Stricta', desc: 'La técnica siempre prevalece sobre el peso. Mantén el control.' },
                                    { title: '3. Sobrecarga', desc: 'Progresa subiendo peso o reps solo cuando la técnica sea perfecta.' },
                                    { title: '4. Hidratación', desc: 'Bebe agua cada 15-20 minutos durante tu entrenamiento.' },
                                    { title: '5. Descanso', desc: 'Respeta los tiempos de descanso para una recuperación óptima.' },
                                    { title: '6. Estiramiento', desc: 'Al terminar, tómate 5 minutos para estirar y volver a la calma.' },
                                ].map((rule, i) => (
                                    <div key={i} style={{ padding: '15px', background: '#fffafb', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                                        <strong style={{ color: '#b91b1b', display: 'block', marginBottom: '5px', fontSize: '13px' }}>{rule.title}</strong>
                                        <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{rule.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '25px', textAlign: 'center', border: '2px dashed #fca5a5', color: '#b91b1b', padding: '15px', borderRadius: '15px', fontSize: '13px', background: '#fff5f5', fontWeight: '800' }}>
                                🚨 ANTE CUALQUIER DOLOR EXTRAÑO, DETÉN EL ENTRENAMIENTO Y AVISA A TU COACH.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Weight History Modal (Needs to be here to be on top) */}
            {showWeightHistory && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 2000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px', backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        background: '#fff', width: '100%', maxWidth: '500px',
                        borderRadius: '24px', overflow: 'hidden',
                        animation: 'fadeIn 0.3s ease-out',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            background: '#111', color: '#a2d149', padding: '20px 25px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Historial de Peso
                            </h3>
                            <button onClick={() => setShowWeightHistory(false)} style={{ background: 'transparent', border: 'none', color: '#a2d149', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '25px', maxHeight: '70vh', overflowY: 'auto' }}>
                            {weightHistory.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No hay registros históricos aún.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {weightHistory.map((item) => (
                                        <div key={item.id} style={{
                                            background: '#f8fafc', padding: '15px 20px', borderRadius: '16px',
                                            borderLeft: '5px solid #a2d149', display: 'flex',
                                            justifyContent: 'space-between', alignItems: 'center',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#a38210', textTransform: 'uppercase' }}>{item.date}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#444', marginTop: '4px' }}>{item.notes || 'Registro de peso'}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#111' }}>{item.weight}<span style={{ fontSize: '14px', marginLeft: '2px' }}>kg</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '20px 25px', background: '#f1f5f9', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Registrado automáticamente con cada actualización</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footers Container */}
            <div style={{
                maxWidth: 800,
                margin: '30px auto 0 auto',
                padding: '0 20px 50px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                {/* Social Media Footer */}
                <div style={{
                    background: '#fff',
                    border: '2px solid #a2d149',
                    borderRadius: 16,
                    padding: '15px 24px',
                    textAlign: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <p style={{
                        fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
                        color: '#64748b', fontWeight: 800, margin: '0 0 10px 0'
                    }}>
                        Síguenos en redes sociales
                    </p>
                    <a
                        href="https://www.instagram.com/jefeandrea"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            color: '#111', textDecoration: 'none',
                            fontSize: '14px', fontWeight: 900,
                            padding: '8px 20px', borderRadius: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.3s'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = '#f8fafc';
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="20" height="20" rx="5" stroke="#a2d149" strokeWidth="2" />
                            <circle cx="12" cy="12" r="4" stroke="#a2d149" strokeWidth="2" />
                            <circle cx="17.5" cy="6.5" r="1.2" fill="#a2d149" />
                        </svg>
                        @bodylogicapp
                    </a>
                </div>

                {/* Coach Contact Footer */}
                <div style={{
                    background: 'linear-gradient(135deg, #111 0%, #1b3022 100%)',
                    border: '1px solid #a2d149',
                    borderRadius: 16,
                    padding: '20px 24px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(162, 209, 73, 0.12)'
                }}>
                    <p style={{
                        fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase',
                        color: '#a2d149', fontWeight: 800, margin: '0 0 6px 0'
                    }}>
                        Contacta a tu Coach
                    </p>
                    <p style={{
                        fontSize: '18px', fontWeight: 900, color: '#fff',
                        margin: '0 0 15px 0', letterSpacing: '0.5px'
                    }}>
                        {coach?.name || '—'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                        {/* Instagram */}
                        {coach?.instagram && (
                            <a
                                href={`https://www.instagram.com/${String(coach.instagram).replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    color: '#a2d149', textDecoration: 'none',
                                    fontSize: '13px', fontWeight: 700,
                                    background: 'rgba(162, 209, 73, 0.08)',
                                    padding: '8px 16px', borderRadius: 50,
                                    border: '1px solid rgba(162, 209, 73, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="#a2d149" strokeWidth="2" />
                                    <circle cx="12" cy="12" r="4" stroke="#a2d149" strokeWidth="2" />
                                    <circle cx="17.5" cy="6.5" r="1.2" fill="#a2d149" />
                                </svg>
                                {coach.instagram}
                            </a>
                        )}
                        {/* Phone */}
                        {coach?.phone && (
                            <a
                                href={`https://wa.me/${String(coach.phone).replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    color: '#a2d149', textDecoration: 'none',
                                    fontSize: '13px', fontWeight: 700,
                                    background: 'rgba(162, 209, 73, 0.08)',
                                    padding: '8px 16px', borderRadius: 50,
                                    border: '1px solid rgba(162, 209, 73, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.6 10.8C7.8 13.2 9.8 15.2 12.2 16.4L14 14.6C14.3 14.3 14.7 14.2 15 14.4C16.1 14.8 17.3 15 18.5 15C19.3 15 20 15.7 20 16.5V19.5C20 20.3 19.3 21 18.5 21C9.9 21 3 14.1 3 5.5C3 4.7 3.7 4 4.5 4H7.5C8.3 4 9 4.7 9 5.5C9 6.7 9.2 7.9 9.6 9C9.7 9.3 9.6 9.7 9.4 10L6.6 10.8Z" stroke="#a2d149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {coach.phone}
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @media (max-width: 600px) {
                    .notif-container {
                        position: fixed !important;
                        top: 50% !important;
                        left: 50% !important;
                        right: auto !important;
                        transform: translate(-50%, -50%) !important;
                        width: 90vw !important;
                        max-width: 350px !important;
                        z-index: 2000 !important;
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3) !important;
                    }
                    .notif-overlay {
                        display: block !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ClientRoutine;
