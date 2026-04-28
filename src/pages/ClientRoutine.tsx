import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, ChevronUp, History, X, Bell } from 'lucide-react';
import logoBody2 from '../assets/logobody2.png';
import { EXERCISES_DB, getImageUrl } from '../data';
import ExerciseImage from '../components/ExerciseImage';

const ClientRoutine = () => {
    const { user, token, logout } = useAuth();
    const [routineDays, setRoutineDays] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDay, setOpenDay] = useState<string | null>(null);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showCoachInfo, setShowCoachInfo] = useState(false);
    const [showWeightHistory, setShowWeightHistory] = useState(false);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [coach, setCoach] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const fetchRoutine = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/client/my-routine', {
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
                const res = await fetch('http://localhost:8000/api/client/weight-history', {
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
                const res = await fetch('http://localhost:8000/api/notifications', {
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
            const res = await fetch(`http://localhost:8000/api/notifications/${id}`, {
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
        <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#f1f5f9', color: '#111', minHeight: '100vh', padding: '0 0 50px 0', position: 'relative' }}>

            {/* Cabecera Negra (del PDF original) */}
            <div style={{ background: '#2d4739', color: '#fff', padding: '40px 20px', textAlign: 'center', position: 'relative', borderBottom: '6px solid #a2d149' }}>
                <button onClick={logout} style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', color: '#a2d149', cursor: 'pointer' }}>
                    <LogOut size={24} />
                </button>

                {/* Notification Bell */}
                <div style={{ position: 'absolute', top: 15, right: 60 }}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ background: 'transparent', border: 'none', color: '#a2d149', cursor: 'pointer', position: 'relative' }}
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
                                <span style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: '#ef4444', color: '#fff',
                                    borderRadius: '50%', width: 18, height: 18,
                                    fontSize: '10px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, border: '2px solid #2d4739'
                                }}>
                                    {notifications.length + (profile ? (() => {
                                        const today = new Date();
                                        let count = 0;

                                        const end = new Date(profile.endDate);
                                        const diffDaysEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        if (diffDaysEnd >= 0 && diffDaysEnd <= 3) count++;

                                        const control = new Date(profile.controlDate);
                                        const diffDaysControl = Math.ceil((control.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        if (diffDaysControl === 1) count++;

                                        return count;
                                    })() : 0)}
                                </span>
                            )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div style={{
                            position: 'absolute', top: 35, right: 0,
                            background: '#1b3022', border: '1px solid #a2d149',
                            borderRadius: '12px', width: '280px', padding: '15px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000,
                            textAlign: 'left'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#a2d149', borderBottom: '1px solid #333', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                Notificaciones
                                {notifications.length > 0 && <span style={{ fontSize: '10px', color: '#888', fontWeight: 400 }}>Toca para borrar</span>}
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => deleteNotif(n.id)}
                                        style={{ background: '#2d4739', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #a2d149', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#fff' }}>Rutina Actualizada</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#ccc' }}>{n.message}</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#a2d149', textAlign: 'right' }}>{n.date}</p>
                                    </div>
                                ))}

                                {profile?.endDate && (() => {
                                    const today = new Date();
                                    const end = new Date(profile.endDate);
                                    const diffTime = end.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    if (diffDays >= 0 && diffDays <= 3) {
                                        return (
                                            <div style={{ background: '#2d1a10', borderLeft: '3px solid #fb923c', padding: '10px', borderRadius: '4px' }}>
                                                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#fb923c' }}>⚠️ Vencimiento de Plan</p>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#ccc' }}>
                                                    Tu plan expira {diffDays === 0 ? 'HOY' : `en ${diffDays} días`}. Por favor, contacta a tu coach para renovar.
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {profile?.controlDate && (() => {
                                    const today = new Date();
                                    const control = new Date(profile.controlDate);
                                    const diffDays = Math.ceil((control.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                    if (diffDays === 1) {
                                        return (
                                            <div style={{ background: '#eff6ff', borderLeft: '3px solid #3b82f6', padding: '10px', borderRadius: '4px' }}>
                                                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#1d4ed8' }}>📅 Recordatorio de Control</p>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#1e40af' }}>
                                                    Mañana es tu día de control. ¡Prepárate para registrar tus progresos!
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {notifications.length === 0 && (!profile || (() => {
                                    const today = new Date();
                                    const end = new Date(profile.endDate);
                                    const diffDaysEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                    const control = new Date(profile.controlDate);
                                    const diffDaysControl = Math.ceil((control.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                    return (diffDaysEnd < 0 || diffDaysEnd > 3) && (diffDaysControl !== 1);
                                })()) && (
                                        <p style={{ margin: 0, fontSize: '12px', color: '#666', textAlign: 'center', padding: '10px 0' }}>No tienes notificaciones pendientes.</p>
                                    )}
                            </div>
                        </div>
                    )}
                </div>
                <img src={logoBody2} alt="Logo" style={{ width: 150, borderRadius: 15, marginBottom: 15, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, letterSpacing: '-1px' }}>BODY <span style={{ color: '#a2d149' }}>LOGIC</span></h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: '#fff', textTransform: 'uppercase' }}>Resultados diseñados a tu medida</p>
                <p style={{ margin: '10px 0 0 0', fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: '#a2d149', textTransform: 'uppercase' }}>PLAN DE ENTRENAMIENTO PERSONALIZADO</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#ccc' }}>Hola, {user?.name}</p>
            </div>

            {/* Container Principal */}
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px', position: 'relative' }}>
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: `url(${logoBody2})`, backgroundRepeat: 'repeat', backgroundSize: '180px',
                    opacity: 0.12, pointerEvents: 'none', zIndex: 0
                }} />

                {routineDays.length === 0 ? (
                    <div style={{ background: '#fff', padding: 40, borderRadius: 16, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1, marginTop: 40 }}>
                        <h3 style={{ color: '#a2d149' }}>Aún no tienes rutinas asignadas</h3>
                        <p style={{ color: '#666' }}>Tu coach publicará tu plan aquí pronto.</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', zIndex: 1, marginTop: 20 }}>
                        {/* Coach Info Panel - Dark Sleek Version */}
                        <div style={{ marginBottom: 15 }}>
                            <button
                                onClick={() => setShowCoachInfo(!showCoachInfo)}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #1b3022 0%, #2d4739 100%)',
                                    color: '#fff',
                                    padding: '15px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                                    letterSpacing: '1px'
                                }}
                            >
                                👔 Tu Coach {coach?.name || '—'}
                                {showCoachInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {showCoachInfo && (
                                <div style={{
                                    background: '#fff',
                                    padding: '30px',
                                    borderRadius: '0 0 16px 16px',
                                    border: '2px solid #111',
                                    borderTop: 'none',
                                    marginTop: '-5px',
                                    animation: 'fadeIn 0.3s ease-out',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                                }}>
                                    <h3 style={{ color: '#a2d149', fontSize: '24px', fontWeight: 900, marginBottom: '15px', textTransform: 'uppercase' }}>¡Hola, {user?.name}!</h3>
                                    <p style={{ fontSize: '15px', color: '#1b3022', lineHeight: '1.7', marginBottom: '30px', fontWeight: 500 }}>
                                        <strong style={{ color: '#111', fontWeight: 900 }}>Soy {coach?.name || 'tu coach'}, tu entrenador personal.</strong> Mi trabajo se trata de ser tu guía, tu motivador y tu mayor apoyo en este camino. Estoy aquí para ofrecerte el conocimiento y la dedicación que necesitas para transformar tu cuerpo y tu mente. Mi enfoque es totalmente personalizado, garantizando que cada plan esté diseñado para tus objetivos únicos, tus capacidades y tu estilo de vida.
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
                                        <div style={{ paddingLeft: '20px', borderLeft: '5px solid #a2d149' }}>
                                            <h4 style={{ color: '#a2d149', fontSize: '18px', fontWeight: 900, marginBottom: '10px' }}>MISIÓN</h4>
                                            <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.6', margin: 0 }}>
                                                Empoderar a las personas a través del ejercicio y el conocimiento, creando planes inteligentes que no solo construyan un cuerpo fuerte, sino también una mentalidad resiliente y segura.
                                            </p>
                                        </div>
                                        <div style={{ paddingLeft: '20px', borderLeft: '5px solid #a2d149' }}>
                                            <h4 style={{ color: '#a2d149', fontSize: '18px', fontWeight: 900, marginBottom: '10px' }}>VISIÓN</h4>
                                            <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.6', margin: 0 }}>
                                                Ser el catalizador del cambio, ayudando a alcanzar un bienestar físico y mental sostenible, convirtiendo la disciplina en un hábito.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Athlete Data Panel - Gold Version */}
                        {profile && (
                            <div style={{ marginBottom: 15 }}>
                                <button
                                    onClick={() => setShowProfile(!showProfile)}
                                    style={{
                                        width: '100%',
                                        background: 'linear-gradient(135deg, #a2d149 0%, #a38210 100%)',
                                        color: '#fff',
                                        padding: '15px 20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        border: 'none',
                                        borderRadius: 12,
                                        fontWeight: 900,
                                        fontSize: '14px',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(162, 209, 73, 0.2)',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    👤 Mi Perfil
                                    {showProfile ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>

                                {showProfile && (
                                    <div style={{
                                        background: '#fff',
                                        padding: '25px',
                                        borderRadius: '0 0 16px 16px',
                                        border: '2px solid #a2d149',
                                        borderTop: 'none',
                                        marginTop: '-5px',
                                        animation: 'fadeIn 0.3s ease-out',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                                            <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block' }}>Objetivo</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{profile.goal}</span>
                                            </div>
                                            <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block' }}>Peso Actual</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{profile.weight} kg</span>
                                            </div>
                                            <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block' }}>Tipo de Plan</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{profile.planType}</span>
                                            </div>
                                            <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block' }}>Inicio del Plan</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{profile.startDate}</span>
                                            </div>
                                            <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block' }}>Final del Plan</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{profile.endDate}</span>
                                            </div>
                                            <div style={{ padding: '10px', background: '#ebf5ff', borderRadius: '10px', border: '1px solid #71a5cb' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#1e40af', fontWeight: 800, display: 'block' }}>Próximo Control</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>{profile.controlDate}</span>
                                            </div>
                                        </div>

                                        {/* History Button */}
                                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => setShowWeightHistory(true)}
                                                style={{
                                                    background: '#111',
                                                    color: '#a2d149',
                                                    padding: '10px 25px',
                                                    borderRadius: '50px',
                                                    border: '2px solid #a2d149',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    textTransform: 'uppercase',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.3s',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.background = '#a2d149';
                                                    e.currentTarget.style.color = '#fff';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.background = '#111';
                                                    e.currentTarget.style.color = '#a2d149';
                                                }}
                                            >
                                                <History size={16} /> Ver Histórico de Peso
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Weight History Modal */}
                        {showWeightHistory && (
                            <div style={{
                                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                background: 'rgba(0,0,0,0.8)', zIndex: 1000,
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
                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                            Registrado automáticamente con cada actualización
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Protocol and Recommendations - New Expandable Version */}
                        <div style={{ marginBottom: 25 }}>
                            <button
                                onClick={() => setShowRecommendations(!showRecommendations)}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #b91b1b 0%, #7f1d1d 100%)',
                                    color: '#fff',
                                    padding: '15px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(185, 27, 27, 0.2)',
                                    letterSpacing: '1px'
                                }}
                            >
                                📋 Protocolo de Reglas y Recomendaciones
                                {showRecommendations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {showRecommendations && (
                                <div style={{
                                    background: '#fff',
                                    padding: '30px 20px',
                                    borderRadius: '0 0 16px 16px',
                                    border: '2px solid #b91b1b',
                                    borderTop: 'none',
                                    marginTop: '-5px',
                                    animation: 'fadeIn 0.3s ease-out',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #71a5cb' }}>
                                                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>1. Calentamiento Activo</strong>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>Realiza 10 minutos de movilidad articular enfocada en los grupos musculares del día antes de comenzar.</p>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #71a5cb' }}>
                                                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>2. Prioridad Técnica Absoluta</strong>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>La técnica siempre prevalece sobre el peso. Si no puedes mantener la forma estricta, reduce la carga.</p>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #71a5cb' }}>
                                                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>3. Sobrecarga Progresiva</strong>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>Inicia con cargas que domines y apúntalas. Progresa subiendo peso o repeticiones solo cuando la técnica sea perfecta.</p>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #71a5cb' }}>
                                                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>4. Hidratación Estratégica</strong>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>Mantente hidratado bebiendo cada 15-20 minutos durante la sesión.</p>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #71a5cb' }}>
                                                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>5. Recuperación Indispensable</strong>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>Respeta los descansos pautados en la rutina. El trabajo muscular real se procesa mientras descansas.</p>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #71a5cb' }}>
                                                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>6. Enfriamiento (Cool-down)</strong>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>Al terminar la rutina, tómate 5 minutos para estirar estáticamente y estabilizar el ritmo cardíaco.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px', textAlign: 'center', border: '1px dashed #ef4444', color: '#b91b1b', padding: '15px', borderRadius: '12px', fontSize: '12px', background: '#fff9f9', fontWeight: '700' }}>
                                        ⚠️ Ante cualquier molestia importante, detén el ejercicio y envíame un mensaje de inmediato.
                                    </div>
                                </div>
                            )}
                        </div>


                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: '25px 0 15px 0', color: '#111', textAlign: 'center' }}>Tu Semana de Entrenamiento</h2>

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
            </div>

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
                    borderRadius: 20,
                    padding: '20px 32px',
                    textAlign: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <p style={{
                        fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
                        color: '#64748b', fontWeight: 800, margin: '0 0 12px 0'
                    }}>
                        Síguenos en redes sociales
                    </p>
                    <a
                        href="https://www.instagram.com/jefeandrea"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            color: '#111', textDecoration: 'none',
                            fontSize: '16px', fontWeight: 900,
                            padding: '12px 24px', borderRadius: 15,
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
                        @jefeandrea
                    </a>
                </div>

                {/* Coach Contact Footer */}
                <div style={{
                    background: 'linear-gradient(135deg, #111 0%, #1b3022 100%)',
                    border: '1px solid #a2d149',
                    borderRadius: 20,
                    padding: '28px 32px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(162, 209, 73, 0.12)'
                }}>
                    <p style={{
                        fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase',
                        color: '#a2d149', fontWeight: 800, margin: '0 0 8px 0'
                    }}>
                        Contacta a tu Coach
                    </p>
                    <p style={{
                        fontSize: '20px', fontWeight: 900, color: '#fff',
                        margin: '0 0 20px 0', letterSpacing: '0.5px'
                    }}>
                        {coach?.name || '—'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                        {/* Instagram */}
                        {coach?.instagram && (
                            <a
                                href={`https://www.instagram.com/${coach.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    color: '#a2d149', textDecoration: 'none',
                                    fontSize: '14px', fontWeight: 700,
                                    background: 'rgba(162, 209, 73, 0.08)',
                                    padding: '10px 18px', borderRadius: 50,
                                    border: '1px solid rgba(162, 209, 73, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                href={`https://wa.me/${coach.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    color: '#a2d149', textDecoration: 'none',
                                    fontSize: '14px', fontWeight: 700,
                                    background: 'rgba(162, 209, 73, 0.08)',
                                    padding: '10px 18px', borderRadius: 50,
                                    border: '1px solid rgba(162, 209, 73, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            `}</style>
        </div>
    );
};

export default ClientRoutine;
