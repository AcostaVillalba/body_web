export const EXERCISES_DB: Record<string, string[]> = {
  "PECTORALES": ["Press de banca con barra", "Press banca inclinado con mancuernas", "Aperturas en máquina Peck Deck o Contractora", "Cruce de poleas", "Press de banca inclinado con barra", "Press de banca con mancuernas", "Aperturas con mancuernas", "Aperturas Inclinadas con mancuernas", "Press de banca en máquina sentado", "Press de banca declinado con barra", "Press de banca declinado con mancuernas", "Flexiones", "Pull over con mancuerna", "Press cerrado neutro con mancuerna", "Press banca declinado con mancuernas", "Press banca declinado con barra"],
  "ESPALDA": ["Remo con mancuerna aislado", "Remo con barra en pronacion", "Remo en barra T en supinacion", "Remo en barra T en pronacion", "Remo en máquina en supinacion", "Remo en máquina en pronacion", "Remo en máquina neutro", "Remo con barra en supinacion", "Remo con mancuernas en supinacion", "Remo con mancuernas en pronacion", "Remo en polea baja en pronacion", "Remo aislado en polea baja", "Jalón abierto en pronacion", "Jalón abierto neutro", "Jalón cerrado neutro", "Jalón aislado en polea alta", "Jalón cerrado en supinacion", "Pull over con cuerda", "Pull over en polea con barra", "Jalón en maquina en pronacion", "Dominada abierta", "Dominada cerrada", "Dominada en supinacion", "Pull over con barra", "Remo al menton con barra", "Remo al menton con barra EZ", "Remo al menton con mancuernas", "Remo al menton en polea"],
  "HOMBROS": ["Press militar con mancuerna", "Press militar en maquina", "Face pull", "Elevacion frontal con disco", "Elevacion frontal en polea", "Apertura inversa en maquina", "Vuelos laterales", "Elevacion aislada en polea baja", "Elevacion frontal con barra libre", "Elevacion frontal con banda", "Elevacion frontal con mancuerna en pronacion", "Press militar con barra", "Elevacion frontal neutral alterna con mancuerna"],
  "TRICEPS": ["Fondos en paralelas", "Extension de triceps en maquina", "Copa aislada con mancuerna", "Copa bilateral con mancuerna", "Press frances con barra", "Press frances con mancuerna", "Extension vertical en polea alta con cuerda", "Extension vertical polea alta con barra en V", "Fondos en banco plano", "Patada trasera con mancuerna", "Extension vertical polea alta con barra plana", "Extension horizontal martillo en polea alta"],
  "BICEPS": ["Curl con barra", "Curl alterno con mancuerna", "Curl con cuerda en polea", "Curl con barra EZ", "Curl de predicador con barra EZ", "Curl alterno de martillo con mancuernas", "Curl inclinado con mancuernas", "Curl concentrado con mancuerna", "Curl de cable con barra recta en polea baja", "Curl de cable en polea alta de pie", "Curl de muñeca con barra sentado", "Extensión de muñeca con barra sentado", "Curl en maquina en supinacion"],
  "CORE/ABS": ["Rueda abdominal", "Plancha", "Plancha con rodillas", "Plancha lateral", "Crunch", "Crunch oblicuo", "Crunch superior cruzado", "Crunch inferior sentado", "Crunch cruzado alterno", "Elevaciones de piernas colgado", "Elevaciones de piernas laterales colgado", "Elevaciones de piernas en soporte", "Abdominales en máquina", "Abdominales con cuerda en polea", "Giros rusos", "Crunch inclinado", "Crunch declinado", "Crunch con balon"],
  "CUADRICEPS": ["Sentadilla en Hack", "Extensión de cuadriceps", "Extensión de cuadriceps aislado", "Zancadas delanteras", "Prensa inclinada cerrada", "Prensa horizontal", "Zancada estática", "Step up", "Sentadilla goblet", "Sentadilla en Smith", "Sentadilla con peso corporal", "Sentadillas con salto", "Sentadillas isometrica con apoyo", "Sentadilla búlgara con peso corporal", "Sentadilla búlgara con mancuernas", "Sentadilla búlgara con barra", "Sentadilla en polea baja", "Sentadilla en banco", "Sentadilla abierta con mancuerna"],
  "ADUCTOR": ["Sentadilla sumó con mancuerna", "Aductor en maquina", "Sentadilla sumo sin peso"],
  "FEMORAL": ["Peso muerto con barra", "Peso muerto rumano con barra", "Peso muerto con mancuerna", "Peso muerto aislado", "Curl femoral horizontal", "Curl femoral horizontal aislado", "Curl femoral vertical", "Curl femoral vertical aislado"],
  "GLUTEO": ["Sentadilla libre con barra", "Zancada trasera", "Step up con mancuerna", "Patada aislada de gluteo en polea", "Zancada estatica en Smith", "Sentadilla sumo con barra", "Hip thrusts con barra", "Hip thrusts aislado", "Puente con mancuerna", "Puente con barra", "Puente sin peso", "Abducción en máquina", "Abducción aislada en polea"],
  "PANTORRILLA": ["Extension de gemelos en prensa", "Extension de gemelos en hack", "Planti flexión dorsi flexión en máquina ", "Extension de gemelos de pie sin peso", "Extension de gemelos en máquina Smit", "Extension de gemelos en máquina sentado", "Extension de gemelos con mancuerna", "Extension de gemelos aislado sin peso"],
  "FUNCIONAL": ["Saltar cuerda", "Burpees", "Jumping jacks", "Skipping", "Columpios", "Maquina de remo", "Montañas"],
  "CARDIO": ["Caminadora", "Bicicleta estática", "Bicicleta estática reclinada", "Elíptica", "Bicicleta de aire", "Escaladora"]
};

