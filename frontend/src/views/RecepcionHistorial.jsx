import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  History,
  Calendar,
  Stethoscope,
  FileText,
  Clock,
  User,
  Filter,
  X
} from 'lucide-react';

export default function RecepcionHistorial() {
  const [pacientes, setPacientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtros sobre el historial cargado
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/pacientes?filtro=${filtro}`);
        if (res.data.success) setPacientes(res.data.data || []);
      } catch (err) {
        console.error('Error fetching pacientes:', err);
      }
    };
    const t = setTimeout(fetchPacientes, 300);
    return () => clearTimeout(t);
  }, [filtro]);

  const handleSelectPaciente = async (paciente) => {
    setSelectedPaciente(paciente);
    setFiltro('');
    setLoading(true);
    setErrorMsg('');
    setHistorial([]);
    // Reset filters when new patient selected
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroEstado('');
    try {
      const res = await axios.get(
        `http://localhost:5000/api/citas/historial-paciente?pacienteId=${paciente.PACIENTE_ID}`
      );
      if (res.data.success) setHistorial(res.data.data || []);
      else setErrorMsg(res.data.message);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error al obtener historial');
    } finally {
      setLoading(false);
    }
  };

  const clearPatient = () => {
    setSelectedPaciente(null);
    setHistorial([]);
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroEstado('');
  };

  // Filtrado client-side sobre el historial ya cargado
  const historialFiltrado = historial.filter(h => {
    const fecha = h.FECHA_CITA ? h.FECHA_CITA.toString().substring(0, 10) : '';
    if (filtroFechaDesde && fecha < filtroFechaDesde) return false;
    if (filtroFechaHasta && fecha > filtroFechaHasta) return false;
    if (filtroEstado && h.ESTADO_CITA !== filtroEstado) return false;
    return true;
  });

  // Lista única de estados disponibles en el historial del paciente
  const estadosDisponibles = [...new Set(historial.map(h => h.ESTADO_CITA).filter(Boolean))];

  const ESTADO_BORDER = {
    'Atendida':    'var(--success)',
    'Cancelada':   'var(--danger)',
    'Confirmada':  'var(--primary)',
    'Pendiente':   'var(--warning)',
    'En Atención': 'var(--warning)',
  };
  const ESTADO_BADGE = {
    'Atendida':    'badge-success',
    'Cancelada':   'badge-danger',
    'Confirmada':  'badge-primary',
    'Pendiente':   'badge-warning',
    'En Atención': 'badge-warning',
  };

  const hayFiltrosActivos = filtroFechaDesde || filtroFechaHasta || filtroEstado;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Historial de Paciente</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Consulta el registro histórico de atenciones médicas y citas de un paciente.</p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
          <Search size={16} /> Buscar Paciente por DNI o Apellidos
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input-control"
            placeholder="Ej. 12345678 o Pérez..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          {filtro && pacientes.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              backgroundColor: 'var(--bg-elevated)', borderRadius: '6px',
              border: '1px solid var(--border-light)', marginTop: '0.5rem',
              maxHeight: '300px', overflowY: 'auto', zIndex: 10,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
              {pacientes.map(p => (
                <div
                  key={p.PACIENTE_ID}
                  onClick={() => handleSelectPaciente(p)}
                  style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-default)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {p.NOMBRES.charAt(0)}{p.APELLIDOS.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.NOMBRES} {p.APELLIDOS}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DNI: {p.DNI}</div>
                    </div>
                  </div>
                  <History size={16} color="var(--primary)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPaciente && (
        <>
          {/* Patient Header + Filters */}
          <div className="card" style={{ padding: '0' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--primary-light)',
              borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {selectedPaciente.NOMBRES.charAt(0)}{selectedPaciente.APELLIDOS.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>
                    {selectedPaciente.NOMBRES} {selectedPaciente.APELLIDOS}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    DNI: {selectedPaciente.DNI} • Tel: {selectedPaciente.TELEFONO || 'N/A'}
                  </span>
                </div>
              </div>
              <button
                onClick={clearPatient}
                className="btn-ghost"
                style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--text-muted)' }}
                title="Cambiar paciente"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filters bar — visible solo cuando hay historial */}
            {historial.length > 0 && (
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', backgroundColor: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Filter size={13} /> Filtrar historial:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> Desde
                  </label>
                  <input
                    type="date"
                    className="input-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '155px' }}
                    value={filtroFechaDesde}
                    onChange={e => setFiltroFechaDesde(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> Hasta
                  </label>
                  <input
                    type="date"
                    className="input-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '155px' }}
                    value={filtroFechaHasta}
                    onChange={e => setFiltroFechaHasta(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    className="input-control"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', minWidth: '160px' }}
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    {estadosDisponibles.map(est => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </select>
                </div>
                {hayFiltrosActivos && (
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' }}
                    onClick={() => { setFiltroFechaDesde(''); setFiltroFechaHasta(''); setFiltroEstado(''); }}
                  >
                    <X size={13} /> Limpiar filtros
                  </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {historialFiltrado.length} de {historial.length} cita{historial.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* History Content */}
          <div className="card" style={{ padding: '1.5rem', flex: 1 }}>
            <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} /> Registro Clínico
            </h4>

            {errorMsg && (
              <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', color: 'var(--danger)', borderRadius: '6px', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando historial...</div>
            ) : historialFiltrado.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <FileText size={48} opacity={0.2} />
                {hayFiltrosActivos
                  ? 'Ninguna cita coincide con los filtros seleccionados.'
                  : 'No hay registro de citas para este paciente.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historialFiltrado.map((h, i) => (
                  <div key={i} style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    borderLeft: `4px solid ${ESTADO_BORDER[h.ESTADO_CITA] || 'var(--border-light)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge ${ESTADO_BADGE[h.ESTADO_CITA] || 'badge-info'}`}>{h.ESTADO_CITA}</span>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} />
                          {h.FECHA_CITA ? new Date(h.FECHA_CITA).toLocaleDateString('es-PE') : h.FECHA_CITA}
                        </span>
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} /> {h.HORA_INICIO}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        <Stethoscope size={16} style={{ color: 'var(--primary)', marginTop: '2px' }} />
                        <div>
                          <span style={{ fontWeight: 600 }}>Dr(a). {h.MEDICO}</span>
                          {' — '}
                          <span style={{ color: 'var(--text-muted)' }}>{h.ESPECIALIDAD}</span>
                        </div>
                      </div>
                      {h.MOTIVO_CONSULTA && (
                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.95rem', backgroundColor: 'var(--bg-default)', padding: '0.75rem', borderRadius: '6px' }}>
                          <FileText size={16} style={{ color: 'var(--secondary)', marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Motivo</div>
                            {h.MOTIVO_CONSULTA}
                          </div>
                        </div>
                      )}
                      {h.OBSERVACIONES && (
                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', backgroundColor: '#F0FDF4', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                          <User size={14} style={{ color: 'var(--success)', marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Observaciones médicas</div>
                            {h.OBSERVACIONES}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedPaciente && (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)', gap: '1rem' }}>
          <User size={64} opacity={0.1} />
          <p>Busca y selecciona un paciente para visualizar su historial clínico.</p>
        </div>
      )}
    </div>
  );
}
