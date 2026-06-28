import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  History, 
  Check, 
  X, 
  AlertCircle,
  FileText,
  Calendar,
  Stethoscope,
  Trash
} from 'lucide-react';

export default function AdminPacientes() {
  const { user } = useAuth();
  const isDoctor = user?.rol?.toUpperCase() === 'MEDICO';

  const [pacientes, setPacientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Selected data
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [pacienteHistory, setPacienteHistory] = useState([]);
  const [filtroHistEstado, setFiltroHistEstado] = useState('');
  const [filtroHistDesde, setFiltroHistDesde] = useState('');
  const [filtroHistHasta, setFiltroHistHasta] = useState('');
  
  // Form fields
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    fechaNacimiento: '',
    telefono: '',
    email: '',
    direccion: '',
    estado: 'A'
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPacientes();
  }, [filtro]);

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/pacientes?filtro=${filtro}`);
      if (res.data.success) {
        setPacientes(res.data.data);
      }
    } catch(err) {
      console.error('Error fetching pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (paciente = null) => {
    if (isDoctor) return; // Prevent doctor from opening form
    setErrorMsg('');
    setSuccessMsg('');
    if (paciente) {
      setSelectedPaciente(paciente);
      setFormData({
        nombres: paciente.NOMBRES || '',
        apellidos: paciente.APELLIDOS || '',
        dni: paciente.DNI || '',
        fechaNacimiento: paciente.FECHA_NACIMIENTO 
          ? new Date(paciente.FECHA_NACIMIENTO).toISOString().substring(0, 10) 
          : '',
        telefono: paciente.TELEFONO || '',
        email: paciente.EMAIL || '',
        direccion: paciente.DIRECCION || '',
        estado: paciente.ESTADO || 'A'
      });
    } else {
      setSelectedPaciente(null);
      setFormData({
        nombres: '',
        apellidos: '',
        dni: '',
        fechaNacimiento: '',
        telefono: '',
        email: '',
        direccion: '',
        estado: 'A'
      });
    }
    setShowFormModal(true);
  };

  const handleSavePaciente = async (e) => {
    e.preventDefault();
    if (isDoctor) return;
    setErrorMsg('');
    setSuccessMsg('');

    // Quick Validation
    if (formData.dni.length < 8) {
      setErrorMsg('El DNI debe tener al menos 8 dígitos.');
      return;
    }

    try {
      const payload = {
        accion: selectedPaciente ? 'U' : 'I',
        pacienteId: selectedPaciente ? selectedPaciente.PACIENTE_ID : null,
        ...formData
      };
      
      const res = await axios.post('http://localhost:5000/api/pacientes/gestionar', payload);
      if (res.data.success) {
        setSuccessMsg(selectedPaciente ? 'Paciente actualizado con éxito' : 'Paciente registrado con éxito');
        setTimeout(() => {
          setShowFormModal(false);
          fetchPacientes();
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error guardando datos del paciente');
    }
  };

  const handleShowHistory = async (paciente) => {
    setSelectedPaciente(paciente);
    setPacienteHistory([]);
    setFiltroHistEstado('');
    setFiltroHistDesde('');
    setFiltroHistHasta('');
    setShowHistoryModal(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/citas/historial-paciente?pacienteId=${paciente.PACIENTE_ID}`);
      if (res.data.success) {
        setPacienteHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching patient history:', err);
    }
  };

  const handleInactivate = async (paciente) => {
    if (isDoctor) return;
    if (!window.confirm(`¿Está seguro de desactivar al paciente ${paciente.NOMBRES} ${paciente.APELLIDOS}?`)) {
      return;
    }
    try {
      const payload = {
        accion: 'U',
        pacienteId: paciente.PACIENTE_ID,
        nombres: paciente.NOMBRES,
        apellidos: paciente.APELLIDOS,
        dni: paciente.DNI,
        fechaNacimiento: paciente.FECHA_NACIMIENTO 
          ? new Date(paciente.FECHA_NACIMIENTO).toISOString().substring(0, 10) 
          : '',
        telefono: paciente.TELEFONO,
        email: paciente.EMAIL,
        direccion: paciente.DIRECCION,
        estado: 'I' // Inactivo
      };
      const res = await axios.post('http://localhost:5000/api/pacientes/gestionar', payload);
      if (res.data.success) {
        fetchPacientes();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al desactivar el paciente');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Directorio de Pacientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mantenimiento del registro demográfico e historial clínico en Oracle PL/SQL.</p>
        </div>
        {!isDoctor && (
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            <UserPlus size={18} />
            Registrar Paciente
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por DNI, Nombres o Apellidos..." 
            className="input-control"
            style={{ paddingLeft: '2.75rem' }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>DNI</th>
                <th>Paciente</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando directorio de pacientes...</p>
                  </td>
                </tr>
              ) : pacientes.length > 0 ? (
                pacientes.map(p => (
                  <tr key={p.PACIENTE_ID}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.DNI}</td>
                    <td style={{ fontWeight: 600 }}>{p.NOMBRES} {p.APELLIDOS}</td>
                    <td>{p.TELEFONO}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.EMAIL || '-'}</td>
                    <td>
                      <span className={`badge ${p.ESTADO === 'A' ? 'badge-success' : 'badge-danger'}`}>
                        {p.ESTADO === 'A' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }} title="Historial Clínico" onClick={() => handleShowHistory(p)}>
                        <History size={16} />
                      </button>
                      {!isDoctor && (
                        <>
                          <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--warning)' }} title="Editar" onClick={() => handleOpenForm(p)}>
                            <Edit2 size={16} />
                          </button>
                          {p.ESTADO === 'A' && (
                            <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }} title="Desactivar" onClick={() => handleInactivate(p)}>
                              <Trash size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    No se encontraron pacientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal: Formulario Registro/Edición */}
      {showFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-light)' }} onClick={() => setShowFormModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>
              {selectedPaciente ? 'Modificar Paciente' : 'Nuevo Registro de Paciente'}
            </h2>

            {errorMsg && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <Check size={16} />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSavePaciente} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nombres *</label>
                  <input type="text" required className="input-control" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">Apellidos *</label>
                  <input type="text" required className="input-control" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">DNI / Documento *</label>
                  <input type="text" required className="input-control" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">Fecha de Nacimiento</label>
                  <input type="date" className="input-control" value={formData.fechaNacimiento} onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Teléfono *</label>
                  <input type="text" required className="input-control" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input type="email" className="input-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="input-label">Dirección Domiliciaria</label>
                <input type="text" className="input-control" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
              </div>

              {selectedPaciente && (
                <div>
                  <label className="input-label">Estado</label>
                  <select className="input-control" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowFormModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} />
                  Guardar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Historial Clínico de Citas */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', maxHeight: '85vh', overflow: 'hidden' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-light)' }} onClick={() => setShowHistoryModal(false)}>
              <X size={20} />
            </button>
            
            <div>
              <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                Historial de Citas Médicas
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Paciente: <strong style={{ color: 'var(--text-main)' }}>{selectedPaciente?.NOMBRES} {selectedPaciente?.APELLIDOS}</strong> (DNI: {selectedPaciente?.DNI})
              </p>
            </div>

            {/* Filtros historial */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
              <select
                className="input-control"
                style={{ maxWidth: '180px', fontSize: '0.85rem' }}
                value={filtroHistEstado}
                onChange={(e) => setFiltroHistEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Confirmada">Confirmada</option>
                <option value="En Atención">En Atención</option>
                <option value="Atendida">Atendida</option>
                <option value="Cancelada">Cancelada</option>
              </select>
              <input type="date" className="input-control" style={{ maxWidth: '160px', fontSize: '0.85rem' }} value={filtroHistDesde} onChange={(e) => setFiltroHistDesde(e.target.value)} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
              <input type="date" className="input-control" style={{ maxWidth: '160px', fontSize: '0.85rem' }} value={filtroHistHasta} onChange={(e) => setFiltroHistHasta(e.target.value)} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const filtradas = pacienteHistory
                  .filter(c => !filtroHistEstado || c.ESTADO_CITA === filtroHistEstado)
                  .filter(c => !filtroHistDesde || new Date(c.FECHA_CITA) >= new Date(filtroHistDesde))
                  .filter(c => !filtroHistHasta || new Date(c.FECHA_CITA) <= new Date(filtroHistHasta + 'T23:59:59'));
                return filtradas.length > 0 ? filtradas.map((c, idx) => (
                  <div key={idx} style={{ padding: '1.25rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(c.FECHA_CITA).toLocaleDateString('es-ES')} ({c.HORA_INICIO} - {c.HORA_FIN})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Stethoscope size={14} style={{ color: 'var(--primary-light)' }} />
                        <span style={{ fontSize: '0.85rem' }}>Especialidad: <strong>{c.ESPECIALIDAD}</strong> | Médico: <strong>{c.MEDICO}</strong></span>
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${
                        c.ESTADO_CITA === 'Atendida' ? 'badge-success' :
                        c.ESTADO_CITA === 'Cancelada' ? 'badge-danger' :
                        c.ESTADO_CITA === 'En Atención' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {c.ESTADO_CITA}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={48} style={{ color: 'var(--text-light)' }} />
                    <span>Este paciente no registra atenciones o citas previas en la clínica.</span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowHistoryModal(false)}>Cerrar Historial</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
