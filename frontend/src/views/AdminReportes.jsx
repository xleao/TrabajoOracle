import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart2, 
  Calendar, 
  FileText, 
  TrendingUp, 
  PieChart, 
  Clock, 
  Users,
  Search,
  AlertCircle
} from 'lucide-react';

export default function AdminReportes() {
  const [reportType, setReportType] = useState('medico'); // 'medico', 'especialidad', 'cancelaciones', 'pacientes', 'ocupacion'
  
  // Date filters
  const [fechaInicio, setFechaInicio] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) // 30 days ago
  );
  const [fechaFin, setFechaFin] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) // 30 days ahead to capture scheduled future appointments
  );

  // Doctors list (needed for hourly occupancy report)
  const [medicos, setMedicos] = useState([]);
  const [selectedMedicoId, setSelectedMedicoId] = useState('');

  // Report data state
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMedicos();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, fechaInicio, fechaFin, selectedMedicoId]);

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

  const fetchReport = async () => {
    if (!fechaInicio || !fechaFin) return;
    
    // For occupancy report, doctor selection is required
    if (reportType === 'ocupacion' && !selectedMedicoId) return;

    setLoading(true);
    setError('');
    setReportData([]);

    try {
      let endpoint = '';
      let params = `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

      switch (reportType) {
        case 'medico':
          endpoint = 'citas-por-medico';
          break;
        case 'especialidad':
          endpoint = 'citas-por-especialidad';
          break;
        case 'cancelaciones':
          endpoint = 'cancelaciones';
          break;
        case 'pacientes':
          endpoint = 'pacientes-atendidos';
          break;
        case 'ocupacion':
          endpoint = 'ocupacion-horaria';
          params += `&medicoId=${selectedMedicoId}`;
          break;
        default:
          return;
      }

      const res = await axios.get(`http://localhost:5000/api/reportes/${endpoint}${params}`);
      if (res.data.success) {
        setReportData(res.data.data || []);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.response?.data?.message || 'Error cargando los datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  // Render SVG Charts dynamically
  const renderChart = () => {
    if (reportData.length === 0) return null;

    if (reportType === 'medico') {
      const maxCitas = Math.max(...reportData.map(d => d.TOTAL_CITAS || 1));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Gráfico: Volumen de Citas por Médico</h4>
          {reportData.map((d, index) => {
            const pct = ((d.TOTAL_CITAS || 0) / maxCitas) * 100;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '150px', fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {d.MEDICO}
                </div>
                <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.8s ease-out'
                  }}></div>
                </div>
                <div style={{ width: '80px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)', textAlign: 'right' }}>
                  {d.TOTAL_CITAS} citas
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (reportType === 'especialidad') {
      const maxCitas = Math.max(...reportData.map(d => d.CANTIDAD || 1));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Gráfico: Demanda por Especialidades</h4>
          {reportData.map((d, index) => {
            const pct = ((d.CANTIDAD || 0) / maxCitas) * 100;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '150px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {d.ESPECIALIDAD}
                </div>
                <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--secondary) 0%, var(--secondary-light) 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.8s ease-out'
                  }}></div>
                </div>
                <div style={{ width: '80px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)', textAlign: 'right' }}>
                  {d.CANTIDAD} citas ({d.PORCENTAJE}%)
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (reportType === 'cancelaciones') {
      const maxCan = Math.max(...reportData.map(d => d.CANTIDAD || 1));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Gráfico: Frecuencia de Cancelaciones</h4>
          {reportData.map((d, index) => {
            const pct = ((d.CANTIDAD || 0) / maxCan) * 100;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '220px', fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={d.MOTIVO_CANCELACION || 'Sin motivo especificado'}>
                  {d.MOTIVO_CANCELACION || 'Sin motivo especificado'}
                </div>
                <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    backgroundColor: 'var(--danger)',
                    borderRadius: '6px',
                    opacity: 0.85,
                    transition: 'width 0.8s ease-out'
                  }}></div>
                </div>
                <div style={{ width: '80px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)', textAlign: 'right' }}>
                  {d.CANTIDAD} citas
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (reportType === 'pacientes') {
      // Pacientes Atendidos returns New vs Recurring. Usually has 2 rows
      return (
        <div style={{ display: 'flex', gap: '2rem', padding: '2rem 0', justifyContent: 'center', alignItems: 'center' }}>
          {reportData.map((d, index) => (
            <div key={index} className="card" style={{ flex: 1, maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', borderTop: `5px solid ${index === 0 ? 'var(--primary)' : 'var(--secondary)'}` }}>
              <span style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                {d.TIPO_PACIENTE}
              </span>
              <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                {d.CANTIDAD}
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                Total Período
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (reportType === 'ocupacion') {
      const maxCitas = Math.max(...reportData.map(d => d.CANTIDAD_CITAS || 1));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Gráfico: Ocupación por Bloque Horario</h4>
          {reportData.map((d, index) => {
            const pct = ((d.CANTIDAD_CITAS || 0) / maxCitas) * 100;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '120px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {d.HORA_INICIO} - {d.HORA_FIN}
                </div>
                <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.8s ease-out'
                  }}></div>
                </div>
                <div style={{ width: '80px', fontSize: '0.85rem', fontWeight: 600, color: '#8B5CF6', textAlign: 'right' }}>
                  {d.CANTIDAD_CITAS} citas
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Módulo de Reportes Gerenciales</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Estadísticas de afluencia, demanda por especialidad y rendimiento operacional en tiempo real.</p>
      </div>

      {/* Date Filter Bar */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', padding: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} /> Fecha de Inicio
          </label>
          <input 
            type="date" 
            className="input-control" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)} 
          />
        </div>
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} /> Fecha de Fin
          </label>
          <input 
            type="date" 
            className="input-control" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)} 
          />
        </div>

        {reportType === 'ocupacion' && (
          <div style={{ flex: 1.5, minWidth: '250px' }}>
            <label className="input-label">Médico Especialista</label>
            <select 
              className="input-control" 
              value={selectedMedicoId} 
              onChange={(e) => setSelectedMedicoId(e.target.value)}
            >
              <option value="" disabled>Seleccione...</option>
              {medicos.map(m => (
                <option key={m.MEDICO_ID} value={m.MEDICO_ID}>
                  Dr(a). {m.NOMBRES} {m.APELLIDOS} ({m.ESPECIALIDAD_NOMBRE})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', gap: '1rem', overflowX: 'auto', paddingBottom: '2px' }}>
        <button 
          onClick={() => setReportType('medico')}
          style={{ padding: '0.75rem 1.25rem', borderBottom: reportType === 'medico' ? '3px solid var(--primary)' : 'none', fontWeight: 600, color: reportType === 'medico' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}
        >
          <TrendingUp size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
          Citas por Médico
        </button>

        <button 
          onClick={() => setReportType('especialidad')}
          style={{ padding: '0.75rem 1.25rem', borderBottom: reportType === 'especialidad' ? '3px solid var(--primary)' : 'none', fontWeight: 600, color: reportType === 'especialidad' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}
        >
          <PieChart size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
          Demanda por Especialidad
        </button>

        <button 
          onClick={() => setReportType('cancelaciones')}
          style={{ padding: '0.75rem 1.25rem', borderBottom: reportType === 'cancelaciones' ? '3px solid var(--primary)' : 'none', fontWeight: 600, color: reportType === 'cancelaciones' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}
        >
          <FileText size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
          Motivos Cancelación
        </button>

        <button 
          onClick={() => setReportType('pacientes')}
          style={{ padding: '0.75rem 1.25rem', borderBottom: reportType === 'pacientes' ? '3px solid var(--primary)' : 'none', fontWeight: 600, color: reportType === 'pacientes' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}
        >
          <Users size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
          Pacientes Atendidos
        </button>

        <button 
          onClick={() => setReportType('ocupacion')}
          style={{ padding: '0.75rem 1.25rem', borderBottom: reportType === 'ocupacion' ? '3px solid var(--primary)' : 'none', fontWeight: 600, color: reportType === 'ocupacion' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}
        >
          <Clock size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
          Ocupación Horaria
        </button>
      </div>

      {/* Main Analysis and Visualization Panel */}
      <div className="grid grid-cols-2 gap-6" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        
        {/* Table representation */}
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', margin: 0 }}>Datos Tabulares del Reporte</h3>
          </div>

          <div className="table-container" style={{ borderRadius: '0' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Consultando Oracle Database...</span>
              </div>
            ) : error ? (
              <div style={{ padding: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--danger)', fontSize: '0.9rem' }}>
                <AlertCircle size={18} />
                {error}
              </div>
            ) : reportData.length > 0 ? (
              <table className="premium-table">
                {/* 1. CITAS POR MEDICO */}
                {reportType === 'medico' && (
                  <>
                    <thead>
                      <tr>
                        <th>Médico</th>
                        <th>Citas Atendidas</th>
                        <th>Citas Canceladas</th>
                        <th>Total General</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.MEDICO}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>{d.ATENDIDAS}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.CANCELADAS}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{d.TOTAL_CITAS}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 2. DEMANDA POR ESPECIALIDAD */}
                {reportType === 'especialidad' && (
                  <>
                    <thead>
                      <tr>
                        <th>Especialidad</th>
                        <th>Cantidad Citas</th>
                        <th>Porcentaje Demandado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.ESPECIALIDAD}</td>
                          <td style={{ fontWeight: 700 }}>{d.CANTIDAD}</td>
                          <td>
                            <span className="badge badge-info" style={{ textTransform: 'none' }}>
                              {d.PORCENTAJE}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 3. MOTIVOS DE CANCELACIÓN */}
                {reportType === 'cancelaciones' && (
                  <>
                    <thead>
                      <tr>
                        <th>Motivo de Cancelación</th>
                        <th>Frecuencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: '0.875rem' }}>{d.MOTIVO_CANCELACION || 'Sin motivo especificado'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{d.CANTIDAD}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 4. PACIENTES ATENDIDOS */}
                {reportType === 'pacientes' && (
                  <>
                    <thead>
                      <tr>
                        <th>Clasificación de Paciente</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.TIPO_PACIENTE}</td>
                          <td style={{ fontWeight: 700, fontSize: '1.15rem' }}>{d.CANTIDAD}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 5. OCUPACION HORARIA */}
                {reportType === 'ocupacion' && (
                  <>
                    <thead>
                      <tr>
                        <th>Franja Horaria</th>
                        <th>Citas Reservadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.HORA_INICIO} - {d.HORA_FIN}</td>
                          <td style={{ fontWeight: 700, color: '#8B5CF6' }}>{d.CANTIDAD_CITAS}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            ) : (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay datos para el período seleccionado.
              </div>
            )}
          </div>
        </div>

        {/* Charts Visual representation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyItems: 'center' }}>
          <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} /> Análisis Gráfico
            </h3>
          </div>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Cargando gráfico...
            </div>
          ) : reportData.length > 0 ? (
            renderChart()
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              Selecciona parámetros válidos para generar la visualización analítica.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
