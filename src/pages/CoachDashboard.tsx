import { useState, useEffect, useMemo } from 'react';
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
}

export interface CoachDashboardProps {
  preloadedEmail?: string;
  preloadedRoutine?: RoutineDay[];
  hideHeader?: boolean;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

export default function CoachDashboard({ preloadedEmail, preloadedRoutine, hideHeader, onCancel, isReadOnly: propIsReadOnly }: CoachDashboardProps = {}) {
  const { token, logout, user, setIsLoading } = useAuth();
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

  // Bloqueo de Coach Inactivo
  const isCoachBlocked = user?.role === 'Coach' && !user.isActive;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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
    setIsLoadingLocal(true);
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
          athlete: { ...athlete, is_active: shouldBeActive, isRenewal: isRenewalActive },
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
              <h2 className="section-title">Control de Pago a Body Logic</h2>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <h2 className="section-title" style={{ margin: 0 }}>Listado de Atletas</h2>
                  {(planFilter !== 'all' || statusFilter !== 'all' || sortOrder !== 'none' || searchQuery !== '') && (
                    <button
                      onClick={() => { setPlanFilter('all'); setStatusFilter('all'); setSortOrder('none'); setSearchQuery(''); }}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <RotateCcw size={12} /> Limpiar Filtros
                    </button>
                  )}
                </div>

                <div className="search-filters-row" style={{ position: 'relative', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Buscador Full Width */}
                  <div style={{
                    display: 'flex', alignItems: 'center', background: '#fff',
                    padding: '8px 14px', borderRadius: 10, border: '2px solid #e2e8f0',
                    flex: '1 1 220px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                  }}>
                    <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '15px', fontWeight: 500 }}
                    />
                  </div>

                  {/* Unified Filters Button */}
                  <div className="filter-container" style={{ position: 'relative' }}>
                    <button
                      onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, background: isFiltersOpen ? '#2d4739' : '#fff',
                        color: isFiltersOpen ? '#fff' : '#475569', padding: '12px 20px', borderRadius: 12,
                        border: '2px solid', borderColor: isFiltersOpen ? '#2d4739' : '#e2e8f0',
                        fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}>
                      <Filter size={16} />
                      <span>Filtros</span>
                      {isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px',
                          background: '#fff', borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          padding: '20px', zIndex: 2000, border: '1px solid #e2e8f0',
                          display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.2s ease-out'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Plan de Suscripción</label>
                            <select
                              value={planFilter}
                              onChange={(e) => setPlanFilter(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '2px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}
                            >
                              <option value="all">Todos los Planes</option>
                              <option value="Mensual">Mensual</option>
                              <option value="Dos meses">Dos meses</option>
                              <option value="Trimestral">Trimestral</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Estado del Atleta</label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '2px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}
                            >
                              <option value="all">Todos los Estados</option>
                              <option value="active">Activos</option>
                              <option value="inactive">Inactivos</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Ordenar por Vencimiento</label>
                            <select
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value as any)}
                              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '2px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}
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
          ) : activeTab === 'payment_history' ? (
            <div style={{ padding: '0 0 20px 0' }} id="coach-payment-history-view">
              <h2 className="section-title">Historial de Pagos y Facturas</h2>
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
                    disabled={isLoadingLocal}
                    style={{ background: '#22c55e', color: '#fff', fontSize: '0.85rem', padding: '6px 12px', marginLeft: '10px' }}
                  >
                    {isLoadingLocal ? 'PROCESANDO...' : '✓ Aceptar Renovación'}
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
                    disabled={isReadOnly || isCoachBlocked || isContractLocked || user?.role === 'Coach'}
                    style={(isReadOnly || isCoachBlocked || isContractLocked || user?.role === 'Coach') ? lockedStyle : {}}
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
                  disabled={isLoadingLocal || (!athlete.is_active && !isRenewalActive) || isCoachBlocked}
                  style={((!athlete.is_active && !isRenewalActive) || isCoachBlocked) ? { ...lockedStyle, backgroundColor: '#cbd5e1', color: '#64748b' } : {}}
                  title={isCoachBlocked ? "Tu cuenta está inactiva" : (!athlete.is_active && !isRenewalActive ? "No se puede publicar rutina para atletas inactivos" : "")}
                >
                  {isLoadingLocal ? 'PUBLICANDO...' : (isCoachBlocked ? 'ACCESO RESTRINGIDO' : (!athlete.is_active && !isRenewalActive ? 'USUARIO INACTIVO' : 'PUBLICAR RUTINA'))}
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

