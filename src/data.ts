export const EXERCISES_DB: Record<string, string[]> = {
  "PECHO": ["Press de banca con barra", "Press banca inclinado con mancuernas", "Aperturas en máquina Peck Deck o Contractora", "Cruce de poleas", "Press de banca inclinado con barra", "Press de banca con mancuernas", "Aperturas con mancuernas", "Aperturas Inclinadas con mancuernas", "Press de banca en máquina sentado", "Press de banca declinado con barra", "Press de banca declinado con mancuernas", "Flexiones", "Pull over con mancuerna"],
  "ESPALDA": ["Remo con mancuerna a una mano", "Remo con barra", "Remo en barra T", "Remo en máquina", "Remo inclinado con barra con agarre supinado", "Remo inclinado con mancuernas", "Jalón al pecho con agarre cerrado", "Jalón al pecho con agarre invertido", "Pull over con cuerda", "Pull over en polea con barra", "Jalón con agarre ancho", "Elevaciones en barra fija", "Elevaciones en barra fija con agarre supinado", "Pull over con mancuerna", "Pull over con barra", "Encogimiento de hombros con barra", "Encogimiento de hombros con mancuernas"],
  "HOMBROS": ["Press militar con mancuerna", "Press militar en maquina", "Face pull", "Elevacion frontal con disco", "Elevacion frontal en polea", "Apertura inversa en maquina", "Vuelos laterales", "Elevaciones unilaterales en polea baja", "Elevaciones frontales en agarre neutro", "Elevacion frontal con barra libre"],
  "BICEPS": ["Curl con barra", "Curl alterno con mancuerna", "Curl con cuerda en polea", "Curl con barra EZ", "Curl de predicador con barra EZ", "Curl alterno de martillo con mancuernas", "Curl inclinado con mancuernas", "Curl concentrado con mancuerna", "Curl de cable con barra recta en polea baja", "Curl de cable en polea alta de pie", "Curl de muñeca con barra sentado", "Extensión de muñeca con barra sentado"],
  "TRICEPS": ["Fondos en paralelas", "Maquina agarre neutro", "Copa unilateral con mancuerna", "Copa bilateral con mancuerna", "Rompe craneo con barra", "Rompe craneo con mancuerna", "Maquina agarre neutro", "Polea alta con cuerda", "Polea alta con barra en V", "Fondos en banco plano", "Patada con mancuerna", "Barra plana en polea alta"],
  "CORE/ABS": ["Rueda", "Plancha", "Plancha lateral", "Crunch", "Crunch oblicuo", "Crunch bicicleta", "Elevaciones de piernas colgado", "Abdominales en máquina", "Abdominales con cuerda en polea alta", "Plancha con flexión", "Abdominales con brazos estirados"],
  "CUADRICEPS": ["Hack", "Extensión de pierna", "Extensión de pierna unipodal", "Zancadas", "Prensa de pierna", "Prensa frontal", "Tijera estática", "Step up", "Sentadilla goblet", "Sentadilla Smith", "Sentadilla con peso corporal", "Sentadillas con saltos pliometricos", "Sentadillas isometrica apoyo en pared", "Sentadilla búlgara con peso corporal", "Sentadilla búlgara con mancuernas", "Sentadilla búlgara con barra", "Sentadilla con saco", "Sentadilla en polea baja", "Sentadilla talones elevados", "Sentadilla en banco"],
  "ADUCTOR": ["Sentadilla sumó con mancuerna", "Prensa en eversión", "Hack en eversión", "Máquina aductor", "Sentadilla sumo con peso corporal", "Aductor con balón"],
  "FEMORAL": ["Peso muerto con barra", "Peso muerto unipodal", "Curl acostado", "Curl acostado unipodal", "Curl sentado", "Curl sentado unipodal", "Prensa alta"],
  "GLUTEO": ["Sentadilla libre", "Reverso", "Sentadilla búlgara con inclinación", "Step up con mancuerna", "Patada en polea", "Tijera estatica en Smith", "Sentadilla sumo con barra", "Hip thrusts", "Hip thrusts unipodal", "Puente con banda", "Puente con propio peso", "Puente con balón Fit ball", "Extensión de cadera con mancuerna", "Abducción en máquina", "Abducción unipodal en polea"],
  "PANTORRILLA": ["Pantorrilla en prensa", "Pantorrilla en hack", "Planti flexión dorsi flexión en máquina ", "Elevación de talones de pie sin peso", "Elevación de talones en máquina Smit", "Elevación de talones en máquina sentado", "Elevación de talones unipodal con peso", "Elevación de talones unipodal sin peso"],
  "SALTOS": ["Saltar cuerda", "Burpees", "Jumping jacks", "Sprints", "Columpios"],
  "CARDIO": ["Caminadora", "Bicicleta estática", "Elíptica", "Escaladora"]
};

// Obtenemos todas las imágenes de la carpeta assets
const assetImages = import.meta.glob('../assets/*.{jpg,png,jpeg,webp}', { eager: true, import: 'default' });

// Función para normalizar el nombre del ejercicio al formato de archivo
// ej: "Press de banca con barra" -> "pressdebancaconbarra"
const formatFileName = (name: string) => {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s+/g, '') // spaces to underscores
    .replace(/[^a-z0-9_]/g, ''); // remove special characters
};

export const getImageUrl = (exerciseName: string) => {
  if (!exerciseName) return '';

  const formattedName = formatFileName(exerciseName);

  // Buscamos la imagen ignorando mayúsculas/minúsculas o extensiones exactas
  const matchedPath = Object.keys(assetImages).find(path => {
    // Extraer solo el nombre del archivo de './assets/MiImagen.jpg' -> 'miimagen'
    const fileName = path.split('/').pop()?.split('.')[0] || '';
    // Normalizar el nombre de archivo iterado con la misma función para compararlos
    return formatFileName(fileName) === formattedName;
  });

  if (matchedPath) {
    return assetImages[matchedPath] as string;
  }

  // Placeholder como respaldo si no hay imagen en assets
  return `https://placehold.co/600x400/111/c5a021?text=${encodeURIComponent(exerciseName)}&font=montserrat`;
};
