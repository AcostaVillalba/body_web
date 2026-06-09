import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EXERCISES_DB, getImageUrl, preloadImage } from '../data';
import { Users, User, PlusCircle, Search, Eye, ArrowLeft, ShieldOff, DollarSign, Filter, RotateCcw, Bell, Menu, X, ChevronDown, ChevronUp, FileText, Shield, Info, Mail, Phone, Save, Edit2, LogOut } from 'lucide-react';
import '../App.css';
import logoBody2 from '../assets/logobody2.png';
import ExerciseImage from '../components/ExerciseImage';
import AvatarUpload from '../components/AvatarUpload';
import InfoModal from '../components/InfoModal';
import API_URL from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';

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
  avg_rating?: number | null;
}

export interface CoachDashboardProps {
  preloadedEmail?: string;
  preloadedRoutine?: RoutineDay[];
  hideHeader?: boolean;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

interface TemplateExercise {
  name: string;
  series: string;
  reps: string;
  isCardio: boolean;
  note?: string;
}

const TEMPLATES_DATA: Record<string, {
  name: string;
  description: string;
  days: {
    name: string;
    exercises: TemplateExercise[];
  }[];
}> = {
  perdida_peso: {
    name: "Pérdida de Peso",
    description: "Enfocada en volumen moderado/alto, ejercicios multiarticulares y acondicionamiento cardiovascular.",
    days: [
      {
        name: "Lunes",
        exercises: [
          { name: "Press de banca con barra", series: "4", reps: "10", isCardio: false },
          { name: "Jalón abierto en pronacion", series: "4", reps: "10", isCardio: false },
          { name: "Press militar con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Curl alterno con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Extension de triceps en maquina", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Martes",
        exercises: [
          { name: "Sentadilla goblet", series: "4", reps: "10", isCardio: false },
          { name: "Peso muerto con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Zancada trasera", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Aductor en maquina", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Miércoles",
        exercises: [
          { name: "Press banca inclinado con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Remo con mancuerna aislado", series: "4", reps: "10", isCardio: false },
          { name: "Vuelos laterales", series: "4", reps: "10", isCardio: false },
          { name: "Curl con barra EZ", series: "4", reps: "10", isCardio: false },
          { name: "Fondos en banco plano", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Jueves",
        exercises: [
          { name: "Extensión de cuadriceps", series: "4", reps: "10", isCardio: false },
          { name: "Curl femoral horizontal", series: "4", reps: "10", isCardio: false },
          { name: "Hip thrusts con barra", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos de pie sin peso", series: "4", reps: "10", isCardio: false },
          { name: "Zancada estática", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Viernes",
        exercises: [
          { name: "Caminadora", series: "30", reps: "MIN", isCardio: true },
          { name: "Plancha", series: "4", reps: "10", isCardio: false, note: "Sostener plancha activa durante 45-60 segundos" },
          { name: "Elíptica", series: "30", reps: "MIN", isCardio: true },
          { name: "Crunch", series: "4", reps: "10", isCardio: false },
          { name: "Giros rusos", series: "4", reps: "10", isCardio: false }
        ]
      }
    ]
  },
  principiantes: {
    name: "Principiantes",
    description: "Ejercicios guiados en máquinas y variantes de peso libre de baja complejidad y menor riesgo de lesión.",
    days: [
      {
        name: "Lunes",
        exercises: [
          { name: "Press de banca en máquina sentado", series: "4", reps: "10", isCardio: false },
          { name: "Jalón en maquina en pronacion", series: "4", reps: "10", isCardio: false },
          { name: "Press militar en maquina", series: "4", reps: "10", isCardio: false },
          { name: "Curl en maquina en supinacion", series: "4", reps: "10", isCardio: false },
          { name: "Extension de triceps en maquina", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Martes",
        exercises: [
          { name: "Prensa inclinada cerrada", series: "4", reps: "10", isCardio: false },
          { name: "Curl femoral horizontal", series: "4", reps: "10", isCardio: false },
          { name: "Abducción en máquina", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos de pie sin peso", series: "4", reps: "10", isCardio: false },
          { name: "Sentadilla goblet", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Miércoles",
        exercises: [
          { name: "Press de banca con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Remo en máquina neutro", series: "4", reps: "10", isCardio: false },
          { name: "Elevaciones laterales en máquina", series: "4", reps: "10", isCardio: false },
          { name: "Curl alterno con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Fondos en banco plano", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Jueves",
        exercises: [
          { name: "Sentadilla en banco", series: "4", reps: "10", isCardio: false },
          { name: "Peso muerto con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Hip thrusts aislado", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Prensa horizontal", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Viernes",
        exercises: [
          { name: "Caminadora", series: "30", reps: "MIN", isCardio: true },
          { name: "Crunch", series: "4", reps: "10", isCardio: false },
          { name: "Bicicleta estática", series: "30", reps: "MIN", isCardio: true },
          { name: "Plancha", series: "4", reps: "10", isCardio: false, note: "Mantener postura recta y core activo" },
          { name: "Giros rusos", series: "4", reps: "10", isCardio: false }
        ]
      }
    ]
  },
  musculatura: {
    name: "Musculatura",
    description: "Centrada en movimientos compuestos pesados de hipertrofia y desarrollo muscular.",
    days: [
      {
        name: "Lunes",
        exercises: [
          { name: "Press de banca con barra", series: "4", reps: "10", isCardio: false },
          { name: "Remo con barra en supinacion", series: "4", reps: "10", isCardio: false },
          { name: "Press militar con barra", series: "4", reps: "10", isCardio: false },
          { name: "Curl con barra EZ", series: "4", reps: "10", isCardio: false },
          { name: "Press cerrado con barra", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Martes",
        exercises: [
          { name: "Sentadilla libre con barra", series: "4", reps: "10", isCardio: false },
          { name: "Peso muerto rumano con barra", series: "4", reps: "10", isCardio: false },
          { name: "Sentadilla búlgara con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos en prensa", series: "4", reps: "10", isCardio: false },
          { name: "Aductor en maquina", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Miércoles",
        exercises: [
          { name: "Press banca inclinado con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Jalón cerrado en supinacion", series: "4", reps: "10", isCardio: false },
          { name: "Elevaciones laterales en máquina", series: "4", reps: "10", isCardio: false },
          { name: "Curl inclinado con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Fondos en paralelas", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Jueves",
        exercises: [
          { name: "Prensa horizontal", series: "4", reps: "10", isCardio: false },
          { name: "Curl femoral vertical", series: "4", reps: "10", isCardio: false },
          { name: "Hip thrusts con barra", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos de pie sin peso", series: "4", reps: "10", isCardio: false },
          { name: "Sentadilla en Hack", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Viernes",
        exercises: [
          { name: "Escaladora", series: "30", reps: "MIN", isCardio: true },
          { name: "Rueda abdominal", series: "4", reps: "10", isCardio: false },
          { name: "Elevaciones de piernas colgado", series: "4", reps: "10", isCardio: false },
          { name: "Caminadora", series: "30", reps: "MIN", isCardio: true },
          { name: "Plancha", series: "4", reps: "10", isCardio: false }
        ]
      }
    ]
  },
  recomposicion: {
    name: "Recomposición",
    description: "Plan equilibrado de fuerza/hipertrofia y acondicionamiento metabólico constante.",
    days: [
      {
        name: "Lunes",
        exercises: [
          { name: "Press de banca con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Remo en barra T en supinacion", series: "4", reps: "10", isCardio: false },
          { name: "Press Arnold con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Curl concentrado con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Copa aislada con mancuerna", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Martes",
        exercises: [
          { name: "Sentadilla en Hack", series: "4", reps: "10", isCardio: false },
          { name: "Peso muerto rumano con barra", series: "4", reps: "10", isCardio: false },
          { name: "Zancada trasera", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos en máquina Smit", series: "4", reps: "10", isCardio: false },
          { name: "Sentadilla goblet", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Miércoles",
        exercises: [
          { name: "Aperturas con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Jalón abierto en pronacion", series: "4", reps: "10", isCardio: false },
          { name: "Vuelos laterales", series: "4", reps: "10", isCardio: false },
          { name: "Curl alterno de martillo con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Press frances con barra", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Jueves",
        exercises: [
          { name: "Sentadilla búlgara con mancuernas", series: "4", reps: "10", isCardio: false },
          { name: "Curl femoral horizontal", series: "4", reps: "10", isCardio: false },
          { name: "Hip thrusts con barra", series: "4", reps: "10", isCardio: false },
          { name: "Extension de gemelos con mancuerna", series: "4", reps: "10", isCardio: false },
          { name: "Aductor en maquina", series: "4", reps: "10", isCardio: false }
        ]
      },
      {
        name: "Viernes",
        exercises: [
          { name: "Bicicleta de aire", series: "30", reps: "MIN", isCardio: true },
          { name: "Giros rusos", series: "4", reps: "10", isCardio: false },
          { name: "Caminadora", series: "30", reps: "MIN", isCardio: true },
          { name: "Plancha", series: "4", reps: "10", isCardio: false },
          { name: "Rueda abdominal", series: "4", reps: "10", isCardio: false }
        ]
      }
    ]
  }
};

export default function CoachDashboard({ preloadedEmail, preloadedRoutine, hideHeader, onCancel, isReadOnly: propIsReadOnly }: CoachDashboardProps = {}) {
  const { token, logout, user, setIsLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const transactionId = searchParams.get('id');

  const [wompiLoading, setWompiLoading] = useState(false);
  const [wompiParams, setWompiParams] = useState<any>(null);
  const [wompiError, setWompiError] = useState<string | null>(null);

  const [checkingTransaction, setCheckingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'create' | 'users' | 'payments' | 'payment_history' | 'profile'>(preloadedEmail ? 'create' : 'create');

  useEffect(() => {
    console.log("CoachDashboard V2 Loaded, Tab:", activeTab);
  }, [activeTab]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(propIsReadOnly || false);
  const [clients, setClients] = useState<AthleteData[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Weight History States
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [weightFilter, setWeightFilter] = useState<'month' | 'year'>('month');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [showWeightProgress, setShowWeightProgress] = useState(false);

  // Bloqueo de Coach Inactivo
  const isCoachBlocked = user?.role === 'Coach' && !user.isActive;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [dayRatings, setDayRatings] = useState<Record<string, number>>({});

  // Auth Headers Helper
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

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

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isNotifOpen && !target.closest('.notif-container')) {
        setIsNotifOpen(false);
      }
      if (isFiltersOpen && !target.closest('.filter-container')) {
        setIsFiltersOpen(false);
      }
    };
    document.onmousedown = handleClickOutside;
    return () => { document.onmousedown = null; };
  }, [isNotifOpen, isFiltersOpen]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // WOMPI payment initialization and redirection effects
  useEffect(() => {
    if (transactionId) {
      setActiveTab('payments');
      checkTransactionStatus(transactionId);
    }
  }, [transactionId]);

  useEffect(() => {
    if (!wompiParams) return;

    const container = document.getElementById('wompi-widget-container');
    if (!container) return;
    container.innerHTML = '';

    const form = document.createElement('form');
    const script = document.createElement('script');
    script.src = "https://checkout.wompi.co/widget.js";
    script.setAttribute('data-render', 'button');
    script.setAttribute('data-public-key', wompiParams.public_key);
    script.setAttribute('data-currency', wompiParams.currency || 'COP');
    script.setAttribute('data-amount-in-cents', wompiParams.amount_in_cents.toString());
    script.setAttribute('data-reference', wompiParams.reference);
    // Firma de integridad activa (comprobada y completamente funcional)
    script.setAttribute('data-signature:integrity', wompiParams.signature);
    script.setAttribute('data-customer-data:email', wompiParams.email);
    script.setAttribute('data-customer-data:full-name', wompiParams.full_name);
    
    // NOTA DE DESARROLLO/SEGURIDAD: 'data-redirect-url' se mantiene comentado en local
    // porque el cortafuegos (WAF) de CloudFront de Wompi bloquea peticiones HTTP con "localhost"
    // en los parámetros (error 403). Para redirección local, configúrala en el Dashboard de Wompi.
    // En producción (usando HTTPS), puedes descomentar las siguientes dos líneas:
    // const redirectUrl = `${window.location.origin}/coach`;
    // script.setAttribute('data-redirect-url', redirectUrl);

    form.appendChild(script);
    container.appendChild(form);

    // Auto click to trigger Wompi modal checkout instantly
    const interval = setInterval(() => {
      const btn = form.querySelector('button');
      if (btn) {
        btn.click();
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
    };
  }, [wompiParams]);

  const handlePayWithWompi = async () => {
    setWompiLoading(true);
    setWompiError(null);
    setWompiParams(null);
    try {
      const res = await fetch(`${API_URL}/api/wompi/preparar-pago`, {
        method: 'POST',
        headers: authHeaders
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al preparar el pago seguro.");
      }
      const data = await res.json();
      setWompiParams(data);
    } catch (err: any) {
      console.error(err);
      setWompiError(err.message || "Error al conectar con la pasarela de pagos.");
    } finally {
      setWompiLoading(false);
    }
  };

  const checkTransactionStatus = async (txId: string) => {
    setCheckingTransaction(true);
    setTransactionResult(null);
    try {
      const res = await fetch(`${API_URL}/api/wompi/transaccion/${txId}`);
      if (!res.ok) throw new Error("Error al consultar el estado del pago.");
      const data = await res.json();
      setTransactionResult(data);
      if (data.status === 'APPROVED') {
        fetchPayments();
      }
    } catch (err: any) {
      console.error(err);
      setTransactionResult({ status: 'ERROR', message: err.message });
    } finally {
      setCheckingTransaction(false);
    }
  };

  const handleClearTransactionId = () => {
    setSearchParams({});
    setTransactionResult(null);
  };

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
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);
  const [activeBlockIndices, setActiveBlockIndices] = useState<Record<string, number>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [isModifyingRoutine, setIsModifyingRoutine] = useState(false);
  const [showAthleteDetails, setShowAthleteDetails] = useState(false);
  const [backupRoutineDays, setBackupRoutineDays] = useState<RoutineDay[]>([]);
  const [backupSelectedDays, setBackupSelectedDays] = useState<string[]>([]);
  const [backupWeight, setBackupWeight] = useState<string>('');
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isRenewalActive, setIsRenewalActive] = useState(false);
  const [coaches, setCoaches] = useState<{ id: number, name: string, email: string }[]>([]);

  // Profile State
  const [coachProfile, setCoachProfile] = useState({
    email: user?.email || '',
    phone: '',
    instagram: '',
    presentation: '',
    mission: '',
    vision: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const countWords = (str: string) => {
    return str.trim() === '' ? 0 : str.trim().split(/\s+/).length;
  };

  const fetchCoachProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/profile`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setCoachProfile({
          email: data.email || user?.email || '',
          phone: data.phone || '',
          instagram: data.instagram || '',
          presentation: data.presentation || '',
          mission: data.mission || '',
          vision: data.vision || ''
        });
      }
    } catch (e) { console.error("Error fetching coach profile", e); }
  };

  const handleUpdateProfile = async () => {
    if (countWords(coachProfile.presentation) > 100) return alert("La presentación no puede exceder las 100 palabras.");
    if (countWords(coachProfile.mission) > 50) return alert("La misión no puede exceder las 50 palabras.");
    if (countWords(coachProfile.vision) > 50) return alert("La visión no puede exceder las 50 palabras.");

    setIsLoadingLocal(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch(`${API_URL}/api/coach/profile`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(coachProfile)
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Perfil actualizado correctamente' });
        setIsEditingProfile(false);
        // Silent refresh: fetch from server to ensure source of truth
        await fetchCoachProfile();
      } else {
        throw new Error("Error al actualizar el perfil");
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Error al conectar con el servidor' });
    } finally {
      setIsLoadingLocal(false);
    }
  };

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
    } finally {
      setIsLoading(false);
    }
  };

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/payments`, { headers: authHeaders });
      if (res.ok) setPayments(await res.json());
    } catch (e) { console.error("Error fetching payments", e); }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/payments/history`, { headers: authHeaders });
      if (res.ok) setPaymentHistory(await res.json());
    } catch (e) { console.error("Error fetching payment history", e); }
  };

  const downloadInvoice = (batch: any) => {
    const doc = new jsPDF();
    doc.setFillColor(45, 71, 57);
    doc.rect(0, 0, 210, 45, 'F');
    try { doc.addImage(logoBody2, 'PNG', 15, 10, 25, 25); } catch (e) { }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA DE LIQUIDACION', 110, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text('BODY LOGIC - CONTROL DE PAGOS', 110, 32, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACION DEL COACH', 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${batch.coach_name}`, 15, 67);
    doc.text(`ID de Lote: ${batch.batch_id}`, 15, 73);
    doc.text(`Fecha de Pago: ${batch.date}`, 15, 79);

    autoTable(doc, {
      startY: 90,
      head: [['ATLETA / CORREO', 'TRAMITE', 'PLAN', 'PERIODO', 'FECHA REG.', 'MONTO']],
      body: batch.clients.map((c: any) => [
        `${c.name}\n${c.email || ''}`,
        c.tramite || 'Nuevo',
        c.plan_type,
        `${c.start_date} - ${c.end_date}`,
        c.reg_date || batch.date,
        `$${c.amount.toLocaleString()}`
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [45, 71, 57], textColor: [255, 255, 255], fontStyle: 'bold' },
      foot: [['', '', '', '', 'TOTAL PAGADO', `$${batch.total_amount.toLocaleString()}`]],
      footStyles: { fillColor: [241, 245, 249], textColor: [45, 71, 57], fontStyle: 'bold' },
      theme: 'striped',
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Este documento sirve como comprobante de pago realizado por el coach a Body Logic.', 105, finalY + 20, { align: 'center' });
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, finalY + 27, { align: 'center' });
    doc.save(`Factura_${batch.coach_name}_${batch.date.replace(/\//g, '-')}.pdf`);
  };

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments();
    if (activeTab === 'payment_history') fetchPaymentHistory();
    if (activeTab === 'profile') fetchCoachProfile();
  }, [activeTab]);

  const handleClientSelect = async (email: string) => {
    setIsRenewalActive(false);
    setActiveBlockIndices({});
    setExpandedDays({});
    setIsModifyingRoutine(false);
    setShowAthleteDetails(false);
    if (!email) {
      setAthlete({ ...emptyAthlete, id: undefined });
      setWeightHistory([]);
      return;
    }
    const selected = clients.find(c => c.email === email);
    if (selected) {
      setAthlete(selected);
      try {
        const wRes = await fetch(`${API_URL}/api/coach/client/weight-history/${email}`, { headers: authHeaders });
        if (wRes.ok) {
          const wData = await wRes.json();
          setWeightHistory(wData);
        } else {
          setWeightHistory([]);
        }
      } catch (err) {
        console.error("Error loading client weight history", err);
        setWeightHistory([]);
      }
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
    setIsLoadingLocal(true);
    setIsReadOnly(true);
    setActiveBlockIndices({});
    setExpandedDays({});
    setIsModifyingRoutine(false);
    setShowAthleteDetails(false);
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
          setDayRatings(data.ratings_by_day || {});
        } else {
          setRoutineDays([]);
          setSelectedDays([]);
          setDayRatings({});
        }

        const client = clients.find(c => c.email === clientEmail);
        if (client) setAthlete(client);
      }

      // Fetch client weight history
      try {
        const wRes = await fetch(`${API_URL}/api/coach/client/weight-history/${clientEmail}`, { headers: authHeaders });
        if (wRes.ok) {
          const wData = await wRes.json();
          setWeightHistory(wData);
        } else {
          setWeightHistory([]);
        }
      } catch (err) {
        console.error("Error loading client weight history", err);
        setWeightHistory([]);
      }
    } catch (e) {
      console.error("Error loading routine", e);
      setDayRatings({});
    } finally {
      setIsLoadingLocal(false);
      setActiveTab('create'); // Reutilizamos la vista de creación pero en modo lectura
    }
  };

  const handleBackToList = () => {
    setIsReadOnly(false);
    setActiveTab('users');
    setAthlete(emptyAthlete);
    setRoutineDays([]);
    setSelectedDays([]);
    setDayRatings({});
    setWeightHistory([]);
    setWeightFilter('month');
    setHoveredPoint(null);
    setShowWeightProgress(false);
    setActiveBlockIndices({});
    setExpandedDays({});
    setIsModifyingRoutine(false);
    setShowAthleteDetails(false);
  };

  const handleAcceptRenewal = async () => {
    if (!athlete.email) return;
    setIsLoadingLocal(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // Logic: If startDate <= today, then is_active = true
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(athlete.profile.startDate + 'T12:00:00');
      start.setHours(0, 0, 0, 0);
      const shouldBeActive = start <= today;

      const res = await fetch(`${API_URL}/api/admin/renew-plan`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...athlete, is_active: shouldBeActive })
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
      setIsLoadingLocal(false);
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

  const toggleDayExpanded = (dayName: string) => {
    setExpandedDays(prev => ({ ...prev, [dayName]: !prev[dayName] }));
  };

  const startModifyingRoutine = () => {
    setBackupRoutineDays(JSON.parse(JSON.stringify(routineDays)));
    setBackupSelectedDays([...selectedDays]);
    setBackupWeight(athlete.profile.weight || '');
    setIsModifyingRoutine(true);
    setStatusMsg({ type: '', text: '' });
  };

  const cancelModifyingRoutine = () => {
    setRoutineDays(backupRoutineDays);
    setSelectedDays(backupSelectedDays);
    setAthlete(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        weight: backupWeight
      }
    }));
    setIsModifyingRoutine(false);
    setStatusMsg({ type: '', text: '' });
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
    let newIndex = 0;
    setRoutineDays(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        newIndex = day.groups.length;
        return {
          ...day,
          groups: [...day.groups, {
            id: Date.now().toString() + Math.random(),
            exercises: [createEmptyExercise()]
          }]
        };
      })
    );
    setActiveBlockIndices(prev => ({ ...prev, [dayName]: newIndex }));
  };

  const removeGroup = (dayName: string, groupId: string) => {
    let newIndex = 0;
    setRoutineDays(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        const filtered = day.groups.filter(g => g.id !== groupId);
        const currentIdx = activeBlockIndices[dayName] || 0;
        newIndex = currentIdx >= filtered.length ? Math.max(0, filtered.length - 1) : currentIdx;
        return {
          ...day,
          groups: filtered
        };
      })
    );
    setActiveBlockIndices(prev => ({ ...prev, [dayName]: newIndex }));
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

  const applyTemplate = (templateKey: string) => {
    const template = TEMPLATES_DATA[templateKey];
    if (!template) return;

    if (routineDays.length > 0) {
      const confirmOverwrite = window.confirm(
        "¿Estás seguro de que deseas cargar esta plantilla? Se sobrescribirá la rutina actual que tienes en edición."
      );
      if (!confirmOverwrite) return;
    }

    const templateDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    setSelectedDays(templateDays);

    const populatedDays: RoutineDay[] = template.days.map((d, dayIdx) => {
      return {
        name: d.name,
        groups: d.exercises.map((ex, exIdx) => ({
          id: Date.now().toString() + "-" + Math.random().toString() + "-g-" + dayIdx + "-" + exIdx,
          exercises: [{
            id: Date.now().toString() + "-" + Math.random().toString() + "-ex-" + dayIdx + "-" + exIdx,
            name: ex.name,
            series: ex.series,
            reps: ex.reps,
            isCardio: ex.isCardio,
            note: ex.note || '',
            img: getImageUrl(ex.name)
          }]
        }))
      };
    });

    setRoutineDays(populatedDays);

    const indices: Record<string, number> = {};
    templateDays.forEach(dayName => {
      indices[dayName] = 0;
    });
    setActiveBlockIndices(indices);

    const expanded: Record<string, boolean> = {};
    templateDays.forEach(dayName => {
      expanded[dayName] = true;
    });
    setExpandedDays(expanded);

    setStatusMsg({ type: 'success', text: `¡Plantilla "${template.name}" cargada correctamente! Recuerda que puedes modificarla a tu conveniencia.` });
    setIsTemplatesExpanded(false);
  };

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

    setIsLoadingLocal(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // Logic: If startDate <= today, then is_active = true
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(athlete.profile.startDate + 'T12:00:00');
      start.setHours(0, 0, 0, 0);
      const shouldBeActive = start <= today;

      // Unificamos el guardado de perfil y rutina en una sola petición atómica
      const res = await fetch(`${API_URL}/api/coach/publish-all`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          athlete: { ...athlete, is_active: shouldBeActive, isRenewal: isReadOnly ? false : isRenewalActive },
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

      if (!res.ok) throw new Error(isReadOnly ? "Error actualizando la rutina" : "Error publicando la rutina");

      setStatusMsg({ type: 'success', text: isReadOnly ? '¡Rutina actualizada exitosamente!' : '¡Rutina publicada y respaldada exitosamente!' });
      setIsRenewalActive(false);
      setIsModifyingRoutine(false);
      fetchClients();

      if (isReadOnly) {
        // Refrescar el historial de peso del atleta para reflejar el cambio en la gráfica
        try {
          const wRes = await fetch(`${API_URL}/api/coach/client/weight-history/${athlete.email}`, { headers: authHeaders });
          if (wRes.ok) {
            const wData = await wRes.json();
            setWeightHistory(wData);
          }
        } catch (wErr) {
          console.error("Error al refrescar el historial de peso", wErr);
        }
      } else {
        // Clear only routine while keeping athlete and message
        setRoutineDays([]);
        setSelectedDays([]);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error desconocido' });
    } finally {
      setIsLoadingLocal(false);
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
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .filters-dropdown, .notif-dropdown {
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
          .filters-overlay, .notif-overlay {
            display: block !important;
          }
        }
      `}</style>
      <div style={{ background: '#f4f7f5', minHeight: '100vh', paddingBottom: 40, fontFamily: "'Montserrat', sans-serif", position: 'relative' }}>
        {/* Background Watermark */}
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundImage: `url(${logoBody2})`, backgroundRepeat: 'repeat', backgroundSize: '200px',
          opacity: 0.08, pointerEvents: 'none', zIndex: 0
        }} />

        {!hideHeader && (
          <>
            {/* Navigation - Hamburger / Sidebar */}
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '70px',
              background: '#2d4739',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              color: '#fff',
              zIndex: 1000,
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px'
                  }}>
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
                {/* Notificaciones */}
                <div className="notif-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Bell size={24} />
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid #2d4739' }}>
                        {notifications.filter(n => !n.is_read).length}
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
                      <div className="notif-dropdown" style={{ position: 'absolute', top: 40, right: 0, width: 320, background: '#fff', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1100, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b' }}>NOTIFICACIONES</h4>
                          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{notifications.length} TOTAL</span>
                        </div>
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                          {notifications.map(n => (
                            <div key={n.id} style={{ padding: 15, borderBottom: '1px solid #f1f5f9', background: n.is_read ? '#fff' : '#f0fdf4', position: 'relative' }}>
                              <p style={{ margin: '0 0 5px 0', fontSize: 12, lineHeight: '1.4', color: '#334155', fontWeight: n.is_read ? 500 : 700 }}>{n.message}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                                <div style={{ display: 'flex', gap: 10 }}>
                                  {!n.is_read && <button onClick={() => markNotifRead(n.id)} style={{ background: 'transparent', border: 'none', color: '#a2d149', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>LEÍDA</button>}
                                  <button onClick={() => deleteNotif(n.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>ELIMINAR</button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {notifications.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No tienes notificaciones</div>}
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

            {/* Sidebar Overlay */}
            {isMenuOpen && (
              <div
                onClick={() => setIsMenuOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 998,
                  backdropFilter: 'blur(4px)'
                }}
              />
            )}

            {/* Sidebar Menu */}
            <div style={{
              position: 'fixed',
              top: '70px',
              left: isMenuOpen ? 0 : '-320px',
              width: '280px',
              maxWidth: '85vw',
              height: 'calc(100vh - 70px)',
              background: '#fff',
              zIndex: 999,
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 0',
              overflowY: 'auto'
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: user?.isActive ? '#10b981' : '#ef4444' }}></span>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                    {user?.isActive ? 'COACH ACTIVO' : 'COACH INACTIVO'}
                  </p>
                </div>
              </div>

              <div style={{ flex: 1, padding: '10px 15px', overflowY: 'auto' }}>
                {[
                  { id: 'create', label: 'CREAR RUTINA', icon: <PlusCircle size={20} /> },
                  { id: 'users', label: 'MIS CLIENTES', icon: <Users size={20} /> },
                  { id: 'profile', label: 'MI PERFIL', icon: <User size={20} /> },
                  { id: 'payments', label: 'CONTROL DE PAGOS', icon: <DollarSign size={20} /> },
                  { id: 'payment_history', label: 'HISTORIAL DE PAGOS', icon: <FileText size={20} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    disabled={tab.id !== 'payments' && isCoachBlocked}
                    onClick={() => { setActiveTab(tab.id as any); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 16px',
                      marginBottom: '4px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: (tab.id !== 'payments' && isCoachBlocked) ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '11px',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      background: activeTab === tab.id ? '#f0fdf4' : 'transparent',
                      color: activeTab === tab.id ? '#2d4739' : (tab.id !== 'payments' && isCoachBlocked ? '#cbd5e1' : '#64748b'),
                      borderLeft: activeTab === tab.id ? '4px solid #a2d149' : '4px solid transparent',
                      opacity: (tab.id !== 'payments' && isCoachBlocked) ? 0.6 : 1
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
                    marginTop: '15px',
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
          </>
        )}

        <div style={{
          paddingTop: hideHeader ? '0' : '100px',
          maxWidth: 1400,
          margin: '0 auto',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '40px'
        }}>

          {isCoachBlocked && (
            <div style={{
              background: '#fee2e2', color: '#991b1b', padding: '15px 20px', borderRadius: 12, border: '1px solid #fecaca',
              marginBottom: 25, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 14, position: 'relative', zIndex: 1
            }}>
              <ShieldOff size={24} />
              <div>
                <p style={{ margin: 0 }}>CUENTA DE COACH INACTIVA</p>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 12 }}>Tu acceso a la gestión de clientes está restringido. Por favor, realiza el pago de tu saldo para reactivar tu cuenta.</p>
              </div>
            </div>
          )}

          {activeTab === 'payments' ? (
            <div style={{ padding: '0 0 20px 0' }}>
              <h2 className="section-title" style={{ marginBottom: '4px' }}>Control de Pago a Body Logic</h2>
              <p style={{ margin: '0 0 20px 0', fontSize: 'clamp(11px, 2vw, 13px)', color: '#64748b', fontWeight: 500, lineHeight: '1.4' }}>
                Administra los saldos pendientes de tus asesorías y mantén un control preciso de los montos a liquidar con Body Logic.
              </p>

              {/* Wompi Hidden Iframe / Widget Container */}
              <div id="wompi-widget-container" style={{ display: 'none' }}></div>

              {/* Status and Feedback Alerts */}
              {checkingTransaction && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  padding: '25px 20px',
                  textAlign: 'center',
                  marginBottom: 25,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12
                }}>
                  <div style={{
                    border: '4px solid rgba(45, 71, 57, 0.1)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    borderLeftColor: '#a2d149',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2d4739' }}>
                    Verificando estado de tu pago en WOMPI...
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                    Por favor no cierres ni recargues la página mientras consultamos al servidor.
                  </p>
                </div>
              )}

              {transactionResult && (
                <div style={{
                  background: transactionResult.status === 'APPROVED' ? '#f0fdf4' : (transactionResult.status === 'PENDING' ? '#fffbeb' : '#fef2f2'),
                  border: `1px solid ${transactionResult.status === 'APPROVED' ? '#bbf7d0' : (transactionResult.status === 'PENDING' ? '#fef3c7' : '#fecaca')}`,
                  color: transactionResult.status === 'APPROVED' ? '#166534' : (transactionResult.status === 'PENDING' ? '#92400e' : '#991b1b'),
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 25,
                  position: 'relative',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  <button
                    onClick={handleClearTransactionId}
                    style={{
                      position: 'absolute',
                      top: 15,
                      right: 15,
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 900
                    }}
                  >
                    <X size={18} />
                  </button>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {transactionResult.status === 'APPROVED' ? '🎉 ¡Pago Aprobado Exitosamente!' :
                      transactionResult.status === 'PENDING' ? '⏳ Pago en Proceso' : '❌ Pago no Completado'}
                  </h3>
                  <p style={{ margin: '0 0 15px 0', fontSize: 12, fontWeight: 500, lineHeight: 1.5 }}>
                    {transactionResult.status === 'APPROVED' ?
                      'El pago de tu saldo pendiente ha sido validado. Tu cuenta se encuentra activa y todos tus atletas asociados han sido renovados.' :
                      transactionResult.status === 'PENDING' ?
                        'WOMPI está procesando la transacción de forma asíncrona. Esto puede tomar unos minutos dependiendo del banco.' :
                        `La transacción no pudo ser completada. Razón: ${transactionResult.status || 'Rechazada por el procesador'}. Por favor, vuelve a intentarlo.`}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, background: 'rgba(255, 255, 255, 0.6)', padding: 12, borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                    <div><strong>Referencia de Lote:</strong> {transactionResult.reference}</div>
                    <div><strong>ID WOMPI:</strong> {transactionResult.id}</div>
                    <div><strong>Monto:</strong> ${(transactionResult.amount_in_cents / 100).toLocaleString()} {transactionResult.currency || 'COP'}</div>
                    {transactionResult.payment_method_type && <div><strong>Método:</strong> {transactionResult.payment_method_type}</div>}
                  </div>
                </div>
              )}

              {wompiError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: 12,
                  padding: 15,
                  marginBottom: 25,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>⚠️ {wompiError}</span>
                  <button onClick={() => setWompiError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 12, padding: 25, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
                  <div style={{ background: '#fee2e2', padding: 20, borderRadius: 12, border: '1px solid #fecaca' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>Saldo Pendiente (Solo Pendientes)</p>
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
                      {payments.filter(p => p.status === 'Pending').map(p => (
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
                              background: '#fee2e2',
                              color: '#991b1b'
                            }}>
                              PENDIENTE
                            </span>
                          </td>
                        </tr>
                      ))}
                      {payments.filter(p => p.status === 'Pending').length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center' }}>
                            <div style={{ color: '#10b981', marginBottom: 10 }}><Shield size={40} /></div>
                            <p style={{ margin: 0, fontWeight: 700, color: '#2d4739' }}>¡Estás al día!</p>
                            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>No tienes saldos pendientes por liquidar.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {payments.some(p => p.status === 'Pending') && (
                  <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handlePayWithWompi}
                      disabled={wompiLoading || checkingTransaction}
                      style={{
                        background: '#2d4739',
                        color: '#fff',
                        border: 'none',
                        padding: '15px 30px',
                        borderRadius: 12,
                        fontWeight: 800,
                        cursor: (wompiLoading || checkingTransaction) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                        opacity: (wompiLoading || checkingTransaction) ? 0.7 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {wompiLoading ? 'PREPARANDO ENTORNO SEGURO...' : `PAGAR SALDO PENDIENTE (${payments.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.amount, 0).toLocaleString()} COP)`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'profile' ? (
            <div style={{ padding: '0 0 20px 0', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h2 className="section-title" style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.2 }}>Mi Perfil</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    Recuerda que esta información es importante, ya que tus clientes la verán y así podrán conocerte mejor.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isEditingProfile && (
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        fetchCoachProfile();
                      }}
                      disabled={isLoadingLocal}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#fff', color: '#64748b', padding: '6px 12px', borderRadius: 8,
                        border: '1px solid #e2e8f0', fontWeight: 800, fontSize: 11, cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <X size={14} /> CANCELAR
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        handleUpdateProfile();
                      } else {
                        setIsEditingProfile(true);
                      }
                    }}
                    disabled={isLoadingLocal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: isEditingProfile ? '#22c55e' : '#2d4739',
                      color: '#fff', padding: '6px 12px', borderRadius: 8,
                      border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                    }}
                  >
                    {isEditingProfile ? (
                      <><Save size={14} /> GUARDAR</>
                    ) : (
                      <><Edit2 size={14} /> EDITAR PERFIL</>
                    )}
                  </button>
                </div>
              </div>

              {statusMsg.text && (
                <div style={{ padding: 10, borderRadius: 10, marginBottom: 15, fontSize: 12, background: statusMsg.type === 'error' ? '#fee2e2' : '#dcfce7', color: statusMsg.type === 'error' ? '#ef4444' : '#166534', fontWeight: 700, textAlign: 'center', border: statusMsg.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                  {statusMsg.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
                {/* Información de Contacto */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    <Mail size={14} color="#a2d149" /> Datos de Contacto
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div className="field">
                      <label style={{ fontSize: 10, marginBottom: 4, fontWeight: 800 }}>Email Profesional</label>
                      <input
                        type="email"
                        value={coachProfile.email}
                        disabled={!isEditingProfile}
                        style={{
                          padding: '8px 12px', fontSize: 13, height: 38,
                          ...(!isEditingProfile ? { background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', border: '1px solid #e2e8f0' } : { border: '1px solid #a2d149' })
                        }}
                        onChange={(e) => setCoachProfile({ ...coachProfile, email: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label style={{ fontSize: 10, marginBottom: 4, fontWeight: 800 }}>Teléfono</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="tel"
                          value={coachProfile.phone}
                          disabled={!isEditingProfile}
                          placeholder="+52 55..."
                          style={{
                            padding: '8px 12px 8px 34px', fontSize: 13, height: 38,
                            ...(!isEditingProfile ? { background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', border: '1px solid #e2e8f0' } : { border: '1px solid #a2d149' })
                          }}
                          onChange={(e) => setCoachProfile({ ...coachProfile, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label style={{ fontSize: 10, marginBottom: 4, fontWeight: 800 }}>Instagram (Sin @)</label>
                      <div style={{ position: 'relative' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                        <input
                          type="text"
                          value={coachProfile.instagram}
                          disabled={!isEditingProfile}
                          placeholder="usuario..."
                          style={{
                            padding: '8px 12px 8px 34px', fontSize: 13, height: 38,
                            ...(!isEditingProfile ? { background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', border: '1px solid #e2e8f0' } : { border: '1px solid #a2d149' })
                          }}
                          onChange={(e) => setCoachProfile({ ...coachProfile, instagram: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Áreas de Texto */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 15 }}>
                  {/* Presentación */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>Presentación</h3>
                      <span style={{ fontSize: 9, fontWeight: 700, color: countWords(coachProfile.presentation) > 100 ? '#ef4444' : '#64748b' }}>
                        {countWords(coachProfile.presentation)}/100
                      </span>
                    </div>
                    <textarea
                      value={coachProfile.presentation}
                      disabled={!isEditingProfile}
                      onChange={(e) => setCoachProfile({ ...coachProfile, presentation: e.target.value })}
                      placeholder="Trayectoria..."
                      style={{
                        width: '100%', minHeight: 80, padding: 12, borderRadius: 8, border: isEditingProfile ? '1px solid #a2d149' : '1px solid #e2e8f0',
                        background: !isEditingProfile ? '#f8fafc' : '#fff', color: '#475569', fontSize: 12, lineHeight: 1.5, resize: 'vertical',
                        outline: 'none', transition: 'all 0.2s'
                      }}
                    />
                  </div>

                  {/* Misión */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>Misión</h3>
                      <span style={{ fontSize: 9, fontWeight: 700, color: countWords(coachProfile.mission) > 50 ? '#ef4444' : '#64748b' }}>
                        {countWords(coachProfile.mission)}/50
                      </span>
                    </div>
                    <textarea
                      value={coachProfile.mission}
                      disabled={!isEditingProfile}
                      onChange={(e) => setCoachProfile({ ...coachProfile, mission: e.target.value })}
                      placeholder="Propósito..."
                      style={{
                        width: '100%', minHeight: 70, padding: 12, borderRadius: 8, border: isEditingProfile ? '1px solid #a2d149' : '1px solid #e2e8f0',
                        background: !isEditingProfile ? '#f8fafc' : '#fff', color: '#475569', fontSize: 12, lineHeight: 1.5, resize: 'vertical',
                        outline: 'none', transition: 'all 0.2s'
                      }}
                    />
                  </div>

                  {/* Visión */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>Visión</h3>
                      <span style={{ fontSize: 9, fontWeight: 700, color: countWords(coachProfile.vision) > 50 ? '#ef4444' : '#64748b' }}>
                        {countWords(coachProfile.vision)}/50
                      </span>
                    </div>
                    <textarea
                      value={coachProfile.vision}
                      disabled={!isEditingProfile}
                      onChange={(e) => setCoachProfile({ ...coachProfile, vision: e.target.value })}
                      placeholder="Futuro..."
                      style={{
                        width: '100%', minHeight: 70, padding: 12, borderRadius: 8, border: isEditingProfile ? '1px solid #a2d149' : '1px solid #e2e8f0',
                        background: !isEditingProfile ? '#f8fafc' : '#fff', color: '#475569', fontSize: 12, lineHeight: 1.5, resize: 'vertical',
                        outline: 'none', transition: 'all 0.2s'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div style={{ padding: '0 0 20px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '0.95rem', letterSpacing: '0.5px' }}>Listado de Atletas</h2>
                    {(planFilter !== 'all' || statusFilter !== 'all' || sortOrder !== 'none' || searchQuery !== '') && (
                      <button
                        onClick={() => { setPlanFilter('all'); setStatusFilter('all'); setSortOrder('none'); setSearchQuery(''); }}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RotateCcw size={10} /> Limpiar Filtros
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 'clamp(11px, 2vw, 13px)', color: '#64748b', fontWeight: 500, lineHeight: '1.4' }}>
                    Gestiona tu comunidad de atletas de forma integral: supervisa y edita sus rutinas activas, analiza el historial de progreso y revisa las valoraciones que otorgan a sus entrenamientos.
                  </p>
                </div>

                <div className="search-filters-row" style={{ position: 'relative', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Buscador Full Width */}
                  <div style={{
                    display: 'flex', alignItems: 'center', background: '#fff',
                    padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1',
                    flex: '1 1 180px', maxWidth: '240px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}>
                    <Search size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '11px', fontWeight: 500 }}
                    />
                  </div>

                  {/* Unified Filters Button */}
                  <div className="filter-container" style={{ position: 'relative' }}>
                    <button
                      onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, background: isFiltersOpen ? '#2d4739' : '#fff',
                        color: isFiltersOpen ? '#fff' : '#475569', padding: '4px 8px', borderRadius: 6,
                        border: '1px solid', borderColor: isFiltersOpen ? '#2d4739' : '#cbd5e1',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}>
                      <Filter size={12} />
                      <span>Filtros</span>
                      {isFiltersOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {/* Dropdown Menu */}
                    {isFiltersOpen && (
                      <>
                        <div
                          className="filters-overlay"
                          onClick={() => setIsFiltersOpen(false)}
                          style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999, backdropFilter: 'blur(2px)' }}
                        />
                        <div className="filters-dropdown" style={{
                          position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '220px',
                          background: '#fff', borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                          padding: '12px', zIndex: 2000, border: '1px solid #e2e8f0',
                          display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.2s ease-out'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Plan de Suscripción</label>
                            <select
                              value={planFilter}
                              onChange={(e) => setPlanFilter(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b' }}
                            >
                              <option value="all">Todos los Planes</option>
                              <option value="Mensual">Mensual</option>
                              <option value="Dos meses">Dos meses</option>
                              <option value="Trimestral">Trimestral</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Estado del Atleta</label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b' }}
                            >
                              <option value="all">Todos los Estados</option>
                              <option value="active">Activos</option>
                              <option value="inactive">Inactivos</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Ordenar por Vencimiento</label>
                            <select
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value as any)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b' }}
                            >
                              <option value="none">Sin Ordenar</option>
                              <option value="asc">Más Próximo Primero</option>
                              <option value="desc">Más Lejano Primero</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '6px 10px', fontWeight: 800 }}>Nombre</th>
                      <th style={{ padding: '6px 10px', fontWeight: 800 }}>Email</th>
                      <th style={{ padding: '6px 10px', fontWeight: 800 }}>Plan</th>
                      <th style={{ padding: '6px 10px', fontWeight: 800 }}>Fin del Plan</th>
                      <th style={{ padding: '6px 10px', fontWeight: 800 }}>Estado</th>
                      <th style={{ padding: '6px 10px', fontWeight: 800 }}>Calificación de Rutina</th>
                      <th style={{ padding: '6px 10px', fontWeight: 800, textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(c => (
                      <tr key={c.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700, fontSize: '11.5px' }}>{c.name}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b', fontSize: '10.5px' }}>{c.email}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 5px', borderRadius: 10, fontSize: '8px', fontWeight: 800 }}>
                            {c.profile?.planType || 'Mensual'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: 600 }}>{c.profile?.endDate || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{
                            padding: '2px 5px', borderRadius: 10, fontSize: '8px', fontWeight: 800,
                            background: c.is_active ? '#dcfce7' : '#fee2e2',
                            color: c.is_active ? '#166534' : '#991b1b'
                          }}>
                            {c.is_active ? '✅ ACTIVO' : '❌ INACTIVO'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, fontSize: '10.5px', color: '#475569' }}>
                          {c.avg_rating !== null && c.avg_rating !== undefined ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: '#fefcbf', color: '#a16207', padding: '2px 4px', borderRadius: 6, fontSize: '10px' }}>
                              ⭐ {c.avg_rating}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleViewRoutineFromList(c.email)}
                            style={{
                              background: '#2d4739', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4,
                              cursor: 'pointer', fontWeight: 700, fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: 3
                            }}>
                            <Eye size={10} /> Ver Rutina
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'payment_history' ? (
            <div style={{ padding: '0 0 20px 0' }} id="coach-payment-history-view">
              <h2 className="section-title" style={{ marginBottom: '4px' }}>Historial de Pagos y Facturas</h2>
              <p style={{ margin: '0 0 20px 0', fontSize: 'clamp(11px, 2vw, 13px)', color: '#64748b', fontWeight: 500, lineHeight: '1.4' }}>
                Consulta el historial completo de tus transacciones y accede a los detalles de facturación de tus periodos anteriores.
              </p>
              <div style={{ background: '#fff', borderRadius: 12, padding: 25, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 10px' }}>Fecha</th>
                        <th style={{ padding: '12px 10px' }}>Atletas</th>
                        <th style={{ padding: '12px 10px' }}>Monto Total</th>
                        <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((batch, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '15px 10px', fontSize: 13, color: '#64748b' }}>{batch.date}</td>
                          <td style={{ padding: '15px 10px', fontWeight: 700 }}>{batch.clients_count} atletas</td>
                          <td style={{ padding: '15px 10px', fontWeight: 700, color: '#10b981' }}>${batch.total_amount.toLocaleString()}</td>
                          <td style={{ padding: '15px 10px', textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedBatch(batch)}
                              style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 15px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={14} /> VER FACTURA
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paymentHistory.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No tienes pagos registrados aún</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 className="section-title" style={{ margin: 0, marginBottom: '4px' }}>
                  {isReadOnly ? "Modificar Rutina" : "Crear Rutina"}
                </h2>
                <p style={{ margin: 0, fontSize: 'clamp(11px, 2vw, 13px)', color: '#64748b', fontWeight: 500, lineHeight: '1.4' }}>
                  {isReadOnly 
                    ? "Ajusta y personaliza el plan de entrenamiento del atleta para adaptarlo a su progreso y metas actuales." 
                    : "Registra nuevos atletas en la plataforma y diseña planes de entrenamiento a medida desde cero para impulsar su progreso."}
                </p>
              </div>

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

              {isExistingClient ? (
                <div 
                  className="section-title" 
                  onClick={() => setShowAthleteDetails(!showAthleteDetails)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: '#fff',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    userSelect: 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.01)',
                    margin: '20px 0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {showAthleteDetails ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                    <span style={{ fontWeight: 800 }}>Datos del Atleta</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextRenewalState = !isRenewalActive;
                        setIsRenewalActive(nextRenewalState);
                        if (nextRenewalState) {
                          setShowAthleteDetails(true);
                        }
                      }}
                      style={{ background: isRenewalActive ? '#ef4444' : '#3b82f6', color: '#fff', fontSize: '11px', padding: '6px 10px', fontWeight: 800, textTransform: 'none', borderRadius: '6px' }}
                    >
                      {isRenewalActive ? '✓ Cancelar Renovación' : 'Renovar Plan'}
                    </button>
                    {isRenewalActive && (
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptRenewal();
                        }}
                        disabled={isLoadingLocal}
                        style={{ background: '#22c55e', color: '#fff', fontSize: '11px', padding: '6px 10px', fontWeight: 800, textTransform: 'none', borderRadius: '6px' }}
                      >
                        {isLoadingLocal ? 'PROCESANDO...' : '✓ Aceptar Renovación'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Datos del Atleta</span>
                </div>
              )}
              {(!isExistingClient || showAthleteDetails) && (
                <div className="grid-inputs" style={{ animation: 'fadeIn 0.25s ease-out' }}>
                  <div className="field">
                    <label>Buscar Cliente D.B.</label>
                    <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        list="clients-datalist"
                        placeholder="Escribe email o nombre..."
                        value={athlete.email}
                        disabled={isReadOnly || isCoachBlocked}
                        style={(isReadOnly || isCoachBlocked) ? { ...lockedStyle, width: '100%' } : { border: '2px solid #a2d149', width: '100%', borderRadius: '8px', padding: '8px 12px' }}
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
                        style={{ border: '2px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}
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
                      padding: '8px',
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
                      disabled={(isReadOnly && !isRenewalActive) || isCoachBlocked}
                      style={((isReadOnly && !isRenewalActive) || isCoachBlocked) ? lockedStyle : {}}
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
                      disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                      style={((isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked) ? lockedStyle : { border: '2px solid #a2d149', borderRadius: '8px', padding: '8px 12px' }}
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
                      disabled={(isReadOnly && !isRenewalActive) || isCoachBlocked}
                      style={((isReadOnly && !isRenewalActive) || isCoachBlocked) ? lockedStyle : {}}
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
                      disabled={(isReadOnly && !isRenewalActive) || isCoachBlocked || isContractLocked}
                      style={((isReadOnly && !isRenewalActive) || isCoachBlocked || isContractLocked) ? lockedStyle : {}}
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
                      disabled={(isReadOnly && !isRenewalActive) || isCoachBlocked || isContractLocked}
                      style={((isReadOnly && !isRenewalActive) || isCoachBlocked || isContractLocked) ? lockedStyle : {}}
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

                        // Auto-calculate is_active status
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const start = new Date(newStart + 'T12:00:00');
                        start.setHours(0, 0, 0, 0);
                        const shouldBeActive = start <= today;

                        setAthlete({
                          ...athlete,
                          is_active: shouldBeActive,
                          profile: { ...athlete.profile, startDate: newStart, endDate: newEnd, controlDate: newControl }
                        });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Fecha Final del Plan</label>
                    <input
                      type="date"
                      value={athlete.profile.endDate}
                      disabled={(isReadOnly && !isRenewalActive) || isCoachBlocked || isContractLocked || user?.role === 'Coach'}
                      style={((isReadOnly && !isRenewalActive) || isCoachBlocked || isContractLocked || user?.role === 'Coach') ? lockedStyle : {}}
                      onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, endDate: e.target.value } })}
                    />
                  </div>
                  <div className="field">
                    <label>Fecha de Control</label>
                    <input
                      type="date"
                      value={athlete.profile.controlDate}
                      disabled={(isReadOnly && !isRenewalActive) || isCoachBlocked}
                      style={((isReadOnly && !isRenewalActive) || isCoachBlocked) ? lockedStyle : {}}
                      onChange={e => setAthlete({ ...athlete, profile: { ...athlete.profile, controlDate: e.target.value } })}
                    />
                  </div>
                </div>
              )}

              {/* Weight Progress Section for Existing Clients */}
              {athlete.id && (
                <div style={{ marginTop: '25px', marginBottom: '25px' }}>
                  <button
                    type="button"
                    onClick={() => setShowWeightProgress(!showWeightProgress)}
                    style={{
                      width: '100%',
                      background: '#fff',
                      color: '#2d4739',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 20px',
                      fontWeight: 800,
                      fontSize: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#a2d149'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📈 Historial de Peso del Atleta
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '20px' }}>
                        {weightHistory.length} {weightHistory.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </span>
                    {showWeightProgress ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {showWeightProgress && (() => {
                    const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const formatDateSpanish = (dateObj: Date) => {
                        const day = dateObj.getDate();
                        const month = MONTH_NAMES_SHORT[dateObj.getMonth()];
                        return `${day} ${month}`;
                    };

                    const processedData = (() => {
                      if (weightFilter === 'month') {
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
                        const now = new Date();
                        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);
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
                        background: '#fff',
                        border: '2px solid #a2d149',
                        borderRadius: '16px',
                        padding: '20px',
                        marginTop: '10px',
                        animation: 'fadeIn 0.3s ease-out',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
                      }}>
                        {/* Selector de periodo */}
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

                        {/* Contenedor del Gráfico SVG */}
                        <div style={{ position: 'relative', width: '100%', background: '#fafafa', borderRadius: '12px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                          {processedData.length === 0 ? (
                            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                              No hay registros de peso en los últimos {weightFilter === 'month' ? '30 días' : '365 días'}.
                            </div>
                          ) : (
                            <>
                              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="auto" style={{ overflow: 'visible' }}>
                                <defs>
                                  <linearGradient id="coachWeightGrad" x1="0" y1="0" x2="0" y2="1">
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

                                {/* Area */}
                                {areaPathStr && (
                                  <path d={areaPathStr} fill="url(#coachWeightGrad)" />
                                )}

                                {/* Line */}
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

                                {/* X-axis labels */}
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

                                {/* Circles */}
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

                              {/* Tooltip */}
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
                          <p style={{ textAlign: 'center', color: '#666', padding: '10px' }}>No hay registros en este período.</p>
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
                    );
                  })()}
                </div>
              )}

              {isReadOnly && !isModifyingRoutine && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={startModifyingRoutine}
                    disabled={isCoachBlocked}
                    style={{
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: isCoachBlocked ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 10px rgba(34, 197, 94, 0.15)',
                      transition: 'all 0.2s',
                      opacity: isCoachBlocked ? 0.7 : 1,
                      textTransform: 'none'
                    }}
                    onMouseOver={e => !isCoachBlocked && (e.currentTarget.style.background = '#16a34a')}
                    onMouseOut={e => !isCoachBlocked && (e.currentTarget.style.background = '#22c55e')}
                  >
                    <Edit2 size={14} /> Modificar rutina
                  </button>
                </div>
              )}

              {(!isReadOnly || isModifyingRoutine || isRenewalActive) && (
                <>
                  {/* Collapsible Templates Section */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    marginBottom: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Header bar / Toggle Button */}
                    <button
                      onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
                      disabled={isCoachBlocked}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        cursor: isCoachBlocked ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        outline: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          background: 'rgba(162, 209, 73, 0.1)',
                          color: '#2d4739',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          ⚡
                        </span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '12.5px', fontWeight: 800, color: '#2d4739', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Plantillas de Rutina Predefinidas
                          </h3>
                          <p style={{ margin: '1px 0 0 0', fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
                            Carga una base de entrenamiento completa y edítala en segundos
                          </p>
                        </div>
                      </div>
                      <div style={{ color: '#64748b' }}>
                        {isTemplatesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Collapsible Content */}
                    {isTemplatesExpanded && (
                      <div style={{
                        padding: '0 16px 16px 16px',
                        borderTop: '1px solid #f1f5f9',
                        animation: 'fadeIn 0.25s ease-out'
                      }}>
                        <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', margin: '10px 0' }}>
                          Selecciona una plantilla base según el objetivo de tu atleta. Se configurarán automáticamente 5 días de entrenamiento (Lunes a Viernes) con 5 ejercicios diarios intercalando tren superior y tren inferior (4 series de 10 repeticiones, o 30 minutos para cardio).
                        </p>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '10px',
                          marginTop: '8px'
                        }}>
                          {Object.entries(TEMPLATES_DATA).map(([key, template]) => (
                            <button
                              key={key}
                              onClick={() => applyTemplate(key)}
                              style={{
                                background: '#f8fafc',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                outline: 'none'
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.borderColor = '#a2d149';
                                e.currentTarget.style.background = '#f0fdf4';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.transform = 'none';
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#2d4739' }}>
                                {template.name}
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#64748b', lineHeight: '1.3', fontWeight: 500 }}>
                                {template.description}
                              </span>
                              <span style={{
                                fontSize: '9.5px',
                                color: '#a2d149',
                                fontWeight: 700,
                                marginTop: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                Cargar plantilla →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="section-title">Configurar Rutina</div>
                  <div className="days-selector">
                    {daysOfWeek.map(day => (
                      <label key={day}>
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(day)}
                          disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                          onChange={() => handleDayToggle(day)}
                        />
                        {day}
                      </label>
                    ))}
                    <button
                      className="btn btn-add-day main-add-btn"
                      onClick={renderDays}
                      disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || (!isReadOnly && !athlete.is_active && !isRenewalActive) || isCoachBlocked}
                      style={(((isReadOnly && !isModifyingRoutine && !isRenewalActive) || (!isReadOnly && !athlete.is_active && !isRenewalActive) || isCoachBlocked) ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {})}
                      title={isCoachBlocked ? "Tu cuenta está inactiva" : ((isReadOnly && !isModifyingRoutine && !isRenewalActive) ? "Haz clic en Modificar Rutina primero" : (!athlete.is_active && !isRenewalActive ? "No se puede configurar rutina para atletas inactivos" : ""))}
                    >
                      Crear Días
                    </button>
                  </div>
                </>
              )}

              <div id="routine-builder">
                {routineDays.map(day => {
                  const groupsList = day.groups || [];
                  let activeIndex = activeBlockIndices[day.name] || 0;
                  if (activeIndex >= groupsList.length && groupsList.length > 0) {
                    activeIndex = groupsList.length - 1;
                  }
                  const activeGroup = groupsList[activeIndex];
                  const isExpanded = !isReadOnly || !!expandedDays[day.name];

                  return (
                    <div key={day.name} className="day-container" style={{ marginBottom: '25px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' }}>
                      {/* Cabecera del Día */}
                      <div 
                        className="day-header" 
                        onClick={() => isReadOnly && toggleDayExpanded(day.name)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '15px 20px', 
                          background: '#f8fafc', 
                          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                          cursor: isReadOnly ? 'pointer' : 'default',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isReadOnly && (
                            isExpanded ? <ChevronUp size={16} color="#64748b" style={{ marginRight: '4px' }} /> : <ChevronDown size={16} color="#64748b" style={{ marginRight: '4px' }} />
                          )}
                          <span style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', color: '#2d4739' }}>{day.name}</span>
                          {dayRatings[day.name] !== undefined && (
                            <span style={{ fontSize: '11px', fontWeight: 800, background: '#fefcbf', color: '#a16207', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', textTransform: 'none' }}>
                              Promedio: ⭐ {dayRatings[day.name]} / 5
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '20px' }}>
                          {groupsList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                              <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, margin: '0 0 15px 0' }}>
                                No hay bloques de ejercicios creados para este día.
                              </p>
                              {(!isReadOnly || isModifyingRoutine || isRenewalActive) && !isCoachBlocked && (
                                <button
                                  type="button"
                                  onClick={() => addGroup(day.name)}
                                  disabled={isCoachBlocked}
                                  style={{
                                    background: '#2d4739',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    cursor: isCoachBlocked ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 10px rgba(45, 71, 57, 0.15)'
                                  }}
                                >
                                  + Agregar Primer Bloque
                                </button>
                              )}
                          </div>
                        ) : (
                          <>
                            {/* Navegador del Carrusel de Bloques */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '12px',
                              marginBottom: '20px',
                              background: '#f8fafc',
                              padding: '16px',
                              borderRadius: '12px',
                              border: '1px solid #f1f5f9'
                            }}>
                              {/* Conteo de bloques arriba */}
                              <span style={{ fontSize: '14px', fontWeight: 900, color: '#2d4739', letterSpacing: '0.5px' }}>
                                Bloque {activeIndex + 1} de {groupsList.length}
                              </span>

                              {/* Botones Anterior y Siguiente uno al lado del otro */}
                              <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  disabled={activeIndex === 0}
                                  onClick={() => setActiveBlockIndices(prev => ({ ...prev, [day.name]: activeIndex - 1 }))}
                                  style={{
                                    background: activeIndex === 0 ? '#cbd5e1' : '#2d4739',
                                    color: activeIndex === 0 ? '#94a3b8' : '#fff',
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontWeight: 800,
                                    fontSize: '11px',
                                    cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    flex: '1',
                                    maxWidth: '140px',
                                    textAlign: 'center',
                                    opacity: activeIndex === 0 ? 0.6 : 1
                                  }}
                                >
                                  ◀ Anterior
                                </button>

                                <button
                                  type="button"
                                  disabled={activeIndex >= groupsList.length - 1}
                                  onClick={() => setActiveBlockIndices(prev => ({ ...prev, [day.name]: activeIndex + 1 }))}
                                  style={{
                                    background: activeIndex >= groupsList.length - 1 ? '#cbd5e1' : '#2d4739',
                                    color: activeIndex >= groupsList.length - 1 ? '#94a3b8' : '#fff',
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontWeight: 800,
                                    fontSize: '11px',
                                    cursor: activeIndex >= groupsList.length - 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    flex: '1',
                                    maxWidth: '140px',
                                    textAlign: 'center',
                                    opacity: activeIndex >= groupsList.length - 1 ? 0.6 : 1
                                  }}
                                >
                                  Siguiente ▶
                                </button>
                              </div>

                              {/* Botones de acción en una fila separada si se permiten */}
                              {(!isReadOnly || isModifyingRoutine || isRenewalActive) && !isCoachBlocked && (
                                <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => addGroup(day.name)}
                                    disabled={isCoachBlocked}
                                    style={{
                                      background: '#a2d149',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      fontWeight: 800,
                                      fontSize: '11px',
                                      cursor: isCoachBlocked ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 4px 10px rgba(162, 209, 73, 0.2)',
                                      flex: '1',
                                      minWidth: '120px',
                                      maxWidth: '160px',
                                      textAlign: 'center'
                                    }}
                                  >
                                    + Agregar Bloque
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => removeGroup(day.name, activeGroup.id)}
                                    disabled={isCoachBlocked}
                                    style={{
                                      background: '#ef4444',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      fontWeight: 800,
                                      fontSize: '11px',
                                      cursor: isCoachBlocked ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s',
                                      flex: '1',
                                      minWidth: '120px',
                                      maxWidth: '160px',
                                      textAlign: 'center'
                                    }}
                                  >
                                    🗑️ Eliminar Bloque
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Renderizar solo el grupo activo si existe */}
                            {activeGroup && (
                              <div className="day-groups" style={{ display: 'block' }}>
                                <div className="exercise-group" style={{ margin: 0, padding: '16px', paddingTop: '8px' }}>
                                  <div className="rows-holder">
                                    {activeGroup.exercises.map((ex, idx) => (
                                      <div
                                        key={ex.id}
                                        className="exercise-sub-row"
                                        style={{ paddingTop: idx === 0 ? 0 : '15px' }}
                                        onMouseEnter={() => { if (ex.img) preloadImage(ex.img); }}
                                      >
                                        <div className="field">
                                          {activeGroup.exercises.length > 1 && (
                                            <label style={{ fontWeight: 800, fontSize: '10px', display: 'block', marginBottom: '8px' }}>
                                              {idx === 0 ? 'EJERCICIO A' : 'EJERCICIO B'}
                                            </label>
                                          )}
                                          <input
                                            type="text"
                                            list="exercises-list"
                                            className="sel-name"
                                            placeholder="Buscar ejercicio..."
                                            value={ex.name}
                                            disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                                            style={{
                                              width: '100%',
                                              boxSizing: 'border-box',
                                              ...(((isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked)
                                                ? lockedStyle
                                                : { border: '2px solid #e2e8f0', borderRadius: '8px', padding: '10px' })
                                            }}
                                            onChange={(e) => updateExercise(day.name, activeGroup.id, ex.id, 'name', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                          />
                                        </div>

                                        <div className="field">
                                          <label style={{ fontWeight: 800, fontSize: '10px' }}>MÉTRICA</label>
                                          <div className="metric-split">
                                            {ex.isCardio ? (
                                              <div className="metric-field">
                                                <label>TIEMPO (MIN)</label>
                                                <input
                                                  type="text"
                                                  placeholder="00"
                                                  value={ex.series}
                                                  disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                                                  style={{
                                                    width: '100%',
                                                    maxWidth: '80px',
                                                    boxSizing: 'border-box',
                                                    fontSize: '13px',
                                                    ...(((isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked)
                                                      ? { ...lockedStyle, padding: '6px 8px' }
                                                      : { border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px' })
                                                  }}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val.length <= 2) updateExercise(day.name, activeGroup.id, ex.id, 'series', val);
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
                                                    disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                                                    style={{
                                                      width: '100%',
                                                      maxWidth: '70px',
                                                      boxSizing: 'border-box',
                                                      fontSize: '13px',
                                                      ...(((isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked)
                                                        ? { ...lockedStyle, padding: '6px 8px' }
                                                        : { border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px' })
                                                    }}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      if (val.length <= 1) updateExercise(day.name, activeGroup.id, ex.id, 'series', val);
                                                    }}
                                                  />
                                                </div>
                                                <div className="metric-field">
                                                  <label>REPS</label>
                                                  <input
                                                    type="text"
                                                    placeholder="R"
                                                    value={ex.reps}
                                                    disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                                                    style={{
                                                      width: '100%',
                                                      maxWidth: '70px',
                                                      boxSizing: 'border-box',
                                                      fontSize: '13px',
                                                      ...(((isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked)
                                                        ? { ...lockedStyle, padding: '6px 8px' }
                                                        : { border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px' })
                                                    }}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      if (val.length <= 3) updateExercise(day.name, activeGroup.id, ex.id, 'reps', val);
                                                    }}
                                                  />
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        <div className="field field-notes">
                                          <label style={{ fontWeight: 800, fontSize: '10px' }}>NOTAS DEL COACH</label>
                                          <textarea
                                            rows={3}
                                            value={ex.note}
                                            disabled={(isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked}
                                            style={{
                                              width: '100%',
                                              boxSizing: 'border-box',
                                              ...(((isReadOnly && !isModifyingRoutine && !isRenewalActive) || isCoachBlocked)
                                                ? lockedStyle
                                                : { border: '2px solid #e2e8f0', borderRadius: '8px', padding: '10px' })
                                            }}
                                            onChange={(e) => updateExercise(day.name, activeGroup.id, ex.id, 'note', e.target.value)}
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

                                  {(!isReadOnly || isModifyingRoutine || isRenewalActive) && !isCoachBlocked && activeGroup.exercises.length < 2 && (
                                    <button className="btn btn-biserie" onClick={() => addBiserie(day.name, activeGroup.id)} disabled={isCoachBlocked} style={isCoachBlocked ? lockedStyle : {}}>
                                      + AGREGAR BISERIE
                                    </button>
                                  )}
                                  <div className="rest-time-label">
                                    ⌛ 3 MINUTOS DE DESCANSO POST-BLOQUE
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isReadOnly && (
                <button
                  className="btn btn-generate"
                  onClick={publishRoutine}
                  disabled={isLoadingLocal || (!athlete.is_active && !isRenewalActive) || isCoachBlocked}
                  style={((!athlete.is_active && !isRenewalActive) || isCoachBlocked) ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {}}
                  title={isCoachBlocked ? "Tu cuenta está inactiva" : (!athlete.is_active && !isRenewalActive ? "No se puede publicar rutina para atletas inactivos" : "")}
                >
                  {isLoadingLocal ? 'PUBLICANDO...' : (isCoachBlocked ? 'ACCESO RESTRINGIDO' : (!athlete.is_active && !isRenewalActive ? 'USUARIO INACTIVO' : 'PUBLICAR RUTINA'))}
                </button>
              )}

              {isReadOnly && isModifyingRoutine && (
                <div style={{ display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={cancelModifyingRoutine}
                    disabled={isLoadingLocal}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: isLoadingLocal ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => !isLoadingLocal && (e.currentTarget.style.background = '#dc2626')}
                    onMouseOut={e => !isLoadingLocal && (e.currentTarget.style.background = '#ef4444')}
                  >
                    Cancelar Cambios
                  </button>
                  
                  <button
                    type="button"
                    onClick={publishRoutine}
                    disabled={isLoadingLocal || isCoachBlocked}
                    style={{
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: (isLoadingLocal || isCoachBlocked) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                      transition: 'all 0.2s',
                      opacity: (isLoadingLocal || isCoachBlocked) ? 0.7 : 1
                    }}
                    onMouseOver={e => !(isLoadingLocal || isCoachBlocked) && (e.currentTarget.style.background = '#16a34a')}
                    onMouseOut={e => !(isLoadingLocal || isCoachBlocked) && (e.currentTarget.style.background = '#22c55e')}
                  >
                    {isLoadingLocal ? 'ACTUALIZANDO...' : 'Actualizar Rutina'}
                  </button>
                </div>
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

          {/* MODAL DETALLES PAGO (Coach) */}
          {selectedBatch && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
              <div style={{ background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: 15, marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Factura de Liquidación</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Fecha: {selectedBatch.date}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={24} />
                  </button>
                </div>

                <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '9px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 15px' }}>Atleta / Correo</th>
                        <th style={{ padding: '12px 15px' }}>Trámite</th>
                        <th style={{ padding: '12px 15px' }}>Plan</th>
                        <th style={{ padding: '12px 15px' }}>Periodo</th>
                        <th style={{ padding: '12px 15px', textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.clients.map((c: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 15px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{c.email}</div>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c.tramite === 'Nuevo' ? '#0891b2' : '#9333ea', background: c.tramite === 'Nuevo' ? '#ecfeff' : '#faf5ff', padding: '2px 8px', borderRadius: 12 }}>
                              {c.tramite || 'Nuevo'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 15px', fontSize: 12 }}>{c.plan_type}</td>
                          <td style={{ padding: '12px 15px', fontSize: 11, color: '#64748b' }}>{c.start_date} al {c.end_date}</td>
                          <td style={{ padding: '12px 15px', fontSize: 13, fontWeight: 800, textAlign: 'right', color: '#10b981' }}>${c.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 20, paddingTop: 15, borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => downloadInvoice(selectedBatch)}
                    style={{ background: '#2d4739', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Download size={18} /> DESCARGAR PDF
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block' }}>TOTAL PAGADO</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#2d4739' }}>${selectedBatch.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}

