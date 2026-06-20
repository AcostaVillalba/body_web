import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, ChevronUp, History, X, Bell, Menu, User, Award, Info, BookOpen, ArrowLeft, Play } from 'lucide-react';
import logoBody2 from '../assets/logobody2.png';
import { EXERCISES_DB, getImageUrl } from '../data';
import { getExerciseBenefits } from '../data/exerciseBenefits';
import ExerciseImage from '../components/ExerciseImage';
import AvatarUpload from '../components/AvatarUpload';
import InfoModal from '../components/InfoModal';
import API_URL from '../api';

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const formatDateSpanish = (dateObj: Date) => {
    const day = dateObj.getDate();
    const month = MONTH_NAMES_SHORT[dateObj.getMonth()];
    return `${day} ${month}`;
};

const ClientRoutine = () => {
    const { user, token, logout, setIsLoading } = useAuth();
    const [routineDays, setRoutineDays] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDay, setOpenDay] = useState<string | null>(null);
    const [showWeightHistory, setShowWeightHistory] = useState(false);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [weightFilter, setWeightFilter] = useState<'month' | 'year'>('month');
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [coach, setCoach] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'routine' | 'profile' | 'coach' | 'rules'>('routine');
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [activeInfoExercise, setActiveInfoExercise] = useState<string | null>(null);
    const [openProtocolRule, setOpenProtocolRule] = useState<number | null>(null);

    // Streak & Badges State
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingDayName, setRatingDayName] = useState<string | null>(null);
    const [selectedStars, setSelectedStars] = useState(0);
    const [submittingRating, setSubmittingRating] = useState(false);
    const [ratingSuccess, setRatingSuccess] = useState(false);
    const [hoveredStars, setHoveredStars] = useState(0);
    const [streakData, setStreakData] = useState<any>({
        streak: 0,
        total_workouts: 0,
        badge: 'Ninguna',
        next_badge: 'Bronce',
        next_badge_target: 5,
        progress_message: '¡Completa tu rutina de hoy para poner en marcha tu racha y conseguir tu primera medalla! 🚀'
    });

    const fetchStreak = async () => {
        try {
            const res = await fetch(`${API_URL}/api/client/workouts/streak`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStreakData(data);
            }
        } catch (err) {
            console.error("Failed to load streak data", err);
        }
    };

    const handleCompleteWorkout = async () => {
        if (!ratingDayName || selectedStars < 1 || selectedStars > 5) return;
        setSubmittingRating(true);
        try {
            const res = await fetch(`${API_URL}/api/client/workouts/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    day_name: ratingDayName,
                    stars: selectedStars
                })
            });
            if (res.ok) {
                setRatingSuccess(true);
                fetchStreak();
                setTimeout(() => {
                    setShowRatingModal(false);
                    setRatingSuccess(false);
                    setSelectedStars(0);
                    setOpenDay(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 1500);
            } else {
                alert("Error al registrar el entrenamiento. Inténtalo de nuevo.");
            }
        } catch (err) {
            console.error("Error completing workout", err);
            alert("Error de conexión. Inténtalo de nuevo.");
        } finally {
            setSubmittingRating(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchStreak();
        }
    }, [token]);

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
                setIsLoading(false); // Disable global loading screen
            }
        };

        fetchRoutine();
    }, [token, setIsLoading]);

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

    // Reset active info popup when changing step or day
    useEffect(() => {
        setActiveInfoExercise(null);
    }, [openDay, currentStep]);

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

    const getMedalColor = (medalName: string) => {
        switch (medalName) {
            case 'Bronce': return { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', icon: '🥉' };
            case 'Plata': return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', icon: '🥈' };
            case 'Oro': return { bg: '#fefcbf', border: '#facc15', text: '#a16207', icon: '🥇' };
            case 'Zafiro': return { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', icon: '🔷' };
            case 'Rubí': return { bg: '#fff1f2', border: '#fda4af', text: '#be123c', icon: '♦️' };
            case 'Esmeralda': return { bg: '#f0fdf4', border: '#86efac', text: '#15803d', icon: '🟢' };
            case 'Amatista': return { bg: '#faf5ff', border: '#d8b4fe', text: '#7e22ce', icon: '🔮' };
            case 'Perla': return { bg: '#fdf8f6', border: '#fed7aa', text: '#7c2d12', icon: '⚪' };
            case 'Obsidiana': return { bg: '#f4f4f5', border: '#a1a1aa', text: '#09090b', icon: '🖤' };
            case 'Diamante': return { bg: '#ecfeff', border: '#67e8f9', text: '#0e7490', icon: '💎' };
            default: return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', icon: '⭐' };
        }
    };

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9', color: '#111' }}><h3>Cargando tu plan...</h3></div>;
    }

    if (openDay) {
        const day = routineDays.find(d => d.name === openDay);
        if (!day) return null;
        const totalGroups = day.groups.length;
        const currentGroup = day.groups[currentStep];

        if (!currentGroup) {
            return (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: '#111a13', color: '#fff', zIndex: 1500,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <button
                        onClick={() => setOpenDay(null)}
                        style={{
                            position: 'absolute', top: 20, left: 20,
                            background: 'rgba(255,255,255,0.08)', border: 'none',
                            borderRadius: '50%', width: 44, height: 44,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h3 style={{ color: '#a2d149' }}>No hay ejercicios registrados en este día.</h3>
                </div>
            );
        }

        const isBiserie = currentGroup.exercises.length > 1;

        return (
            <div style={{
                background: 'linear-gradient(135deg, #111a13 0%, #0c100d 100%)',
                color: '#fff',
                minHeight: '100vh',
                fontFamily: "'Montserrat', sans-serif",
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(20, 30, 24, 0.95)',
                    backdropFilter: 'blur(10px)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10
                }}>
                    <button
                        onClick={() => setOpenDay(null)}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <h2 style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 900,
                        letterSpacing: '1px',
                        color: '#a2d149',
                        textAlign: 'center',
                        textTransform: 'uppercase'
                    }}>
                        {openDay}
                    </h2>
                    <div style={{ width: 32 }} />
                </div>

                {/* Exercise Content Area */}
                <div style={{
                    padding: '80px 8px 140px 8px', // Clear fixed header and footer
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'calc(100vh - 220px)',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '680px',
                        background: 'rgba(24, 38, 30, 0.75)',
                        border: '1.5px solid rgba(162, 209, 73, 0.25)',
                        borderRadius: '24px',
                        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(12px)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Card Sub-Header */}
                        {isBiserie && (
                            <div style={{ display: 'flex', height: '42px', alignItems: 'stretch' }}>
                                <div style={{
                                    background: '#a2d149',
                                    color: '#000',
                                    flex: 1,
                                    padding: 8,
                                    fontWeight: 900,
                                    fontSize: '10px',
                                    letterSpacing: '1.5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textTransform: 'uppercase'
                                }}>
                                    🔥 BISERIE / SUPER SERIE
                                </div>
                            </div>
                        )}

                        {/* Exercises List */}
                        <div style={{
                            padding: '16px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            {currentGroup.exercises.map((ex: any, idx: number) => {
                                const currentImgUrl = getImageUrl(ex.name) || '';
                                return (
                                    <div key={ex.id} style={{
                                        animation: 'slideIn 0.4s ease-out',
                                        borderBottom: (isBiserie && idx < currentGroup.exercises.length - 1) ? '2px dashed rgba(255,255,255,0.1)' : 'none',
                                        paddingBottom: (isBiserie && idx < currentGroup.exercises.length - 1) ? '25px' : '0',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 8,
                                                    width: '100%'
                                                }}>
                                                    {getMuscleGroup(ex.name) ? (
                                                        <span style={{
                                                            fontSize: '9px',
                                                            fontWeight: 900,
                                                            letterSpacing: '1px',
                                                            textTransform: 'uppercase',
                                                            color: '#a2d149',
                                                            background: 'rgba(162, 209, 73, 0.12)',
                                                            padding: '3px 8px',
                                                            borderRadius: 20,
                                                            border: '1px solid rgba(162, 209, 73, 0.2)'
                                                        }}>
                                                            {getMuscleGroup(ex.name)}
                                                        </span>
                                                    ) : <div />}
                                                    
                                                    {/* Botón de información estilo Deep Tech */}
                                                    <button
                                                        onClick={() => setActiveInfoExercise(activeInfoExercise === ex.name ? null : ex.name)}
                                                        style={{
                                                            background: activeInfoExercise === ex.name ? '#a2d149' : 'rgba(162, 209, 73, 0.15)',
                                                            border: '1px solid rgba(162, 209, 73, 0.4)',
                                                            borderRadius: '50%',
                                                            width: '26px',
                                                            height: '26px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: activeInfoExercise === ex.name ? '#000' : '#a2d149',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: activeInfoExercise === ex.name ? '0 0 10px rgba(162,209,73,0.5)' : 'none',
                                                            padding: 0
                                                        }}
                                                        onMouseOver={e => {
                                                            if (activeInfoExercise !== ex.name) {
                                                                e.currentTarget.style.background = 'rgba(162, 209, 73, 0.3)';
                                                                e.currentTarget.style.transform = 'scale(1.08)';
                                                            }
                                                        }}
                                                        onMouseOut={e => {
                                                            if (activeInfoExercise !== ex.name) {
                                                                e.currentTarget.style.background = 'rgba(162, 209, 73, 0.15)';
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                            }
                                                        }}
                                                    >
                                                        <Info size={13} />
                                                    </button>
                                                </div>
                                                <div style={{
                                                    fontWeight: 900,
                                                    fontSize: '16px',
                                                    color: '#fff',
                                                    marginBottom: 8,
                                                    textTransform: 'uppercase',
                                                    lineHeight: 1.2,
                                                    textAlign: 'center'
                                                }}>
                                                    {isBiserie ? (idx === 0 ? 'A. ' : 'B. ') : ''}{ex.name}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                                                    <div style={{
                                                        background: 'rgba(162, 209, 73, 0.2)',
                                                        border: '1.5px solid rgba(162, 209, 73, 0.45)',
                                                        color: '#fff',
                                                        padding: '6px 16px',
                                                        borderRadius: 30,
                                                        fontWeight: 800,
                                                        fontSize: '13px'
                                                    }}>
                                                        {ex.reps === "MIN" ? `${ex.series} Minutos` : `${ex.series} Series x ${ex.reps} Reps`}
                                                    </div>
                                                </div>
                                                {ex.note && (
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#cbd5e1',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        padding: '8px 12px',
                                                        borderRadius: 8,
                                                        borderLeft: '4px solid #a2d149',
                                                        fontWeight: 500,
                                                        lineHeight: 1.4
                                                    }}>
                                                        {ex.note}
                                                    </div>
                                                )}
                                            </div>

                                            {currentImgUrl && (
                                                <div style={{
                                                    width: '100%',
                                                    borderRadius: 16,
                                                    overflow: 'hidden',
                                                    background: '#000',
                                                    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                                                    border: '1px solid rgba(255,255,255,0.08)'
                                                }}>
                                                    <ExerciseImage src={currentImgUrl} alt={ex.name} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Rest Message */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            color: '#94a3b8',
                            textAlign: 'center',
                            padding: '8px 10px',
                            fontWeight: 800,
                            fontSize: '9px',
                            letterSpacing: '1px',
                            borderTop: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            ⌛ 3 MINUTOS DE DESCANSO DESPUÉS DE ESTE BLOQUE
                        </div>
                    </div>
                </div>

                {/* Bottom Actions Sticky Footer */}
                <div style={{
                    background: 'rgba(16, 24, 20, 0.97)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: '15px 20px',
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    alignItems: 'center',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    {/* Controls buttons */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        width: '100%',
                        maxWidth: '600px'
                    }}>
                        <button
                            disabled={currentStep === 0}
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            style={{
                                flex: 1,
                                padding: '12px 10px',
                                background: currentStep === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                                color: currentStep === 0 ? '#64748b' : '#fff',
                                border: '1.5px solid',
                                borderColor: currentStep === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.2)',
                                borderRadius: 12,
                                fontWeight: 900,
                                fontSize: '11px',
                                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Anterior
                        </button>

                        <span style={{
                            fontWeight: 900,
                            fontSize: '14px',
                            color: '#fff',
                            minWidth: '35px',
                            textAlign: 'center',
                            letterSpacing: '0.5px'
                        }}>
                            {currentStep + 1}/{totalGroups}
                        </span>

                        <button
                            onClick={() => {
                                if (currentStep === totalGroups - 1) {
                                    setRatingDayName(day.name);
                                    setSelectedStars(0);
                                    setHoveredStars(0);
                                    setShowRatingModal(true);
                                } else {
                                    setCurrentStep(prev => prev + 1);
                                }
                            }}
                            style={{
                                flex: 1,
                                padding: '12px 10px',
                                background: currentStep === totalGroups - 1 ? '#a2d149' : '#2d4739',
                                color: currentStep === totalGroups - 1 ? '#000' : '#fff',
                                border: 'none',
                                borderRadius: 12,
                                fontWeight: 900,
                                fontSize: '11px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: currentStep === totalGroups - 1 
                                    ? '0 6px 20px rgba(162, 209, 73, 0.35)' 
                                    : '0 6px 20px rgba(45, 71, 57, 0.35)',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {currentStep === totalGroups - 1 ? 'Finalizar' : 'Siguiente'}
                        </button>
                    </div>

                    {/* Progress Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        {day.groups.map((_: any, idx: number) => (
                            <div key={idx} style={{
                                width: idx === currentStep ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                background: idx === currentStep ? '#a2d149' : 'rgba(255,255,255,0.2)',
                                transition: 'all 0.3s'
                            }} />
                        ))}
                    </div>
                </div>

                {/* Biomechanical Benefits Modal */}
                {activeInfoExercise && (() => {
                    const activeEx = currentGroup.exercises.find((ex: any) => ex.name === activeInfoExercise);
                    if (!activeEx) return null;
                    const benefits = getExerciseBenefits(activeEx.name, getMuscleGroup(activeEx.name));
                    return (
                        <div 
                            onClick={() => setActiveInfoExercise(null)}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0, 0, 0, 0.65)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                zIndex: 2000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px',
                                animation: 'fadeIn 0.2s ease-out'
                            }}
                        >
                            <div 
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '90%',
                                    maxWidth: '340px',
                                    background: 'rgba(248, 250, 249, 0.85)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    borderRadius: '20px',
                                    border: '1.5px solid rgba(162, 209, 73, 0.4)',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                                    animation: 'scaleIn 0.2s ease-out'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid rgba(45, 71, 57, 0.15)',
                                    paddingBottom: '8px',
                                    marginBottom: '12px'
                                }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        color: '#1a3325',
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase'
                                    }}>
                                        Beneficios Clave
                                    </span>
                                    <button
                                        onClick={() => setActiveInfoExercise(null)}
                                        style={{
                                            background: 'rgba(0,0,0,0.08)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#000',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    {benefits.map((benefit, bIdx) => (
                                        <div key={bIdx} style={{
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'flex-start'
                                        }}>
                                            <span style={{
                                                color: '#1a3325',
                                                fontWeight: 900,
                                                fontSize: '12px',
                                                marginTop: '2px'
                                            }}>
                                                ●
                                            </span>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '11px',
                                                color: '#112217',
                                                lineHeight: '1.4',
                                                fontWeight: 700,
                                                textAlign: 'left'
                                            }}>
                                                {benefit}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Rating Modal */}
                {showRatingModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            background: '#fff', width: '90%', maxWidth: '400px',
                            borderRadius: '24px', padding: '30px 20px', textAlign: 'center',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative'
                        }}>
                            {!ratingSuccess ? (
                                <>
                                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#2d4739', margin: '0 0 10px 0' }}>
                                        ¡ENTRENAMIENTO COMPLETADO! 🎉
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, margin: '0 0 25px 0' }}>
                                        Puntúa la rutina de hoy para activar tu racha y guardar tu progreso.
                                    </p>
                                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 15px 0' }}>
                                        ¿Cuántas estrellas le das a la rutina?
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setSelectedStars(star)}
                                                onMouseEnter={() => setHoveredStars(star)}
                                                onMouseLeave={() => setHoveredStars(0)}
                                                style={{
                                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                                    fontSize: '36px', color: (hoveredStars || selectedStars) >= star ? '#facc15' : '#e2e8f0',
                                                    transition: 'transform 0.1s, color 0.1s',
                                                    transform: (hoveredStars || selectedStars) >= star ? 'scale(1.15)' : 'scale(1)'
                                                }}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            type="button"
                                            disabled={submittingRating}
                                            onClick={() => setShowRatingModal(false)}
                                            style={{
                                                flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569',
                                                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={selectedStars === 0 || submittingRating}
                                            onClick={handleCompleteWorkout}
                                            style={{
                                                flex: 2, padding: '12px',
                                                background: selectedStars === 0 ? '#cbd5e1' : '#a2d149',
                                                color: '#fff', border: 'none', borderRadius: '12px',
                                                fontWeight: 800, fontSize: '13px',
                                                cursor: selectedStars === 0 ? 'not-allowed' : 'pointer',
                                                boxShadow: selectedStars === 0 ? 'none' : '0 8px 16px rgba(162, 209, 73, 0.25)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {submittingRating ? 'Guardando...' : 'Enviar Calificación'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '20px 0' }}>
                                    <div style={{
                                        fontSize: '60px', color: '#10b981', marginBottom: '20px',
                                        animation: 'scaleIn 0.3s ease-out'
                                    }}>
                                        ✓
                                    </div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', margin: '0 0 10px 0' }}>
                                        ¡Excelente Trabajo!
                                    </h3>
                                    <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, margin: 0 }}>
                                        Tu racha ha sido actualizada. ¡A seguir con toda! 🔥
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
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
                        className="compact-mobile"
                        style={{
                            background: '#333', color: '#f87171', border: 'none',
                            padding: '8px 16px', borderRadius: 10, fontSize: '11px',
                            fontWeight: 800, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: 8, transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#444'}
                        onMouseOut={e => e.currentTarget.style.background = '#333'}
                    >
                        <LogOut size={14} /> <span className="hide-mobile">SALIR</span>
                    </button>
                </div>
            </div>

            {/* SIDEBAR MENU */}
            {isMenuOpen && (
                <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, backdropFilter: 'blur(4px)' }} />
            )}
            <div style={{
                position: 'fixed', top: '70px', left: isMenuOpen ? 0 : '-320px', width: '280px', maxWidth: '85vw', height: 'calc(100vh - 70px)',
                background: '#fff', zIndex: 1200, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '4px 0 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', padding: '20px 0', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 20px' }}>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        style={{
                            background: '#f1f5f9', border: 'none', width: 40, height: 40, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            color: '#2d4739', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>
                <div style={{
                    padding: '15px 20px',
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

                <div style={{ flex: 1, padding: '20px 15px', overflowY: 'auto' }}>
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
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
                                marginBottom: '4px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: '11px', transition: 'all 0.2s', textAlign: 'left',
                                background: activeTab === tab.id ? '#f0fdf4' : 'transparent',
                                color: activeTab === tab.id ? '#2d4739' : '#64748b',
                                borderLeft: activeTab === tab.id ? '4px solid #a2d149' : '4px solid transparent'
                            }}>
                            <span style={{ color: activeTab === tab.id ? '#a2d149' : 'inherit' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}

                    {/* New INFO Item */}
                    <button
                        onClick={() => { setIsInfoModalOpen(true); setIsMenuOpen(false); }}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 16px',
                            marginTop: '12px',
                            borderRadius: '12px',
                            border: '2px solid rgba(162, 209, 73, 0.2)',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '11px',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            background: 'rgba(162, 209, 73, 0.05)',
                            color: '#a2d149'
                        }}>
                        <Info size={20} />
                        INFORMACIÓN
                    </button>
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
                                    <div key={day.name} style={{ marginBottom: 10 }}>
                                        <button
                                            onClick={() => setOpenDay(day.name)}
                                            style={{
                                                width: '100%',
                                                background: '#fff',
                                                color: '#111',
                                                padding: '10px 16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.borderColor = '#a2d149';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(162,209,73,0.08)';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
                                            }}
                                        >
                                            <span style={{ fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', color: '#111', letterSpacing: '0.5px' }}>
                                                {day.name}
                                            </span>
                                            <div style={{
                                                background: '#f0fdf4',
                                                color: '#2d4739',
                                                border: '1.5px solid rgba(162, 209, 73, 0.3)',
                                                borderRadius: '20px',
                                                padding: '6px 12px',
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                boxShadow: '0 2px 4px rgba(162,209,73,0.06)'
                                            }}>
                                                <Play size={10} fill="#2d4739" />
                                                ENTRENAR
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'profile' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 15px 0', color: '#111', textAlign: 'center' }}>Mi Perfil de Atleta</h2>
                        <div style={{
                            background: '#fff', padding: '30px', borderRadius: '24px', border: '2px solid #a2d149', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#a2d149', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, margin: '0 auto 10px' }}>
                                    {user?.name?.[0].toUpperCase()}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>{user?.name}</h3>
                                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: 10, fontWeight: 500 }}>{user?.email}</p>
                            </div>

                            {profile ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                    <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 3 }}>Objetivo Principal</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#111' }}>{profile.goal}</span>
                                    </div>
                                    <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 3 }}>Peso Actual</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#111' }}>{profile.weight} kg</span>
                                    </div>
                                    <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 3 }}>Suscripción</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#111' }}>{profile.planType}</span>
                                    </div>
                                    <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 3 }}>Inicio de Plan</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#111' }}>{profile.startDate}</span>
                                    </div>
                                    <div style={{ padding: '10px', background: '#fcfaf2', borderRadius: '10px', border: '1px solid #f2e3b3' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a38210', fontWeight: 800, display: 'block', marginBottom: 3 }}>Vencimiento</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#111' }}>{profile.endDate}</span>
                                    </div>
                                    <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#1e40af', fontWeight: 800, display: 'block', marginBottom: 3 }}>Próximo Control</span>
                                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#1e40af' }}>{profile.controlDate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Aún no tienes un perfil de plan activo.</p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Tu coach registrará tus datos pronto.</p>
                                </div>
                            )}

                            {/* Medals & Streaks Section */}
                            <div style={{
                                marginTop: '25px', padding: '20px', background: '#f8fafc',
                                border: '1px solid #e2e8f0', borderRadius: '16px',
                                display: 'flex', flexDirection: 'column', gap: '15px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '28px', display: 'inline-block', animation: streakData.streak > 0 ? 'pulse 1.5s infinite' : 'none' }}>🔥</span>
                                        <div>
                                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block', letterSpacing: '0.5px' }}>Racha Activa</span>
                                            <span style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>
                                                {streakData.streak} {streakData.streak === 1 ? 'Día' : 'Días'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {streakData.badge !== 'Ninguna' && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            background: getMedalColor(streakData.badge).bg,
                                            border: `1px solid ${getMedalColor(streakData.badge).border}`,
                                            color: getMedalColor(streakData.badge).text,
                                            padding: '8px 16px', borderRadius: '14px', fontWeight: 900, fontSize: '12px',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                                        }}>
                                            <span style={{ fontSize: '18px' }}>{getMedalColor(streakData.badge).icon}</span>
                                            Medalla de {streakData.badge}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{
                                    fontSize: '12px', fontWeight: 700, color: streakData.streak === 0 ? '#92400e' : '#166534',
                                    background: streakData.streak === 0 ? '#fffbeb' : '#f0fdf4',
                                    border: streakData.streak === 0 ? '1px solid #fef3c7' : '1px solid #dcfce7',
                                    borderRadius: '12px', padding: '12px 15px', display: 'flex', alignItems: 'flex-start', gap: '10px',
                                    lineHeight: '1.4', textAlign: 'left'
                                }}>
                                    <span style={{ fontSize: '16px' }}>{streakData.streak === 0 ? '💡' : '🏆'}</span>
                                    <span>{streakData.progress_message}</span>
                                </div>
                            </div>

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
                                {coach?.profile_picture_url ? (
                                    <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto 15px', border: '4px solid #a2d149', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                        <img src={coach.profile_picture_url} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#2d4739', color: '#a2d149', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, margin: '0 auto 15px' }}>
                                        {coach?.name?.[0].toUpperCase() || 'C'}
                                    </div>
                                )}
                                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{coach?.name || 'Tu Coach'}</h3>
                                <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: 14 }}>Entrenador Certificado Body Logic</p>
                            </div>

                            <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8', marginBottom: '30px', textAlign: 'center', fontStyle: 'italic' }}>
                                "{coach?.presentation || "Mi misión es guiarte hacia tu mejor versión, utilizando ciencia y disciplina para alcanzar tus metas de forma sostenible."}"
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', borderTop: '4px solid #a2d149' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2d4739', fontWeight: 800, fontSize: 14 }}>MISIÓN</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{coach?.mission || "Empoderar a través del ejercicio y crear planes inteligentes para una mentalidad resiliente."}</p>
                                </div>
                                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', borderTop: '4px solid #a2d149' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2d4739', fontWeight: 800, fontSize: 14 }}>VISIÓN</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{coach?.vision || "Ser el catalizador del cambio y ayudar a alcanzar un bienestar físico y mental sostenible."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 20px 0', color: '#111', textAlign: 'center' }}>Protocolo de Entrenamiento</h2>
                        <div style={{
                            background: '#fff', padding: '24px 20px', borderRadius: '24px', border: '2px solid #2d4739', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { 
                                        title: '1. Calentamiento Neuromuscular y Movilidad Dinámica', 
                                        desc: 'No se limita a "cardio suave". Dedica 8-10 minutos a realizar movilidad articular dinámica enfocada en los patrones de movimiento del día. Esto disminuye la viscosidad del líquido sinovial, eleva la temperatura intraarticular y activa los propioceptores (órganos tendinosos de Golgi y husos musculares). Prepara el sistema nervioso central (SNC) para el reclutamiento de unidades motoras de alto umbral y previene cizallamientos lesivos bajo carga.' 
                                    },
                                    { 
                                        title: '2. Ejecución Técnica y Alineación Biomecánica', 
                                        desc: 'La técnica estricta direcciona la tensión mecánica al vientre muscular objetivo (muscle target) y evita la sobrecarga en estructuras pasivas (tendones, ligamentos y cápsulas articulares). Respeta el plano anatómico del movimiento, estabiliza el torque de tus articulaciones periféricas y controla el Rango de Movimiento Activo (ROM). Levantar con compensaciones solo transfiere la carga a articulaciones vulnerables.' 
                                    },
                                    { 
                                        title: '3. Sobrecarga Progresiva Controlada', 
                                        desc: 'La tensión mecánica es la variable reina en la hipertrofia miofibrilar. Sin embargo, solo debes incrementar el peso, volumen o tempo (segundos bajo tensión) cuando seas capaz de dominar el peso actual con una técnica impecable tanto en la fase excéntrica como concéntrica. Si necesitas usar inercia o balanceo para completar una repetición, la serie ha terminado.' 
                                    },
                                    { 
                                        title: '4. Hidratación Celular y Equilibrio Electrolítico', 
                                        desc: 'Una caída de tan solo un 2% en tu nivel de hidratación reduce drásticamente la fuerza contráctil y la velocidad de conducción nerviosa debido a la pérdida de turgencia celular. Consume pequeños sorbos de agua u oligoelementos cada 15-20 minutos durante la sesión para mantener el volumen del citoplasma, optimizar la bomba de sodio-potasio y mitigar la fatiga periférica.' 
                                    },
                                    { 
                                        title: '5. Densidad de Estímulo y Recuperación del ATP-PC', 
                                        desc: 'Respeta rigurosamente los descansos indicados para cada bloque. En ejercicios multiarticulares demandantes, son necesarios de 2 a 3 minutos para permitir la resíntesis total de fosfocreatina (sistema ATP-PC) y la disipación de la fatiga del sistema nervioso central. Acortar el descanso por "sentir bombeo" limita la carga absoluta que podrás mover en las series posteriores.' 
                                    },
                                    { 
                                        title: '6. Retorno a la Homeostasis y Flexibilidad Miofascial', 
                                        desc: 'Los últimos 5 minutos deben estar dedicados a estiramientos estáticos ligeros combinados con respiración diafragmática para estimular la activación del sistema nervioso parasimpático. Esto inicia de inmediato la transición del estado catabólico al anabólico, disminuye el tono muscular residual post-esfuerzo y promueve la irrigación de sangre rica en nutrientes para acelerar la regeneración miofascial.' 
                                    },
                                ].map((rule, i) => {
                                    const isOpen = openProtocolRule === i;
                                    return (
                                        <div 
                                            key={i} 
                                            style={{ 
                                                borderRadius: '14px', 
                                                overflow: 'hidden',
                                                border: '1px solid rgba(45, 71, 57, 0.12)',
                                                background: isOpen ? 'rgba(45, 71, 57, 0.02)' : '#fff',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {/* Header Trigger */}
                                            <button
                                                onClick={() => setOpenProtocolRule(isOpen ? null : i)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    background: 'none',
                                                    border: 'none',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    outline: 'none',
                                                    borderLeft: `4px solid ${isOpen ? '#a2d149' : 'rgba(45, 71, 57, 0.25)'}`,
                                                    transition: 'border-left 0.2s ease'
                                                }}
                                            >
                                                <span style={{ 
                                                    fontWeight: 800, 
                                                    fontSize: '11px', 
                                                    color: '#2d4739',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {rule.title}
                                                </span>
                                                <span style={{ color: '#2d4739', display: 'flex', alignItems: 'center' }}>
                                                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </span>
                                            </button>

                                            {/* Accordion Content */}
                                            <div style={{
                                                maxHeight: isOpen ? '300px' : '0px',
                                                overflow: 'hidden',
                                                transition: 'max-height 0.3s cubic-bezier(0, 1, 0, 1)',
                                                padding: isOpen ? '0 14px 14px 18px' : '0 14px'
                                            }}>
                                                <p style={{ 
                                                    margin: 0, 
                                                    fontSize: '10px', 
                                                    color: '#475569', 
                                                    lineHeight: '1.5',
                                                    fontWeight: 500,
                                                    textAlign: 'justify'
                                                }}>
                                                    {rule.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: '20px', textAlign: 'center', border: '2px dashed #a2d149', color: '#2d4739', padding: '12px', borderRadius: '15px', fontSize: '11px', background: 'rgba(162, 209, 73, 0.08)', fontWeight: '800' }}>
                                🚨 ANTE CUALQUIER DOLOR EXTRAÑO, DETÉN EL ENTRENAMIENTO Y AVISA A TU COACH.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Weight History Modal (Needs to be here to be on top) */}
            {showWeightHistory && (() => {
                // Filter and group weight history
                const processedData = (() => {
                    if (weightFilter === 'month') {
                        // Last 30 days
                        const now = new Date();
                        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
                        const filtered = weightHistory.filter(item => {
                            const parts = item.date.split('-');
                            const rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            return rDate >= cutoff;
                        });
                        const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
                        return sorted.map(item => {
                            const parts = item.date.split('-');
                            const rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            return {
                                label: formatDateSpanish(rDate),
                                weight: Number(item.weight),
                                originalDate: item.date,
                                notes: item.notes || 'Registro de peso'
                            };
                        });
                    } else {
                        // Last 365 days
                        const now = new Date();
                        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);
                        
                        // Group by YYYY-MM
                        const groups: { [key: string]: { weights: number[], monthIndex: number, year: number } } = {};
                        weightHistory.forEach(item => {
                            const parts = item.date.split('-');
                            const rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            if (rDate >= cutoff) {
                                const yearMonth = `${parts[0]}-${parts[1]}`;
                                if (!groups[yearMonth]) {
                                    groups[yearMonth] = {
                                        weights: [],
                                        monthIndex: rDate.getMonth(),
                                        year: rDate.getFullYear()
                                    };
                                }
                                groups[yearMonth].weights.push(Number(item.weight));
                            }
                        });

                        const sortedKeys = Object.keys(groups).sort();
                        return sortedKeys.map(key => {
                            const group = groups[key];
                            const avgWeight = group.weights.reduce((sum, val) => sum + val, 0) / group.weights.length;
                            return {
                                label: MONTH_NAMES_SHORT[group.monthIndex],
                                weight: Math.round(avgWeight * 10) / 10,
                                originalDate: `${MONTH_NAMES_SHORT[group.monthIndex]} ${group.year}`,
                                notes: `Promedio mensual (${group.weights.length} registros)`
                            };
                        });
                    }
                })();

                const filteredHistoryForCards = weightHistory.filter(item => {
                    const parts = item.date.split('-');
                    const rDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    const now = new Date();
                    const limitDays = weightFilter === 'month' ? 30 : 365;
                    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - limitDays);
                    return rDate >= cutoff;
                }).sort((a, b) => b.date.localeCompare(a.date));

                // Chart parameters
                const chartWidth = 550;
                const chartHeight = 250;
                const paddingTop = 25;
                const paddingBottom = 40;
                const paddingLeft = 45;
                const paddingRight = 25;
                const drawWidth = chartWidth - paddingLeft - paddingRight;
                const drawHeight = chartHeight - paddingTop - paddingBottom;

                const weights = processedData.map(d => d.weight);
                const maxW = weights.length > 0 ? Math.max(...weights) : 80;
                const minW = weights.length > 0 ? Math.min(...weights) : 60;
                
                const minY = Math.max(0, minW - 10);
                const maxY = maxW === minW ? minW + 10 : maxW + 10;
                
                const getX = (index: number) => {
                    if (processedData.length <= 1) return paddingLeft + drawWidth / 2;
                    return paddingLeft + (index / (processedData.length - 1)) * drawWidth;
                };

                const getY = (weight: number) => {
                    const denom = maxY - minY;
                    if (denom === 0) return paddingTop + drawHeight / 2;
                    return chartHeight - paddingBottom - ((weight - minY) / denom) * drawHeight;
                };

                let linePathStr = '';
                let areaPathStr = '';
                if (processedData.length > 1) {
                    const pts = processedData.map((d, i) => ({ x: getX(i), y: getY(d.weight) }));
                    linePathStr = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    areaPathStr = `${linePathStr} L ${pts[pts.length - 1].x} ${chartHeight - paddingBottom} L ${pts[0].x} ${chartHeight - paddingBottom} Z`;
                }
                
                const gridSteps = 3;
                const gridLines = [];
                for (let i = 0; i <= gridSteps; i++) {
                    gridLines.push(minY + (i * (maxY - minY)) / gridSteps);
                }

                return (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.8)', zIndex: 2000,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '20px', backdropFilter: 'blur(5px)'
                    }}>
                        <div style={{
                            background: '#fff', width: '100%', maxWidth: '650px',
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
                                {/* Filter Toggle Tabs */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setWeightFilter('month')}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '50px',
                                            border: 'none',
                                            fontWeight: 800,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: weightFilter === 'month' ? '#a2d149' : '#f1f5f9',
                                            color: weightFilter === 'month' ? '#fff' : '#64748b',
                                            boxShadow: weightFilter === 'month' ? '0 4px 12px rgba(162, 209, 73, 0.25)' : 'none'
                                        }}
                                    >
                                        Mes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWeightFilter('year')}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '50px',
                                            border: 'none',
                                            fontWeight: 800,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: weightFilter === 'year' ? '#a2d149' : '#f1f5f9',
                                            color: weightFilter === 'year' ? '#fff' : '#64748b',
                                            boxShadow: weightFilter === 'year' ? '0 4px 12px rgba(162, 209, 73, 0.25)' : 'none'
                                        }}
                                    >
                                        Año
                                    </button>
                                </div>

                                {/* SVG Chart Area */}
                                <div style={{ position: 'relative', width: '100%', background: '#fafafa', borderRadius: '16px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                                    {processedData.length === 0 ? (
                                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                                            No hay registros de peso en los últimos {weightFilter === 'month' ? '30 días' : '365 días'}.
                                        </div>
                                    ) : (
                                        <>
                                            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="auto" style={{ overflow: 'visible' }}>
                                                <defs>
                                                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#a2d149" stopOpacity="0.4" />
                                                        <stop offset="100%" stopColor="#a2d149" stopOpacity="0.0" />
                                                    </linearGradient>
                                                </defs>

                                                {/* Grid Lines */}
                                                {gridLines.map((val, idx) => {
                                                    const y = getY(val);
                                                    return (
                                                        <g key={idx}>
                                                            <line
                                                                x1={paddingLeft}
                                                                y1={y}
                                                                x2={chartWidth - paddingRight}
                                                                y2={y}
                                                                stroke="#e2e8f0"
                                                                strokeDasharray="4 4"
                                                            />
                                                            <text
                                                                x={paddingLeft - 8}
                                                                y={y}
                                                                textAnchor="end"
                                                                dominantBaseline="middle"
                                                                fill="#64748b"
                                                                fontSize="10"
                                                                fontWeight="700"
                                                            >
                                                                {Math.round(val)} kg
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                                {/* Area under the line */}
                                                {areaPathStr && (
                                                    <path d={areaPathStr} fill="url(#weightGrad)" />
                                                )}

                                                {/* Stroke Line */}
                                                {linePathStr && (
                                                    <path
                                                        d={linePathStr}
                                                        fill="none"
                                                        stroke="#a2d149"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                )}

                                                {/* Labels on X-axis */}
                                                {processedData.map((d, idx) => {
                                                    const x = getX(idx);
                                                    const totalLabels = processedData.length;
                                                    const showLabel = 
                                                        weightFilter === 'year' || 
                                                        totalLabels <= 8 || 
                                                        idx === 0 || 
                                                        idx === totalLabels - 1 || 
                                                        idx % Math.ceil(totalLabels / 6) === 0;

                                                    if (!showLabel) return null;

                                                    return (
                                                        <g key={idx}>
                                                            <text
                                                                x={x}
                                                                y={chartHeight - paddingBottom + 18}
                                                                textAnchor="middle"
                                                                fill="#64748b"
                                                                fontSize="9"
                                                                fontWeight="800"
                                                            >
                                                                {d.label}
                                                            </text>
                                                            <line
                                                                x1={x}
                                                                y1={chartHeight - paddingBottom}
                                                                x2={x}
                                                                y2={chartHeight - paddingBottom + 4}
                                                                stroke="#cbd5e1"
                                                            />
                                                        </g>
                                                    );
                                                })}

                                                {/* Circles on data points */}
                                                {processedData.map((d, idx) => {
                                                    const x = getX(idx);
                                                    const y = getY(d.weight);
                                                    const isHovered = hoveredPoint && hoveredPoint.index === idx;

                                                    return (
                                                        <circle
                                                            key={idx}
                                                            cx={x}
                                                            cy={y}
                                                            r={isHovered ? 7 : 4}
                                                            fill={isHovered ? "#2d4739" : "#a2d149"}
                                                            stroke="#fff"
                                                            strokeWidth={isHovered ? 2.5 : 1.5}
                                                            style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                                                            onMouseEnter={() => setHoveredPoint({ ...d, index: idx, x, y })}
                                                            onMouseLeave={() => setHoveredPoint(null)}
                                                        />
                                                    );
                                                })}
                                            </svg>

                                            {/* Floating Tooltip */}
                                            {hoveredPoint && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                                                    top: `${(hoveredPoint.y / chartHeight) * 100 - 30}px`,
                                                    transform: 'translate(-50%, -100%)',
                                                    background: '#111',
                                                    color: '#fff',
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                                                    pointerEvents: 'none',
                                                    zIndex: 10,
                                                    whiteSpace: 'nowrap',
                                                    border: '1px solid #a2d149',
                                                    textAlign: 'center',
                                                    animation: 'fadeIn 0.15s ease-out'
                                                }}>
                                                    <div style={{ color: '#a2d149', fontSize: '13px', fontWeight: 900 }}>{hoveredPoint.weight} kg</div>
                                                    <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>{hoveredPoint.originalDate}</div>
                                                    <div style={{ fontSize: '8px', opacity: 0.6, marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{hoveredPoint.notes}</div>
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-5px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        width: 0,
                                                        height: 0,
                                                        borderLeft: '5px solid transparent',
                                                        borderRight: '5px solid transparent',
                                                        borderTop: '5px solid #111'
                                                    }} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* List of cards */}
                                {filteredHistoryForCards.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No hay registros en este período.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {filteredHistoryForCards.map((item) => (
                                            <div key={item.id} style={{
                                                background: '#f8fafc', padding: '8px 15px', borderRadius: '12px',
                                                borderLeft: '4px solid #a2d149', display: 'flex',
                                                justifyContent: 'space-between', alignItems: 'center',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#a38210', textTransform: 'uppercase' }}>{item.date}</div>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#444', marginTop: '2px' }}>{item.notes || 'Registro de peso'}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#111' }}>{item.weight}<span style={{ fontSize: '11px', marginLeft: '2px', fontWeight: 800 }}>kg</span></div>
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
                );
            })()}

            {/* Footers Container */}
            <div style={{
                maxWidth: 600,
                margin: '30px auto 0 auto',
                padding: '0 20px 50px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                {/* Social Media Footer */}
                <div style={{
                    background: '#fff',
                    border: '2px solid #a2d149',
                    borderRadius: 12,
                    padding: '8px 16px',
                    textAlign: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <p style={{
                        fontSize: '7px', letterSpacing: '1.5px', textTransform: 'uppercase',
                        color: '#64748b', fontWeight: 800, margin: '0 0 6px 0'
                    }}>
                        Síguenos en redes sociales
                    </p>
                    <a
                        href="https://www.instagram.com/jefeandrea"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            color: '#111', textDecoration: 'none',
                            fontSize: '11px', fontWeight: 900,
                            padding: '4px 12px', borderRadius: 10,
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                    borderRadius: 12,
                    padding: '10px 15px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(162, 209, 73, 0.12)'
                }}>
                    <p style={{
                        fontSize: '7px', letterSpacing: '3px', textTransform: 'uppercase',
                        color: '#a2d149', fontWeight: 800, margin: '0 0 3px 0'
                    }}>
                        Contacta a tu Coach
                    </p>
                    <p style={{
                        fontSize: '13px', fontWeight: 900, color: '#fff',
                        margin: '0 0 8px 0', letterSpacing: '0.5px'
                    }}>
                        {coach?.name || '—'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {/* Instagram */}
                        {coach?.instagram && (
                            <a
                                href={`https://www.instagram.com/${String(coach.instagram).replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    color: '#a2d149', textDecoration: 'none',
                                    fontSize: '11px', fontWeight: 700,
                                    background: 'rgba(162, 209, 73, 0.08)',
                                    padding: '6px 12px', borderRadius: 50,
                                    border: '1px solid rgba(162, 209, 73, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    color: '#a2d149', textDecoration: 'none',
                                    fontSize: '11px', fontWeight: 700,
                                    background: 'rgba(162, 209, 73, 0.08)',
                                    padding: '6px 12px', borderRadius: 50,
                                    border: '1px solid rgba(162, 209, 73, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); }
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



            {showRatingModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: '#fff', width: '90%', maxWidth: '400px',
                        borderRadius: '24px', padding: '30px 20px', textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative'
                    }}>
                        {!ratingSuccess ? (
                            <>
                                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#2d4739', margin: '0 0 10px 0' }}>
                                    ¡ENTRENAMIENTO COMPLETADO! 🎉
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, margin: '0 0 25px 0' }}>
                                    Puntúa la rutina de hoy para activar tu racha y guardar tu progreso.
                                </p>
                                
                                <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 15px 0' }}>
                                    ¿Cuántas estrellas le das a la rutina?
                                </p>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setSelectedStars(star)}
                                            onMouseEnter={() => setHoveredStars(star)}
                                            onMouseLeave={() => setHoveredStars(0)}
                                            style={{
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                fontSize: '36px', color: (hoveredStars || selectedStars) >= star ? '#facc15' : '#e2e8f0',
                                                transition: 'transform 0.1s, color 0.1s',
                                                transform: (hoveredStars || selectedStars) >= star ? 'scale(1.15)' : 'scale(1)'
                                            }}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        disabled={submittingRating}
                                        onClick={() => setShowRatingModal(false)}
                                        style={{
                                            flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569',
                                            border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={selectedStars === 0 || submittingRating}
                                        onClick={handleCompleteWorkout}
                                        style={{
                                            flex: 2, padding: '12px',
                                            background: selectedStars === 0 ? '#cbd5e1' : '#a2d149',
                                            color: '#fff', border: 'none', borderRadius: '12px',
                                            fontWeight: 800, fontSize: '13px',
                                            cursor: selectedStars === 0 ? 'not-allowed' : 'pointer',
                                            boxShadow: selectedStars === 0 ? 'none' : '0 8px 16px rgba(162, 209, 73, 0.25)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {submittingRating ? 'Guardando...' : 'Enviar Calificación'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: '20px 0' }}>
                                <div style={{
                                    fontSize: '60px', color: '#10b981', marginBottom: '20px',
                                    animation: 'scaleIn 0.3s ease-out'
                                }}>
                                    ✓
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', margin: '0 0 10px 0' }}>
                                    ¡Excelente Trabajo!
                                </h3>
                                <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, margin: 0 }}>
                                    Tu racha ha sido actualizada. ¡A seguir con toda! 🔥
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
        </div>
    );
};

export default ClientRoutine;
