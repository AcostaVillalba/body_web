import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EXERCISES_DB, getImageUrl } from '../data';
import { LogOut } from 'lucide-react';
import '../App.css';

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
}

export interface CoachDashboardProps {
  preloadedEmail?: string;
  preloadedRoutine?: RoutineDay[];
  hideHeader?: boolean;
  onCancel?: () => void;
}

const CoachDashboard = ({ preloadedEmail, preloadedRoutine, hideHeader, onCancel }: CoachDashboardProps = {}) => {
  const { token, logout, user } = useAuth();
  const [clients, setClients] = useState<AthleteData[]>([]);

  // Auth Headers Helper
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const emptyAthlete: AthleteData = {
    email: '',
    name: '',
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
  
  const isExistingClient = !!athlete.id;
  const isContractLocked = isExistingClient && !isRenewalActive;
  const lockedStyle = { backgroundColor: '#f0f0f0', cursor: 'not-allowed', opacity: 0.8 };

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const allExercises = Object.values(EXERCISES_DB).flat().sort();

  useEffect(() => {
    fetchClients();
  }, []);

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
      if (res.ok) {
        const data = await res.json();
        setClients(data);
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
      // 1. Guardar perfil de cliente si es nuevo
      const profRes = await fetch('http://localhost:8000/api/coach/clients', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...athlete, isRenewal: isRenewalActive })
      });
      if (!profRes.ok) throw new Error("Error guardando el perfil del atleta");

      // 2. Guardar la Rutina
      const routineDataJSON = JSON.stringify(routineDays);
      const res = await fetch('http://localhost:8000/api/coach/routines', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          client_email: athlete.email,
          routine_data: routineDataJSON
        })
      });

      if (!res.ok) throw new Error("Error publicando la rutina");

      setStatusMsg({ type: 'success', text: '¡Rutina publicada y respaldada exitosamente!' });
      setIsRenewalActive(false);
      fetchClients(); // Update client dropdown
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
              <h1>BODY BY <span>J.A.</span></h1>
              <p style={{ margin: '-10px 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#c5a021', textTransform: 'uppercase' }}>BY JUAN CARLOS GONZALES</p>
              <p>CONTROL PANEL | Coach: {user?.name}</p>
            </div>
          </>
        )}

        {onCancel && (
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
        </div>
        <div className="grid-inputs">
          <div className="field">
            <label>Seleccionar Cliente D.B.</label>
            <select onChange={(e) => handleClientSelect(e.target.value)}>
              <option value="">-- Nuevo Cliente --</option>
              {clients.map(c => (
                <option key={c.email} value={c.email}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Email (Req. Google Login)</label>
            <input type="email" value={athlete.email} onChange={e => setAthlete({ ...athlete, email: e.target.value })} placeholder="email@gmail.com" />
          </div>
          <div className="field">
            <label>Nombre del Cliente</label>
            <input type="text" value={athlete.name} onChange={e => setAthlete({ ...athlete, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Edad</label>
            <input
              type="number"
              value={athlete.profile.age}
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
              onChange={e => {
                const val = e.target.value;
                if (val.length <= 3) setAthlete({ ...athlete, profile: { ...athlete.profile, weight: val } });
              }}
            />
          </div>
          <div className="field">
            <label>Objetivo</label>
            <select value={athlete.profile.goal} onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, goal: e.target.value } })}>
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
              disabled={isContractLocked}
              style={isContractLocked ? lockedStyle : {}}
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
              disabled={isContractLocked}
              style={isContractLocked ? lockedStyle : {}}
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
              disabled={isContractLocked}
              style={isContractLocked ? lockedStyle : {}}
              onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, endDate: e.target.value } })}
            />
          </div>
          <div className="field">
            <label>Fecha de Control</label>
            <input 
              type="date" 
              value={athlete.profile.controlDate} 
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
                onChange={() => handleDayToggle(day)}
              />
              {day}
            </label>
          ))}
          <button className="btn btn-add-day main-add-btn" onClick={renderDays}>
            Crear Días
          </button>
        </div>

        <div id="routine-builder">
          {routineDays.map(day => (
            <div key={day.name} className="day-container">
              <div className="day-header">
                {day.name}
                <button className="btn btn-add-day" onClick={() => addGroup(day.name)}>+ Bloque</button>
              </div>

              <div className="day-groups">
                {day.groups.map(group => (
                  <div key={group.id} className="exercise-group">
                    <button className="btn btn-del" onClick={() => removeGroup(day.name, group.id)}>Eliminar</button>

                    <div className="rows-holder">
                      {group.exercises.map((ex, idx) => (
                        <div key={ex.id} className="exercise-sub-row">
                          <div className="field">
                            <label>{idx === 0 ? 'EJERCICIO' : 'EJERCICIO B'}</label>
                            <input
                              type="text"
                              list="exercises-list"
                              className="sel-name"
                              placeholder="Buscar ejercicio..."
                              value={ex.name}
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
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val.length <= 2) updateExercise(day.name, group.id, ex.id, 'series', val);
                                    }}
                                    style={{ width: 100 }}
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
                              onChange={(e) => updateExercise(day.name, group.id, ex.id, 'note', e.target.value)}
                            />
                          </div>

                          <div className="img-preview-box">
                            {ex.img ? (
                              <img src={ex.img} alt={ex.name} />
                            ) : (
                              <span>+ FOTO (Auto)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {group.exercises.length < 2 && (
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

        <button className="btn btn-generate" onClick={publishRoutine} disabled={isLoading}>
          {isLoading ? 'PUBLICANDO...' : 'PUBLICAR RUTINA'}
        </button>
      </div>
    </>
  );
};

export default CoachDashboard;
