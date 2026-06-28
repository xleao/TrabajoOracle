import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Stethoscope, 
  UserPlus, 
  Edit2, 
  Trash, 
  Check, 
  X, 
  AlertCircle,
  Mail,
  Phone,
  Search
} from 'lucide-react';

export default function AdminMedicos() {
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    nroColegiatura: '',
    especialidadId: '',
    telefono: '',
    email: '',
    estado: 'A'
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchMedicos();
    fetchEspecialidades();
  }, []);

  const fetchMedicos = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/medicos');
      if (res.data.success) {
        setMedicos(res.data.data);
      }
    } catch(err) {
      console.error('Error fetching medicos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEspecialidades = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/especialidades');
      if (res.data.success) {
        setEspecialidades(res.data.data.filter(e => e.ESTADO === 'A'));
      }
    } catch(err) {
      console.error('Error fetching especialidades:', err);
    }
  };

  const handleOpenForm = (medico = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (medico) {
      setSelectedMedico(medico);
      setFormData({
        nombres: medico.NOMBRES || '',
        apellidos: medico.APELLIDOS || '',
        nroColegiatura: medico.NRO_COLEGIATURA || '',
        especialidadId: medico.ESPECIALIDAD_ID || '',
        telefono: medico.TELEFONO || '',
        email: medico.EMAIL || '',
        estado: medico.ESTADO || 'A'
      });
    } else {
      setSelectedMedico(null);
      setFormData({
        nombres: '',
        apellidos: '',
        nroColegiatura: '',
        especialidadId: especialidades[0]?.ESPECIALIDAD_ID || '',
        telefono: '',
        email: '',
        estado: 'A'
      });
    }
    setShowFormModal(true);
  };

  const handleSaveMedico = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.nroColegiatura.startsWith('CMP-')) {
      setErrorMsg('El Nro. de Colegiatura debe empezar con "CMP-", ej. CMP-50001');
      return;
    }

    try {
      const payload = {
        accion: selectedMedico ? 'U' : 'I',
        medicoId: selectedMedico ? selectedMedico.MEDICO_ID : null,
        ...formData
      };
      
      const res = await axios.post('http://localhost:5000/api/medicos/gestionar', payload);
      if (res.data.success) {
        setSuccessMsg(selectedMedico ? 'Médico actualizado con éxito' : 'Médico registrado con éxito');
        setTimeout(() => {
          setShowFormModal(false);
          fetchMedicos();
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error guardando datos del médico');
    }
  };

  const handleInactivate = async (medico) => {
    if (!window.confirm(`¿Está seguro de desactivar al Dr(a). ${medico.NOMBRES} ${medico.APELLIDOS}?`)) {
      return;
    }
    try {
      const payload = {
        accion: 'U',
        medicoId: medico.MEDICO_ID,
        nombres: medico.NOMBRES,
        apellidos: medico.APELLIDOS,
        nroColegiatura: medico.NRO_COLEGIATURA,
        especialidadId: medico.ESPECIALIDAD_ID,
        telefono: medico.TELEFONO,
        email: medico.EMAIL,
        estado: 'I' // Inactivo
      };
      const res = await axios.post('http://localhost:5000/api/medicos/gestionar', payload);
      if (res.data.success) {
        fetchMedicos();
      }
    } catch(err) {
      alert(err.response?.data?.message || 'Error al desactivar el médico');
    }
  };

  const filteredMedicos = medicos.filter(m =>
    `${m.NOMBRES} ${m.APELLIDOS}`.toLowerCase().includes(filtro.toLowerCase()) ||
    (m.NRO_COLEGIATURA?.toLowerCase() || '').includes(filtro.toLowerCase()) ||
    (m.ESPECIALIDAD_NOMBRE?.toLowerCase() || '').includes(filtro.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Gestión de Personal Médico</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administración de médicos especialistas y credenciales de colegiatura.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenForm()}>
          <UserPlus size={18} />
          Registrar Médico
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por Nombre, Colegiatura o Especialidad..." 
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
                <th>Colegiatura</th>
                <th>Médico</th>
                <th>Especialidad</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando catálogo médico...</p>
                  </td>
                </tr>
              ) : filteredMedicos.length > 0 ? (
                filteredMedicos.map(m => (
                  <tr key={m.MEDICO_ID}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{m.NRO_COLEGIATURA}</td>
                    <td style={{ fontWeight: 600 }}>Dr(a). {m.NOMBRES} {m.APELLIDOS}</td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'none', padding: '0.35rem 0.75rem' }}>
                        {m.ESPECIALIDAD_NOMBRE}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', gap: '0.15rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {m.TELEFONO || '-'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}><Mail size={12} /> {m.EMAIL || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${m.ESTADO === 'A' ? 'badge-success' : 'badge-danger'}`}>
                        {m.ESTADO === 'A' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', height: '100%', alignItems: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--warning)' }} title="Editar" onClick={() => handleOpenForm(m)}>
                        <Edit2 size={16} />
                      </button>
                      {m.ESTADO === 'A' && (
                        <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }} title="Desactivar" onClick={() => handleInactivate(m)}>
                          <Trash size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    No se encontraron médicos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-light)' }} onClick={() => setShowFormModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>
              {selectedMedico ? 'Modificar Médico' : 'Registrar Nuevo Médico'}
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

            <form onSubmit={handleSaveMedico} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  <label className="input-label">CMP / Nro. Colegiatura *</label>
                  <input type="text" required placeholder="ej. CMP-50001" className="input-control" value={formData.nroColegiatura} onChange={(e) => setFormData({...formData, nroColegiatura: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">Especialidad Asignada *</label>
                  <select required className="input-control" value={formData.especialidadId} onChange={(e) => setFormData({...formData, especialidadId: e.target.value})}>
                    {especialidades.map(esp => (
                      <option key={esp.ESPECIALIDAD_ID} value={esp.ESPECIALIDAD_ID}>
                        {esp.NOMBRE}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Teléfono</label>
                  <input type="text" className="input-control" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">Correo Institucional *</label>
                  <input type="email" required className="input-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              {selectedMedico && (
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
                  Guardar Médico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
