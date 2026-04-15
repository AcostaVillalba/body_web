import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import logoBody2 from '../assets/logobody2.jpeg';
import logoBody from '../assets/logobody.png'; // Watermark

const ClientRoutine = () => {
    const { user, token, logout } = useAuth();
    const [routineDays, setRoutineDays] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDay, setOpenDay] = useState<string | null>(null);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showCoachInfo, setShowCoachInfo] = useState(false);

    useEffect(() => {
        const fetchRoutine = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/client/my-routine', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.routine_data) {
                        setRoutineDays(JSON.parse(data.routine_data));
                    }
                    if (data.profile) {
                        setProfile(data.profile);
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

    const getDayAbbr = (dayName: string) => {
        const dayMap: { [key: string]: string } = {
          "Lunes": "LUN", "Martes": "MAR", "Miércoles": "MIÉ", "Jueves": "JUE", "Viernes": "VIE", "Sábado": "SÁB", "Domingo": "DOM"
        };
        return dayMap[dayName] || dayName.substring(0, 3).toUpperCase();
    };

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9', color: '#111' }}><h3>Cargando tu plan...</h3></div>;
    }

    return (
        <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#f1f5f9', color: '#111', minHeight: '100vh', padding: '0 0 50px 0', position: 'relative' }}>
            
            {/* Cabecera Negra (del PDF original) */}
            <div style={{ background: '#000', color: '#fff', padding: '40px 20px', textAlign: 'center', position: 'relative', borderBottom: '6px solid #c5a021' }}>
                <button onClick={logout} style={{ position:'absolute', top: 15, right: 15, background: 'transparent', border:'none', color:'#c5a021', cursor:'pointer' }}>
                    <LogOut size={24} />
                </button>
                <img src={logoBody2} alt="Logo" style={{ width: 120, borderRadius: 15, marginBottom: 15 }} />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, letterSpacing: '-1px' }}>BODY BY <span style={{ color: '#c5a021'}}>J.A.</span></h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: '#fff', textTransform: 'uppercase' }}>BY JUAN CARLOS GONZALES</p>
                <p style={{ margin: '10px 0 0 0', fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: '#c5a021', textTransform: 'uppercase' }}>PLAN DE ENTRENAMIENTO</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#ccc' }}>Hola, {user?.name}</p>
            </div>

            {/* Container Principal */}
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px', position: 'relative' }}>
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                    backgroundImage: `url(${logoBody})`, backgroundRepeat: 'repeat', backgroundSize: '150px',
                    opacity: 0.07, pointerEvents: 'none', zIndex: 0
                }} />

                {routineDays.length === 0 ? (
                    <div style={{ background: '#fff', padding: 40, borderRadius: 16, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1, marginTop: 40 }}>
                        <h3 style={{ color: '#c5a021' }}>Aún no tienes rutinas asignadas</h3>
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
                                    background: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)', 
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
                                👔 Tu Coach Juan C. González
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
                                    <h3 style={{ color: '#c5a021', fontSize: '24px', fontWeight: 900, marginBottom: '15px', textTransform: 'uppercase' }}>¡Hola, {user?.name}!</h3>
                                    <p style={{ fontSize: '15px', color: '#1a1a1a', lineHeight: '1.7', marginBottom: '30px', fontWeight: 500 }}>
                                        <strong style={{ color: '#111', fontWeight: 900 }}>Soy Juan Carlos González, tu entrenador personal.</strong> Mi trabajo se trata de ser tu guía, tu motivador y tu mayor apoyo en este camino. Estoy aquí para ofrecerte el conocimiento y la dedicación que necesitas para transformar tu cuerpo y tu mente. Mi enfoque es totalmente personalizado, garantizando que cada plan esté diseñado para tus objetivos únicos, tus capacidades y tu estilo de vida.
                                    </p>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
                                        <div style={{ paddingLeft: '20px', borderLeft: '5px solid #c5a021' }}>
                                            <h4 style={{ color: '#c5a021', fontSize: '18px', fontWeight: 900, marginBottom: '10px' }}>MISIÓN</h4>
                                            <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.6', margin: 0 }}>
                                                Empoderar a las personas a través del ejercicio y el conocimiento, creando planes inteligentes que no solo construyan un cuerpo fuerte, sino también una mentalidad resiliente y segura.
                                            </p>
                                        </div>
                                        <div style={{ paddingLeft: '20px', borderLeft: '5px solid #c5a021' }}>
                                            <h4 style={{ color: '#c5a021', fontSize: '18px', fontWeight: 900, marginBottom: '10px' }}>VISIÓN</h4>
                                            <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.6', margin: 0 }}>
                                                Ser el catalizador del cambio, ayudando a alcanzar un bienestar físico y mental sostenible, convirtiendo la disciplina en un hábito.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 20, color: '#111' }}>Tu Semana de Entrenamiento</h2>
                        
                        {/* Athlete Data Panel - Gold Version */}
                        {profile && (
                            <div style={{ marginBottom: 15 }}>
                                <button 
                                    onClick={() => setShowProfile(!showProfile)}
                                    style={{ 
                                        width: '100%', 
                                        background: 'linear-gradient(135deg, #c5a021 0%, #a38210 100%)', 
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
                                        boxShadow: '0 4px 15px rgba(197, 160, 33, 0.2)',
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
                                        border: '2px solid #c5a021',
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
                                    </div>
                                )}
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

                        {routineDays.map((day) => (
                            <div key={day.name} style={{ marginBottom: 15 }}>
                                {/* Accordion Header */}
                                <button 
                                    onClick={() => setOpenDay(openDay === day.name ? null : day.name)}
                                    style={{ 
                                        width: '100%', background: openDay === day.name ? '#c5a021' : '#fff', color: openDay === day.name ? '#fff' : '#111',
                                        padding: '18px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        border: openDay === day.name ? 'none' : '2px solid #e5e7eb', borderRadius: 12, fontWeight: 900, fontSize: '18px',
                                        textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s',
                                        boxShadow: openDay === day.name ? '0 8px 20px rgba(197, 160, 33, 0.3)' : 'none'
                                    }}
                                >
                                    {day.name}
                                    {openDay === day.name ? <ChevronUp /> : <ChevronDown />}
                                </button>
                                
                                {/* Accordion Body */}
                                {openDay === day.name && (
                                    <div style={{ padding: '20px 0', animation: 'fadeIn 0.3s ease-out' }}>
                                        {day.groups.map((group: any, gIdx: number) => {
                                            const isBiserie = group.exercises.length > 1;
                                            return (
                                                <div key={group.id} style={{ 
                                                    background: '#fff', border: '2px solid #c5a021', borderRadius: 16, 
                                                    marginBottom: 25, overflow: 'hidden', boxShadow: isBiserie ? '0 8px 20px rgba(197, 160, 33, 0.12)' : '0 4px 12px rgba(0,0,0,0.03)'
                                                }}>
                                                    <div style={{ display: 'flex', height: 40, alignItems: 'stretch' }}>
                                                        <div style={{ background: '#ef4444', color: '#fff', padding: '0 20px', fontWeight: 900, fontSize: '12px', display: 'flex', alignItems: 'center', borderRadius: '0 0 15px 0', letterSpacing: '1px' }}>
                                                            {getDayAbbr(day.name)} | BLOQUE #{gIdx + 1}
                                                        </div>
                                                        {isBiserie && (
                                                            <div style={{ background: '#c5a021', color: '#fff', flex: 1, padding: 10, fontWeight: 900, fontSize: '11px', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                                BISERIE / SUPER SERIE
                                                            </div>
                                                        )}
                                                    </div>

                                                    {group.exercises.map((ex: any, idx: number) => (
                                                        <div key={ex.id} style={{ padding: '25px', borderBottom: idx < group.exercises.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                                                <div>
                                                                    <div style={{ fontWeight: 900, fontSize: '20px', color: '#111', marginBottom: 12, textTransform: 'uppercase', lineHeight: 1.2 }}>
                                                                        {isBiserie ? (idx === 0 ? 'A. ' : 'B. ') : ''}{ex.name || 'Ejercicio'}
                                                                    </div>
                                                                    <div style={{ display: 'inline-block', background: '#fdfaf0', border: '1px solid #f2e3b3', color: '#a38210', padding: '8px 16px', borderRadius: 30, fontWeight: 800, fontSize: '14px', marginBottom: 15 }}>
                                                                        {ex.reps === "MIN" ? `${ex.series} Minutos` : `${ex.series || '0'} Series x ${ex.reps || '0'} Reps`}
                                                                    </div>
                                                                    {ex.note && (
                                                                        <div style={{ fontSize: '14px', color: '#444', background: '#f8f9fa', padding: 15, borderRadius: 10, borderLeft: '4px solid #c5a021', fontWeight: 500 }}>
                                                                            {ex.note}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {ex.img && (
                                                                    <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#fafafa' }}>
                                                                        <img src={ex.img} alt={ex.name} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div style={{ background: '#71a5cb', color: '#fff', textAlign: 'center', padding: 15, fontWeight: 800, fontSize: '12px', letterSpacing: '1px' }}>
                                                        ⌛ 3 MINUTOS DE DESCANSO POST-BLOQUE
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                        


                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ClientRoutine;
