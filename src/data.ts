export const EXERCISES_DB: Record<string, string[]> = {
  "PECHO": ["Press de banca con barra", "Press banca inclinado con mancuernas", "Aperturas en máquina Peck Deck o Contractora", "Cruce de poleas", "Press de banca inclinado con barra", "Press de banca con mancuernas", "Aperturas con mancuernas", "Aperturas Inclinadas con mancuernas", "Press de banca en máquina sentado", "Press de banca declinado con barra", "Press de banca declinado con mancuernas", "Flexiones", "Pull over con mancuerna"],
  "ESPALDA": ["Remo con mancuerna a una mano", "Remo con barra", "Remo en barra T", "Remo en máquina", "Remo inclinado con barra con agarre supinado", "Remo inclinado con mancuernas", "Jalón al pecho con agarre cerrado", "Jalón al pecho con agarre invertido", "Pull over con cuerda", "Pull over en polea con barra", "Jalón con agarre ancho", "Elevaciones en barra fija", "Elevaciones en barra fija con agarre supinado", "Pull over con mancuerna", "Pull over con barra", "Encogimiento de hombros con barra", "Encogimiento de hombros con mancuernas"],
  "HOMBROS": ["Press militar con barra", "Elevaciones laterales", "Pájaros", "Press Arnold", "Elevaciones frontales"],
  "BICEPS": ["Curl con barra", "Curl alterno con mancuerna", "Curl con cuerda en polea", "Curl con barra EZ", "Curl de predicador con barra EZ", "Curl alterno de martillo con mancuernas", "Curl inclinado con mancuernas", "Curl concentrado con mancuerna", "Curl de cable con barra recta en polea baja", "Curl de cable en polea alta de pie", "Curl de muñeca con barra sentado", "Extensión de muñeca con barra sentado"],
  "TRICEPS": ["Extensión de tríceps en polea", "Press francés", "Fondos en paralelas", "Patada de tríceps"],
  "CORE/ABS": ["Rueda", "Plancha", "Plancha lateral", "Crunch", "Crunch oblicuo", "Crunch bicicleta", "Elevaciones de piernas colgado", "Abdominales en máquina", "Abdominales con cuerda en polea alta", "Plancha con flexión", "Abdominales con brazos estirados"],
  "CUADRICEPS":["Hack", "Extensión de pierna", "Extensión de pierna unipodal", "Zancadas", "Prensa de pierna", "Prensa frontal", "Tijera estática", "Step up", "Sentadilla goblet", "Sentadilla Smith", "Sentadilla con peso corporal", "Sentadillas con saltos pliometricos", "Sentadillas isometrica apoyo en pared", "Sentadilla búlgara con peso corporal", "Sentadilla búlgara con mancuernas", "Sentadilla búlgara con barra", "Sentadilla con saco", "Sentadilla en polea baja", "Sentadilla talones elevados", "Sentadilla en banco"],
  "ADUCTOR":["Sentadilla sumó con mancuerna", "Prensa en eversión", "Hack en eversión", "Máquina aductor", "Sentadilla sumo con peso corporal", "Aductor con balón"],
  "FEMORAL":["Peso muerto con barra", "Peso muerto unipodal", "Curl acostado", "Curl acostado unipodal", "Curl sentado", "Curl sentado unipodal", "Prensa alta"],
  "GLUTEO":["Sentadilla libre", "Reverso", "Sentadilla búlgara con inclinación", "Step up con mancuerna", "Patada en polea", "Tijera estatica en Smith", "Sentadilla sumo con barra", "Hip thrusts", "Hip thrusts unipodal", "Puente con banda", "Puente con propio peso", "Puente con balón Fit ball", "Extensión de cadera con mancuerna", "Abducción en máquina", "Abducción unipodal en polea"],
  "PANTORRILLA":["Pantorrilla en prensa", "Pantorrilla en hack", "Planti flexión dorsi flexión en máquina ", "Elevación de talones de pie sin peso", "Elevación de talones en máquina Smit", "Elevación de talones en máquina sentado", "Elevación de talones unipodal con peso", "Elevación de talones unipodal sin peso"],
  "SALTOS": ["Saltar cuerda", "Burpees", "Jumping jacks", "Sprints", "Columpios"],
  "CARDIO": ["Caminadora", "Bicicleta estática", "Elíptica", "Escaladora"]
};

// Real image mapping where available, falls back to a clean placeholder
const PREDEFINED_IMAGES: Record<string, string> = {
  "Flexiones": "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=800",
  "Sentadilla libre": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=800",
  "Elevaciones en barra fija": "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=800",
  "Plancha": "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&q=80&w=800",
  "Zancadas": "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&q=80&w=800",
  "Curl alterno con mancuerna": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=800"
};

export const getImageUrl = (exerciseName: string) => {
  if (!exerciseName) return '';
  if (PREDEFINED_IMAGES[exerciseName]) return PREDEFINED_IMAGES[exerciseName];
  // Beautiful black and gold placeholder referencing the exact exercise dynamically
  return `https://placehold.co/600x400/111/c5a021?text=${encodeURIComponent(exerciseName)}&font=montserrat`;
};
