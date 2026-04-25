import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EXERCISES_DB, getImageUrl, preloadImage } from '../data';
import { LogOut, Users, PlusCircle, Search, Eye, ArrowLeft } from 'lucide-react';
import '../App.css';
import ExerciseImage from '../components/ExerciseImage';

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
  const [activeTab, setActiveTab] = useState<'create' | 'users'>(preloadedEmail ? 'create' : 'create');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingEmail, setViewingEmail] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(propIsReadOnly || false);
  const [clients, setClients] = useState<AthleteData[]>([]);

  // Auth Headers Helper
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
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
    return () => clearInterval(interval);
  }, [user]);

  const fetchCoaches = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/coach/list', { headers: authHeaders });
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
      setRoutineDays(preloadedRoutine);
      setSelectedDays(preloadedRoutine.map(d => d.name));
    }
  }, [preloadedRoutine]);

  const fetchClients = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/coach/clients', { headers: authHeaders });

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
      const res = await fetch(`http://localhost:8000/api/coach/routine/${clientEmail}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.routine_data) {
          const routine = JSON.parse(data.routine_data);
          setRoutineDays(routine);
          setSelectedDays(routine.map((d: any) => d.name));
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
      const res = await fetch('http://localhost:8000/api/coach/clients', {
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

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      const res = await fetch('http://localhost:8000/api/coach/publish-all', {
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
      <div className="admin-container" style={{ position: 'relative' }}>

        {!hideHeader && (
          <>
            <button
              onClick={logout}
              className="btn"
              style={{ position: 'absolute', top: 20, right: 20, background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
              <LogOut size={16} /> Salir
            </button>

            <div className="header">
              <h1>BODY LOGIC</h1>
              <p style={{ margin: '-10px 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#c5a021', textTransform: 'uppercase' }}>Resultados diseñados a tu medida</p>
              <p>CONTROL PANEL | Coach: {user?.name}</p>
            </div>
          </>
        )}

        {/* Tabs Navigation */}
        {!viewingEmail && !hideTabs && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                flex: 1, padding: '14px', background: activeTab === 'create' ? '#111' : '#fff', color: activeTab === 'create' ? '#fff' : '#111',
                border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: activeTab === 'create' ? '0 8px 16px rgba(0,0,0,0.1)' : '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}>
              <PlusCircle size={16} /> CREAR RUTINA
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                flex: 1, padding: '14px', background: activeTab === 'users' ? '#c5a021' : '#fff', color: activeTab === 'users' ? '#fff' : '#111',
                border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: activeTab === 'users' ? '0 8px 16px rgba(197,160,33,0.2)' : '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}>
              <Users size={16} /> VER USUARIOS
            </button>
          </div>
        )}

        {activeTab === 'users' ? (
          <div style={{ padding: '0 0 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="section-title" style={{ margin: 0 }}>Listado de Atletas</h2>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '2px solid #e2e8f0', width: 300 }}>
                <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
                />
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
                            background: '#111', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6,
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
                style={{ background: '#111', color: '#fff', marginBottom: 20, display: 'inline-flex', gap: 8, padding: '10px 20px' }}
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
              {user?.role === 'Admin' && isExistingClient && (
                <button
                  className="btn"
                  onClick={() => setIsRenewalActive(!isRenewalActive)}
                  style={{ background: isRenewalActive ? '#ef4444' : '#3b82f6', color: '#fff', fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  {isRenewalActive ? '✓ Cancelar Renovación' : 'Renovar Plan'}
                </button>
              )}
              {user?.role === 'Admin' && isExistingClient && isRenewalActive && (
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
                    disabled={isReadOnly}
                    style={isReadOnly ? { ...lockedStyle, width: '100%' } : { border: '2px solid #c5a021', width: '100%', borderRadius: '8px', padding: '10px' }}
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
                    disabled={isReadOnly}
                    style={isReadOnly ? lockedStyle : { border: '2px solid #c5a021', background: '#fff' }}
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
                  disabled={isReadOnly || (isExistingClient && user?.role !== 'Admin')}
                  style={(isReadOnly || (isExistingClient && user?.role !== 'Admin')) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, email: e.target.value })}
                  placeholder="email@gmail.com"
                />
              </div>
              <div className="field">
                <label>Nombre del Cliente</label>
                <input
                  type="text"
                  value={athlete.name}
                  disabled={isReadOnly || (isExistingClient && user?.role !== 'Admin')}
                  style={(isReadOnly || (isExistingClient && user?.role !== 'Admin')) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Edad</label>
                <input
                  type="number"
                  value={athlete.profile.age}
                  disabled={isReadOnly}
                  style={isReadOnly ? lockedStyle : {}}
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
                  disabled={isReadOnly}
                  style={isReadOnly ? lockedStyle : {}}
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
                  disabled={isReadOnly}
                  style={isReadOnly ? lockedStyle : {}}
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
                  disabled={isReadOnly || isContractLocked}
                  style={(isReadOnly || isContractLocked) ? lockedStyle : {}}
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
                  disabled={isReadOnly || isContractLocked}
                  style={(isReadOnly || isContractLocked) ? lockedStyle : {}}
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
                  disabled={isReadOnly || isContractLocked}
                  style={(isReadOnly || isContractLocked) ? lockedStyle : {}}
                  onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, endDate: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>Fecha de Control</label>
                <input
                  type="date"
                  value={athlete.profile.controlDate}
                  disabled={isReadOnly}
                  style={isReadOnly ? lockedStyle : {}}
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
                    disabled={isReadOnly}
                    onChange={() => handleDayToggle(day)}
                  />
                  {day}
                </label>
              ))}
              {!isReadOnly && (
                <button
                  className="btn btn-add-day main-add-btn"
                  onClick={renderDays}
                  disabled={!athlete.is_active}
                  style={!athlete.is_active ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {}}
                  title={!athlete.is_active ? "No se puede configurar rutina para atletas inactivos" : ""}
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
                    {!isReadOnly && <button className="btn btn-add-day" onClick={() => addGroup(day.name)}>+ Bloque</button>}
                  </div>

                  <div className="day-groups">
                    {day.groups.map(group => (
                      <div key={group.id} className="exercise-group">
                        {!isReadOnly && <button className="btn btn-del" onClick={() => removeGroup(day.name, group.id)}>Eliminar</button>}

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
                          <button className="btn btn-biserie" onClick={() => addBiserie(day.name, group.id)}>
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
                disabled={isLoading || !athlete.is_active}
                style={!athlete.is_active ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {}}
                title={!athlete.is_active ? "No se puede publicar rutina para atletas inactivos" : ""}
              >
                {isLoading ? 'PUBLICANDO...' : (!athlete.is_active ? 'USUARIO INACTIVO' : 'PUBLICAR RUTINA')}
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
