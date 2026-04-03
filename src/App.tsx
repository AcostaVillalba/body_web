import { useState } from 'react';
import { EXERCISES_DB, getImageUrl } from './data';
// @ts-ignore
import html2pdf from 'html2pdf.js';
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

interface Athlete {
  name: string;
  id: string;
  age: string;
  weight: string;
  goal: string;
  planType: string;
  startDate: string;
  controlDate: string;
}

function App() {
  const [athlete, setAthlete] = useState<Athlete>({
    name: '',
    id: '',
    age: '',
    weight: '',
    goal: 'Definición Muscular',
    planType: 'Mensual',
    startDate: new Date().toISOString().split('T')[0],
    controlDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })()
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  // Consolidate all exercises for the search datalist (MEJORA INTEGRADA)
  const allExercises = Object.values(EXERCISES_DB).flat().sort();

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

  const generateClientPortal = async () => {
    const imageToBase64 = async (url: string): Promise<string> => {
      if (!url) return '';
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error("Error al cargar imagen para exportar", err);
        return url;
      }
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const controlDateFormatted = formatDate(athlete.controlDate);

    let routineHtml = '';

    for (const day of routineDays) {
      let groupCounter = 1;
      routineHtml += `
            <div class="client-day-header">
                <span>${day.name}</span>
                <span class="day-contact">
                    <svg viewBox="0 0 24 24" width="16" style="vertical-align:middle; margin-right:5px;"><path fill="#fff" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>
                    @juancarlosgc03_18 | 3013806239
                </span>
            </div>
            <div class="day-groups-container">`;

      const dayPrefix = day.name.substring(0, 3).toUpperCase();
      for (const group of day.groups) {
        const isBis = group.exercises.length > 1;
        routineHtml += `<div class="client-ex-card ${isBis ? 'biserie-card' : ''}">
                        <div class="ex-number-badge">${dayPrefix} | EJERCICIO #${groupCounter++}</div>`;
        if (isBis) routineHtml += `<div class="biserie-tag">BISERIE (A + B) / EN SUPER SERIE</div>`;

        for (let idx = 0; idx < group.exercises.length; idx++) {
          const ex = group.exercises[idx];
          const base64Img = await imageToBase64(ex.img);

          const metricText = ex.reps === "MIN" ? `${ex.series} Minutos` : `${ex.series || '0'} Series x ${ex.reps || '0'} Reps`;
          routineHtml += `
                    <div class="client-row">
                        <div class="client-info">
                            <div class="client-ex-name">${isBis ? (idx === 0 ? 'A. ' : 'B. ') : ''}${ex.name || 'Ejercicio'}</div>
                            <div class="client-metric">${metricText}</div>
                            ${ex.note ? `<div class="client-note">${ex.note}</div>` : ''}
                        </div>
                        ${base64Img ? `
                        <div class="client-img-large">
                            <img src="${base64Img}">
                        </div>` : ''}
                    </div>`;
        }
        routineHtml += `<div class="client-rest-bar">⌛ 3 MINUTOS DE DESCANSO POST-BLOQUE</div></div>`;
      }
      routineHtml += `</div>`;
    }

    const finalTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Plan - ${athlete.name || 'Atleta'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #c5a021;
            --bg-body: #f1f5f9;
            --bg-card: #ffffff;
            --text-main: #111111;
            --text-muted: #555555;
            --border-color: #e2e8f0;
        }
        body { font-family: 'Montserrat', sans-serif; background: var(--bg-body); color: var(--text-main); margin: 0; padding: 20px; line-height: 1.6; }
        .wrapper { max-width: 900px; margin: 0 auto; background: var(--bg-card); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); padding-bottom: 0;}
        
        .top-banner { background: #111; color: #fff; padding: 60px 20px; text-align:center; position: relative;}
        .top-banner::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #c5a021, #f5d76e, #c5a021); }
        .top-header h1 { margin: 0; font-size: 61px; font-weight: 900; letter-spacing: 2px;}
        .brand-subtitle { margin:0; font-size:14px; font-weight:700; letter-spacing:4px; color: var(--primary); text-transform: uppercase; margin-top: 10px;}
        
        .intro-box { padding: 50px 40px; border-bottom: 1px solid var(--border-color); }
        .intro-box h2 { color: var(--primary); margin-top:0; font-size: 26px; font-weight: 900; text-transform: uppercase;}
        .intro-box p { font-size: 16px; color: var(--text-muted); text-align: justify; margin-bottom: 0;}

        .mv-grid { display: flex; gap: 30px; padding: 40px; background: #fafafa; border-bottom: 1px solid var(--border-color);}
        .mv-box { flex: 1; border-left: 4px solid var(--primary); padding-left: 20px; }
        .mv-box h4 { margin-top: 0; color: var(--primary); font-weight: 900; letter-spacing: 1px; margin-bottom: 10px; text-transform: uppercase;}
        .mv-box p { font-size: 15px; color: var(--text-muted); margin: 0; }
        
        .stats-bar { margin: 30px 40px; background:#fff; color: #111; padding:20px 30px; border-radius:12px; display:flex; justify-content:space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 4px solid #71a5cb;}
        .stat-item { display: flex; flex-direction: column; gap: 5px;}
        .stat-label { font-size: 11px; color: var(--primary); font-weight: 700; letter-spacing: 1px;}
        .stat-val { font-size: 16px; font-weight: 400; color: #111;}

        .client-day-header { page-break-before: always; break-before: page; background: var(--primary); color: #fff; padding: 20px 40px; font-size: 24px; font-weight: 900; display: flex; justify-content: space-between; align-items: center; margin-top: 40px; text-transform: uppercase;}
        .day-contact { font-size: 13px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; letter-spacing: 1px;}
        
        .day-groups-container { padding: 40px 40px; background: #fff;}
        .client-ex-card { position: relative; page-break-inside: avoid; break-inside: avoid; background: #fff; border: 1px solid var(--border-color); border-radius: 16px; margin-bottom: 35px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden;}
        .ex-number-badge { position: absolute; top: 0; left: 0; background: #f84a4aff; color: #fff; padding: 0 20px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border-bottom-right-radius: 17px; z-index: 10; border-right: 1px solid #991b1b; border-bottom: 1px solid #991b1b; letter-spacing: 1px; text-transform: uppercase; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);}
        .biserie-card { border: 2px solid var(--primary); box-shadow: 0 8px 20px rgba(197, 160, 33, 0.12); }
        .biserie-tag { background: var(--primary); color: #fff; text-align: center; padding: 10px; font-weight: 900; font-size: 13px; letter-spacing: 2px;}
        
        .client-row { display: flex; padding: 30px; border-bottom: 1px solid var(--border-color); gap: 40px; align-items: center; }
        .client-row:last-child { border-bottom: none; }
        .client-info { flex: 1; min-width: 0; }
        .client-ex-name { font-weight: 900; font-size: 22px; color: #111; margin-bottom: 15px; text-transform: uppercase; line-height: 1.2;}
        .client-metric { display: inline-block; background: #fdfaf0; border: 1px solid #f2e3b3; color: #a38210; padding: 10px 20px; border-radius: 30px; font-weight: 800; font-size: 15px; margin-bottom: 15px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);}
        .client-note { font-size: 14px; color: #444; background: #f8f9fa; padding: 15px; border-radius: 10px; border-left: 4px solid var(--primary); font-weight: 500; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-line;}
        
        .client-img-large { flex-shrink: 0; width: 260px; height: 190px; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 15px rgba(0,0,0,0.08); background: #f0f0f0; border: 1px solid #eee;}
        .client-img-large img { width: 100%; height: 100%; object-fit: cover; display: block; }
        
        .client-rest-bar { background: #71a5cbff; color: #f1f5f9; text-align: center; padding: 15px; font-weight: 800; font-size: 14px; letter-spacing: 2px; border-top: 2px solid var(--primary);}
        
        .recommendations-section { page-break-before: always; break-before: page; page-break-inside: avoid; break-inside: avoid; background: #fff; color: #111; padding: 60px 40px; position: relative; border-top: 8px solid var(--primary);}
        .recommendations-section h3 { color: #b91b1b; text-transform: uppercase; margin-top: 0; font-size: 22px; font-weight: 900; margin-bottom: 30px; text-align: center;}
        .recommendations-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 16px; color: #444; line-height: 1.6;}
        .rec-item strong { display: block; margin-bottom: 5px; color: #71a5cb; font-size: 17px;}
        .contact-reminder { margin-top: 50px; text-align: center; background: rgba(248, 74, 74, 0.05); border: 2px solid #f84a4a; color: #111; padding: 25px; border-radius: 16px; font-weight: 700; letter-spacing: 1px; font-size: 17px;}

        .footer-black { background: #111; color: #fff; padding: 50px 40px; position: relative; border-top: 2px solid #333;}
        .coach-contact-section { text-align: center; }
        .coach-contact-section h4 { color: var(--primary); text-transform: uppercase; margin-bottom: 15px; font-size: 18px; font-weight: 900;}
        .contact-details { display: flex; justify-content: center; gap: 40px; font-weight: 700; font-size: 16px;}
        .contact-link { color: #fff; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        
        @media (max-width: 768px) {
           .mv-grid { flex-direction: column; }
           .client-row { flex-direction: column; align-items: stretch; text-align: center; gap: 20px;}
           .client-note { text-align: left; }
           .client-img-large { width: 100%; height: auto; aspect-ratio: 16/10; }
           .recommendations-grid { grid-template-columns: 1fr; }
           .stats-bar { flex-direction: column; gap: 15px; align-items: flex-start; }
           .client-day-header { flex-direction: column; gap: 10px; align-items: flex-start; }
        }
    </style>
</head>
<body>
    <div class=\"wrapper\">
        <div class=\"top-banner\">
            <h1 class=\"brand-logo\">BODY BY <span style=\"color:#c5a021\">J.A.</span></h1>
            <p class=\"brand-subtitle\">Juan Carlos Gonzalez</p>
            <p class=\"brand-subtitle\">Plan de Entrenamiento Personalizado</p>
        </div>

        <div class=\"intro-box\">
            <h2>¡Hola, ${athlete.name || 'Atleta'}!</h2>
            <p><strong>Soy Juan Carlos González, tu entrenador personal.</strong> Mi trabajo se trata de ser tu guía, tu motivador y tu mayor apoyo en este camino. Estoy aquí para ofrecerte el conocimiento y la dedicación que necesitas para transformar tu cuerpo y tu mente. Mi enfoque es totalmente personalizado, garantizando que cada plan esté diseñado para tus objetivos únicos, tus capacidades y tu estilo de vida. Juntos, superaremos cualquier obstáculo y celebraremos cada victoria, por pequeña que sea.</p>
        </div>

        <div class=\"mv-grid\">
            <div class=\"mv-box\"><h4>MISIÓN</h4><p>Empoderar a las personas a través del ejercicio y el conocimiento, creando planes inteligentes que no solo construyan un cuerpo fuerte, sino también una mentalidad resiliente y segura.</p></div>
            <div class=\"mv-box\"><h4>VISIÓN</h4><p>Ser el catalizador del cambio, ayudando a alcanzar un bienestar físico y mental sostenible, convirtiendo la disciplina en un hábito.</p></div>
        </div>


        <div class=\"stats-bar\">
            <div class=\"stat-item\"><span class=\"stat-label\">FECHA DE INICIO</span><span class=\"stat-val\">${formatDate(athlete.startDate)}</span></div>
            <div class=\"stat-item\"><span class=\"stat-label\">FECHA DE CONTROL</span><span class=\"stat-val\">${controlDateFormatted}</span></div>
            <div class=\"stat-item\"><span class=\"stat-label\">TIPO DE PLAN</span><span class=\"stat-val\">${athlete.planType || 'Mensual'}</span></div>
            <div class=\"stat-item\"><span class=\"stat-label\">OBJETIVO PRINCIPAL</span><span class=\"stat-val\">${athlete.goal}</span></div>
            <div class=\"stat-item\"><span class=\"stat-label\">PESO</span><span class=\"stat-val\">${athlete.weight || '--'} KG</span></div>

        </div>

        ${routineHtml}

        <div class=\"recommendations-section\">

            <h3>Protocolo de Reglas y Recomendaciones</h3>
            <div class=\"recommendations-grid\">
                <div class=\"rec-item\"><strong>1. Calentamiento Activo</strong>Realiza 10 minutos de movilidad articular enfocada en los grupos musculares del día antes de comenzar.</div>
                <div class=\"rec-item\"><strong>2. Prioridad Técnica Absoluta</strong>La técnica siempre prevalece sobre el peso. Si no puedes mantener la forma estricta, reduce la carga.</div>
                <div class=\"rec-item\"><strong>3. Sobrecarga Progresiva</strong>Inicia con cargas que domines y apúntalas. Progresa subiendo peso o repeticiones solo cuando la técnica sea perfecta.</div>
                <div class=\"rec-item\"><strong>4. Hidratación Estratégica</strong>Mantente hidratado bebiendo cada 15-20 minutos durante la sesión.</div>
                <div class=\"rec-item\"><strong>5. Recuperación Indispensable</strong>Respeta los descansos pautados en la rutina. El trabajo muscular real se procesa mientras descansas.</div>
                <div class=\"rec-item\"><strong>6. Enfriamiento (Cool-down)</strong>Al terminar la rutina, tómate 5 minutos para estirar estáticamente y estabilizar el ritmo cardíaco.</div>
            </div>

            <div class=\"contact-reminder\">
                ⚠️ Ante cualquier molestia importante o duda técnica, detén el ejercicio y envíame un mensaje de inmediato, con gusto te ayudo a resolverlo. ⚠️
            </div>
        </div>

        <div class=\"footer-black\">
            <div class=\"coach-contact-section\">
                <h4>Juan Carlos Gonzalez</h4>
                <div class=\"contact-details\">
                    <div class=\"contact-link\">
                        <svg viewBox=\"0 0 24 24\" width=\"20\" fill=\"currentColor\"><path d=\"M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z\"/></svg>
                        3013806239
                    </div>
                    <div class=\"contact-link\">
                        <svg viewBox=\"0 0 24 24\" width=\"20\" fill=\"currentColor\"><path d=\"M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M18,4.5A1.5,1.5 0 1,0 19.5,6A1.5,1.5 0 0,0 18,4.5Z\"/></svg>

                        @juancarlosgc03_18
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    // Backup Data: Enviar datos al backend
    try {
      await fetch('http://localhost:8000/api/save-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(athlete)
      });
    } catch (err) {
      console.warn("Backend local apagado o inaccesible, continuando con descarga PDF...", err);
    }

    // Convertir el HTML a PDF usando html2pdf
    const element = document.createElement('div');
    element.innerHTML = finalTemplate;
    // IMPORTANTE: Añadir temporalmente al DOM (invisible) para poder medir posiciones
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '900px'; // Mismo ancho que .wrapper
    document.body.appendChild(element);

    // Obtener las posiciones de los encabezados de día para saber en qué página van
    const dayHeaders = Array.from(element.querySelectorAll('.client-day-header'));
    const dayPositions = dayHeaders.map(h => ({
      name: (h as HTMLElement).innerText.trim(),
      y: (h as HTMLElement).offsetTop
    }));

    const opt = {
      margin: [0.4, 0, 0.4, 0] as [number, number, number, number],
      filename: `Plan_BODYBYJA_${(athlete.name || 'Atleta').replace(/ /g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] as any }
    };

    // Iniciar el proceso con html2pdf
    const worker = html2pdf().from(element).set(opt);
    
    // Hook para añadir la franja sutil en cada página después de generar el PDF pero antes de guardar
    worker.toPdf().get('pdf').then((pdf: any) => {
      const totalPages = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      const canvasHeightPx = element.scrollHeight;

      for (let i = 1; i <= totalPages; i++) {
        // Ignorar la primera página (Banner superior/Misión/Visión)
        if (i === 1) continue;

        pdf.setPage(i);
        
        const currentYPx = (i - 1) * (canvasHeightPx / totalPages);
        let activeDay = "";
        for (const pos of dayPositions) {
          if (pos.y <= (currentYPx + 100)) { 
            activeDay = pos.name;
          }
        }

        if (activeDay) {
          // Dibujar franja sutil (Dorado translúcido)
          pdf.setDrawColor(197, 160, 33);
          pdf.setFillColor(197, 160, 33);
          
          // Intentar usar GState para opacidad si está disponible
          try {
            pdf.setGState(new (pdf as any).GState({ opacity: 0.4 }));
          } catch(e) {
            // Fallback a un color más claro si GState falla
            pdf.setFillColor(235, 215, 150); 
          }
          
          const barHeight = 0.25;
          const barY = 0.08; 
          
          pdf.rect(0, barY, pageWidth, barHeight, 'F');
          
          try {
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
          } catch(e) {}

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${activeDay.toUpperCase()} | @JUANCARLOSGC03_18`, pageWidth / 2, barY + (barHeight / 2) + 0.04, { align: 'center' });
        }
      }
      
      // Limpiar el DOM temporal
      document.body.removeChild(element);
    }).then(() => {
      // Guardar el PDF después de las modificaciones
      worker.save();
    });
  };

  return (
    <>
      <datalist id=\"exercises-list\">
        {allExercises.map(exName => (
          <option key={exName} value={exName} />
        ))}
      </datalist>
      <div className=\"admin-container\">
        <div className=\"header\">
          <h1>BODY BY <span>J.A.</span></h1>
          <p>CONTROL PANEL | JUAN CARLOS GONZÁLEZ</p>
        </div>

        <div className=\"section-title\">Datos del Atleta</div>
        <div className=\"grid-inputs\">
          <div className=\"field\">
            <label>Nombre del Cliente</label>
            <input type=\"text\" value={athlete.name} onChange={e => setAthlete({ ...athlete, name: e.target.value })} />
          </div>
          <div className=\"field\">
            <label>ID</label>
            <input type=\"number\" value={athlete.id} onChange={e => setAthlete({ ...athlete, id: e.target.value })} />
          </div>
          <div className=\"field\">
            <label>Edad</label>
            <input type=\"number\" value={athlete.age} onChange={e => setAthlete({ ...athlete, age: e.target.value })} />
          </div>
          <div className=\"field\">
            <label>Peso (kg)</label>
            <input type=\"number\" value={athlete.weight} onChange={e => setAthlete({ ...athlete, weight: e.target.value })} />
          </div>
          <div className=\"field\">
            <label>Objetivo</label>
            <select value={athlete.goal} onChange={e => setAthlete({ ...athlete, goal: e.target.value })}>
              <option>Definición Muscular</option>
              <option>Volumen Muscular</option>
              <option>Mantenimiento Físico</option>
              <option>Recomposicion Corporal</option>
            </select>
          </div>
          <div className=\"field\">
            <label>Tipo de Plan</label>
            <select value={athlete.planType} onChange={e => setAthlete({ ...athlete, planType: e.target.value })}>
              <option value=\"Mensual\">Mensual</option>
              <option value=\"Dos meses\">Dos meses</option>
              <option value=\"Trimestral\">Trimestral</option>
            </select>
          </div>
          <div className=\"field\">
            <label>Fecha de Inicio</label>
            <input
              type=\"date\"
              value={athlete.startDate}
              onChange={e => {
                const newStart = e.target.value;
                const d = new Date(newStart + 'T12:00:00');
                d.setMonth(d.getMonth() + 1);
                const newControl = d.toISOString().split('T')[0];
                setAthlete({ ...athlete, startDate: newStart, controlDate: newControl });
              }}
            />
          </div>
          <div className=\"field\">
            <label>Fecha de Control (Auto)</label>
            <input type=\"date\" value={athlete.controlDate} readOnly style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
          </div>
        </div>

        <div className=\"section-title\">Configurar Rutina</div>
        <div className=\"days-selector\">
          {daysOfWeek.map(day => (
            <label key={day}>
              <input
                type=\"checkbox\"
                checked={selectedDays.includes(day)}
                onChange={() => handleDayToggle(day)}
              />
              {day}
            </label>
          ))}
          <button className=\"btn btn-add-day main-add-btn\" onClick={renderDays}>
            Crear Días
          </button>
        </div>

        <div id=\"routine-builder\">
          {routineDays.map(day => (
            <div key={day.name} className=\"day-container\">
              <div className=\"day-header\">
                {day.name}
                <button className=\"btn btn-add-day\" onClick={() => addGroup(day.name)}>+ Bloque</button>
              </div>

              <div className=\"day-groups\">
                {day.groups.map(group => (
                  <div key={group.id} className=\"exercise-group\">
                    <button className=\"btn btn-del\" onClick={() => removeGroup(day.name, group.id)}>Eliminar</button>

                    <div className=\"rows-holder\">
                      {group.exercises.map((ex, idx) => (
                        <div key={ex.id} className=\"exercise-sub-row\">
                          <div className=\"field\">
                            <label>{idx === 0 ? 'EJERCICIO' : 'EJERCICIO B'}</label>
                            <input
                              type=\"text\"
                              list=\"exercises-list\"
                              className=\"sel-name\"
                              placeholder=\"Buscar ejercicio...\"
                              value={ex.name}
                              onChange={(e) => updateExercise(day.name, group.id, ex.id, 'name', e.target.value)}
                              onFocus={(e) => e.target.select()}
                            />
                          </div>

                          <div className=\"field\">
                            <label>MÉTRICA</label>
                            <div className=\"metric-split\">
                              {ex.isCardio ? (
                                <div className=\"metric-field\">
                                  <label>TIEMPO (MIN)</label>
                                  <input
                                    type=\"text\"
                                    placeholder=\"00\"
                                    value={ex.series}
                                    onChange={(e) => updateExercise(day.name, group.id, ex.id, 'series', e.target.value)}
                                    style={{ width: 100 }}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className=\"metric-field\">
                                    <label>SERIES</label>
                                    <input
                                      type=\"text\"
                                      placeholder=\"S\"
                                      value={ex.series}
                                      onChange={(e) => updateExercise(day.name, group.id, ex.id, 'series', e.target.value)}
                                    />
                                  </div>
                                  <div className=\"metric-field\">
                                    <label>REPS</label>
                                    <input
                                      type=\"text\"
                                      placeholder=\"R\"
                                      value={ex.reps}
                                      onChange={(e) => updateExercise(day.name, group.id, ex.id, 'reps', e.target.value)}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className=\"field field-notes\">
                            <label>NOTAS DEL COACH</label>
                            <textarea
                              rows={3}
                              value={ex.note}
                              onChange={(e) => updateExercise(day.name, group.id, ex.id, 'note', e.target.value)}
                            />
                          </div>

                          <div className=\"img-preview-box\">
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
                      <button className=\"btn btn-biserie\" onClick={() => addBiserie(day.name, group.id)}>
                        + AGREGAR BISERIE
                      </button>
                    )}
                    <div className=\"rest-time-label\">
                      ⌛ 3 MINUTOS DE DESCANSO POST-BLOQUE
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className=\"btn btn-generate\" onClick={generateClientPortal}>
          GENERAR PLAN PARA EL CLIENTE
        </button>
      </div>
    </>
  );
}

export default App;
