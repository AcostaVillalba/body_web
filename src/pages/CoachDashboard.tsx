import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EXERCISES_DB, getImageUrl, preloadImage } from '../data';
import { LogOut, Users, PlusCircle, Search, Eye, ArrowLeft, ShieldOff, DollarSign, Filter, Calendar, RotateCcw, Bell, Trash2 } from 'lucide-react';
import '../App.css';
import logoBody2 from '../assets/logobody2.png';
import ExerciseImage from '../components/ExerciseImage';
import API_URL from '../api';

interface ExerciseSubRow {
  id: string;
  name: string;
  series: string;
  reps: string;
  note: string;
  img: string;
  isCardio: boolean;
}

interface RoutineGroup {
  id: string;
  exercises: ExerciseSubRow[];
}

export interface RoutineDay {
  name: string;
  groups: RoutineGroup[];
}

interface AthleteProfile {
  age: string;
  weight: string;
  goal: string;
  planType: string;
  startDate: string;
  endDate: string;
  controlDate: string;
}

interface AthleteData {
  id?: number;
  email: string;
  name: string;
  profile: AthleteProfile;
  is_active?: boolean;
  coach_id?: number | null;
}

export interface CoachDashboardProps {
  preloadedEmail?: string;
  preloadedRoutine?: RoutineDay[];
  hideHeader?: boolean;
  hideTabs?: boolean;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

const CoachDashboard = ({ preloadedEmail, preloadedRoutine, hideHeader, hideTabs, onCancel, isReadOnly: propIsReadOnly }: CoachDashboardProps = {}) => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'users' | 'payments'>(preloadedEmail ? 'create' : 'create');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingEmail, setViewingEmail] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(propIsReadOnly || false);
  const [clients, setClients] = useState<AthleteData[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  // Bloqueo de Coach Inactivo
  const isCoachBlocked = user?.role === 'Coach' && !user.isActive;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Auth Headers Helper
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, { headers: authHeaders });
      if (res.ok) {
        const dbNotifs = await res.json();
        setNotifications(dbNotifs);
      }
    } catch (e) { console.error("Error fetching notifications", e); }
  };

  // Efecto para verificar pagos pendientes (Viernes/Sábado antes de Domingo)
  useEffect(() => {
    const checkPaymentWarning = () => {
      const now = new Date();
      const day = now.getDay(); // 0: Dom, 1: Lun, ..., 5: Vie, 6: Sab
      const dateKey = now.toISOString().split('T')[0];
      
      const pendingPayments = payments.filter(p => p.status === 'Pending');
      
      if (pendingPayments.length > 0 && (day === 5 || day === 6)) {
        const msg = `⚠️ Tienes ${pendingPayments.length} pagos pendientes. Recuerda liquidar antes del domingo para evitar el bloqueo de tu cuenta.`;
        
        setNotifications(prev => {
          // Si ya existe una notificación de advertencia sin leer hoy, no hacer nada
          if (prev.some(n => n.id === `pay-warn-${dateKey}` && !n.is_read)) return prev;
          
          return [{
            id: `pay-warn-${dateKey}`,
            message: msg,
            created_at: now.toISOString(),
            is_read: false,
            is_virtual: true
          }, ...prev];
        });
      }
    };

    if (payments.length > 0) checkPaymentWarning();
  }, [payments]);

  // Cerrar notificaciones al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isNotifOpen && !target.closest('.notif-container')) {
        setIsNotifOpen(false);
      }
    };
    document.onmousedown = handleClickOutside;
    return () => { document.onmousedown = null; };
  }, [isNotifOpen]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const markNotifRead = async (id: number | string) => {
    if (typeof id === 'string') {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      return;
    }
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders });
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const deleteNotif = async (id: number | string) => {
    if (typeof id === 'string') {
      setNotifications(prev => prev.filter(n => n.id !== id));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const emptyAthlete: AthleteData = {
    email: '',
    name: '',
    is_active: true,
    profile: {
      age: '',
      weight: '',
      goal: 'Definición Muscular',
      planType: 'Mensual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
      })(),
      controlDate: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
      })()
    }
  };

  const [athlete, setAthlete] = useState<AthleteData>(emptyAthlete);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isRenewalActive, setIsRenewalActive] = useState(false);
  const [coaches, setCoaches] = useState<{ id: number, name: string, email: string }[]>([]);

  const isExistingClient = !!athlete.id;
  const isContractLocked = isExistingClient && !isRenewalActive;
  const lockedStyle = { backgroundColor: '#f0f0f0', cursor: 'not-allowed', opacity: 0.8 };

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const allExercises = Object.values(EXERCISES_DB).flat().sort();

  useEffect(() => {
    fetchClients();
    // Poll for changes every 30 seconds to keep status in sync
    const interval = setInterval(fetchClients, 30000);
    if (user?.role === 'Admin') fetchCoaches();
    
    // Si el coach está bloqueado, forzar pestaña de pagos
    if (user?.role === 'Coach' && !user.isActive) {
      setActiveTab('payments');
    }
    
    return () => clearInterval(interval);
  }, [user]);

  const fetchCoaches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/list`, { headers: authHeaders });
      if (res.ok) setCoaches(await res.json());
    } catch (e) { console.error("Error fetching coaches", e); }
  };

  useEffect(() => {
    if (preloadedEmail && clients.length > 0) {
      const selected = clients.find(c => c.email === preloadedEmail);
      if (selected) {
        setAthlete(selected);
      } else {
        setAthlete(prev => ({ ...prev, email: preloadedEmail }));
      }
    }
  }, [preloadedEmail, clients]);

  useEffect(() => {
    if (preloadedRoutine && preloadedRoutine.length > 0) {
      // Refrescar URLs de imágenes para asegurar que se usen los GIFs actuales
      const refreshedRoutine = preloadedRoutine.map(day => ({
        ...day,
        groups: day.groups.map(group => ({
          ...group,
          exercises: group.exercises.map(ex => ({
            ...ex,
            img: getImageUrl(ex.name)
          }))
        }))
      }));
      setRoutineDays(refreshedRoutine);
      setSelectedDays(refreshedRoutine.map(d => d.name));
    }
  }, [preloadedRoutine]);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/clients`, { headers: authHeaders });

      if (res.status === 403) {
        const data = await res.json();
        if (data.detail && String(data.detail).toLowerCase().includes("plan ha expirado")) {
          logout();
          return;
        }
      }

      if (res.ok) {
        const data: AthleteData[] = await res.json();
        setClients(data);

        // Sincronizar el atleta seleccionado actualmente si hubo cambios en el servidor
        if (athlete.email) {
          const updatedSelected = data.find(c => c.email === athlete.email);
          if (updatedSelected) {
            setAthlete(prev => ({
              ...updatedSelected,
              // Mantener flags locales como isRenewalActive
              ...((prev as any).isRenewalActive !== undefined ? { isRenewalActive: (prev as any).isRenewalActive } : {})
            }));
          }
        }
      }
    } catch (e) {
      console.error("Error fetching clients", e);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/payments`, { headers: authHeaders });
      if (res.ok) setPayments(await res.json());
    } catch (e) { console.error("Error fetching payments", e); }
  };

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments();
  }, [activeTab]);

  const handlePayBalance = async () => {
    if (!window.confirm("¿Confirmas que has pagado el saldo pendiente al administrador?")) return;
    try {
      const res = await fetch(`${API_URL}/api/coach/payments/pay`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Saldo marcado como pagado exitosamente' });
        fetchPayments();
      }
    } catch (e) { 
      setStatusMsg({ type: 'error', text: 'Error al procesar el pago' });
    }
  };

  const handleClientSelect = (email: string) => {
    setIsRenewalActive(false);
    if (!email) {
      setAthlete({ ...emptyAthlete, id: undefined });
      return;
    }
    const selected = clients.find(c => c.email === email);
    if (selected) {
      setAthlete(selected);
    }
  };

  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');

  const filteredClientsForSelect = clients.filter(c => {
    if (user?.role === 'Admin' && selectedCoachId !== 'all') {
      return String(c.coach_id) === selectedCoachId;
    }
    return true;
  });

  const handleViewRoutineFromList = async (clientEmail: string) => {
    setIsLoading(true);
    setViewingEmail(clientEmail);
    setIsReadOnly(true);
    try {
      const res = await fetch(`${API_URL}/api/coach/routine/${clientEmail}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.routine_data) {
          const routine: RoutineDay[] = JSON.parse(data.routine_data);
          
          // Refrescar URLs de imágenes para asegurar que se usen los GIFs actuales
          const updatedRoutine = routine.map(day => ({
            ...day,
            groups: day.groups.map(group => ({
              ...group,
              exercises: group.exercises.map(ex => ({
                ...ex,
                img: getImageUrl(ex.name) // Forzar actualización desde data.ts
              }))
            }))
          }));

          setRoutineDays(updatedRoutine);
          setSelectedDays(updatedRoutine.map((d: any) => d.name));
        } else {
          setRoutineDays([]);
          setSelectedDays([]);
        }

        const client = clients.find(c => c.email === clientEmail);
        if (client) setAthlete(client);
      }
    } catch (e) {
      console.error("Error loading routine", e);
    } finally {
      setIsLoading(false);
      setActiveTab('create'); // Reutilizamos la vista de creación pero en modo lectura
    }
  };

  const handleBackToList = () => {
    setViewingEmail(null);
    setIsReadOnly(false);
    setActiveTab('users');
    setAthlete(emptyAthlete);
    setRoutineDays([]);
    setSelectedDays([]);
  };
  
  const handleAcceptRenewal = async () => {
    if (!athlete.email) return;
    setIsLoading(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/api/coach/clients`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...athlete, isRenewal: true })
      });
      
      if (res.status === 403) {
        const data = await res.json();
        if (data.detail && String(data.detail).toLowerCase().includes("plan ha expirado")) {
          logout();
          return;
        }
      }

      if (res.ok) {
        setStatusMsg({ type: 'success', text: '¡Renovación aceptada exitosamente!' });
        setIsRenewalActive(false);
        fetchClients();
      } else {
        throw new Error("Error al aceptar la renovación");
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error desconocido' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || (c.profile?.planType === planFilter);
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' ? c.is_active : !c.is_active);
    
    return matchesSearch && matchesPlan && matchesStatus;
  }).sort((a, b) => {
    if (sortOrder === 'none') return 0;
    const dateA = a.profile?.endDate || '';
    const dateB = b.profile?.endDate || '';
    if (sortOrder === 'asc') return dateA.localeCompare(dateB);
    return dateB.localeCompare(dateA);
  });

  // --- Routine Logic from Previous Code ---
  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const renderDays = () => {
    const newRoutineDays = selectedDays.map(dayName => {
      const existing = routineDays.find(d => d.name === dayName);
      return existing || { name: dayName, groups: [] };
    });
    newRoutineDays.sort((a, b) => daysOfWeek.indexOf(a.name) - daysOfWeek.indexOf(b.name));
    setRoutineDays(newRoutineDays);
  };

  const addGroup = (dayName: string) => {
    setRoutineDays(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          groups: [...day.groups, {
            id: Date.now().toString() + Math.random(),
            exercises: [createEmptyExercise()]
          }]
        };
      })
    );
  };

  const removeGroup = (dayName: string, groupId: string) => {
    setRoutineDays(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          groups: day.groups.filter(g => g.id !== groupId)
        };
      })
    );
  };

  const createEmptyExercise = (): ExerciseSubRow => ({
    id: Date.now().toString() + Math.random(),
    name: '',
    series: '',
    reps: '',
    note: '',
    img: '',
    isCardio: false
  });

  const addBiserie = (dayName: string, groupId: string) => {
    setRoutineDays(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          groups: day.groups.map(g => {
            if (g.id !== groupId || g.exercises.length >= 2) return g;
            return { ...g, exercises: [...g.exercises, createEmptyExercise()] };
          })
        };
      })
    );
  };

  const updateExercise = (dayName: string, groupId: string, exId: string, field: keyof ExerciseSubRow, value: any) => {
    setRoutineDays(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          groups: day.groups.map(g => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              exercises: g.exercises.map(ex => {
                if (ex.id !== exId) return ex;

                const updated = { ...ex, [field]: value };
                if (field === 'name') {
                  const valStr = value as string;
                  updated.img = getImageUrl(valStr);
                  updated.isCardio = EXERCISES_DB["CARDIO"].includes(valStr);
                  if (updated.isCardio) {
                    updated.reps = "MIN";
                  } else if (ex.isCardio) {
                    updated.reps = "";
                  }
                }
                return updated;
              })
            };
          })
        };
      })
    );
  };

  const publishRoutine = async () => {
    if (!athlete.email) {
      setStatusMsg({ type: 'error', text: 'Debes ingresar o seleccionar el email del cliente' });
      return;
    }
    if (routineDays.length === 0) {
      setStatusMsg({ type: 'error', text: 'No has agregado ningún día a la rutina' });
      return;
    }

    setIsLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // Unificamos el guardado de perfil y rutina en una sola petición atómica
      const res = await fetch(`${API_URL}/api/coach/publish-all`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          athlete: { ...athlete, isRenewal: isRenewalActive },
          routine_data: JSON.stringify(routineDays)
        })
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.detail && String(data.detail).toLowerCase().includes("plan ha expirado")) {
          logout();
          return;
        }
      }

      if (!res.ok) throw new Error("Error publicando la rutina");

      setStatusMsg({ type: 'success', text: '¡Rutina publicada y respaldada exitosamente!' });
      setIsRenewalActive(false);
      fetchClients();

      // Clear only routine while keeping athlete and message
      setRoutineDays([]);
      setSelectedDays([]);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error desconocido' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <datalist id="exercises-list">
        {allExercises.map(exName => (
          <option key={exName} value={exName} />
        ))}
      </datalist>
      <datalist id="clients-datalist">
        {filteredClientsForSelect.map(c => (
          <option key={c.email} value={c.email}>{c.name}</option>
        ))}
      </datalist>
      <div className="admin-container" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background Watermark */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundImage: `url(${logoBody2})`, backgroundRepeat: 'repeat', backgroundSize: '220px',
          opacity: 0.06, pointerEvents: 'none', zIndex: 0
        }} />

        {!hideHeader && (
          <>
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 15, zIndex: 1000 }}>
              {/* Notification Bell */}
              <div className="notif-container" style={{ position: 'relative' }}>
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  style={{ background: '#f8fafc', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}
                >
                  <Bell size={20} />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <div style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                      {notifications.filter(n => !n.is_read).length}
                    </div>
                  )}
                </button>

                {isNotifOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 10, width: 320, background: '#fff', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>NOTIFICACIONES</span>
                      <button onClick={() => setIsNotifOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                          No tienes notificaciones
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ 
                            padding: '15px 20px', 
                            borderBottom: '1px solid #f1f5f9', 
                            background: n.is_read ? '#fff' : '#f0fdf4',
                            position: 'relative',
                            transition: 'background 0.2s'
                          }}>
                            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#334155', fontWeight: n.is_read ? 500 : 700 }}>
                              {n.message}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                              <div style={{ display: 'flex', gap: 10 }}>
                                {!n.is_read && (
                                  <button onClick={() => markNotifRead(n.id)} style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: 10, fontWeight: 800, cursor: 'pointer', padding: 0 }}>
                                    LEÍDO
                                  </button>
                                )}
                                <button onClick={() => deleteNotif(n.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, opacity: 0.6 }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="btn"
                style={{ background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5, padding: '10px 16px', borderRadius: 10 }}>
                <LogOut size={16} /> Salir
              </button>
            </div>

            <div className="header" style={{ position: 'relative', zIndex: 1 }}>
              <img src={logoBody2} alt="Logo" style={{ width: 140, marginBottom: 20, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }} />
              <h1>BODY LOGIC</h1>
              <p style={{ margin: '-10px 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#a2d149', textTransform: 'uppercase' }}>Resultados diseñados a tu medida</p>
              <p>CONTROL PANEL | Coach: {user?.name}</p>
            </div>
          </>
        )}

        {/* Tabs Navigation */}
        {!viewingEmail && !hideTabs && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
            <button
              onClick={() => !isCoachBlocked && setActiveTab('create')}
              style={{
                flex: 1, padding: '14px', 
                background: activeTab === 'create' ? '#2d4739' : '#fff', 
                color: activeTab === 'create' ? '#fff' : (isCoachBlocked ? '#cbd5e1' : '#2d4739'),
                border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', 
                cursor: isCoachBlocked ? 'not-allowed' : 'pointer', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: activeTab === 'create' ? '0 8px 16px rgba(0,0,0,0.1)' : '0 2px 5px rgba(0,0,0,0.05)', 
                transition: 'all 0.2s',
                opacity: isCoachBlocked ? 0.6 : 1
              }}>
              <PlusCircle size={16} /> CREAR RUTINA
            </button>
            <button
              onClick={() => !isCoachBlocked && setActiveTab('users')}
              style={{
                flex: 1, padding: '14px', 
                background: activeTab === 'users' ? '#a2d149' : '#fff', 
                color: activeTab === 'users' ? '#fff' : (isCoachBlocked ? '#cbd5e1' : '#2d4739'),
                border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', 
                cursor: isCoachBlocked ? 'not-allowed' : 'pointer', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: activeTab === 'users' ? '0 8px 16px rgba(197,160,33,0.2)' : '0 2px 5px rgba(0,0,0,0.05)', 
                transition: 'all 0.2s',
                opacity: isCoachBlocked ? 0.6 : 1
              }}>
              <Users size={16} /> VER USUARIOS
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                flex: 1, padding: '14px', background: activeTab === 'payments' ? '#3b82f6' : '#fff', color: activeTab === 'payments' ? '#fff' : '#2d4739',
                border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: activeTab === 'payments' ? '0 8px 16px rgba(59,130,246,0.2)' : '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}>
              <DollarSign size={16} /> GESTIÓN DE PAGOS
            </button>
          </div>
        )}

        {isCoachBlocked && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '15px 20px', borderRadius: 12, border: '1px solid #fecaca',
            marginBottom: 25, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 14, position: 'relative', zIndex: 1
          }}>
            <ShieldOff size={24} />
            <div>
              <p style={{ margin: 0 }}>CUENTA DE COACH INACTIVA</p>
              <p style={{ margin: 0, fontWeight: 500, fontSize: 12 }}>Tu acceso a la gestión de clientes está restringido. Por favor, contacta al administrador.</p>
            </div>
          </div>
        )}

        {activeTab === 'payments' ? (
          <div style={{ padding: '0 0 20px 0' }}>
            <h2 className="section-title">Control de Pago a Body Logic</h2>
            <div style={{ background: '#fff', borderRadius: 12, padding: 25, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
                <div style={{ background: '#fee2e2', padding: 20, borderRadius: 12, border: '1px solid #fecaca' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>Saldo Pendiente</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: 24, fontWeight: 900, color: '#991b1b' }}>
                    ${payments.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 10px' }}>Fecha</th>
                      <th style={{ padding: '12px 10px' }}>Atleta</th>
                      <th style={{ padding: '12px 10px' }}>Plan</th>
                      <th style={{ padding: '12px 10px' }}>Monto</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '15px 10px', fontSize: 12, color: '#64748b' }}>{p.date}</td>
                        <td style={{ padding: '15px 10px', fontWeight: 700, fontSize: 14 }}>{p.client_name}</td>
                        <td style={{ padding: '15px 10px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{p.plan_type}</span>
                        </td>
                        <td style={{ padding: '15px 10px', fontWeight: 700, color: '#10b981' }}>
                          ${p.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'right' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: '10px', fontWeight: 800,
                            background: p.status === 'Paid' ? '#dcfce7' : '#fee2e2',
                            color: p.status === 'Paid' ? '#166534' : '#991b1b'
                          }}>
                            {p.status === 'Paid' ? 'PAGADO' : 'PENDIENTE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payments.some(p => p.status === 'Pending') && (
                <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={handlePayBalance}
                    style={{
                      background: '#2d4739', color: '#fff', border: 'none', padding: '15px 30px', 
                      borderRadius: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                    }}
                  >
                    PAGAR SALDO PENDIENTE (${payments.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.amount, 0).toLocaleString()})
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div style={{ padding: '0 0 20px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Listado de Atletas</h2>
                { (planFilter !== 'all' || statusFilter !== 'all' || sortOrder !== 'none' || searchQuery !== '') && (
                  <button 
                    onClick={() => { setPlanFilter('all'); setStatusFilter('all'); setSortOrder('none'); setSearchQuery(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RotateCcw size={12} /> Limpiar Filtros
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Buscador */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: 10, border: '2px solid #e2e8f0', flex: '1 1 250px' }}>
                  <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
                  />
                </div>

                {/* Filtro Plan */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '6px 12px', borderRadius: 10, border: '2px solid #e2e8f0' }}>
                  <Filter size={14} color="#64748b" style={{ marginRight: 8 }} />
                  <select 
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#475569', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}
                  >
                    <option value="all">Todos los Planes</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Dos meses">Dos meses</option>
                    <option value="Trimestral">Trimestral</option>
                  </select>
                </div>

                {/* Filtro Estado */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '6px 12px', borderRadius: 10, border: '2px solid #e2e8f0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusFilter === 'active' ? '#10b981' : (statusFilter === 'inactive' ? '#ef4444' : '#cbd5e1'), marginRight: 8 }} />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#475569', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>

                {/* Ordenar Fecha */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '6px 12px', borderRadius: 10, border: '2px solid #e2e8f0' }}>
                  <Calendar size={14} color="#64748b" style={{ marginRight: 8 }} />
                  <select 
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#475569', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}
                  >
                    <option value="none">Sin Ordenar Fecha</option>
                    <option value="asc">Fecha Fin: Ascendente</option>
                    <option value="desc">Fecha Fin: Descendente</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '16px 20px', fontWeight: 800 }}>Nombre</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800 }}>Email</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800 }}>Plan</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800 }}>Fin del Plan</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800 }}>Estado</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(c => (
                    <tr key={c.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px 20px', fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: '15px 20px', color: '#64748b', fontSize: '13px' }}>{c.email}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 20, fontSize: '10px', fontWeight: 800 }}>
                          {c.profile?.planType || 'Mensual'}
                        </span>
                      </td>
                      <td style={{ padding: '15px 20px', fontSize: '13px', fontWeight: 600 }}>{c.profile?.endDate || '—'}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: '10px', fontWeight: 800,
                          background: c.is_active ? '#dcfce7' : '#fee2e2',
                          color: c.is_active ? '#166534' : '#991b1b'
                        }}>
                          {c.is_active ? '✅ ACTIVO' : '❌ INACTIVO'}
                        </span>
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleViewRoutineFromList(c.email)}
                          style={{
                            background: '#2d4739', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6,
                            cursor: 'pointer', fontWeight: 700, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 6
                          }}>
                          <Eye size={14} /> Ver Rutina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {isReadOnly && (
              <button
                className="btn"
                onClick={handleBackToList}
                style={{ background: '#2d4739', color: '#fff', marginBottom: 20, display: 'inline-flex', gap: 8, padding: '10px 20px' }}
              >
                <ArrowLeft size={16} /> VOLVER AL LISTADO DE USUARIOS
              </button>
            )}

            {onCancel && !isReadOnly && (
              <button className="btn" onClick={onCancel} style={{ background: '#e2e8f0', color: '#475569', marginBottom: 20, display: 'inline-flex', gap: 8 }}>
                ⬅ VOLVER AL LISTADO
              </button>
            )}

            {statusMsg.text && (
              <div style={{ padding: 15, borderRadius: 8, marginBottom: 20, background: statusMsg.type === 'error' ? '#fee2e2' : '#dcfce7', color: statusMsg.type === 'error' ? '#ef4444' : '#166534', fontWeight: 600, textAlign: 'center' }}>
                {statusMsg.text}
              </div>
            )}

            <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Datos del Atleta</span>
              {isExistingClient && (
                <button
                  className="btn"
                  onClick={() => setIsRenewalActive(!isRenewalActive)}
                  style={{ background: isRenewalActive ? '#ef4444' : '#3b82f6', color: '#fff', fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  {isRenewalActive ? '✓ Cancelar Renovación' : 'Renovar Plan'}
                </button>
              )}
              {isExistingClient && isRenewalActive && (
                <button
                  className="btn"
                  onClick={handleAcceptRenewal}
                  disabled={isLoading}
                  style={{ background: '#22c55e', color: '#fff', fontSize: '0.85rem', padding: '6px 12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'PROCESANDO...' : '✓ Aceptar Renovación'}
                </button>
              )}
            </div>
            <div className="grid-inputs">
              <div className="field">
                <label>Buscar Cliente D.B.</label>
                <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    list="clients-datalist"
                    placeholder="Escribe email o nombre..."
                    value={athlete.email}
                    disabled={isReadOnly || isCoachBlocked}
                    style={(isReadOnly || isCoachBlocked) ? { ...lockedStyle, width: '100%' } : { border: '2px solid #a2d149', width: '100%', borderRadius: '8px', padding: '10px' }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAthlete({ ...athlete, email: val });
                      const match = clients.find(c => c.email === val || c.name === val);
                      if (match) handleClientSelect(match.email);
                    }}
                  />
                  {athlete.email && (
                    <button 
                      className="btn" 
                      onClick={() => handleClientSelect('')}
                      style={{ padding: '8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {user?.role === 'Admin' && (
                <div className="field">
                  <label>Filtrar Clientes por Coach</label>
                  <select
                    value={selectedCoachId}
                    onChange={(e) => setSelectedCoachId(e.target.value)}
                    style={{ border: '2px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}
                  >
                    <option value="all">-- Todos los Coaches --</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field">
                <label>Estado de Acceso</label>
                <div style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: athlete.is_active ? '#dcfce7' : '#fee2e2',
                  color: athlete.is_active ? '#166534' : '#ef4444',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  border: athlete.is_active ? '1px solid #166534' : '1px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isReadOnly ? 0.7 : 1
                }}>
                  {athlete.is_active ? '✅ ACTIVO' : '❌ INACTIVO'}
                </div>
              </div>

              {user?.role === 'Admin' && (
                <div className="field">
                  <label>Asignar a Coach</label>
                  <select
                    value={athlete.coach_id || ""}
                    onChange={e => setAthlete({ ...athlete, coach_id: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={isReadOnly || isCoachBlocked}
                    style={(isReadOnly || isCoachBlocked) ? lockedStyle : { border: '2px solid #a2d149', background: '#fff' }}
                  >
                    <option value="">-- Seleccionar Coach --</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field">
                <label>Email (Req. Google Login)</label>
                <input
                  type="email"
                  value={athlete.email}
                  disabled={isReadOnly || isCoachBlocked || (isExistingClient && user?.role !== 'Admin')}
                  style={(isReadOnly || isCoachBlocked || (isExistingClient && user?.role !== 'Admin')) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, email: e.target.value })}
                  placeholder="email@gmail.com"
                />
              </div>
              <div className="field">
                <label>Nombre del Cliente</label>
                <input
                  type="text"
                  value={athlete.name}
                  disabled={isReadOnly || isCoachBlocked || (isExistingClient && user?.role !== 'Admin')}
                  style={(isReadOnly || isCoachBlocked || (isExistingClient && user?.role !== 'Admin')) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Edad</label>
                <input
                  type="number"
                  value={athlete.profile.age}
                  disabled={isReadOnly || isCoachBlocked}
                  style={(isReadOnly || isCoachBlocked) ? lockedStyle : {}}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length <= 2) setAthlete({ ...athlete, profile: { ...athlete.profile, age: val } });
                  }}
                />
              </div>
              <div className="field">
                <label>Peso (kg)</label>
                <input
                  type="number"
                  value={athlete.profile.weight}
                  disabled={isReadOnly || isCoachBlocked}
                  style={(isReadOnly || isCoachBlocked) ? lockedStyle : {}}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length <= 3) setAthlete({ ...athlete, profile: { ...athlete.profile, weight: val } });
                  }}
                />
              </div>
              <div className="field">
                <label>Objetivo</label>
                <select
                  value={athlete.profile.goal}
                  disabled={isReadOnly || isCoachBlocked}
                  style={(isReadOnly || isCoachBlocked) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, goal: e.target.value } })}
                >
                  <option>Definición Muscular</option>
                  <option>Volumen Muscular</option>
                  <option>Mantenimiento Físico</option>
                  <option>Recomposicion Corporal</option>
                </select>
              </div>
              <div className="field">
                <label>Tipo de Plan</label>
                <select
                  value={athlete.profile.planType}
                  disabled={isReadOnly || isCoachBlocked || isContractLocked}
                  style={(isReadOnly || isCoachBlocked || isContractLocked) ? lockedStyle : {}}
                  onChange={e => {
                    const newPlan = e.target.value;
                    let days = 30;
                    if (newPlan === 'Dos meses') days = 60;
                    if (newPlan === 'Trimestral') days = 90;
                    const d = new Date(athlete.profile.startDate + 'T12:00:00');
                    d.setDate(d.getDate() + days);
                    const newEnd = d.toISOString().split('T')[0];
                    setAthlete({ ...athlete, profile: { ...athlete.profile, planType: newPlan, endDate: newEnd } });
                  }}>
                  <option value="Mensual">Mensual</option>
                  <option value="Dos meses">Dos meses</option>
                  <option value="Trimestral">Trimestral</option>
                </select>
              </div>
              <div className="field">
                <label>Fecha de Inicio</label>
                <input
                  type="date"
                  value={athlete.profile.startDate}
                  disabled={isReadOnly || isCoachBlocked || isContractLocked}
                  style={(isReadOnly || isCoachBlocked || isContractLocked) ? lockedStyle : {}}
                  onChange={e => {
                    const newStart = e.target.value;
                    const dControl = new Date(newStart + 'T12:00:00');
                    dControl.setMonth(dControl.getMonth() + 1);
                    const newControl = dControl.toISOString().split('T')[0];

                    let days = 30;
                    if (athlete.profile.planType === 'Dos meses') days = 60;
                    if (athlete.profile.planType === 'Trimestral') days = 90;
                    const dEnd = new Date(newStart + 'T12:00:00');
                    dEnd.setDate(dEnd.getDate() + days);
                    const newEnd = dEnd.toISOString().split('T')[0];

                    setAthlete({ ...athlete, profile: { ...athlete.profile, startDate: newStart, endDate: newEnd, controlDate: newControl } });
                  }}
                />
              </div>
              <div className="field">
                <label>Fecha Final del Plan</label>
                <input
                  type="date"
                  value={athlete.profile.endDate}
                  disabled={isReadOnly || isCoachBlocked || isContractLocked}
                  style={(isReadOnly || isCoachBlocked || isContractLocked) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, endDate: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>Fecha de Control</label>
                <input
                  type="date"
                  value={athlete.profile.controlDate}
                  disabled={isReadOnly || isCoachBlocked}
                  style={(isReadOnly || isCoachBlocked) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, controlDate: e.target.value } })}
                />
              </div>
            </div>

            <div className="section-title">Configurar Rutina</div>
            <div className="days-selector">
              {daysOfWeek.map(day => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    disabled={isReadOnly || isCoachBlocked}
                    onChange={() => handleDayToggle(day)}
                  />
                  {day}
                </label>
              ))}
              {!isReadOnly && (
                <button
                  className="btn btn-add-day main-add-btn"
                  onClick={renderDays}
                  disabled={(!athlete.is_active && !isRenewalActive) || isCoachBlocked}
                  style={((!athlete.is_active && !isRenewalActive) || isCoachBlocked) ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {}}
                  title={isCoachBlocked ? "Tu cuenta está inactiva" : (!athlete.is_active && !isRenewalActive ? "No se puede configurar rutina para atletas inactivos" : "")}
                >
                  Crear Días
                </button>
              )}
            </div>

            <div id="routine-builder">
              {routineDays.map(day => (
                <div key={day.name} className="day-container">
                  <div className="day-header">
                    {day.name}
                    {!isReadOnly && <button className="btn btn-add-day" onClick={() => addGroup(day.name)} disabled={isCoachBlocked} style={isCoachBlocked ? lockedStyle : {}}>+ Bloque</button>}
                  </div>

                  <div className="day-groups">
                    {day.groups.map(group => (
                      <div key={group.id} className="exercise-group">
                        {!isReadOnly && <button className="btn btn-del" onClick={() => removeGroup(day.name, group.id)} disabled={isCoachBlocked} style={isCoachBlocked ? lockedStyle : {}}>Eliminar</button>}

                        <div className="rows-holder">
                          {group.exercises.map((ex, idx) => (
                            <div
                              key={ex.id}
                              className="exercise-sub-row"
                              onMouseEnter={() => { if (ex.img) preloadImage(ex.img); }}
                            >
                              <div className="field">

                                <label>{idx === 0 ? 'EJERCICIO' : 'EJERCICIO B'}</label>
                                <input
                                  type="text"
                                  list="exercises-list"
                                  className="sel-name"
                                  placeholder="Buscar ejercicio..."
                                  value={ex.name}
                                  disabled={isReadOnly}
                                  style={isReadOnly ? lockedStyle : {}}
                                  onChange={(e) => updateExercise(day.name, group.id, ex.id, 'name', e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                />
                              </div>

                              <div className="field">
                                <label>MÉTRICA</label>
                                <div className="metric-split">
                                  {ex.isCardio ? (
                                    <div className="metric-field">
                                      <label>TIEMPO (MIN)</label>
                                      <input
                                        type="text"
                                        placeholder="00"
                                        value={ex.series}
                                        disabled={isReadOnly}
                                        style={{ width: 100, ...(isReadOnly ? lockedStyle : {}) }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val.length <= 2) updateExercise(day.name, group.id, ex.id, 'series', val);
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <div className="metric-field">
                                        <label>SERIES</label>
                                        <input
                                          type="text"
                                          placeholder="S"
                                          value={ex.series}
                                          disabled={isReadOnly}
                                          style={isReadOnly ? lockedStyle : {}}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length <= 1) updateExercise(day.name, group.id, ex.id, 'series', val);
                                          }}
                                        />
                                      </div>
                                      <div className="metric-field">
                                        <label>REPS</label>
                                        <input
                                          type="text"
                                          placeholder="R"
                                          value={ex.reps}
                                          disabled={isReadOnly}
                                          style={isReadOnly ? lockedStyle : {}}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length <= 3) updateExercise(day.name, group.id, ex.id, 'reps', val);
                                          }}
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="field field-notes">
                                <label>NOTAS DEL COACH</label>
                                <textarea
                                  rows={3}
                                  value={ex.note}
                                  disabled={isReadOnly}
                                  style={isReadOnly ? lockedStyle : {}}
                                  onChange={(e) => updateExercise(day.name, group.id, ex.id, 'note', e.target.value)}
                                />
                              </div>

                              <div className="img-preview-box">
                                {ex.img ? (
                                  <ExerciseImage src={ex.img} alt={ex.name} />
                                ) : (
                                  <span>+ FOTO (Auto)</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {!isReadOnly && group.exercises.length < 2 && (
                          <button className="btn btn-biserie" onClick={() => addBiserie(day.name, group.id)} disabled={isCoachBlocked} style={isCoachBlocked ? lockedStyle : {}}>
                            + AGREGAR BISERIE
                          </button>
                        )}
                        <div className="rest-time-label">
                          ⌛ 3 MINUTOS DE DESCANSO POST-BLOQUE
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!isReadOnly && (
              <button
                className="btn btn-generate"
                onClick={publishRoutine}
                disabled={isLoading || (!athlete.is_active && !isRenewalActive) || isCoachBlocked}
                style={((!athlete.is_active && !isRenewalActive) || isCoachBlocked) ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {}}
                title={isCoachBlocked ? "Tu cuenta está inactiva" : (!athlete.is_active && !isRenewalActive ? "No se puede publicar rutina para atletas inactivos" : "")}
              >
                {isLoading ? 'PUBLICANDO...' : (isCoachBlocked ? 'ACCESO RESTRINGIDO' : (!athlete.is_active && !isRenewalActive ? 'USUARIO INACTIVO' : 'PUBLICAR RUTINA'))}
              </button>
            )}

            {statusMsg.text && (
              <div style={{
                marginTop: 20,
                padding: 15,
                borderRadius: 8,
                background: statusMsg.type === 'error' ? '#fee2e2' : '#dcfce7',
                color: statusMsg.type === 'error' ? '#ef4444' : '#166534',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                {statusMsg.text}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default CoachDashboard;
