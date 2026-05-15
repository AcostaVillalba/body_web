import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, PlusCircle, Edit3, Settings, X, Save, Search, Shield, ShieldOff, Filter, ChevronDown, RotateCcw, ChevronLeft, ChevronRight, DollarSign, FileText, Menu, Download, ArrowLeft, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CoachDashboard, { type RoutineDay } from './CoachDashboard';
import '../App.css';
import logoBody2 from '../assets/logobody2.png';
import API_URL from '../api';
import { getImageUrl } from '../data';
import AvatarUpload from '../components/AvatarUpload';
import InfoModal from '../components/InfoModal';

const AdminDashboard = () => {
  const { token, logout, user, setIsLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'coaches' | 'pending_payments' | 'payment_history'>('users');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddingCoach, setIsAddingCoach] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [coachesList, setCoachesList] = useState<any[]>([]); // Para la pestaña de gestión
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [newCoach, setNewCoach] = useState({ name: '', email: '', phone: '', instagram: '' });
  const [editingClientEmail, setEditingClientEmail] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineDay[] | null>(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [editingCoachId, setEditingCoachId] = useState<number | null>(null); // Nuevo estado para editar coaches
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [pendingCoachFilter, setPendingCoachFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    planType: 'all',
    dateType: 'end', // 'start' o 'end'
    dateSort: 'desc',
    coachId: 'all'
  });
  const [coaches, setCoaches] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Edit Profile State
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    if (activeTab === 'users' && !editingClientEmail) {
      fetchClients();
    }
  }, [activeTab, editingClientEmail]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  useEffect(() => {
    fetchCoaches();
  }, []);

  useEffect(() => {
    if (activeTab === 'payment_history') {
      fetchAdminPayments();
    }
    if (activeTab === 'pending_payments') {
      fetchPendingPayments();
    }
  }, [activeTab]);

  const fetchAdminPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/payments?status=Paid`, { headers: authHeaders });
      if (res.ok) setAdminPayments(await res.json());
    } catch (e) { console.error("Error fetching admin payments", e); }
  };

  const fetchPendingPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/payments?status=Pending`, { headers: authHeaders });
      if (res.ok) setPendingPayments(await res.json());
    } catch (e) { console.error("Error fetching pending payments", e); }
  };

  const downloadInvoice = (batch: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(45, 71, 57); // #2d4739
    doc.rect(0, 0, 210, 45, 'F');
    
    // Logo (if available)
    try {
      doc.addImage(logoBody2, 'PNG', 15, 10, 25, 25);
    } catch (e) {
      console.warn("Logo could not be added to PDF", e);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA DE LIQUIDACION', 110, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text('BODY LOGIC - CONTROL DE PAGOS', 110, 32, { align: 'center' });

    // Coach Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACION DEL COACH', 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${batch.coach_name}`, 15, 67);
    doc.text(`ID de Lote: ${batch.batch_id || 'N/A'}`, 15, 73);
    doc.text(`Fecha de Pago: ${batch.date}`, 15, 79);

    // Summary Table
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

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Este documento sirve como comprobante de pago realizado por el coach a Body Logic.', 105, finalY + 20, { align: 'center' });
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, finalY + 27, { align: 'center' });

    doc.save(`Factura_${batch.coach_name}_${batch.date.replace(/\//g, '-')}.pdf`);
  };

  const handleCancelPayment = async (paymentId: number) => {
    if (!confirm("¿Estás seguro de anular este cobro? Esta acción no se puede deshacer y quedará registrado como Cancelado.")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        fetchPendingPayments();
        alert("Cobro anulado correctamente.");
      }
    } catch (e) { console.error("Error canceling payment", e); }
  };

  const fetchCoaches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coach/list`, { headers: authHeaders });
      if (res.ok) setCoaches(await res.json());

      const resAdmin = await fetch(`${API_URL}/api/admin/coaches`, { headers: authHeaders });
      if (resAdmin.ok) setCoachesList(await resAdmin.json());
    } catch (e) { console.error("Error fetching coaches", e); }
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/coaches`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newCoach)
      });
      if (res.ok) {
        setNewCoach({ name: '', email: '', phone: '', instagram: '' });
        setEditingCoachId(null);
        setIsAddingCoach(false);
        fetchCoaches();
        alert(editingCoachId ? "Coach actualizado correctamente" : "Coach registrado correctamente");
      } else {
        const data = await res.json();
        alert(data.detail || "Error al procesar coach");
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleCoachStatus = async (coachId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${coachId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        fetchCoaches();
      } else {
        const data = await res.json();
        alert(data.detail || "Error al cambiar estado del coach");
      }
    } catch (e) { console.error(e); }
  };

  const handleStartEditCoach = (coach: any) => {
    setEditingCoachId(coach.id);
    setNewCoach({
      name: coach.name,
      email: coach.email,
      phone: coach.phone || '',
      instagram: coach.instagram || ''
    });
  };

  const handleDeleteCoach = async (id: number) => {
    if (!confirm("¿Estás seguro de remover a este coach? Se convertirá en cliente regular.")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/coaches/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) fetchCoaches();
    } catch (e) { console.error(e); }
  };

  const fetchClients = async () => {
    try {
      console.log("DEBUG: Fetching clients from", `${API_URL}/api/coach/clients`);
      const res = await fetch(`${API_URL}/api/coach/clients`, { headers: authHeaders });
      console.log("DEBUG: Response status (clients):", res.status);
      
      if (res.status === 401) {
        console.warn("DEBUG: 401 Unauthorized - Redirecting to logout");
        logout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        console.log("DEBUG: Clients data received:", data);
        setClients(data);
      } else {
        console.error("DEBUG: Request failed with status", res.status);
      }
    } catch (e) {
      console.error("DEBUG: Fetch error (CORS or Network):", e);
    } finally {
      setIsLoading(false); // Disable global loading screen
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.detail && String(data.detail).toLowerCase().includes("plan ha expirado")) {
          logout();
          return;
        }
      }

      if (res.ok) {
        setClients(prev => prev.map(c => c.id === userId ? { ...c, is_active: !currentStatus } : c));
      } else {
        const data = await res.json();
        alert(data.detail || "Error al actualizar estado");
      }
    } catch (e) {
      console.error("Error toggling status", e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ text: 'Guardando...', type: 'info' });
    try {
      const res = await fetch(`${API_URL}/api/coach/clients/${editingProfile.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          email: editingProfile.email,
          name: editingProfile.name,
          profile: editingProfile.profile || { age: '', weight: '', goal: '', planType: '', startDate: '', controlDate: '' },
          coach_id: editingProfile.coach_id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: '¡Perfil actualizado con éxito!', type: 'success' });
        fetchClients(); // recargar
        setTimeout(() => { setEditingProfile(null); setStatusMsg({ text: '', type: '' }); }, 1500);
      } else {
        setStatusMsg({ text: data.detail || 'Error al actualizar', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setStatusMsg({ text: 'Error de red', type: 'error' });
    }
  };

  const handleEditRoutine = async (email: string) => {
    setIsLoadingLocal(true);
    setEditingClientEmail(email);
    try {
      const res = await fetch(`${API_URL}/api/coach/routine/${email}`, { headers: authHeaders });
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

          setEditingRoutine(updatedRoutine);
        } else {
          setEditingRoutine([]); // Empty routine
        }
      } else {
        setEditingRoutine([]);
      }
    } catch (e) {
      console.error("Error fetching routine", e);
      setEditingRoutine([]);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  return (
    <div style={{ background: '#f4f7f5', minHeight: '100vh', paddingBottom: 40, fontFamily: "'Montserrat', sans-serif", position: 'relative' }}>
      {/* Background Watermark */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: `url(${logoBody2})`, backgroundRepeat: 'repeat', backgroundSize: '200px',
        opacity: 0.08, pointerEvents: 'none', zIndex: 0
      }} />
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
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#a2d149' }}>{user?.name}</span>
          <button onClick={logout} style={{ background: '#333', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
            SALIR
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
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                ADMINISTRADOR
            </p>
        </div>

        <div style={{ flex: 1, padding: '10px 15px', overflowY: 'auto' }}>
          {[
            { id: 'users', label: 'ADMINISTRAR USUARIOS', icon: <Users size={20} /> },
            { id: 'create', label: 'CREAR RUTINA', icon: <PlusCircle size={20} /> },
            { id: 'coaches', label: 'GESTIÓN DE COACHES', icon: <Shield size={20} /> },
            { id: 'pending_payments', label: 'COBROS PENDIENTES', icon: <DollarSign size={20} /> },
            { id: 'payment_history', label: 'HISTORIAL DE PAGOS', icon: <FileText size={20} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setEditingClientEmail(null); setIsMenuOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                marginBottom: '4px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '11px',
                transition: 'all 0.2s',
                textAlign: 'left',
                background: activeTab === tab.id ? '#f0f9ff' : 'transparent',
                color: activeTab === tab.id ? '#2d4739' : '#64748b',
                borderLeft: activeTab === tab.id ? '4px solid #a2d149' : '4px solid transparent'
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
              marginTop: '12px',
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

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '100px 20px 40px' }}>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* TAB 1: USERS */}
          {activeTab === 'users' && !editingClientEmail && (() => {
            const filteredClients = clients.filter(c => {
              if (filters.status === 'active' && !c.is_active) return false;
              if (filters.status === 'inactive' && c.is_active) return false;
              
              if (filters.planType !== 'all' && c.profile?.planType !== filters.planType) return false;
              if (filters.coachId !== 'all' && String(c.coach_id) !== filters.coachId) return false;

              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) {
                  return false;
                }
              }

              return true;
            }).sort((a, b) => {
              // Helper para parsear DD/MM/YYYY a un timestamp de manera segura
              const parseDate = (dateStr?: string) => {
                if (!dateStr) return 0;
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  // Asumiendo formato DD/MM/YYYY
                  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
                }
                return 0;
              };

              let valA = 0;
              let valB = 0;

              const field = filters.dateType === 'start' ? 'startDate' : 'endDate';
              valA = parseDate(a.profile?.[field]);
              valB = parseDate(b.profile?.[field]);

              return filters.dateSort === 'desc' ? valB - valA : valA - valB;
            });

            const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE) || 1;
            const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            // Pagination Helper: generate page numbers with ellipsis
            const getPageNumbers = () => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage > 3) pages.push('...');

                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);

                for (let i = start; i <= end; i++) {
                  if (!pages.includes(i)) pages.push(i);
                }

                if (currentPage < totalPages - 2) pages.push('...');
                if (!pages.includes(totalPages)) pages.push(totalPages);
              }
              return pages;
            };

            return (
              <div className="admin-content-container">
                <div className="admin-header-row">
                  <div className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>Listado de Atletas ({filteredClients.length})</div>
                  <div className="admin-actions-group">
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, background: isFilterOpen ? '#a2d149' : '#fff',
                          color: isFilterOpen ? '#fff' : '#1e293b', border: '2px solid', borderColor: isFilterOpen ? '#a2d149' : '#e2e8f0',
                          padding: '10px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                        <Filter size={16} /> FILTRAR <ChevronDown size={14} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>

                      {isFilterOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 280, background: '#fff',
                          borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 100, padding: 20
                        }}>
                          <div className="admin-header-row" style={{ marginBottom: 25 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#2d4739' }}>OPCIONES DE FILTRO</span>
                            <button
                              onClick={() => setFilters({ status: 'all', planType: 'all', dateType: 'end', dateSort: 'desc', coachId: 'all' })}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <RotateCcw size={12} /> Limpiar
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>ESTADO DE ACCESO</label>
                              <select
                                value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                <option value="all">Todos los estados</option>
                                <option value="active">Solo Activos</option>
                                <option value="inactive">Solo Inactivos</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>TIPO DE PLAN</label>
                              <select
                                value={filters.planType}
                                onChange={e => setFilters({ ...filters, planType: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                <option value="all">Todos los planes</option>
                                <option value="Mensual">Mensual</option>
                                <option value="Dos meses">Dos meses</option>
                                <option value="Trimestral">Trimestral</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>BASE DE FECHA</label>
                              <select
                                value={filters.dateType}
                                onChange={e => setFilters({ ...filters, dateType: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 15 }}>
                                <option value="end">Fecha de Finalización</option>
                                <option value="start">Fecha de Inicio</option>
                              </select>

                              <label style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>ORDEN DE FECHA</label>
                              <select
                                value={filters.dateSort}
                                onChange={e => setFilters({ ...filters, dateSort: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                {filters.dateType === 'start' ? (
                                  <>
                                    <option value="desc">Más reciente</option>
                                    <option value="asc">Más antiguo</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="asc">Próximos a vencer</option>
                                    <option value="desc">Vencimiento más lejano</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="admin-search-bar">
                      <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#1e293b' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Nombre</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Email</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Plan / Objetivo</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Inicio del Plan</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Fin del Plan</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Coach</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Estado de Acceso</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800, textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedClients.map(c => (
                        <tr key={c.email} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '20px', fontWeight: 700, color: '#1e293b' }}>{c.name}</td>
                          <td style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>{c.email}</td>
                          <td style={{ padding: '20px' }}>
                            <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 800, marginBottom: 4 }}>
                              {c.profile?.planType || 'Mensual'}
                            </span>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{c.profile?.goal || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '20px' }}>
                            {c.profile?.startDate ? (
                              <span style={{
                                display: 'inline-block',
                                background: '#fbf0fdff',
                                color: '#571665ff',
                                border: '1px solid #f6dcfcff',
                                padding: '5px 12px',
                                borderRadius: 20,
                                fontSize: '12px',
                                fontWeight: 800,
                                letterSpacing: '0.5px'
                              }}>
                                {c.profile.startDate}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '20px' }}>
                            {c.profile?.endDate ? (
                              <span style={{
                                display: 'inline-block',
                                background: '#c3e3f9ff',
                                color: '#040faaff',
                                border: '1px solid #caf0feff',
                                padding: '5px 12px',
                                borderRadius: 20,
                                fontSize: '12px',
                                fontWeight: 800,
                                letterSpacing: '0.5px'
                              }}>
                                {c.profile.endDate}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a2d149', textTransform: 'uppercase' }}>
                              {coaches.find(co => String(co.id) === String(c.coach_id))?.name || 'Sin asignar'}
                            </div>
                          </td>
                          <td style={{ padding: '20px' }}>
                            <button
                              onClick={() => handleToggleStatus(c.id, c.is_active)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                borderRadius: 20,
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: '11px',
                                transition: 'all 0.2s',
                                background: c.is_active ? '#dcfce7' : '#fee2e2',
                                color: c.is_active ? '#166534' : '#991b1b',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                              }}
                              title={c.is_active ? 'Desactivar acceso' : 'Activar acceso'}
                            >
                              {c.is_active ? (
                                <><Shield size={14} /> ACTIVO</>
                              ) : (
                                <><ShieldOff size={14} /> INACTIVO</>
                              )}
                            </button>
                          </td>
                          <td style={{ padding: '20px', textAlign: 'right' }}>
                            <button
                              onClick={() => setEditingProfile(c)}
                              style={{
                                background: '#fff', border: '2px solid #e2e8f0', color: '#0f172a', padding: '8px 12px', marginRight: 8,
                                borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                              }}
                              onMouseOver={e => { e.currentTarget.style.borderColor = '#a2d149'; e.currentTarget.style.color = '#a2d149'; }}
                              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                            >
                              <Settings size={14} /> Editar Datos
                            </button>
                            <button
                              onClick={() => handleEditRoutine(c.email)}
                              style={{
                                background: '#fff', border: '2px solid #e2e8f0', color: '#0f172a', padding: '8px 16px',
                                borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                              }}
                              onMouseOver={e => { e.currentTarget.style.borderColor = '#a2d149'; e.currentTarget.style.color = '#a2d149'; }}
                              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                            >
                              <Edit3 size={14} /> Ver / Editar Rutina
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedClients.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            {clients.length === 0 ? 'No hay atletas registrados aún.' : 'No se encontraron resultados para la búsqueda.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                <div className="admin-pagination-row">
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                      Mostrando <span style={{ color: '#2d4739' }}>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a <span style={{ color: '#2d4739' }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)}</span> de <span style={{ color: '#2d4739' }}>{filteredClients.length}</span> resultados
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                          background: '#fff', color: currentPage === 1 ? '#cbd5e1' : '#1e293b', cursor: currentPage === 1 ? 'default' : 'pointer',
                          fontSize: '13px', fontWeight: 700, transition: 'all 0.2s'
                        }}
                      >
                        <ChevronLeft size={16} /> Anterior
                      </button>

                      <div style={{ display: 'flex', gap: 5 }}>
                        {getPageNumbers().map((p, idx) => (
                          <button
                            key={idx}
                            disabled={p === '...'}
                            onClick={() => typeof p === 'number' && setCurrentPage(p)}
                            style={{
                              minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 8, border: '1px solid', borderColor: p === currentPage ? '#2d4739' : p === '...' ? 'transparent' : '#e2e8f0',
                              background: p === currentPage ? '#2d4739' : 'transparent',
                              color: p === currentPage ? '#fff' : p === '...' ? '#94a3b8' : '#1e293b',
                              cursor: p === '...' ? 'default' : 'pointer', fontSize: '13px', fontWeight: 800, transition: 'all 0.2s'
                            }}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                          background: '#fff', color: currentPage === totalPages ? '#cbd5e1' : '#1e293b', cursor: currentPage === totalPages ? 'default' : 'pointer',
                          fontSize: '13px', fontWeight: 700, transition: 'all 0.2s'
                        }}
                      >
                        Siguiente <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 1: EDITING USER */}
          {activeTab === 'users' && editingClientEmail && (
            <div style={{ padding: '0' }}>
              {isLoadingLocal ? (
                <div style={{ padding: 100, textAlign: 'center', color: '#64748b' }}>Cargando rutina...</div>
              ) : (
                <CoachDashboard
                  hideHeader={true}
                  preloadedEmail={editingClientEmail}
                  preloadedRoutine={editingRoutine || []}
                  onCancel={() => setEditingClientEmail(null)}
                />
              )}
            </div>
          )}

          {/* TAB 2: CREATE ROUTINE (COACH MODE) */}
          {activeTab === 'create' && (
            <div style={{ padding: '0' }}>
              <CoachDashboard hideHeader={true} />
            </div>
          )}

          {/* TAB 3: COACH MANAGEMENT */}
          {activeTab === 'coaches' && (
            <div className="admin-content-container">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
                
                {/* Header & Toggle Button */}
                <div className="admin-header-row" style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#2d4739' }}>GESTIÓN DE EQUIPO</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Administra y supervisa a los coaches de Body Logic</p>
                  </div>
                  {!isAddingCoach && !editingCoachId && (
                    <button 
                      onClick={() => setIsAddingCoach(true)}
                      style={{ 
                        background: '#a2d149', color: '#1e293b', border: 'none', padding: '12px 20px', borderRadius: '12px', 
                        fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 4px 12px rgba(162, 209, 73, 0.3)'
                      }}>
                      <PlusCircle size={18} /> AGREGAR NUEVO COACH
                    </button>
                  )}
                </div>

                {/* Conditional Form (Modal-like or Collapsible) */}
                {(isAddingCoach || editingCoachId) && (
                  <div style={{ 
                    background: '#f8fafc', padding: '30px', borderRadius: '20px', border: '2px solid #e2e8f0',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{editingCoachId ? 'EDITAR COACH' : 'REGISTRAR NUEVO COACH'}</h3>
                      <button 
                        onClick={() => { setIsAddingCoach(false); setEditingCoachId(null); setNewCoach({ name: '', email: '', phone: '', instagram: '' }); }}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 800 }}
                      >CANCELAR</button>
                    </div>
                    
                    <form onSubmit={handleCreateCoach} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>NOMBRE COMPLETO</label>
                        <input required placeholder="Ej: Juan Pérez" value={newCoach.name} onChange={e => setNewCoach({ ...newCoach, name: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>CORREO GMAIL</label>
                        <input required type="email" placeholder="ejemplo@gmail.com" value={newCoach.email} onChange={e => setNewCoach({ ...newCoach, email: e.target.value })} style={{ width: '100%', padding: '12px', border: editingCoachId ? '1px solid #e2e8f0' : '1px solid #a2d149', borderRadius: 8, outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>TELÉFONO</label>
                        <input placeholder="Ej: +57 300 123 4567" value={newCoach.phone} onChange={e => setNewCoach({ ...newCoach, phone: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>INSTAGRAM</label>
                        <input placeholder="Ej: @coach_fitness" value={newCoach.instagram} onChange={e => setNewCoach({ ...newCoach, instagram: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none' }} />
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ background: '#2d4739', color: '#fff', padding: '14px 40px', borderRadius: 12, border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                          {editingCoachId ? <Save size={18} /> : <PlusCircle size={18} />} {editingCoachId ? 'GUARDAR CAMBIOS' : 'CONFIRMAR REGISTRO'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Coaches Table Section */}
                <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#475569' }}>COACHES ACTIVOS ({coachesList.length})</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#fff', borderBottom: '2px solid #f1f5f9', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: '#64748b' }}>Nombre</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: '#64748b' }}>Email</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: '#64748b' }}>Teléfono</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: '#64748b' }}>Instagram</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: '#64748b' }}>Estado</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: '#64748b', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coachesList.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                            <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{c.name}</td>
                            <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>{c.email}</td>
                            <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>{c.phone || '-'}</td>
                            <td style={{ padding: '16px 20px', color: '#a2d149', fontSize: '13px', fontWeight: 700 }}>{c.instagram || '-'}</td>
                            <td style={{ padding: '16px 20px' }}>
                               <button
                                 onClick={() => handleToggleCoachStatus(c.id, c.is_active)}
                                 style={{ 
                                   background: c.is_active ? '#dcfce7' : '#fee2e2', 
                                   color: c.is_active ? '#166534' : '#991b1b',
                                   border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 800, fontSize: '10px'
                                 }}
                               >
                                 {c.is_active ? '● ACTIVO' : '○ INACTIVO'}
                               </button>
                             </td>
                             <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                               <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
                                 <button
                                   onClick={() => handleStartEditCoach(c)}
                                   style={{ background: 'transparent', border: 'none', color: '#2d4739', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                                 >
                                   Editar
                                 </button>
                                 <button
                                   onClick={() => handleDeleteCoach(c.id)}
                                   style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                                 >
                                   Remover
                                 </button>
                               </div>
                             </td>
                          </tr>
                        ))}
                        {coachesList.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No hay coaches registrados en el sistema.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 4: COBROS PENDIENTES */}
          {activeTab === 'pending_payments' && (
            <div className="admin-content-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px' }}>COBROS PENDIENTES DE CONCILIACIÓN</h2>
                  <p style={{ margin: '5px 0 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{pendingPayments.length} COBROS POR LIQUIDAR</p>
                </div>
                
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Buscador */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', width: 220 }}>
                    <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
                    <input
                      type="text"
                      placeholder="Buscar atleta..."
                      value={pendingSearchQuery}
                      onChange={(e) => setPendingSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12px' }}
                    />
                  </div>

                  {/* Filtro por Coach */}
                  <select 
                    value={pendingCoachFilter}
                    onChange={(e) => setPendingCoachFilter(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', fontWeight: 700, color: '#475569', outline: 'none' }}
                  >
                    <option value="all">TODOS LOS COACHES</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>FECHA</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>ATLETA</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>COACH</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>PLAN</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>MONTO</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800, textAlign: 'right' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.filter(p => {
                        const matchesSearch = p.client_name.toLowerCase().includes(pendingSearchQuery.toLowerCase());
                        const matchesCoach = pendingCoachFilter === 'all' || p.coach_name === pendingCoachFilter;
                        return matchesSearch && matchesCoach;
                      }).map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 20px', fontSize: 12, color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{p.client_name}</td>
                          <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#2d4739' }}>{p.coach_name || 'Sin asignar'}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ background: '#f0f9ff', color: '#0369a1', padding: '4px 10px', borderRadius: 20, fontSize: '10px', fontWeight: 800 }}>{p.plan_type}</span>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 900, color: '#b91c1c' }}>${p.amount.toLocaleString()}</td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleCancelPayment(p.id)}
                              style={{ background: '#fff', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                              onMouseOut={e => e.currentTarget.style.background = '#fff'}
                            >
                              ANULAR COBRO
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pendingPayments.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>No hay cobros pendientes registrados.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HISTORIAL DE PAGOS */}
          {activeTab === 'payment_history' && (
            <div className="admin-content-container">
              <div style={{ marginBottom: 25 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px' }}>HISTORIAL DE LIQUIDACIONES</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Registro de lotes pagados a coaches</p>
              </div>

              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>FECHA</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>COACH</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>ATLETAS</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>MONTO TOTAL</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800, textAlign: 'right' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPayments.map((batch: any, i: number) => (
                        <tr key={batch.batch_id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600 }}>{batch.date}</td>
                          <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: '#2d4739' }}>{batch.coach_name}</td>
                          <td style={{ padding: '16px 20px', fontSize: 13 }}>{batch.clients_count} atletas</td>
                          <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 900, color: '#10b981' }}>${batch.total_amount.toLocaleString()}</td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button 
                              onClick={() => setSelectedBatch(batch)}
                              style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={14} /> VER FACTURA
                            </button>
                          </td>
                        </tr>
                      ))}
                      {adminPayments.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>No hay liquidaciones registradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDICION PERFIL */}
      {activeTab === 'users' && editingProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: 15, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Editar Datos del Atleta</h3>
              <button
                onClick={() => { setEditingProfile(null); setStatusMsg({ text: '', type: '' }); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {statusMsg.text && (
              <div style={{ padding: 12, borderRadius: 8, marginBottom: 15, background: statusMsg.type === 'error' ? '#fee2e2' : statusMsg.type === 'success' ? '#dcfce7' : '#e0f2fe', color: statusMsg.type === 'error' ? '#ef4444' : statusMsg.type === 'success' ? '#166534' : '#0284c7', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>NOMBRE DEL ATLETA</label>
                <input required value={editingProfile.name || ''} onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>CORREO DE INGRESO (IMPORTANTE)</label>
                <input required type="email" value={editingProfile.email || ''} onChange={e => setEditingProfile({ ...editingProfile, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '2px solid #a2d149', borderRadius: 8, outline: 'none', background: '#fefce8' }} />
              </div>
              <div style={{ display: 'flex', gap: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>OBJETIVO</label>
                  <select value={editingProfile.profile?.goal || ''} onChange={e => setEditingProfile({ ...editingProfile, profile: { ...editingProfile.profile, goal: e.target.value } })} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, outline: 'none' }}>
                    <option value="Definición Muscular">Definición Muscular</option>
                    <option value="Aumento de Masa Muscular">Aumento de Masa Muscular</option>
                    <option value="Acondicionamiento Físico">Acondicionamiento Físico</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>TIPO DE PLAN</label>
                  <select value={editingProfile.profile?.planType || ''} onChange={e => setEditingProfile({ ...editingProfile, profile: { ...editingProfile.profile, planType: e.target.value } })} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, outline: 'none' }}>
                    <option value="Mensual">Mensual</option>
                    <option value="Dos meses">Dos meses</option>
                    <option value="Trimestral">Trimestral</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>ASIGNAR COACH</label>
                <select
                  value={editingProfile.coach_id || ''}
                  onChange={e => setEditingProfile({ ...editingProfile, coach_id: e.target.value ? parseInt(e.target.value) : null })}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, outline: 'none' }}
                >
                  <option value="">-- Sin asignar --</option>
                  {coaches.map(co => (
                    <option key={co.id} value={co.id}>{co.name}</option>
                  ))}
                </select>
              </div>
              <button disabled={statusMsg.text === 'Guardando...'} style={{ background: '#2d4739', color: '#fff', padding: 12, borderRadius: 8, border: 'none', fontWeight: 800, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={18} /> {statusMsg.text === 'Guardando...' ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLES PAGO */}
      {selectedBatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: 15, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Detalles del Pago - {selectedBatch.coach_name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Fecha: {selectedBatch.date}</p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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


      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </div>
  );
};

export default AdminDashboard;
