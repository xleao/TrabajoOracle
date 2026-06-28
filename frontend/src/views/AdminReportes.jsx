import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart2,
  Calendar,
  FileText,
  TrendingUp,
  PieChart as PieChartIcon,
  Clock,
  Users,
  AlertCircle,
  UserCheck,
  Stethoscope
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function AdminReportes() {
  const [reportType, setReportType] = useState('medico');

  const [fechaInicio, setFechaInicio] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );

  const [medicos, setMedicos] = useState([]);
  const [selectedMedicoId, setSelectedMedicoId] = useState('');

  const [reportData, setReportData] = useState([]);
  // RFR-03 sub-sections
  const [cancelMedicos, setCancelMedicos] = useState([]);
  const [cancelPacientes, setCancelPacientes] = useState([]);
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
        const activos = res.data.data.filter(m => m.ESTADO === 'A');
        setMedicos(activos);
        if (activos.length > 0) setSelectedMedicoId(activos[0].MEDICO_ID);
      }
    } catch(err) {
      console.error('Error fetching medicos:', err);
    }
  };

  const fetchReport = async () => {
    if (!fechaInicio || !fechaFin) return;
    if (reportType === 'ocupacion' && !selectedMedicoId) return;

    setLoading(true);
    setError('');
    setReportData([]);
    setCancelMedicos([]);
    setCancelPacientes([]);

    const params = `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

    try {
      if (reportType === 'cancelaciones') {
        // RFR-03: fetch the 3 sub-reports in parallel
        const [motivosRes, medicosRes, pacientesRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/reportes/cancelaciones${params}`),
          axios.get(`http://localhost:5000/api/reportes/cancelaciones-medico${params}`),
          axios.get(`http://localhost:5000/api/reportes/cancelaciones-paciente${params}`)
        ]);
        if (motivosRes.data.success)   setReportData(motivosRes.data.data || []);
        if (medicosRes.data.success)   setCancelMedicos(medicosRes.data.data || []);
        if (pacientesRes.data.success) setCancelPacientes(pacientesRes.data.data || []);
      } else {
        let endpoint = '';
        let extraParams = params;
        switch (reportType) {
          case 'medico':       endpoint = 'citas-por-medico'; break;
          case 'especialidad': endpoint = 'citas-por-especialidad'; break;
          case 'pacientes':    endpoint = 'pacientes-atendidos'; break;
          case 'ocupacion':
            endpoint = 'ocupacion-horaria';
            extraParams += `&medicoId=${selectedMedicoId}`;
            break;
          default: return;
        }
        const res = await axios.get(`http://localhost:5000/api/reportes/${endpoint}${extraParams}`);
        if (res.data.success) setReportData(res.data.data || []);
        else setError(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error cargando los datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (reportType === 'medico' && reportData.length > 0) {
      return (
        <div style={{ width: '100%', height: 550, padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '1rem' }}>Volumen de Citas por Médico</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData} margin={{ top: 10, right: 30, left: 0, bottom: 90 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="MEDICO" tick={{fontSize: 11}} angle={-35} textAnchor="end" interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: 'var(--bg-elevated)'}} />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar dataKey="TOTAL_CITAS" name="Total General" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ATENDIDAS" name="Atendidas" fill="var(--success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="CANCELADAS" name="Canceladas" fill="var(--danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (reportType === 'especialidad' && reportData.length > 0) {
      const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];
      return (
        <div style={{ width: '100%', height: 450, padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '1rem' }}>Demanda por Especialidades</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie data={reportData} dataKey="CANTIDAD_CITAS" nameKey="ESPECIALIDAD" cx="50%" cy="55%" outerRadius={110}
                label={({name, percent}) => `${name} (${(percent * 100).toFixed(1)}%)`}>
                {reportData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v} citas`, 'Cantidad']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (reportType === 'cancelaciones' && (reportData.length > 0 || cancelMedicos.length > 0)) {
      return (
        <div style={{ width: '100%', height: 350, padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '1rem' }}>Frecuencia de Cancelaciones por Motivo</h4>
          {reportData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={reportData} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="MOTIVO" type="category" tick={{fontSize: 11}} width={120} />
                <Tooltip cursor={{fill: 'var(--bg-elevated)'}} />
                <Bar dataKey="CANTIDAD" name="Cancelaciones" fill="var(--danger)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
              No hay cancelaciones en el período.
            </div>
          )}
        </div>
      );
    }

    if (reportType === 'pacientes' && reportData.length > 0) {
      const nuevos = reportData.filter(d => d.TIPO_PACIENTE === 'NUEVO').length;
      const recurrentes = reportData.filter(d => d.TIPO_PACIENTE === 'RECURRENTE').length;
      const pieData = [
        { name: 'Nuevos', value: nuevos },
        { name: 'Recurrentes', value: recurrentes }
      ];
      const COLORS = ['var(--primary)', 'var(--secondary)'];
      return (
        <div style={{ width: '100%', height: 350, padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '1rem', textAlign: 'center' }}>Proporción de Pacientes</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={60} outerRadius={100} paddingAngle={5}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(1)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v} pacientes`, 'Cantidad']} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (reportType === 'ocupacion' && reportData.length > 0) {
      return (
        <div style={{ width: '100%', height: 350, padding: '1rem 0' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '1rem' }}>Ocupación por Bloque Horario</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="FRANJA_HORARIA" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: 'var(--bg-elevated)'}} />
              <Bar dataKey="DEMANDA" name="Citas" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        Selecciona parámetros válidos para generar la visualización.
      </div>
    );
  };

  const hasCancelData = reportData.length > 0 || cancelMedicos.length > 0 || cancelPacientes.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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
          <input type="date" className="input-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} /> Fecha de Fin
          </label>
          <input type="date" className="input-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
        {reportType === 'ocupacion' && (
          <div style={{ flex: 1.5, minWidth: '250px' }}>
            <label className="input-label">Médico Especialista</label>
            <select className="input-control" value={selectedMedicoId} onChange={(e) => setSelectedMedicoId(e.target.value)}>
              <option value="" disabled>Seleccione...</option>
              {medicos.map(m => (
                <option key={m.MEDICO_ID} value={m.MEDICO_ID}>Dr(a). {m.NOMBRES} {m.APELLIDOS} ({m.ESPECIALIDAD_NOMBRE})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', gap: '1rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { key: 'medico',        label: 'Citas por Médico',        Icon: TrendingUp },
          { key: 'especialidad',  label: 'Demanda por Especialidad', Icon: PieChartIcon },
          { key: 'cancelaciones', label: 'Análisis de Cancelaciones',Icon: FileText },
          { key: 'pacientes',     label: 'Pacientes Atendidos',      Icon: Users },
          { key: 'ocupacion',     label: 'Ocupación Horaria',        Icon: Clock },
        ].map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setReportType(key)} style={{
            padding: '0.75rem 1.25rem',
            borderBottom: reportType === key ? '3px solid var(--primary)' : 'none',
            fontWeight: 600,
            color: reportType === key ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }}>
            <Icon size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Main Panel */}
      <div className="grid grid-cols-2 gap-6" style={{ gridTemplateColumns: '0.85fr 1.15fr' }}>

        {/* Table Panel */}
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
                <AlertCircle size={18} />{error}
              </div>
            ) : reportType === 'cancelaciones' ? (
              // RFR-03: 3 secciones apiladas
              !hasCancelData ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay cancelaciones en el período seleccionado.</div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: '600px' }}>
                  {/* Sección 1: Motivos */}
                  <div style={{ padding: '1rem 1.25rem 0.5rem', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <FileText size={15} color="var(--danger)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Motivos más frecuentes
                    </span>
                  </div>
                  {reportData.length > 0 ? (
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Motivo de Cancelación</th>
                          <th style={{ width: '100px', textAlign: 'right' }}>Casos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((d, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: '0.875rem' }}>{d.MOTIVO || 'Sin motivo especificado'}</td>
                            <td style={{ fontWeight: 700, color: 'var(--danger)', textAlign: 'right' }}>{d.CANTIDAD}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin datos.</div>
                  )}

                  {/* Sección 2: Tasa por médico */}
                  <div style={{ padding: '1rem 1.25rem 0.5rem', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '2px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                    <Stethoscope size={15} color="var(--warning)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tasa de cancelación por médico
                    </span>
                  </div>
                  {cancelMedicos.length > 0 ? (
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Médico</th>
                          <th>Total</th>
                          <th>Canceladas</th>
                          <th>% Cancelación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelMedicos.map((d, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{d.MEDICO}</td>
                            <td>{d.TOTAL_CITAS}</td>
                            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.CANCELADAS}</td>
                            <td>
                              <span className={`badge ${d.PCT_CANCELACION >= 50 ? 'badge-danger' : d.PCT_CANCELACION >= 25 ? 'badge-warning' : 'badge-success'}`}>
                                {d.PCT_CANCELACION}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin datos.</div>
                  )}

                  {/* Sección 3: Tasa por paciente */}
                  <div style={{ padding: '1rem 1.25rem 0.5rem', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '2px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                    <UserCheck size={15} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pacientes con mayor tasa de cancelación
                    </span>
                  </div>
                  {cancelPacientes.length > 0 ? (
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Total</th>
                          <th>Canceladas</th>
                          <th>% Cancelación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelPacientes.map((d, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{d.PACIENTE}</td>
                            <td>{d.TOTAL_CITAS}</td>
                            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.CANCELADAS}</td>
                            <td>
                              <span className={`badge ${d.PCT_CANCELACION >= 50 ? 'badge-danger' : d.PCT_CANCELACION >= 25 ? 'badge-warning' : 'badge-success'}`}>
                                {d.PCT_CANCELACION}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ningún paciente con cancelaciones en el período.</div>
                  )}
                </div>
              )
            ) : reportData.length > 0 ? (
              <table className="premium-table">
                {/* RFR-01: Citas por médico */}
                {reportType === 'medico' && (
                  <>
                    <thead>
                      <tr><th>Médico</th><th>Atendidas</th><th>Canceladas</th><th>Total</th><th>Prom/día</th></tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.MEDICO}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>{d.ATENDIDAS}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.CANCELADAS}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{d.TOTAL_CITAS}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{d.PROMEDIO_DIARIO}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {/* RFR-02: Demanda por especialidad */}
                {reportType === 'especialidad' && (() => {
                  const total = reportData.reduce((acc, d) => acc + (d.CANTIDAD_CITAS || 0), 0);
                  return (
                    <>
                      <thead>
                        <tr><th>Especialidad</th><th>Citas</th><th>% Demanda</th></tr>
                      </thead>
                      <tbody>
                        {reportData.map((d, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{d.ESPECIALIDAD}</td>
                            <td style={{ fontWeight: 700 }}>{d.CANTIDAD_CITAS}</td>
                            <td>
                              <span className="badge badge-info" style={{ textTransform: 'none' }}>
                                {total > 0 ? (((d.CANTIDAD_CITAS || 0) / total) * 100).toFixed(1) : 0}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  );
                })()}
                {/* RFR-04: Pacientes atendidos */}
                {reportType === 'pacientes' && (
                  <>
                    <thead>
                      <tr><th>Paciente</th><th>Visitas en el Período</th><th>Clasificación</th></tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.PACIENTE}</td>
                          <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>{d.TOTAL_VISITAS}</td>
                          <td>
                            <span className={`badge ${d.TIPO_PACIENTE === 'RECURRENTE' ? 'badge-success' : 'badge-warning'}`}>
                              {d.TIPO_PACIENTE === 'RECURRENTE' ? 'Recurrente' : 'Nuevo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {/* RFR-05: Ocupación horaria */}
                {reportType === 'ocupacion' && (
                  <>
                    <thead>
                      <tr><th>Franja Horaria</th><th>Citas Reservadas</th></tr>
                    </thead>
                    <tbody>
                      {reportData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.FRANJA_HORARIA}</td>
                          <td style={{ fontWeight: 700, color: '#8B5CF6' }}>{d.DEMANDA}</td>
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

        {/* Chart Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} /> Análisis Gráfico
            </h3>
          </div>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Cargando gráfico...
            </div>
          ) : renderChart()}
        </div>

      </div>
    </div>
  );
}
