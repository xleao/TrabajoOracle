import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Clock, 
  Calendar,
  Plus, 
  Edit2, 
  Trash, 
  Check, 
  X, 
  AlertCircle,
  User,
  HelpCircle
} from 'lucide-react';

export default function AdminHorarios() {
  const [medicos, setMedicos] = useState([]);
  const [selectedMedicoId, setSelectedMedicoId] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    diaSemana: '2', // Monday by default
    horaInicio: '08:00',
    horaFin: '12:00',
    duracionCitaMin: '30',
    estado: 'A'
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Map numbers to Spanish day names (assuming Monday=2, Sunday=1 or Monday=1 based on DB territory)
  // Let's use standard representation: 2=Lunes, 3=Martes, 4=Miércoles, 5=Jueves, 6=Viernes, 7=Sábado, 1=Domingo
  const DAYS_MAP = {
    '2': 'Lunes',
    '3': 'Martes',
    '4': 'Miércoles',
    '5': 'Jueves',
    '6': 'Viernes',
    '7': 'Sábado',
    '1': 'Domingo'
  };

  useEffect(() => {
    fetchMedicos();
  }, []);

  useEffect(() => {
    if (selectedMedicoId) {
      fetchHorarios(selectedMedicoId);
    } else {
      setHorarios([]);
    }
  }, [selectedMedicoId]);

  const fetchMedicos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/medicos');
      if (res.data.success) {
        const activeMedicos = res.data.data.filter(m => m.ESTADO === 'A');
        setMedicos(activeMedicos);
        if (activeMedicos.length > 0) {
          setSelectedMedicoId(activeMedicos[0].MEDICO_ID);
        }
      }
    } catch(err) {
      console.error('Error fetching medicos:', err);
    }
  };

  const fetchHorarios = async (medicoId) => {
    setLoadingHorarios(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/horarios?medicoId=${medicoId}`);
      if (res.data.success) {
        setHorarios(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const handleOpenForm = (horario = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (horario) {
      setSelectedHorario(horario);
      setFormData({
        diaSemana: String(horario.DIA_SEMANA),
        horaInicio: horario.HORA_INICIO || '08:00',
        horaFin: horario.HORA_FIN || '12:00',
        duracionCitaMin: String(horario.DURACION_CITA_MIN || 30),
        estado: horario.ESTADO || 'A'
      });
    } else {
      setSelectedHorario(null);
      setFormData({
        diaSemana: '2',
        horaInicio: '08:00',
        horaFin: '12:00',
        duracionCitaMin: '30',
        estado: 'A'
      });
    }
    setShowFormModal(true);
  };

  const handleSaveHorario = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Quick duration check
    if (Number(formData.duracionCitaMin) <= 0) {
      setErrorMsg('La duración de la cita debe ser mayor a 0 minutos.');
      return;
    }

    try {
      const payload = {
        accion: selectedHorario ? 'U' : 'I',
        horarioId: selectedHorario ? selectedHorario.HORARIO_ID : null,
        medicoId: selectedMedicoId,
        ...formData
      };
      
      const res = await axios.post('http://localhost:5000/api/horarios/gestionar', payload);
      if (res.data.success) {
        setSuccessMsg(selectedHorario ? 'Horario actualizado con éxito' : 'Horario registrado con éxito');
        setTimeout(() => {
          setShowFormModal(false);
          fetchHorarios(selectedMedicoId);
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error guardando horario del médico');
    }
  };

  const handleInactivate = async (horario) => {
    if (!window.confirm('¿Está seguro de desactivar esta jornada de atención?')) {
      return;
    }
    try {
      const payload = {
        accion: 'U',
        horarioId: horario.HORARIO_ID,
        medicoId: selectedMedicoId,
        diaSemana: horario.DIA_SEMANA,
        horaInicio: horario.HORA_INICIO,
        horaFin: horario.HORA_FIN,
        duracionCitaMin: horario.DURACION_CITA_MIN,
        estado: 'I' // Inactivo
      };
      const res = await axios.post('http://localhost:5000/api/horarios/gestionar', payload);
      if (res.data.success) {
        fetchHorarios(selectedMedicoId);
      }
    } catch(err) {
      alert(err.response?.data?.message || 'Error al desactivar el horario');
    }
  };

  const getSelectedDoctorName = () => {
    const med = medicos.find(m => String(m.MEDICO_ID) === String(selectedMedicoId));
    return med ? `Dr(a). ${med.NOMBRES} ${med.APELLIDOS}` : '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Horarios y Jornadas Médicas</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Definición del calendario de atención semanal por médico especialista.</p>
      </div>

      {/* Select Doctor Bar */}
      <div className="card grid grid-cols-2 gap-4" style={{ padding: '1.5rem', alignItems: 'center', gridTemplateColumns: '3fr 1fr' }}>
        <div>
          <label className="input-label" style={{ marginBottom: '0.25rem' }}>Seleccionar Médico Especialista</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
              <User size={18} />
            </div>
            <select 
              className="input-control" 
              style={{ paddingLeft: '2.75rem' }}
              value={selectedMedicoId}
              onChange={(e) => setSelectedMedicoId(e.target.value)}
            >
              <option value="" disabled>Seleccione un médico...</option>
              {medicos.map(m => (
                <option key={m.MEDICO_ID} value={m.MEDICO_ID}>
                  Dr(a). {m.NOMBRES} {m.APELLIDOS} ({m.ESPECIALIDAD_NOMBRE})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          className="btn btn-primary" 
          style={{ height: '46px', alignSelf: 'flex-end' }} 
          disabled={!selectedMedicoId}
          onClick={() => handleOpenForm()}
        >
          <Plus size={18} />
          Configurar Turno
        </button>
      </div>

      {/* Schedules List */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', margin: 0 }}>
            Jornadas Configuras para: {getSelectedDoctorName() || 'Seleccione un médico'}
          </h3>
        </div>
        
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Día de la Semana</th>
                <th>Hora de Inicio</th>
                <th>Hora de Fin</th>
                <th>Duración de Consulta</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingHorarios ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando calendario...</p>
                  </td>
                </tr>
              ) : horarios.length > 0 ? (
                horarios.map(h => (
                  <tr key={h.HORARIO_ID}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {DAYS_MAP[String(h.DIA_SEMANA)] || `Día ${h.DIA_SEMANA}`}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{h.HORA_INICIO}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{h.HORA_FIN}</td>
                    <td>{h.DURACION_CITA_MIN} minutos</td>
                    <td>
                      <span className={`badge ${h.ESTADO === 'A' ? 'badge-success' : 'badge-danger'}`}>
                        {h.ESTADO === 'A' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--warning)' }} title="Editar" onClick={() => handleOpenForm(h)}>
                        <Edit2 size={16} />
                      </button>
                      {h.ESTADO === 'A' && (
                        <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }} title="Desactivar" onClick={() => handleInactivate(h)}>
                          <Trash size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    No se han registrado horarios de atención para este médico. ¡Haz clic en "Configurar Turno" para añadir uno!
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-light)' }} onClick={() => setShowFormModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>
              {selectedHorario ? 'Modificar Turno de Atención' : 'Configurar Nueva Jornada'}
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

            <form onSubmit={handleSaveHorario} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Día de la Semana *</label>
                <select className="input-control" value={formData.diaSemana} onChange={(e) => setFormData({...formData, diaSemana: e.target.value})}>
                  <option value="2">Lunes</option>
                  <option value="3">Martes</option>
                  <option value="4">Miércoles</option>
                  <option value="5">Jueves</option>
                  <option value="6">Viernes</option>
                  <option value="7">Sábado</option>
                  <option value="1">Domingo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Hora de Inicio *</label>
                  <input type="text" required placeholder="ej. 08:00" className="input-control" value={formData.horaInicio} onChange={(e) => setFormData({...formData, horaInicio: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">Hora de Fin *</label>
                  <input type="text" required placeholder="ej. 12:00" className="input-control" value={formData.horaFin} onChange={(e) => setFormData({...formData, horaFin: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="input-label">Duración Cita (Minutos) *</label>
                <input type="number" required placeholder="ej. 30" className="input-control" value={formData.duracionCitaMin} onChange={(e) => setFormData({...formData, duracionCitaMin: e.target.value})} />
              </div>

              {selectedHorario && (
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
                  Guardar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
