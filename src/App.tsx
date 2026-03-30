import { useState } from 'react';
import { EXERCISES_DB, getImageUrl } from './data';
import './App.css';

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

interface RoutineDay {
  name: string;
  groups: RoutineGroup[];
}

function App() {
  const [athlete, setAthlete] = useState({
    name: '',
    id: '',
    age: '',
    weight: '',
    goal: 'Definición Muscular'
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const renderDays = () => {
    // Check which days were added/removed
    const newRoutineDays = selectedDays.map(dayName => {
      const existing = routineDays.find(d => d.name === dayName);
      return existing || { name: dayName, groups: [] };
    });
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
                // Handle complex updates
                if (field === 'name') {
                  const valStr = value as string;
                  updated.img = getImageUrl(valStr);
                  updated.isCardio = EXERCISES_DB["CARDIO"].includes(valStr);
                  if (updated.isCardio) {
                    updated.reps = "MIN";
                  } else if (ex.isCardio) {
                    updated.reps = ""; // clear if it was cardio before
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

  const generateClientPortal = () => {
    let routineHtml = '';
    
    routineDays.forEach(day => {
        routineHtml += `
            <div class="client-day-header">
                <span>${day.name}</span>
                <span class="day-contact">
                    @juancarlosgc03_18 | 
                    <svg viewBox="0 0 24 24" width="14" style="vertical-align:middle; margin-left:10px;"><path fill="#c5a021" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>
                    3013806239
                </span>
            </div>`;
            
        day.groups.forEach(group => {
            const isBis = group.exercises.length > 1;
            routineHtml += `<div class="client-ex-card ${isBis ? 'biserie-card' : ''}">`;
            if(isBis) routineHtml += `<div class="biserie-tag">BISERIE (A + B)</div>`;
            
            group.exercises.forEach((ex, idx) => {
                const metricText = ex.reps === "MIN" ? `${ex.series} Minutos` : `${ex.series || '0'} Series x ${ex.reps || '0'} Reps`;
                routineHtml += `
                    <div class="client-row">
                        <div class="client-info">
                            <div class="client-ex-name">${isBis ? (idx===0?'A. ':'B. ') : ''}${ex.name || 'Ejercicio'}</div>
                            <div class="client-metric">${metricText}</div>
                            <div class="client-note">${ex.note}</div>
                        </div>
                        <div class="client-img-large">${ex.img ? `<img src="${ex.img}">` : ''}</div>
                    </div>`;
            });
            routineHtml += `<div class="client-rest-bar">⌛ 3 MINUTOS DE DESCANSO POST-BLOQUE</div></div>`;
        });
    });

    const finalTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Plan - ${athlete.name || 'Atleta'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Montserrat', sans-serif; background: #000; color: #fff; margin: 0; padding: 15px; }
        .wrapper { max-width: 900px; margin: 0 auto; background: #fff; color: #111; border-radius: 20px; overflow: hidden; padding-bottom: 40px;}
        .top-banner { background: #000; color: #fff; padding: 40px 10px; border-bottom: 8px solid #c5a021; text-align:center; }
        .intro-box { padding: 40px; font-size: 14px; text-align: justify; border-bottom: 1px solid #eee; }
        .mv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px 40px; background: #fafafa;}
        .mv-box { border-left: 4px solid #c5a021; padding-left: 15px; font-size: 12px; }
        .client-day-header { background: #000; color: #fff; padding: 15px 40px; font-size: 18px; font-weight: 900; display: flex; justify-content: space-between; align-items: center; }
        .day-contact { font-size: 11px; font-weight: 400; color: #c5a021; display: flex; align-items: center; gap: 5px;}
        .client-ex-card { margin: 20px 40px; border: 2px solid #eee; border-radius: 15px; overflow: hidden; }
        .biserie-card { border-color: #c5a021; border-width: 3px; }
        .biserie-tag { background: #c5a021; color: #fff; text-align: center; padding: 5px; font-weight: 900; font-size: 11px; }
        .client-row { display: grid; grid-template-columns: 1fr 250px; gap: 20px; padding: 25px; border-bottom: 1px solid #eee; align-items: center;}
        .client-ex-name { font-weight: 900; font-size: 20px; color: #000; }
        .client-metric { font-weight: 700; color: #c5a021; margin: 8px 0; font-size: 18px; }
        .client-note { font-size: 13px; color: #666; font-style: italic; }
        .client-img-large img { width: 250px; height: 180px; object-fit: cover; border-radius: 10px; }
        .client-rest-bar { background: #fff8e1; color: #b78d00; text-align: center; padding: 10px; font-weight: 900; font-size: 13px; }
        
        .footer-premium { background: #111; color: #fff; padding: 40px; border-top: 8px solid #c5a021; }
        .footer-premium h3 { color: #c5a021; text-transform: uppercase; margin-top: 0; }
        .recommendations-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px; }
        .rec-item { margin-bottom: 10px; border-left: 2px solid #444; padding-left: 10px; }
        .contact-reminder { margin-top: 30px; text-align: center; background: #c5a021; color: #000; padding: 15px; border-radius: 10px; font-weight: 900; }
        
        @media (max-width: 600px) {
           .mv-grid { grid-template-columns: 1fr; }
           .client-row { grid-template-columns: 1fr; }
           .client-img-large img { width: 100%; height: auto; aspect-ratio: 16/9; }
           .recommendations-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="top-banner">
            <h1 style="margin:0; font-size:45px; font-weight:900;">BODY BY <span style="color:#c5a021">J.A.</span></h1>
            <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:2px;">BY JUAN CARLOS GONZÁLEZ</p>
        </div>

        <div class="intro-box">
            <h2 style="color:#c5a021; margin-top:0">¡Hola, ${athlete.name || 'Atleta'}!</h2>
            <p><strong>Soy Juan Carlos González, TU Entrenador personal.</strong> Mi trabajo se trata de ser tu guía, tu motivador y tu mayor apoyo en este camino. Estoy aquí para ofrecerte el conocimiento y la dedicación que necesitas para transformar tu cuerpo y tu mente. Mi enfoque es totalmente personalizado, garantizando que cada plan esté diseñado para tus objetivos únicos, tus capacidades y tu estilo de vida. Juntos, superaremos cualquier obstáculo y celebraremos cada victoria, por pequeña que sea.</p>
        </div>

        <div class="mv-grid">
            <div class="mv-box"><h4>MISIÓN</h4><p>Empoderar a las personas a través del ejercicio y el conocimiento, creando planes inteligentes que no solo construyan un cuerpo fuerte, sino también una mentalidad resiliente y segura.</p></div>
            <div class="mv-box"><h4>VISIÓN</h4><p>Ser el catalizador del cambio, ayudando a alcanzar un bienestar físico y mental sostenible, convirtiendo la disciplina en un hábito.</p></div>
        </div>

        <div style="margin: 20px 40px; background:#f4f4f4; padding:15px; border-radius:10px; display:flex; justify-content:space-between; font-size:12px; font-weight:bold;">
            <span>OBJETIVO: ${athlete.goal}</span>
            <span>PESO INICIAL: ${athlete.weight || '0'} KG</span>
        </div>

        ${routineHtml}

        <div class="footer-premium">
            <h3>Protocolo de Seguridad y Bienestar</h3>
            <div class="recommendations-grid">
                <div class="rec-item"><strong>Calentamiento:</strong> Realiza 10-15 minutos de movilidad articular y cardio ligero antes de comenzar.</div>
                <div class="rec-item"><strong>Prioridad Técnica:</strong> La técnica siempre va antes que el peso. Si pierdes la forma, reduce la carga inmediatamente.</div>
                <div class="rec-item"><strong>Manejo de Cargas:</strong> Comienza con un peso moderado que puedas controlar perfectamente antes de intentar progresar.</div>
                <div class="rec-item"><strong>Hidratación:</strong> Consume agua en pequeños sorbos antes, durante y después de la sesión.</div>
                <div class="rec-item"><strong>Seguridad:</strong> Asegura bien los discos y utiliza el equipamiento de forma responsable.</div>
                <div class="rec-item"><strong>Enfriamiento:</strong> Al terminar, dedica 5 minutos a estiramientos suaves y respiración controlada.</div>
            </div>

            <div class="contact-reminder">
                ⚠️ ¿Tienes dudas sobre la ejecución o el plan? ¡Contáctame de inmediato para asesorarte!
            </div>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([finalTemplate], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Plan_BODYBYJA_${(athlete.name || 'Atleta').replace(/ /g,'_')}.html`;
    a.click();
  };

  return (
    <div className="admin-container">
      <div className="header">
        <h1>BODY BY <span>J.A.</span></h1>
        <p>CONTROL PANEL | JUAN CARLOS GONZÁLEZ</p>
      </div>

      <div className="section-title">Datos del Atleta</div>
      <div className="grid-inputs">
        <div className="field">
          <label>Nombre del Cliente</label>
          <input type="text" value={athlete.name} onChange={e => setAthlete({...athlete, name: e.target.value})} />
        </div>
        <div className="field">
          <label>ID</label>
          <input type="number" value={athlete.id} onChange={e => setAthlete({...athlete, id: e.target.value})} />
        </div>
        <div className="field">
          <label>Edad</label>
          <input type="number" value={athlete.age} onChange={e => setAthlete({...athlete, age: e.target.value})} />
        </div>
        <div className="field">
          <label>Peso (kg)</label>
          <input type="number" value={athlete.weight} onChange={e => setAthlete({...athlete, weight: e.target.value})} />
        </div>
        <div className="field">
          <label>Objetivo</label>
          <select value={athlete.goal} onChange={e => setAthlete({...athlete, goal: e.target.value})}>
            <option>Definición Muscular</option>
            <option>Volumen Muscular</option>
            <option>Mantenimiento Físico</option>
            <option>Recomposicion Corporal</option>
          </select>
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
                          <select 
                            className="sel-name" 
                            value={ex.name}
                            onChange={(e) => updateExercise(day.name, group.id, ex.id, 'name', e.target.value)}
                          >
                            <option value="">- Seleccionar -</option>
                            {Object.entries(EXERCISES_DB).map(([cat, exercises]) => (
                              <optgroup key={cat} label={cat}>
                                {exercises.map(exName => (
                                  <option key={exName} value={exName}>{exName}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
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
                                  onChange={(e) => updateExercise(day.name, group.id, ex.id, 'series', e.target.value)}
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
                                    onChange={(e) => updateExercise(day.name, group.id, ex.id, 'series', e.target.value)}
                                  />
                                </div>
                                <div className="metric-field">
                                  <label>REPS</label>
                                  <input 
                                    type="text" 
                                    placeholder="R" 
                                    value={ex.reps}
                                    onChange={(e) => updateExercise(day.name, group.id, ex.id, 'reps', e.target.value)}  
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

      <button className="btn btn-generate" onClick={generateClientPortal}>
        GENERAR PLAN PARA EL CLIENTE
      </button>
    </div>
  );
}

export default App;
