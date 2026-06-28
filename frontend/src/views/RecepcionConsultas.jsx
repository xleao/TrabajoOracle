import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Calendar,
  Stethoscope,
  Filter,
  AlertCircle,
  Clock,
  User
} from 'lucide-react';

export default function RecepcionConsultas() {
  const [tab, setTab] = useState('especialidad'); // 'especialidad' | 'estado'

  // Catálogos
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [estados, setEstados] = useState([]);

  // Filtros RFC-04
  const [especialidadId, setEspecialidadId] = useState('');
  // Filtros RFC-05
  const [estadoCitaId, setEstadoCitaId] = useState('');
  const [medicoId, setMedicoId] = useState('');

  // Fechas compartidas
  const today = new Date().toISOString().substring(0, 10);
  const [fechaInicio, setFechaInicio] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(today);

  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [espRes, medRes, estRes] = await Promise.all([
          axios.get('http://localhost:5000/api/especialidades'),
          axios.get('http://localhost:5000/api/medicos'),
          axios.get('http://localhost:5000/api/citas/estados')
        ]);
        if (espRes.data.success) {
          const activas = espRes.data.data.filter(e => e.ESTADO === 'A');
          setEspecialidades(activas);
          if (activas.length > 0) setEspecialidadId(activas[0].ESPECIALIDAD_ID);
        }
        if (medRes.data.success) setMedicos(medRes.data.data.filter(m => m.ESTADO === 'A'));
        if (estRes.data.success) {
          setEstados(estRes.data.data);
          if (estRes.data.data.length > 0) setEstadoCitaId(estRes.data.data[0].ESTADO_CITA_ID);
        }
      } catch (err) {
        console.error('Error loading catalogs:', err);
      }
    };
    loadCatalogs();
  }, []);

  // Reset resultados al cambiar de tab
  useEffect(() => {
    setResultados([]);
    setError('');
    setSearched(false);
  }, [tab]);

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!fechaInicio || !fechaFin) return;

    setLoading(true);
    setError('');
    setResultados([]);
    setSearched(true);

    try {
      let res;
      if (tab === 'especialidad') {
        // RFC-04
        res = await axios.get(
          `http://localhost:5000/api/citas/por-especialidad?especialidadId=${especialidadId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
        );
      } else {
        // RFC-05
        const medParam = medicoId ? `&medicoId=${medicoId}` : '';
        res = await axios.get(
          `http://localhost:5000/api/citas/por-estado?estadoCitaId=${estadoCitaId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}${medParam}`
        );
      }
      if (res.data.success) setResultados(res.data.data || []);
      else setError(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al ejecutar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const ESTADO_BADGE = {
    'Pendiente':   'badge-info',
    'Confirmada':  'badge-success',
    'En Atención': 'badge-warning',
    'Atendida':    'badge-success',
    'Cancelada':   'badge-danger',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div>
        <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Consultas de Citas</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Busca citas por especialidad médica o por estado de atención.</p>
      </div>

      {/* Tabs RFC-04 / RFC-05 */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-light)' }}>
        <button
          onClick={() => setTab('especialidad')}
          style={{
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: tab === 'especialidad' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: tab === 'especialidad' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Stethoscope size={16} /> Por Especialidad
        </button>
        <button
          onClick={() => setTab('estado')}
          style={{
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: tab === 'estado' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: tab === 'estado' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Filter size={16} /> Por Estado
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleBuscar} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>

          {tab === 'especialidad' ? (
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Stethoscope size={13} /> Especialidad
              </label>
              <select className="input-control" value={especialidadId} onChange={e => setEspecialidadId(e.target.value)} required>
                {especialidades.map(e => (
                  <option key={e.ESPECIALIDAD_ID} value={e.ESPECIALIDAD_ID}>{e.NOMBRE}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div style={{ flex: 1.5, minWidth: '180px' }}>
                <label className="input-label">Estado de Cita</label>
                <select className="input-control" value={estadoCitaId} onChange={e => setEstadoCitaId(e.target.value)} required>
                  {estados.map(e => (
                    <option key={e.ESTADO_CITA_ID} value={e.ESTADO_CITA_ID}>{e.NOMBRE}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label className="input-label">Médico (opcional)</label>
                <select className="input-control" value={medicoId} onChange={e => setMedicoId(e.target.value)}>
                  <option value="">Todos los médicos</option>
                  {medicos.map(m => (
                    <option key={m.MEDICO_ID} value={m.MEDICO_ID}>Dr(a). {m.NOMBRES} {m.APELLIDOS}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ minWidth: '160px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} /> Fecha inicio
            </label>
            <input type="date" className="input-control" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
          </div>
          <div style={{ minWidth: '160px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} /> Fecha fin
            </label>
            <input type="date" className="input-control" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Search size={16} /> Buscar Citas
          </button>
        </form>
      </div>

      {/* Resultados */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-dark)', margin: 0 }}>
            {tab === 'especialidad' ? 'Citas por Especialidad (RFC-04)' : 'Citas por Estado (RFC-05)'}
          </h3>
          {resultados.length > 0 && (
            <span className="badge badge-info" style={{ textTransform: 'none' }}>{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Consultando base de datos...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--danger)' }}>
              <AlertCircle size={18} /> {error}
            </div>
          ) : resultados.length > 0 ? (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  {tab === 'especialidad' && <th>Estado</th>}
                  {tab === 'estado' && <th>Estado</th>}
                </tr>
              </thead>
              <tbody>
                {resultados.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>
                      {c.FECHA_CITA ? new Date(c.FECHA_CITA).toLocaleDateString('es-PE') : '—'}
                    </td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={13} />
                      {c.HORA_INICIO || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={14} color="var(--text-light)" />
                        {c.PACIENTE || '—'}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {c.MEDICO ? `Dr(a). ${c.MEDICO}` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${ESTADO_BADGE[c.ESTADO_CITA] || 'badge-info'}`}>
                        {c.ESTADO_CITA || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : searched ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No se encontraron citas con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Selecciona los filtros y presiona <strong>Buscar Citas</strong> para ver los resultados.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