// Función para normalizar nombres: quita acentos, espacios, guiones y caracteres especiales
const formatFileName = (name: string) => {
  if (!name) return '';
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9]/g, '');      // Mantener SOLO letras y números
};

// Obtenemos todos los archivos y creamos un mapa indexado por nombre normalizado (sin hashes de Vite)
const rawAssets = import.meta.glob('./assets/gifs/*.{gif,webm,mp4}', { eager: true, import: 'default' });

const assetMap: Record<string, string> = {};
Object.entries(rawAssets).forEach(([path, url]) => {
  const fileName = (path.split('/').pop() || '').split('?')[0];
  const nameWithoutExt = fileName.split('.')[0] || '';
  
  // Limpiar el hash de Vite para la CLAVE del mapa (ej: "ejercicio-BGkil9Pa" -> "ejercicio")
  // Pero el VALOR (la url) conservará el hash original para que Vite lo encuentre
  const nameWithoutHash = nameWithoutExt.replace(/-[a-zA-Z0-9]{8,}$/, '');
  
  const normalized = formatFileName(nameWithoutHash);
  if (normalized) {
    assetMap[normalized] = url as string;
  }
});

// Función para obtener la URL de la imagen/video
export const getImageUrl = (exerciseName: string) => {
  if (!exerciseName) return '';
  
  const searchName = formatFileName(exerciseName);
  
  // Coincidencia exacta en el mapa limpio (donde las claves no tienen hashes)
  if (assetMap[searchName]) return assetMap[searchName];

  // Fallback: Placeholder si no hay coincidencia
  return `https://placehold.co/600x400/111/c5a021?text=${encodeURIComponent(exerciseName)}&font=montserrat`;
};

// Función para precargar recursos inteligentemente (imágenes o videos)
export const preloadImage = (url: string) => {
  if (!url) return;
  // Usamos fetch con prioridad baja para poner el archivo (gif o webm) en caché
  fetch(url, { priority: 'low' }).catch(() => { });
};
