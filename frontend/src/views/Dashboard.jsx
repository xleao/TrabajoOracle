import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Bell, 
  FileText,
  UserPlus,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pacientes: 0,
    medicos: 0,
    citas: 0,
    usuarios: 0,
    horarios: 0,
    notificaciones: []
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [doctorAgenda, setDoctorAgenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const role = user?.rol?.toUpperCase();
      
      // If Admin, load overall data
      if (role === 'ADMINISTRADOR') {
        const [pacientesRes, medicosRes, usuariosRes, horariosRes, auditRes, notifRes] = await Promise.all([
          axios.get('http://localhost:5000/api/pacientes'),
          axios.get('http://localhost:5000/api/medicos'),
          axios.get('http://localhost:5000/api/usuarios'),
          axios.get('http://localhost:5000/api/horarios'),
          axios.get('http://localhost:5000/api/auditoria'),
          axios.get('http://localhost:5000/api/notificaciones')
        ]);

        setStats({
          pacientes: pacientesRes.data.data?.length || 0,
          medicos: medicosRes.data.data?.length || 0,
          usuarios: usuariosRes.data.data?.length || 0,
          horarios: horariosRes.data.data?.length || 0,
          notificaciones: notifRes.data.data?.filter(n => n.LEIDA === 'N') || []
        });
        setAuditLogs(auditRes.data.data?.slice(0, 5) || []);
      } 
      // If Recepcionista, load appointments and notifications
      else if (role === 'RECEPCIONISTA') {
        const [pacientesRes, notifRes, medicosRes] = await Promise.all([
          axios.get('http://localhost:5000/api/pacientes'),
          axios.get('http://localhost:5000/api/notificaciones'),
          axios.get('http://localhost:5000/api/medicos')
        ]);
        
        // Fetch all appointments for today
        const todayStr = new Date().toISOString().substring(0, 10);
        let todayAppointments = [];
        
        for (const med of medicosRes.data.data || []) {
          try {
            const agendaRes = await axios.get(`http://localhost:5000/api/citas/agenda-diaria?medicoId=${med.MEDICO_ID}&fecha=${todayStr}`);
            if (agendaRes.data.success) {
              todayAppointments.push(...agendaRes.data.data.map(app => ({ ...app, doctorName: `${med.NOMBRES} ${med.APELLIDOS}` })));
            }
          } catch(e) {
            console.error('Error fetching agenda for med:', med.MEDICO_ID, e);
          }
        }

        setStats({
          pacientes: pacientesRes.data.data?.length || 0,
          medicos: medicosRes.data.data?.length || 0,
          citas: todayAppointments.length,
          notificaciones: notifRes.data.data?.filter(n => n.LEIDA === 'N') || []
        });
        setAuditLogs(todayAppointments.slice(0, 8)); // Display in main panel
      }
      // If Medico, load their agenda for today
      else if (role === 'MEDICO' && user.medicoId) {
        const todayStr = new Date().toISOString().substring(0, 10);
        const agendaRes = await axios.get(`http://localhost:5000/api/citas/agenda-diaria?medicoId=${user.medicoId}&fecha=${todayStr}`);
        
        setDoctorAgenda(agendaRes.data.data || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Error de conexión con el backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      const response = await axios.post('http://localhost:5000/api/notificaciones/marcar-leida', { notificacionId: notifId });
      if (response.data.success) {
        setStats(prev => ({
          ...prev,
          notificaciones: prev.notificaciones.filter(n => n.NOTIFICACION_ID !== notifId)
        }));
      }
    } catch(err) {
      console.error('Error marking notification as read:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Cargando datos del panel principal...</p>
      </div>
    );
  }

  const role = user?.rol?.toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Banner */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(2,108,128,0.05) 0%, rgba(3,150,166,0.1) 100%)' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '2rem', marginBottom: '0.5rem' }}>
            Hola, {user?.nombre || 'Usuario'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Bienvenido al panel clínico de la **Clínica Salud y Vida**. Hoy es {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '50%', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
          <Activity size={32} className="animate-pulse" />
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #EF4444', fontSize: '0.9rem' }}>
          <strong>Error de Carga:</strong> {errorMsg}. Por favor verifica el estado del backend o de la base de datos Oracle.
        </div>
      )}

      {/* RENDER BY ROLE */}
      
      {/* 1. ADMINISTRADOR DASHBOARD */}
      {role === 'ADMINISTRADOR' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(2,108,128,0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{stats.pacientes}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pacientes Registrados</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(3,150,166,0.1)', color: 'var(--primary-light)', borderRadius: '12px' }}>
                <Stethoscope size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{stats.medicos}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Médicos Activos</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(242,106,75,0.1)', color: 'var(--secondary)', borderRadius: '12px' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{stats.horarios}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Jornadas Semanales</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: '12px' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{stats.usuarios}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Usuarios con Acceso</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
            {/* Audit Logs */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)' }}>Auditoría del Sistema (Cambios Recientes)</h3>
                <span className="badge badge-info" style={{ textTransform: 'none' }}>Base de Datos Segura</span>
              </div>
              
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Tabla</th>
                      <th>Operación</th>
                      <th>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length > 0 ? (
                      auditLogs.map(log => (
                        <tr key={log.AUDITORIA_ID}>
                          <td style={{ fontWeight: 600 }}>{log.USUARIO}</td>
                          <td>{log.TABLA_AFECTADA}</td>
                          <td>
                            <span className={`badge ${
                              log.OPERACION === 'INSERT' ? 'badge-success' : 
                              log.OPERACION === 'UPDATE' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {log.OPERACION}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(log.FECHA_HORA).toLocaleString('es-ES')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                          Sin registros de auditoría recientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notifications */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={20} /> Recordatorios ({stats.notificaciones.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {stats.notificaciones.length > 0 ? (
                  stats.notificaciones.map(notif => (
                    <div key={notif.NOTIFICACION_ID} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-main)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="badge badge-warning">{notif.TIPO}</span>
                        <button onClick={() => handleMarkAsRead(notif.NOTIFICACION_ID)} style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Entendido</button>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>{notif.MENSAJE}</p>
                      <small style={{ color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
                        {new Date(notif.FECHA_GENERACION).toLocaleString('es-ES')}
                      </small>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No hay recordatorios pendientes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. RECEPCIONISTA DASHBOARD */}
      {role === 'RECEPCIONISTA' && (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-6">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => window.location.href='/recepcion/agenda'}>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(2,108,128,0.1)', color: 'var(--primary)', borderRadius: '50%' }}>
                <Calendar size={32} />
              </div>
              <h4 style={{ fontSize: '1.15rem' }}>Agendar Nueva Cita</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Reservar citas y reprogramar horarios médicos de forma atómica.</p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => window.location.href='/recepcion/pacientes'}>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: '50%' }}>
                <UserPlus size={32} />
              </div>
              <h4 style={{ fontSize: '1.15rem' }}>Registrar Paciente</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Ingresar y actualizar información demográfica del directorio.</p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(242,106,75,0.1)', color: 'var(--secondary)', borderRadius: '50%' }}>
                <Bell size={32} />
              </div>
              <h4 style={{ fontSize: '1.15rem' }}>Notificaciones</h4>
              <span className="badge badge-danger" style={{ fontSize: '0.9rem', padding: '0.35rem 1rem' }}>
                {stats.notificaciones.length} Pendientes
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Alertas preventivas automáticas activas.</p>
            </div>
          </div>

          {/* Recepcion Overview Table */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)' }}>Citas Asignadas del Día</h3>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Médico</th>
                    <th>Estado</th>
                    <th>Motivo de Consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length > 0 ? (
                    auditLogs.map((app, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{app.HORA_INICIO} - {app.HORA_FIN}</td>
                        <td style={{ fontWeight: 600 }}>{app.PACIENTE}</td>
                        <td>{app.doctorName}</td>
                        <td>
                          <span className={`badge ${
                            app.ESTADO_CITA === 'Pendiente' ? 'badge-info' :
                            app.ESTADO_CITA === 'Confirmada' ? 'badge-success' :
                            app.ESTADO_CITA === 'En Atención' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {app.ESTADO_CITA}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{app.MOTIVO_CONSULTA}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                        No hay citas agendadas para el día de hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 3. MÉDICO DASHBOARD */}
      {role === 'MEDICO' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)' }}>Mi Agenda de Consultas (Hoy)</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Consultando citas del día de hoy en tiempo real desde la Base de Datos.</p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.85rem' }}>
              {doctorAgenda.length} Pacientes Agendados
            </span>
          </div>

          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Estado</th>
                  <th>Motivo de Consulta</th>
                </tr>
              </thead>
              <tbody>
                {doctorAgenda.length > 0 ? (
                  doctorAgenda.map((c, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {c.HORA_INICIO} - {c.HORA_FIN}
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.PACIENTE}</td>
                      <td>
                        <span className={`badge ${
                          c.ESTADO_CITA === 'Pendiente' ? 'badge-info' :
                          c.ESTADO_CITA === 'Confirmada' ? 'badge-success' :
                          c.ESTADO_CITA === 'En Atención' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {c.ESTADO_CITA}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{c.MOTIVO_CONSULTA}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                      No tienes consultas programadas para hoy. ¡Disfruta tu día!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
