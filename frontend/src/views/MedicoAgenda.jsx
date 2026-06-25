import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Calendar, 
  Clock, 
  User, 
  History, 
  Search, 
  X, 
  FileText,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  Bookmark
} from 'lucide-react';

export default function MedicoAgenda() {
  const { user } = useAuth();
  
  // Doctor properties
  const medicoId = user?.medicoId || '';
  
  // Date selection (defaults to today)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Patient history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [pacienteHistory, setPacienteHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (medicoId) {
      fetchAgenda();
    }
  }, [selectedDate, medicoId]);

  const fetchAgenda = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`http://localhost:5000/api/citas/agenda-diaria?medicoId=${medicoId}&fecha=${selectedDate}`);
      if (res.data.success) {
        setAgenda(res.data.data);
      } else {
        setErrorMsg(res.data.message);
      }
    } catch (err) {
      console.error('Error fetching doctor agenda:', err);
      setErrorMsg(err.response?.data?.message || 'Error cargando la agenda del médico');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHistory = async (cita) => {
    setSelectedPaciente({
      pacienteId: cita.PACIENTE_ID || cita.pacienteId || 1, // fallback if ID is not direct
      nombre: cita.PACIENTE
    });
    
    // We need to resolve patient ID. In FN_AGENDA_DIARIA, it returns PACIENTE name.
    // Let's search patient by name to extract their PACIENTE_ID or we can query using a search.
    // Wait, let's look at FN_AGENDA_DIARIA in 10_patch_strict_plsql.sql line 32:
    // SELECT c.CITA_ID, c.HORA_INICIO, c.HORA_FIN, p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE, e.NOMBRE AS ESTADO_CITA, c.MOTIVO_CONSULTA
    // Ah! It doesn't return PACIENTE_ID!
    // But wait! How can we get the PACIENTE_ID?
    // We can search for the patient by name using `FN_BUSCAR_PACIENTE` with the name as filter!
    // This is a brilliant and robust workaround!
    setLoadingHistory(true);
    setShowHistoryModal(true);
    setPacienteHistory([]);

    try {
      // 1. Find patient ID by name
      const searchRes = await axios.get(`http://localhost:5000/api/pacientes?filtro=${cita.PACIENTE}`);
      if (searchRes.data.success && searchRes.data.data.length > 0) {
        const pId = searchRes.data.data[0].PACIENTE_ID;
        setSelectedPaciente(searchRes.data.data[0]);
        
        // 2. Fetch history
        const histRes = await axios.get(`http://localhost:5000/api/citas/historial-paciente?pacienteId=${pId}`);
        if (histRes.data.success) {
          setPacienteHistory(histRes.data.data);
        }
      } else {
        setErrorMsg('No se pudo ubicar el identificador único del paciente.');
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Agenda de Consultas Médicas</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Consulte y gestione sus citas del día e historiales clínicos de pacientes.</p>
      </div>

      {/* Date filter card */}
      <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
          <Calendar size={20} />
          <span>Fecha de Trabajo:</span>
        </div>
        <input 
          type="date" 
          className="input-control" 
          style={{ maxWidth: '250px' }}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        
        <div style={{ flex: 1, textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Restricción de Privacidad: Agenda Médica Exclusiva (ID: {medicoId})
        </div>
      </div>

      {/* Agenda list Table */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Hora Bloque</th>
                <th>Nombre del Paciente</th>
                <th>Motivo de Consulta</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Cargando agenda diaria...</p>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--danger)' }}>
                    <AlertCircle size={24} style={{ marginBottom: '0.5rem' }} />
                    <p>{errorMsg}</p>
                  </td>
                </tr>
              ) : agenda.length > 0 ? (
                agenda.map((c, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.HORA_INICIO} - {c.HORA_FIN}</td>
                    <td style={{ fontWeight: 600 }}>{c.PACIENTE}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{c.MOTIVO_CONSULTA || 'Consulta de rutina'}</td>
                    <td>
                      <span className={`badge ${
                        c.ESTADO_CITA === 'Pendiente' ? 'badge-info' :
                        c.ESTADO_CITA === 'Confirmada' ? 'badge-success' :
                        c.ESTADO_CITA === 'En Atención' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {c.ESTADO_CITA}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => handleOpenHistory(c)}
                      >
                        <History size={14} /> Historial Paciente
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                    No registra consultas agendadas para la fecha seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient History Modal (with Timeline) */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', backgroundColor: 'white', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', maxHeight: '85vh', overflow: 'hidden' }}>
            <button style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-light)' }} onClick={() => setShowHistoryModal(false)}>
              <X size={20} />
            </button>

            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--primary-dark)', margin: 0 }}>Historial Clínico Cronológico</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Paciente: <strong style={{ color: 'var(--text-main)' }}>{selectedPaciente?.NOMBRES || selectedPaciente?.nombre} {selectedPaciente?.APELLIDOS || ''}</strong> (DNI: {selectedPaciente?.DNI || 'Buscando...'})
              </p>
            </div>

            {/* Timeline component */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              
              {loadingHistory ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando línea de tiempo...</span>
                </div>
              ) : pacienteHistory.length > 0 ? (
                <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-light)', marginLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {pacienteHistory.map((h, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {/* Bullet */}
                      <div style={{ 
                        position: 'absolute', 
                        left: '-23px', 
                        top: '4px', 
                        width: '14px', 
                        height: '14px', 
                        borderRadius: '50%', 
                        backgroundColor: h.ESTADO_CITA === 'Atendida' ? 'var(--success)' : 
                                         h.ESTADO_CITA === 'Cancelada' ? 'var(--danger)' : 'var(--primary)',
                        border: '3px solid white',
                        boxShadow: 'var(--shadow-sm)'
                      }}></div>
                      
                      {/* Content block */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', width: '100%' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {new Date(h.FECHA_CITA).toLocaleDateString('es-ES')} ({h.HORA_INICIO} - {h.HORA_FIN})
                          </strong>
                          <span className={`badge ${
                            h.ESTADO_CITA === 'Atendida' ? 'badge-success' : 
                            h.ESTADO_CITA === 'Cancelada' ? 'badge-danger' : 'badge-info'
                          }`} style={{ scale: '0.85', transformOrigin: 'right center' }}>
                            {h.ESTADO_CITA}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Médico: <strong>{h.MEDICO}</strong> | Especialidad: <strong>{h.ESPECIALIDAD}</strong>
                        </span>
                        {h.OBSERVACIONES && (
                          <div style={{ padding: '0.5rem', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'white', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {h.OBSERVACIONES}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <FileText size={40} style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0 }}>No hay registro de citas anteriores.</p>
                </div>
              )}
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
