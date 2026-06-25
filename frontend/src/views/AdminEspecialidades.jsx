import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Edit2, Check, X, AlertCircle, BookOpen, Trash } from 'lucide-react';

export default function AdminEspecialidades() {
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', estado: 'A' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchEspecialidades(); }, []);

  const fetchEspecialidades = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/especialidades');
      if (res.data.success) setEspecialidades(res.data.data);
    } catch (err) {
      console.error('Error fetching especialidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (esp = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (esp) {
      setSelected(esp);
      setFormData({ nombre: esp.NOMBRE, descripcion: esp.DESCRIPCION || '', estado: esp.ESTADO });
    } else {
      setSelected(null);
      setFormData({ nombre: '', descripcion: '', estado: 'A' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        accion: selected ? 'U' : 'I',
        especialidadId: selected ? selected.ESPECIALIDAD_ID : null,
        ...formData
      };
      const res = await axios.post('http://localhost:5000/api/especialidades/gestionar', payload);
      if (res.data.success) {
        setSuccessMsg(selected ? 'Especialidad actualizada.' : 'Especialidad registrada.');
        setTimeout(() => { setShowModal(false); fetchEspecialidades(); }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error guardando especialidad');
    }
  };

  const handleToggleEstado = async (esp) => {
    const nuevo = esp.ESTADO === 'A' ? 'I' : 'A';
    if (!window.confirm(`¿${nuevo === 'I' ? 'Desactivar' : 'Activar'} la especialidad "${esp.NOMBRE}"?`)) return;
    try {
      await axios.post('http://localhost:5000/api/especialidades/gestionar', {
        accion: 'U',
        especialidadId: esp.ESPECIALIDAD_ID,
        nombre: esp.NOMBRE,
        descripcion: esp.DESCRIPCION || '',
        estado: nuevo
      });
      fetchEspecialidades();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Catálogo de Especialidades</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestión de especialidades médicas disponibles en la clínica.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <PlusCircle size={18} /> Nueva Especialidad
        </button>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando especialidades...</p>
                  </td>
                </tr>
              ) : especialidades.length > 0 ? (
                especialidades.map(esp => (
                  <tr key={esp.ESPECIALIDAD_ID}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{esp.ESPECIALIDAD_ID}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={16} style={{ color: 'var(--primary)' }} /> {esp.NOMBRE}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{esp.DESCRIPCION || '—'}</td>
                    <td>
                      <span className={`badge ${esp.ESTADO === 'A' ? 'badge-success' : 'badge-danger'}`}>
                        {esp.ESTADO === 'A' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--warning)' }}
                        title="Editar"
                        onClick={() => handleOpenModal(esp)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '8px', color: esp.ESTADO === 'A' ? 'var(--danger)' : 'var(--success)' }}
                        title={esp.ESTADO === 'A' ? 'Desactivar' : 'Activar'}
                        onClick={() => handleToggleEstado(esp)}
                      >
                        {esp.ESTADO === 'A' ? <Trash size={16} /> : <Check size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    No se encontraron especialidades registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-light)' }} onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
            <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>
              {selected ? 'Editar Especialidad' : 'Nueva Especialidad'}
            </h2>

            {errorMsg && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <Check size={16} /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Nombre de la Especialidad *</label>
                <input
                  type="text"
                  required
                  className="input-control"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Cardiología"
                />
              </div>
              <div>
                <label className="input-label">Descripción</label>
                <textarea
                  className="input-control"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción breve de la especialidad..."
                  style={{ resize: 'vertical' }}
                />
              </div>
              {selected && (
                <div>
                  <label className="input-label">Estado</label>
                  <select
                    className="input-control"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="A">Activa</option>
                    <option value="I">Inactiva</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
