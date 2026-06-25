import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  Clock, 
  Search, 
  Check, 
  X, 
  AlertCircle,
  Plus,
  RefreshCw,
  Trash,
  User,
  Stethoscope,
  Info,
  CalendarDays
} from 'lucide-react';

export default function RecepcionAgenda() {
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'book'
  
  // Data lists
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search/Filters in directory
  const [citasFilter, setCitasFilter] = useState('');
  const [citasStatus, setCitasStatus] = useState('');

  // ----------------------------------------------------
  // BOOKING STATE
  // ----------------------------------------------------
  const [searchPatientVal, setSearchPatientVal] = useState('');
  const [searchedPacientes, setSearchedPacientes] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [selectedMedicoId, setSelectedMedicoId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().substring(0, 10));
  
  const [freeSlots, setFreeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { start, end }
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [motivoConsulta, setMotivoConsulta] = useState('');

  // ----------------------------------------------------
  // ACTIONS STATE (Cancel / Reprogram)
  // ----------------------------------------------------
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [activeCita, setActiveCita] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  
  // Reprogram specific
  const [reprogramDate, setReprogramDate] = useState('');
  const [reprogramSlots, setReprogramSlots] = useState([]);
  const [selectedReprogramSlot, setSelectedReprogramSlot] = useState(null);
  const [loadingReprogramSlots, setLoadingReprogramSlots] = useState(false);

  useEffect(() => {
    fetchCitas();
    fetchEspecialidades();
    fetchMedicos();
  }, []);

  useEffect(() => {
    if (selectedMedicoId && bookingDate) {
      fetchFreeSlots();
    } else {
      setFreeSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedMedicoId, bookingDate]);

  useEffect(() => {
    if (activeCita && reprogramDate) {
      fetchReprogramSlots();
    } else {
      setReprogramSlots([]);
      setSelectedReprogramSlot(null);
    }
  }, [reprogramDate]);

  const fetchCitas = async () => {
    setLoading(true);
    try {
      // List appointments by pulling from reportes or PKG_CONSULTAS. 
      // We can use FN_CITAS_POR_ESTADO with no state filter to list all citas.
      // Or we can get from /api/citas/por-estado?estadoCitaId=1&fechaInicio=...
      // Since server.js has /api/citas/por-estado, let's query it.
      // Let's search from 2026-05-19 to 2026-07-19
      const res = await axios.get('http://localhost:5000/api/citas/por-estado?estadoCitaId=1&fechaInicio=2026-05-19&fechaFin=2026-07-19');
      // Let's also fetch other states (Confirmada=2, En Atención=3, Atendida=4, Cancelada=5) to have a list
      const res2 = await axios.get('http://localhost:5000/api/citas/por-estado?estadoCitaId=2&fechaInicio=2026-05-19&fechaFin=2026-07-19');
      
      const combined = [
        ...(res.data.data || []).map(c => ({ ...c, estadoNombre: 'Pendiente' })),
        ...(res2.data.data || []).map(c => ({ ...c, estadoNombre: 'Confirmada' }))
      ];
      
      // Sort by date and hour
      combined.sort((a, b) => new Date(a.FECHA_CITA) - new Date(b.FECHA_CITA) || a.HORA_INICIO.localeCompare(b.HORA_INICIO));
      setCitas(combined);
    } catch(err) {
      console.error('Error fetching appointments:', err);
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
      console.error('Error fetching specialties:', err);
    }
  };

  const fetchMedicos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/medicos');
      if (res.data.success) {
        setMedicos(res.data.data.filter(m => m.ESTADO === 'A'));
      }
    } catch(err) {
      console.error('Error fetching doctors:', err);
    }
  };

  // Search patient during booking
  const handleSearchPatient = async () => {
    if (!searchPatientVal.trim()) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/pacientes?filtro=${searchPatientVal}`);
      if (res.data.success) {
        setSearchedPacientes(res.data.data);
      }
    } catch(err) {
      console.error('Error searching patient:', err);
    }
  };

  // Fetch free slots for selected doctor and date
  const fetchFreeSlots = async () => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/citas/disponibilidad?medicoId=${selectedMedicoId}&fecha=${bookingDate}`);
      if (res.data.success && res.data.data.length > 0) {
        // Franjas libres returns list of occupied ranges and schedule limits.
        // We calculate slots. Let's write slot calculator or display the raw slot logic.
        // Since database/packages/06_pkg_citas.sql:123:FN_OBTENER_FRANJAS_LIBRES returns:
        // HORARIO_INICIO_JORNADA, HORARIO_FIN_JORNADA, DURACION_CITA_MIN, OCUPADO_DESDE, OCUPADO_HASTA.
        // Let's generate slots based on this returned data!
        const rawData = res.data.data;
        const duracion = rawData[0].DURACION_CITA_MIN || 30;
        
        // Generate list of possible slots in the shift (morning and afternoon)
        // Check if there are overlapping appointments
        const slots = [];
        const startHour = parseInt(rawData[0].HORARIO_INICIO_JORNADA.split(':')[0]);
        const endHour = parseInt(rawData[0].HORARIO_FIN_JORNADA.split(':')[0]);
        
        // Create simple 30 min slots
        let current = new Date(`2026-01-01T${rawData[0].HORARIO_INICIO_JORNADA}:00`);
        const limit = new Date(`2026-01-01T${rawData[0].HORARIO_FIN_JORNADA}:00`);
        
        while (current < limit) {
          const slotStart = current.toTimeString().substring(0, 5);
          current.setMinutes(current.getMinutes() + duracion);
          const slotEnd = current.toTimeString().substring(0, 5);
          
          // Check if slot is occupied
          const isOccupied = rawData.some(d => 
            d.OCUPADO_DESDE && (
              (slotStart >= d.OCUPADO_DESDE && slotStart < d.OCUPADO_HASTA) ||
              (slotEnd > d.OCUPADO_DESDE && slotEnd <= d.OCUPADO_HASTA)
            )
          );
          
          if (!isOccupied) {
            slots.push({ start: slotStart, end: slotEnd });
          }
        }
        setFreeSlots(slots);
      } else {
        setFreeSlots([]);
      }
    } catch(err) {
      console.error('Error fetching availability:', err);
      setFreeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Fetch reprogram slots for selected date
  const fetchReprogramSlots = async () => {
    setLoadingReprogramSlots(true);
    setSelectedReprogramSlot(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/citas/disponibilidad?medicoId=${activeCita.MEDICO_ID}&fecha=${reprogramDate}`);
      if (res.data.success && res.data.data.length > 0) {
        const rawData = res.data.data;
        const duracion = rawData[0].DURACION_CITA_MIN || 30;
        const slots = [];
        let current = new Date(`2026-01-01T${rawData[0].HORARIO_INICIO_JORNADA}:00`);
        const limit = new Date(`2026-01-01T${rawData[0].HORARIO_FIN_JORNADA}:00`);
        
        while (current < limit) {
          const slotStart = current.toTimeString().substring(0, 5);
          current.setMinutes(current.getMinutes() + duracion);
          const slotEnd = current.toTimeString().substring(0, 5);
          
          const isOccupied = rawData.some(d => 
            d.OCUPADO_DESDE && (
              (slotStart >= d.OCUPADO_DESDE && slotStart < d.OCUPADO_HASTA) ||
              (slotEnd > d.OCUPADO_DESDE && slotEnd <= d.OCUPADO_HASTA)
            )
          );
          
          if (!isOccupied) {
            slots.push({ start: slotStart, end: slotEnd });
          }
        }
        setReprogramSlots(slots);
      } else {
        setReprogramSlots([]);
      }
    } catch(err) {
      console.error('Error fetching availability:', err);
      setReprogramSlots([]);
    } finally {
      setLoadingReprogramSlots(false);
    }
  };

  // Book appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPatient) {
      setErrorMsg('Debe seleccionar un paciente.');
      return;
    }
    if (!selectedSlot) {
      setErrorMsg('Debe seleccionar una franja horaria disponible.');
      return;
    }

    try {
      const payload = {
        pacienteId: selectedPatient.PACIENTE_ID,
        medicoId: Number(selectedMedicoId),
        especialidadId: Number(selectedSpecialtyId),
        fechaCita: bookingDate,
        horaInicio: selectedSlot.start,
        horaFin: selectedSlot.end,
        motivoConsulta
      };
      
      const res = await axios.post('http://localhost:5000/api/citas/agendar', payload);
      if (res.data.success) {
        setSuccessMsg('Cita agendada exitosamente en Oracle.');
        setTimeout(() => {
          setActiveTab('list');
          fetchCitas();
          // Reset booking state
          setSelectedPatient(null);
          setSelectedSlot(null);
          setMotivoConsulta('');
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error al agendar la cita médica');
    }
  };

  // Open Cancel Modal
  const openCancelFlow = (cita) => {
    setActiveCita(cita);
    setMotivoCancelacion('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowCancelModal(true);
  };

  const handleCancelAppointment = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!motivoCancelacion.trim()) {
      setErrorMsg('Debe especificar un motivo de cancelación.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/citas/cancelar', {
        citaId: activeCita.CITA_ID,
        motivoCancelacion
      });
      if (res.data.success) {
        setSuccessMsg('Cita cancelada correctamente en Oracle.');
        setTimeout(() => {
          setShowCancelModal(false);
          fetchCitas();
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error al cancelar la cita');
    }
  };

  // Open Reprogram Modal
  const openReprogramFlow = (cita) => {
    setActiveCita(cita);
    setReprogramDate(new Date(cita.FECHA_CITA).toISOString().substring(0, 10));
    setReprogramSlots([]);
    setSelectedReprogramSlot(null);
    setErrorMsg('');
    setSuccessMsg('');
    setShowReprogramModal(true);
  };

  const handleReprogramAppointment = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!selectedReprogramSlot) {
      setErrorMsg('Debe seleccionar un nuevo horario disponible.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/citas/reprogramar', {
        citaId: activeCita.CITA_ID,
        nuevaFecha: reprogramDate,
        nuevaHoraInicio: selectedReprogramSlot.start,
        nuevaHoraFin: selectedReprogramSlot.end
      });
      if (res.data.success) {
        setSuccessMsg('Cita reprogramada atómicamente en Oracle.');
        setTimeout(() => {
          setShowReprogramModal(false);
          fetchCitas();
        }, 1500);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch(err) {
      setErrorMsg(err.response?.data?.message || 'Error al reprogramar la cita');
    }
  };

  // Filter doctors by selected specialty in booking flow
  const filteredDoctors = medicos.filter(m => 
    !selectedSpecialtyId || String(m.ESPECIALIDAD_ID) === String(selectedSpecialtyId)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Agenda de Consultas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Agendamiento, cancelaciones y reprogramaciones atómicas del sistema.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => { setActiveTab('list'); fetchCitas(); }}
          >
            Ver Calendario Citas
          </button>
          <button 
            className={`btn ${activeTab === 'book' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('book')}
          >
            <Plus size={18} />
            Agendar Nueva Cita
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          TAB 1: LIST ACTIVE APPOINTMENTS
          ---------------------------------------------------- */}
      {activeTab === 'list' && (
        <>
          {/* Filters card */}
          <div className="card grid grid-cols-2 gap-4" style={{ padding: '1rem', gridTemplateColumns: '2fr 1fr' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Filtrar por paciente, médico o fecha..." 
                className="input-control"
                style={{ paddingLeft: '2.75rem' }}
                value={citasFilter}
                onChange={(e) => setCitasFilter(e.target.value)}
              />
            </div>
            
            <button className="btn btn-outline" onClick={fetchCitas} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center', justifyContent: 'center' }}>
              <RefreshCw size={16} /> Refrescar Citas
            </button>
          </div>

          {/* Appointments Table */}
          <div className="card" style={{ padding: '0' }}>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Paciente</th>
                    <th>Médico</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center" style={{ padding: '3rem' }}>
                        <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                        <p style={{ color: 'var(--text-muted)' }}>Cargando agenda de la clínica...</p>
                      </td>
                    </tr>
                  ) : citas.length > 0 ? (
                    citas.filter(c => 
                      c.PACIENTE?.toLowerCase().includes(citasFilter.toLowerCase()) || 
                      c.MEDICO?.toLowerCase().includes(citasFilter.toLowerCase()) ||
                      c.FECHA_CITA?.toLowerCase().includes(citasFilter.toLowerCase())
                    ).map(c => (
                      <tr key={c.CITA_ID}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{new Date(c.FECHA_CITA).toLocaleDateString('es-ES')}</span>
                            <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{c.HORA_INICIO} - {c.HORA_FIN}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{c.PACIENTE}</td>
                        <td>Dr(a). {c.MEDICO}</td>
                        <td>
                          <span className={`badge ${c.estadoNombre === 'Confirmada' ? 'badge-success' : 'badge-info'}`}>
                            {c.estadoNombre}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openReprogramFlow(c)}>
                            Reprogramar
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => openCancelFlow(c)}>
                            <Trash size={14} style={{ marginRight: '0.25rem' }} /> Cancelar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                        No hay citas activas registradas en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ----------------------------------------------------
          TAB 2: BOOK AN APPOINTMENT WIZARD
          ---------------------------------------------------- */}
      {activeTab === 'book' && (
        <form onSubmit={handleBookAppointment} className="grid grid-cols-2 gap-6" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          
          {/* Booking Inputs */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} /> Formulario de Registro de Cita
            </h3>
            
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

            {/* 1. Select Patient */}
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
              <label className="input-label" style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>Paso 1: Seleccionar Paciente *</label>
              
              {selectedPatient ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--primary)', backgroundColor: 'var(--accent)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <strong>{selectedPatient.NOMBRES} {selectedPatient.APELLIDOS}</strong> (DNI: {selectedPatient.DNI})
                  </div>
                  <button type="button" onClick={() => setSelectedPatient(null)} style={{ color: 'var(--danger)' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
                      <Search size={16} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Buscar por DNI o Nombres..." 
                      className="input-control" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={searchPatientVal}
                      onChange={(e) => setSearchPatientVal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchPatient())}
                    />
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleSearchPatient}>Buscar</button>
                </div>
              )}

              {/* Patient search results */}
              {!selectedPatient && searchedPacientes.length > 0 && (
                <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {searchedPacientes.map(p => (
                    <div 
                      key={p.PACIENTE_ID} 
                      onClick={() => setSelectedPatient(p)}
                      style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', justifyBetween: 'space-between' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span>{p.NOMBRES} {p.APELLIDOS}</span>
                      <strong style={{ color: 'var(--primary)' }}>DNI: {p.DNI}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Select Specialty and Doctor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Especialidad *</label>
                <select 
                  className="input-control" 
                  value={selectedSpecialtyId} 
                  onChange={(e) => { setSelectedSpecialtyId(e.target.value); setSelectedMedicoId(''); }}
                  required
                >
                  <option value="">Seleccione especialidad...</option>
                  {especialidades.map(esp => (
                    <option key={esp.ESPECIALIDAD_ID} value={esp.ESPECIALIDAD_ID}>{esp.NOMBRE}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Médico Especialista *</label>
                <select 
                  className="input-control" 
                  value={selectedMedicoId} 
                  onChange={(e) => setSelectedMedicoId(e.target.value)}
                  disabled={!selectedSpecialtyId}
                  required
                >
                  <option value="">Seleccione médico...</option>
                  {filteredDoctors.map(m => (
                    <option key={m.MEDICO_ID} value={m.MEDICO_ID}>Dr(a). {m.NOMBRES} {m.APELLIDOS}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Pick Date */}
            <div>
              <label className="input-label">Fecha de la Consulta *</label>
              <input 
                type="date" 
                className="input-control" 
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().substring(0, 10)}
                required
              />
            </div>

            {/* 4. Consultation motive */}
            <div>
              <label className="input-label">Motivo de la Consulta *</label>
              <textarea 
                className="input-control" 
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={motivoConsulta}
                onChange={(e) => setMotivoConsulta(e.target.value)}
                required
                placeholder="Escribe el motivo del paciente..."
              ></textarea>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('list')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!selectedSlot}>
                <Check size={18} /> Confirmar Cita
              </button>
            </div>
          </div>

          {/* Free Slots Grid Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <Clock size={18} /> Franjas Horarias Disponibles
            </h3>

            {loadingSlots ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', padding: '3rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Buscando franjas libres en Oracle...</span>
              </div>
            ) : !selectedMedicoId ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={32} style={{ color: 'var(--text-light)' }} />
                <span>Seleccione especialidad, médico y fecha para consultar la disponibilidad horaria del profesional.</span>
              </div>
            ) : freeSlots.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {freeSlots.map((slot, index) => {
                  const isSelected = selectedSlot && selectedSlot.start === slot.start;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{ 
                        padding: '0.75rem 0.5rem', 
                        borderRadius: 'var(--radius-md)', 
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        backgroundColor: isSelected ? 'var(--accent)' : 'white',
                        color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'var(--bg-main)')}
                      onMouseOut={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'white')}
                    >
                      {slot.start} - {slot.end}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={32} />
                <span>El médico no tiene franjas disponibles configuradas para este día o ya se encuentran reservadas.</span>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ----------------------------------------------------
          MODAL A: CANCEL APPOINTMENT
          ---------------------------------------------------- */}
      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-light)' }} onClick={() => setShowCancelModal(false)}>
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Cancelar Cita Médica</h3>
            
            {errorMsg && (
              <div style={{ padding: '0.5rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '0.5rem', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                {successMsg}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              ¿Está seguro de cancelar la cita de <strong style={{ color: 'var(--text-main)' }}>{activeCita?.PACIENTE}</strong> con el médico <strong style={{ color: 'var(--text-main)' }}>{activeCita?.MEDICO}</strong>? El horario quedará liberado automáticamente en Oracle.
            </p>

            <div>
              <label className="input-label">Motivo de Cancelación *</label>
              <textarea 
                className="input-control" 
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                required
                placeholder="ej. Paciente no podrá asistir por motivos laborales..."
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowCancelModal(false)}>Volver</button>
              <button className="btn btn-secondary" onClick={handleCancelAppointment}>Confirmar Cancelación</button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL B: REPROGRAM APPOINTMENT (ATOMIC ACTION)
          ---------------------------------------------------- */}
      {showReprogramModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-light)' }} onClick={() => setShowReprogramModal(false)}>
              <X size={20} />
            </button>
            
            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--primary-dark)', margin: 0 }}>Reprogramación Atómica de Cita</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Paciente: <strong>{activeCita?.PACIENTE}</strong> | Especialista: <strong>{activeCita?.MEDICO}</strong>
              </p>
            </div>

            {errorMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
              <div>
                <label className="input-label">Seleccionar Nueva Fecha *</label>
                <input 
                  type="date" 
                  className="input-control" 
                  value={reprogramDate}
                  onChange={(e) => setReprogramDate(e.target.value)}
                  min={new Date().toISOString().substring(0, 10)}
                  required
                />
              </div>

              {/* Free slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="input-label">Horarios Libres del Médico *</label>
                
                {loadingReprogramSlots ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando...</span>
                  </div>
                ) : reprogramSlots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {reprogramSlots.map((slot, idx) => {
                      const isSel = selectedReprogramSlot && selectedReprogramSlot.start === slot.start;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedReprogramSlot(slot)}
                          style={{
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: isSel ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                            backgroundColor: isSel ? 'var(--accent)' : 'white'
                          }}
                        >
                          {slot.start} - {slot.end}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', padding: '0.5rem 0' }}>
                    No hay cupos disponibles. Seleccione otra fecha.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowReprogramModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleReprogramAppointment} disabled={!selectedReprogramSlot}>
                Confirmar Reprogramación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
