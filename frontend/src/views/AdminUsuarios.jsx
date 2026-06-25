import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, 
  UserPlus, 
  Edit2, 
  Trash, 
  Check, 
  X, 
  AlertCircle,
  Key,
  Search,
  UserCheck
} from 'lucide-react';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombreCompleto: '',
    email: '',
    rolId: '2', // Recepcionista by default
    medicoId: '',
    estado: 'A'
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
    fetchMedicos();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/usuarios');
      if (res.data.success) {
        setUsuarios(res.data.data);
      }
    } catch(err) {
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/roles');
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch(err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchMedicos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/medicos');
      if (res.data.success) {
        setMedicos(res.data.data.filter(m => m.ESTADO === 'A'));
      }
    } catch(err) {
      console.error('Error fetching medicos:', err);
    }
  };

  const handleOpenForm = (usuario = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (usuario) {
      setSelectedUsuario(usuario);
      setFormData({
        username: usuario.USERNAME || '',
        password: '', // Kept empty unless changing it
        nombreCompleto: usuario.NOMBRE_COMPLETO || '',
        email: usuario.EMAIL || '',
        rolId: String(usuario.ROL_ID || '2'),
        medicoId: usuario.MEDICO_ID ? String(usuario.MEDICO_ID) : '',
        estado: usuario.ESTADO || 'A'
      });
    } else {
      setSelectedUsuario(null);
      setFormData({
        username: '',
        password: '',
        nombreCompleto: '',
        email: '',
        rolId: roles[1]?.ROL_ID ? String(roles[1].ROL_ID) : '2',
        medicoId: '',
        estado: 'A'
      });
    }
    setShowFormModal(true);
  };

  const handleSaveUsuario = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validations
    if (!selectedUsuario && !formData.password) {
      setErrorMsg('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }
    
    // If Doctor role is selected, medicoId must be specified
    const selectedRoleName = roles.find(r => String(r.ROL_ID) === String(formData.rolId))?.NOMBRE;
    if (selectedRoleName === 'MEDICO' && !formData.medicoId) {
      setErrorMsg('Debe seleccionar el médico asociado para cuentas con rol de Médico.');
      return;
    }

    try {
      const payload = {
        accion: selectedUsuario ? 'U' : 'I',
        usuarioId: selectedUsuario ? selectedUsuario.USUARIO_ID : null,
        ...formData,
        medicoId: selectedRoleName === 'MEDICO' && formData.medicoId ? Number(formData.medicoId) : null,
        rolId: Number(formData.rolId)
      };

      // Ensure username is uppercase for standardization
      payload.username = payload.username.toUpperCase();
      
      const res = await axios.post('http://localhost:5000/api/usuarios/gestionar', payload);
      if (res.data.success) {
        setSuccessMsg(selectedUsuario ? 'Usuario actualizado con éxito' : 'Usuario registrado con éxito');
        setTimeout(() => {
          setShowFormModal(false);
          fetchUsuarios();
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error guardando datos del usuario');
    }
  };

  const handleInactivate = async (usuario) => {
    if (usuario.USUARIO_ID === 1) {
      alert('No es posible desactivar la cuenta del Administrador Principal.');
      return;
    }
    if (!window.confirm(`¿Está seguro de desactivar la cuenta del usuario ${usuario.USERNAME}?`)) {
      return;
    }
    try {
      const payload = {
        accion: 'U',
        usuarioId: usuario.USUARIO_ID,
        username: usuario.USERNAME,
        nombreCompleto: usuario.NOMBRE_COMPLETO,
        email: usuario.EMAIL,
        rolId: usuario.ROL_ID,
        medicoId: usuario.MEDICO_ID,
        estado: 'I' // Inactivo
      };
      const res = await axios.post('http://localhost:5000/api/usuarios/gestionar', payload);
      if (res.data.success) {
        fetchUsuarios();
      }
    } catch(err) {
      alert(err.response?.data?.message || 'Error al desactivar el usuario');
    }
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.USERNAME.toLowerCase().includes(filtro.toLowerCase()) || 
    u.NOMBRE_COMPLETO.toLowerCase().includes(filtro.toLowerCase()) ||
    u.ROL_NOMBRE.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Usuarios y Accesos del Sistema</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administración de privilegios, roles y cuentas de usuarios en Oracle PL/SQL.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenForm()}>
          <UserPlus size={18} />
          Registrar Usuario
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
            placeholder="Buscar por Nombre, Rol o Username..." 
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
                <th>Username</th>
                <th>Nombre Completo</th>
                <th>Rol</th>
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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando usuarios del sistema...</p>
                  </td>
                </tr>
              ) : filteredUsuarios.length > 0 ? (
                filteredUsuarios.map(u => (
                  <tr key={u.USUARIO_ID}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{u.USERNAME}</td>
                    <td style={{ fontWeight: 600 }}>{u.NOMBRE_COMPLETO}</td>
                    <td>
                      <span className={`badge ${
                        u.ROL_NOMBRE === 'ADMINISTRADOR' ? 'badge-danger' :
                        u.ROL_NOMBRE === 'RECEPCIONISTA' ? 'badge-success' : 'badge-info'
                      }`} style={{ padding: '0.35rem 0.75rem' }}>
                        {u.ROL_NOMBRE}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.EMAIL || '-'}</td>
                    <td>
                      <span className={`badge ${u.ESTADO === 'A' ? 'badge-success' : 'badge-danger'}`}>
                        {u.ESTADO === 'A' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', height: '100%', alignItems: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--warning)' }} title="Editar" onClick={() => handleOpenForm(u)}>
                        <Edit2 size={16} />
                      </button>
                      {u.ESTADO === 'A' && u.USUARIO_ID !== 1 && (
                        <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }} title="Desactivar" onClick={() => handleInactivate(u)}>
                          <Trash size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    No se encontraron cuentas de usuarios.
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-light)' }} onClick={() => setShowFormModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>
              {selectedUsuario ? 'Modificar Cuenta de Usuario' : 'Registrar Nuevo Usuario'}
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

            <form onSubmit={handleSaveUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Username (Login) *</label>
                  <input type="text" required placeholder="ej. JRODRIGUEZ" className="input-control" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="input-label">Contraseña {selectedUsuario && '(Dejar en blanco para mantener)'}</label>
                  <input type="password" required={!selectedUsuario} placeholder={selectedUsuario ? 'Mantener contraseña' : '••••••••'} className="input-control" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="input-label">Nombre Completo *</label>
                <input type="text" required className="input-control" value={formData.nombreCompleto} onChange={(e) => setFormData({...formData, nombreCompleto: e.target.value})} />
              </div>

              <div>
                <label className="input-label">Correo Electrónico *</label>
                <input type="email" required className="input-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Rol del Sistema *</label>
                  <select required className="input-control" value={formData.rolId} onChange={(e) => setFormData({...formData, rolId: e.target.value})}>
                    {roles.map(r => (
                      <option key={r.ROL_ID} value={r.ROL_ID}>
                        {r.NOMBRE}
                      </option>
                    ))}
                  </select>
                </div>
                
                {roles.find(r => String(r.ROL_ID) === String(formData.rolId))?.NOMBRE === 'MEDICO' && (
                  <div>
                    <label className="input-label">Médico Asociado *</label>
                    <select required className="input-control" value={formData.medicoId} onChange={(e) => setFormData({...formData, medicoId: e.target.value})}>
                      <option value="" disabled>Seleccione...</option>
                      {medicos.map(m => (
                        <option key={m.MEDICO_ID} value={m.MEDICO_ID}>
                          Dr(a). {m.NOMBRES} {m.APELLIDOS}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedUsuario && (
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
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
