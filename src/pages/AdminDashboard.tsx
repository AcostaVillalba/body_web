import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, PlusCircle, Edit3, Settings, X, Save, Search } from 'lucide-react';
import CoachDashboard, { type RoutineDay } from './CoachDashboard';
import '../App.css';

const AdminDashboard = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'create'>('users');
  const [clients, setClients] = useState<any[]>([]);
  const [editingClientEmail, setEditingClientEmail] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineDay[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
          profile: editingProfile.profile || { age: '', weight: '', goal: '', planType: '', startDate: '', controlDate: '' }
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
            BODY BY <span style={{ color: '#c5a021' }}>J.A.</span>
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
        </div>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* TAB 1: USERS */}
          {activeTab === 'users' && !editingClientEmail && (() => {
            const filteredClients = clients.filter(c =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.email.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <div style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>Listado de Atletas ({filteredClients.length})</div>
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

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Nombre</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Email</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Plan / Objetivo</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800 }}>Fin del Plan</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800, textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map(c => (
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
                      {filteredClients.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            {clients.length === 0 ? 'No hay atletas registrados aún.' : 'No se encontraron resultados para la búsqueda.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
