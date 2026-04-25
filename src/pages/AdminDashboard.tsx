import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, PlusCircle, Edit3, Settings, X, Save, Search, Shield, ShieldOff, Filter, ChevronDown, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import CoachDashboard, { type RoutineDay } from './CoachDashboard';
import '../App.css';

const AdminDashboard = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'coaches'>('users');
  const [clients, setClients] = useState<any[]>([]);
  const [coachesList, setCoachesList] = useState<any[]>([]); // Para la pestaña de gestión
  const [newCoach, setNewCoach] = useState({ name: '', email: '' });
  const [editingClientEmail, setEditingClientEmail] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineDay[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  const fetchCoaches = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/coach/list', { headers: authHeaders });
      if (res.ok) setCoaches(await res.json());
      
      const resAdmin = await fetch('http://localhost:8000/api/admin/coaches', { headers: authHeaders });
      if (resAdmin.ok) setCoachesList(await resAdmin.json());
    } catch (e) { console.error("Error fetching coaches", e); }
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/admin/coaches', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newCoach)
      });
      if (res.ok) {
        setNewCoach({ name: '', email: '' });
        fetchCoaches();
        alert("Coach registrado correctamente");
      } else {
        const data = await res.json();
        alert(data.detail || "Error al registrar coach");
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteCoach = async (id: number) => {
    if (!confirm("¿Estás seguro de remover a este coach? Se convertirá en cliente regular.")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/coaches/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) fetchCoaches();
    } catch (e) { console.error(e); }
  };

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
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error("Error fetching clients", e);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/users/${userId}/status`, {
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
      const res = await fetch(`http://localhost:8000/api/coach/clients/${editingProfile.id}`, {
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
    setIsLoading(true);
    setEditingClientEmail(email);
    try {
      const res = await fetch(`http://localhost:8000/api/coach/routine/${email}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.routine_data) {
          setEditingRoutine(JSON.parse(data.routine_data));
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
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', paddingBottom: 40, fontFamily: "'Montserrat', sans-serif" }}>
      {/* Top Banner */}
      <div style={{ background: '#111', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>
            BODY <span style={{ color: '#c5a021' }}>LOGIC</span>
          </h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 800 }}>
            ADMINISTRATOR PANEL
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Hola, {user?.name}</span>
          <button
            onClick={logout}
            style={{ background: '#333', color: '#f87171', border: 'none', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 1200, margin: '30px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => { setActiveTab('users'); setEditingClientEmail(null); }}
            style={{
              flex: 1, padding: '16px', background: activeTab === 'users' ? '#c5a021' : '#fff', color: activeTab === 'users' ? '#fff' : '#111',
              border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: activeTab === 'users' ? '0 8px 16px rgba(197,160,33,0.3)' : '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
            }}>
            <Users size={18} /> ADMINISTRAR USUARIOS
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1, padding: '16px', background: activeTab === 'create' ? '#111' : '#fff', color: activeTab === 'create' ? '#fff' : '#111',
              border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: activeTab === 'create' ? '0 8px 16px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
            }}>
            <PlusCircle size={18} /> CREAR RUTINA
          </button>
          <button
            onClick={() => setActiveTab('coaches')}
            style={{
              flex: 1, padding: '16px', background: activeTab === 'coaches' ? '#571665ff' : '#fff', color: activeTab === 'coaches' ? '#fff' : '#111',
              border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: activeTab === 'coaches' ? '0 8px 16px rgba(87,22,101,0.3)' : '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
            }}>
            <Shield size={18} /> GESTIÓN DE COACHES
          </button>
        </div>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* TAB 1: USERS */}
          {activeTab === 'users' && !editingClientEmail && (() => {
            const filteredClients = clients.filter(c => {
              const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesPlan = filters.planType === 'all' ||
                (c.profile?.planType === filters.planType);
              const matchesCoach = filters.coachId === 'all' ||
                (String(c.coach_id) === String(filters.coachId));
              const matchesStatus = filters.status === 'all' || 
                (filters.status === 'active' ? c.is_active : !c.is_active);
              
              return matchesSearch && matchesStatus && matchesPlan && matchesCoach;
            }).sort((a, b) => {
              const field = filters.dateType === 'start' ? 'startDate' : 'endDate';
              const dateA = a.profile?.[field] ? new Date(a.profile[field]).getTime() : 0;
              const dateB = b.profile?.[field] ? new Date(b.profile[field]).getTime() : 0;
              return filters.dateSort === 'desc' ? dateB - dateA : dateA - dateB;
            });

            const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
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
              <div style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>Listado de Atletas ({filteredClients.length})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, background: isFilterOpen ? '#c5a021' : '#fff',
                          color: isFilterOpen ? '#fff' : '#1e293b', border: '2px solid', borderColor: isFilterOpen ? '#c5a021' : '#e2e8f0',
                          padding: '10px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                        <Filter size={16} /> FILTRAR <ChevronDown size={14} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>

                      {isFilterOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 280, background: '#fff',
                          borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 100, padding: 20
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>OPCIONES DE FILTRO</span>
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

                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '2px solid #e2e8f0', width: 320, transition: 'all 0.2s' }}>
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
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#c5a021', textTransform: 'uppercase' }}>
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
                              onMouseOver={e => { e.currentTarget.style.borderColor = '#c5a021'; e.currentTarget.style.color = '#c5a021'; }}
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
                              onMouseOver={e => { e.currentTarget.style.borderColor = '#c5a021'; e.currentTarget.style.color = '#c5a021'; }}
                              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                            >
                              <Edit3 size={14} /> Ver / Editar Rutina
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedClients.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            {clients.length === 0 ? 'No hay atletas registrados aún.' : 'No se encontraron resultados para la búsqueda.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                      Mostrando <span style={{ color: '#111' }}>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a <span style={{ color: '#111' }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)}</span> de <span style={{ color: '#111' }}>{filteredClients.length}</span> resultados
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
                              borderRadius: 8, border: '1px solid', borderColor: p === currentPage ? '#111' : p === '...' ? 'transparent' : '#e2e8f0',
                              background: p === currentPage ? '#111' : 'transparent',
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
              {isLoading ? (
                <div style={{ padding: 100, textAlign: 'center', color: '#64748b' }}>Cargando rutina...</div>
              ) : (
                <CoachDashboard
                  hideHeader={true}
                  hideTabs={true}
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
            <div style={{ padding: 40 }}>
              <div style={{ display: 'flex', gap: 40 }}>
                {/* Formulario Izquierda */}
                <div style={{ flex: '0 0 350px' }}>
                  <div className="section-title" style={{ marginTop: 0 }}>Registrar Nuevo Coach</div>
                  <form onSubmit={handleCreateCoach} style={{ background: '#f8fafc', padding: 25, borderRadius: 16, border: '2px solid #e2e8f0' }}>
                    <div style={{ marginBottom: 15 }}>
                      <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>NOMBRE COMPLETO</label>
                      <input 
                        required 
                        placeholder="Ej: Juan Pérez"
                        value={newCoach.name} 
                        onChange={e => setNewCoach({...newCoach, name: e.target.value})}
                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none' }} 
                      />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 5 }}>CORREO GMAIL</label>
                      <input 
                        required 
                        type="email"
                        placeholder="ejemplo@gmail.com"
                        value={newCoach.email} 
                        onChange={e => setNewCoach({...newCoach, email: e.target.value})}
                        style={{ width: '100%', padding: '12px', border: '1px solid #c5a021', borderRadius: 8, outline: 'none' }} 
                      />
                    </div>
                    <button style={{ width: '100%', background: '#111', color: '#fff', padding: '14px', borderRadius: 8, border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <PlusCircle size={18} /> AGREGAR COACH
                    </button>
                  </form>
                </div>

                {/* Tabla Derecha */}
                <div style={{ flex: 1 }}>
                  <div className="section-title" style={{ marginTop: 0 }}>Coaches Activos</div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '15px 20px', fontWeight: 800 }}>Nombre</th>
                          <th style={{ padding: '15px 20px', fontWeight: 800 }}>Email</th>
                          <th style={{ padding: '15px 20px', fontWeight: 800, textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coachesList.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '15px 20px', fontWeight: 700 }}>{c.name}</td>
                            <td style={{ padding: '15px 20px', color: '#64748b' }}>{c.email}</td>
                            <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                              <button 
                                onClick={() => handleDeleteCoach(c.id)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                        {coachesList.length === 0 && (
                          <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No hay coaches registrados.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                <input required type="email" value={editingProfile.email || ''} onChange={e => setEditingProfile({ ...editingProfile, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '2px solid #c5a021', borderRadius: 8, outline: 'none', background: '#fefce8' }} />
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
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
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
              <button disabled={statusMsg.text === 'Guardando...'} style={{ background: '#111', color: '#fff', padding: 12, borderRadius: 8, border: 'none', fontWeight: 800, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={16} /> GUARDAR CAMBIOS
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
