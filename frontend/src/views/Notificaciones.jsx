import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, CheckCircle, Filter } from 'lucide-react';

const TIPO_BADGE = {
  CONFIRMACION: 'badge-success',
  RECORDATORIO: 'badge-info',
  CANCELACION: 'badge-danger',
  REPROGRAMACION: 'badge-warning',
};

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLeida, setFiltroLeida] = useState('');

  useEffect(() => { fetchNotificaciones(); }, []);

  const fetchNotificaciones = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/notificaciones');
      if (res.data.success) setNotificaciones(res.data.data);
    } catch (err) {
      console.error('Error fetching notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarLeida = async (id) => {
    try {
      await axios.post('http://localhost:5000/api/notificaciones/marcar-leida', { notificacionId: id });
      setNotificaciones(prev =>
        prev.map(n => n.NOTIFICACION_ID === id ? { ...n, LEIDA: 'S' } : n)
      );
    } catch (err) {
      console.error('Error marcando notificación:', err);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(n => n.LEIDA === 'N');
    await Promise.all(noLeidas.map(n => handleMarcarLeida(n.NOTIFICACION_ID)));
  };

  const filtradas = notificaciones
    .filter(n => !filtroTipo || n.TIPO === filtroTipo)
    .filter(n => !filtroLeida || n.LEIDA === filtroLeida);

  const noLeidasCount = notificaciones.filter(n => n.LEIDA === 'N').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Centro de Notificaciones
            {noLeidasCount > 0 && (
              <span className="badge badge-danger" style={{ fontSize: '0.8rem' }}>{noLeidasCount} sin leer</span>
            )}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Recordatorios y alertas generados automáticamente por Oracle Scheduler (JOB_RECORDATORIOS_24H).
          </p>
        </div>
        {noLeidasCount > 0 && (
          <button className="btn btn-outline" onClick={handleMarcarTodasLeidas}>
            <CheckCircle size={18} /> Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Filter size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Filtrar por:</span>
        </div>
        <select
          className="input-control"
          style={{ maxWidth: '220px' }}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="CONFIRMACION">Confirmación</option>
          <option value="RECORDATORIO">Recordatorio</option>
          <option value="CANCELACION">Cancelación</option>
          <option value="REPROGRAMACION">Reprogramación</option>
        </select>
        <select
          className="input-control"
          style={{ maxWidth: '180px' }}
          value={filtroLeida}
          onChange={(e) => setFiltroLeida(e.target.value)}
        >
          <option value="">Todas</option>
          <option value="N">Sin leer</option>
          <option value="S">Leídas</option>
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtradas.length} notificación(es)
        </span>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Paciente</th>
                <th>Mensaje</th>
                <th>Fecha Generación</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando notificaciones...</p>
                  </td>
                </tr>
              ) : filtradas.length > 0 ? (
                filtradas.map(n => (
                  <tr key={n.NOTIFICACION_ID} style={{ opacity: n.LEIDA === 'S' ? 0.6 : 1 }}>
                    <td>
                      <span className={`badge ${TIPO_BADGE[n.TIPO] || 'badge-info'}`} style={{ fontSize: '0.75rem' }}>
                        {n.TIPO}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{n.PACIENTE_NOMBRE}</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '300px' }}>{n.MENSAJE}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(n.FECHA_GENERACION).toLocaleString('es-ES')}
                    </td>
                    <td>
                      <span className={`badge ${n.LEIDA === 'S' ? 'badge-success' : 'badge-warning'}`}>
                        {n.LEIDA === 'S' ? 'Leída' : 'Sin leer'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {n.LEIDA === 'N' && (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => handleMarcarLeida(n.NOTIFICACION_ID)}
                        >
                          <CheckCircle size={14} /> Leída
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    <Bell size={40} style={{ color: 'var(--text-light)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                    <p style={{ margin: 0 }}>No hay notificaciones con los filtros seleccionados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
