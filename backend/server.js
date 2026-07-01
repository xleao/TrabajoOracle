const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');
require('dotenv').config();

// Config oracledb outFormat globally to return objects instead of arrays
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.autoCommit = true; // Auto commit on operations

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url} - Auth: ${req.headers.authorization ? 'Yes' : 'No'}`);
  next();
});

const PORT = process.env.PORT || 5000;

// Initialize connection pool
let pool;
async function initializeDb() {
  try {
    pool = await oracledb.createPool({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || 'JRODRIGUEZ',
      connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/orcl',
      poolMax: 10,
      poolMin: 2,
      poolIncrement: 1,
      poolTimeout: 60
    });
    console.log('✅ Connection pool initialized successfully.');
  } catch (err) {
    console.error('❌ Database pool initialization failed:', err);
    process.exit(1);
  }
}

// Helper to execute query with connection from pool
async function executeDb(query, binds = {}, options = {}) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute("ALTER SESSION SET NLS_TERRITORY = 'AMERICA'");
    const result = await connection.execute(query, binds, options);
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Helper to execute procedure returning cursors
async function executeWithCursor(query, binds = {}) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute("ALTER SESSION SET NLS_TERRITORY = 'AMERICA'");
    
    // Setup Cursor bind out parameter
    const localBinds = {
      ...binds,
      ret: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };
    
    const result = await connection.execute(query, localBinds);
    const cursor = result.outBinds.ret;
    
    const rows = [];
    let row;
    while ((row = await cursor.getRow())) {
      rows.push(row);
    }
    await cursor.close();
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Middleware: Authenticate Session and Check Role
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Falta token de sesión' });
  }

  try {
    const list = await executeWithCursor(
      `BEGIN :ret := SEG_CLINICA.PKG_SEGURIDAD.FN_VALIDAR_TOKEN_SESION(:token); END;`,
      { token }
    );

    if (list.length === 0) {
      return res.status(401).json({ success: false, message: 'Sesión expirada o inválida' });
    }

    req.user = list[0];
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ success: false, message: 'Error de servidor en autenticación' });
  }
}

// ----------------------------------------------------
// 1. AUTENTICACIÓN (PKG_SEGURIDAD)
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y clave obligatorios' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Authenticate user
    const authResult = await connection.execute(
      `BEGIN :usuario_id := SEG_CLINICA.PKG_SEGURIDAD.FN_AUTENTICAR(:username, :password); END;`,
      {
        username,
        password,
        usuario_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    const usuarioId = authResult.outBinds.usuario_id;
    if (usuarioId === -1) {
      await connection.close();
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas o usuario inactivo' });
    }

    // 2. Create session
    const sessionResult = await connection.execute(
      `BEGIN SEG_CLINICA.PKG_SEGURIDAD.SP_CREAR_SESION(:usuario_id, :ip, :token); END;`,
      {
        usuario_id: usuarioId,
        ip: req.ip || '127.0.0.1',
        token: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      }
    );

    const token = sessionResult.outBinds.token;
    await connection.close();
    connection = null;

    // Re-verify to get standard session data block using the new token function
    const list = await executeWithCursor(
      `BEGIN :ret := SEG_CLINICA.PKG_SEGURIDAD.FN_VALIDAR_TOKEN_SESION(:token); END;`,
      { token }
    );
    
    if(list.length === 0) {
      return res.status(500).json({ success: false, message: 'Error recuperando perfil de usuario' });
    }
    const user = list[0];

    res.json({
      success: true,
      token,
      user: {
        id: user.USUARIO_ID,
        username: user.USERNAME,
        nombre: user.NOMBRE_COMPLETO,
        rolId: user.ROL_ID,
        rol: user.ROL_NAME,
        medicoId: user.MEDICO_ID
      }
    });

  } catch (err) {
    if (connection) await connection.close();
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  try {
    await executeDb(
      `BEGIN SEG_CLINICA.PKG_SEGURIDAD.SP_CERRAR_SESION(:token); END;`,
      { token }
    );
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 2. MANTENIMIENTOS Y CRUD (PKG_ADMINISTRACION)
// ----------------------------------------------------

// Pacientes
app.get('/api/pacientes', authenticateToken, async (req, res) => {
  const { filtro = '' } = req.query;
  try {
    // Obtenemos todos los pacientes pasando filtro vacío a Oracle (sin modificar PL/SQL)
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_BUSCAR_PACIENTE(''); END;`
    );
    
    // Filtramos en JS para soportar búsqueda de nombre completo, DNI y orden desordenado
    const terminos = filtro.trim().toLowerCase().split(/\s+/);
    const filteredList = list.filter(p => {
      const nombreCompleto = `${p.NOMBRES} ${p.APELLIDOS}`.toLowerCase();
      const dni = (p.DNI || '').toLowerCase();
      return terminos.every(term => nombreCompleto.includes(term) || dni.includes(term));
    });

    res.json({ success: true, data: filteredList });
  } catch (err) {
    console.error('Get pacientes error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/pacientes/gestionar', authenticateToken, async (req, res) => {
  const { accion, nombres, apellidos, dni, fechaNacimiento, telefono, email, direccion, estado } = req.body;
  let pacienteId = req.body.pacienteId ? Number(req.body.pacienteId) : null;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_PACIENTE(
         :accion, :pacienteId, :nombres, :apellidos, :dni, 
         TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'), :telefono, :email, :direccion, :estado
       ); END;`,
      {
        accion,
        pacienteId: { val: pacienteId, dir: oracledb.BIND_INOUT, type: oracledb.NUMBER },
        nombres,
        apellidos,
        dni,
        fechaNacimiento: fechaNacimiento ? fechaNacimiento.substring(0, 10) : null,
        telefono,
        email,
        direccion,
        estado
      }
    );
    res.json({ success: true, pacienteId: result.outBinds.pacienteId, message: 'Paciente gestionado con éxito' });
  } catch (err) {
    console.error('Gestionar paciente error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Médicos
app.get('/api/medicos', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_LISTAR_MEDICOS(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get medicos error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/medicos/gestionar', authenticateToken, async (req, res) => {
  const { accion, nombres, apellidos, nroColegiatura, especialidadId, telefono, email, estado } = req.body;
  let medicoId = req.body.medicoId ? Number(req.body.medicoId) : null;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_MEDICO(
         :accion, :medicoId, :nombres, :apellidos, :nroColegiatura, 
         :especialidadId, :telefono, :email, :estado
       ); END;`,
      {
        accion,
        medicoId: { val: medicoId, dir: oracledb.BIND_INOUT, type: oracledb.NUMBER },
        nombres,
        apellidos,
        nroColegiatura,
        especialidadId: Number(especialidadId),
        telefono,
        email,
        estado
      }
    );
    res.json({ success: true, medicoId: result.outBinds.medicoId, message: 'Médico gestionado con éxito' });
  } catch (err) {
    console.error('Gestionar medico error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Especialidades
app.get('/api/especialidades', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_LISTAR_ESPECIALIDADES(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get especialidades error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/especialidades/gestionar', authenticateToken, async (req, res) => {
  const { accion, nombre, descripcion, estado } = req.body;
  let especialidadId = req.body.especialidadId ? Number(req.body.especialidadId) : null;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_ESPECIALIDAD(
         :accion, :especialidadId, :nombre, :descripcion, :estado
       ); END;`,
      {
        accion,
        especialidadId: { val: especialidadId, dir: oracledb.BIND_INOUT, type: oracledb.NUMBER },
        nombre,
        descripcion,
        estado
      }
    );
    res.json({ success: true, especialidadId: result.outBinds.especialidadId, message: 'Especialidad gestionada con éxito' });
  } catch (err) {
    console.error('Gestionar especialidad error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Horarios Médicos
app.get('/api/horarios', authenticateToken, async (req, res) => {
  const { medicoId } = req.query;
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_LISTAR_HORARIOS(:medicoId); END;`,
      { medicoId: medicoId ? Number(medicoId) : null }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get horarios error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/horarios/gestionar', authenticateToken, async (req, res) => {
  const { accion, medicoId, diaSemana, horaInicio, horaFin, duracionCitaMin, estado } = req.body;
  let horarioId = req.body.horarioId ? Number(req.body.horarioId) : null;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_HORARIO(
         :accion, :horarioId, :medicoId, :diaSemana, :horaInicio, :horaFin, :duracionCitaMin, :estado
       ); END;`,
      {
        accion,
        horarioId: { val: horarioId, dir: oracledb.BIND_INOUT, type: oracledb.NUMBER },
        medicoId: Number(medicoId),
        diaSemana: Number(diaSemana),
        horaInicio,
        horaFin,
        duracionCitaMin: Number(duracionCitaMin),
        estado
      }
    );
    res.json({ success: true, horarioId: result.outBinds.horarioId, message: 'Horario gestionado con éxito' });
  } catch (err) {
    console.error('Gestionar horario error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Usuarios
app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := SEG_CLINICA.PKG_SEGURIDAD.FN_LISTAR_USUARIOS(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get usuarios error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/roles', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := SEG_CLINICA.PKG_SEGURIDAD.FN_LISTAR_ROLES(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/usuarios/gestionar', authenticateToken, async (req, res) => {
  const { accion, username, password, nombreCompleto, email, rolId, medicoId, estado } = req.body;
  let usuarioId = req.body.usuarioId ? Number(req.body.usuarioId) : null;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_USUARIO(
         :accion, :usuarioId, :username, :password, :nombreCompleto, :email, :rolId, :medicoId, :estado
       ); END;`,
      {
        accion,
        usuarioId: { val: usuarioId, dir: oracledb.BIND_INOUT, type: oracledb.NUMBER },
        username,
        password: password || null,
        nombreCompleto,
        email,
        rolId: Number(rolId),
        medicoId: medicoId ? Number(medicoId) : null,
        estado
      }
    );
    res.json({ success: true, usuarioId: result.outBinds.usuarioId, message: 'Usuario gestionado con éxito' });
  } catch (err) {
    console.error('Gestionar usuario error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 3. CORE DE CITAS (PKG_VALOR)
// ----------------------------------------------------

// Consultar franjas libres
app.get('/api/citas/disponibilidad', authenticateToken, async (req, res) => {
  const { medicoId, fecha } = req.query;
  if (!medicoId || !fecha) {
    return res.status(400).json({ success: false, message: 'Faltan medicoId y fecha' });
  }

  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_OBTENER_FRANJAS_LIBRES(:medicoId, TO_DATE(:fecha, 'YYYY-MM-DD')); END;`,
      {
        medicoId: Number(medicoId),
        fecha
      }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get disponibilidad error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Agendar Cita
app.post('/api/citas/agendar', authenticateToken, async (req, res) => {
  const { pacienteId, medicoId, especialidadId, fechaCita, horaInicio, horaFin, motivoConsulta } = req.body;
  if (!pacienteId || !medicoId || !especialidadId || !fechaCita || !horaInicio || !horaFin) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para agendar la cita' });
  }
  const usuarioCreacion = req.user.USUARIO_ID;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_VALOR.SP_AGENDAR_CITA(
         :pacienteId, :medicoId, :especialidadId, TO_DATE(:fechaCita, 'YYYY-MM-DD'),
         :horaInicio, :horaFin, :motivoConsulta, :usuarioCreacion, :citaId
       ); END;`,
      {
        pacienteId: Number(pacienteId),
        medicoId: Number(medicoId),
        especialidadId: Number(especialidadId),
        fechaCita: fechaCita.substring(0, 10),
        horaInicio,
        horaFin,
        motivoConsulta: motivoConsulta || '',
        usuarioCreacion,
        citaId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );
    res.json({ success: true, citaId: result.outBinds.citaId, message: 'Cita agendada con éxito' });
  } catch (err) {
    console.error('Agendar cita error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancelar Cita
app.post('/api/citas/cancelar', authenticateToken, async (req, res) => {
  const { citaId, motivoCancelacion } = req.body;
  const usuarioModificacion = req.user.USUARIO_ID;

  try {
    await executeDb(
      `BEGIN APP_CLINICA.PKG_VALOR.SP_CANCELAR_CITA(:citaId, :motivoCancelacion, :usuarioModificacion); END;`,
      {
        citaId: Number(citaId),
        motivoCancelacion,
        usuarioModificacion
      }
    );
    res.json({ success: true, message: 'Cita cancelada con éxito' });
  } catch (err) {
    console.error('Cancelar cita error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reprogramar Cita
app.post('/api/citas/reprogramar', authenticateToken, async (req, res) => {
  const { citaId, nuevaFecha, nuevaHoraInicio, nuevaHoraFin } = req.body;
  if (!citaId || !nuevaFecha || !nuevaHoraInicio || !nuevaHoraFin) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para reprogramar' });
  }
  const usuarioModificacion = req.user.USUARIO_ID;

  try {
    const result = await executeDb(
      `BEGIN APP_CLINICA.PKG_VALOR.SP_REPROGRAMAR_CITA(
         :citaId, TO_DATE(:nuevaFecha, 'YYYY-MM-DD'), :nuevaHoraInicio, :nuevaHoraFin, 
         :usuarioModificacion, :nuevaCitaId
       ); END;`,
      {
        citaId: Number(citaId),
        nuevaFecha: nuevaFecha.substring(0, 10),
        nuevaHoraInicio,
        nuevaHoraFin,
        usuarioModificacion,
        nuevaCitaId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );
    res.json({ success: true, nuevaCitaId: result.outBinds.nuevaCitaId, message: 'Cita reprogramada con éxito' });
  } catch (err) {
    console.error('Reprogramar cita error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 4. CONSULTAS (PKG_CONSULTAS)
// ----------------------------------------------------

// Estados Cita Catalog
app.get('/api/citas/estados', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_LISTAR_ESTADOS_CITA(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get estados cita error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Agenda Diaria
app.get('/api/citas/agenda-diaria', authenticateToken, async (req, res) => {
  const { medicoId, fecha } = req.query;
  if (!medicoId || !fecha) {
    return res.status(400).json({ success: false, message: 'Faltan medicoId y fecha' });
  }
  
  // Validar RFS-03: Un médico solo puede ver su propia agenda
  if ((req.user.ROL_NAME === 'MEDICO' || req.user.ROL_ID === 3) && req.user.MEDICO_ID !== Number(medicoId)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Solo puedes consultar tu propia agenda.' });
  }

  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_AGENDA_DIARIA(:medicoId, TO_DATE(:fecha, 'YYYY-MM-DD')); END;`,
      { medicoId: Number(medicoId), fecha }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Agenda diaria error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Historial del Paciente
app.get('/api/citas/historial-paciente', authenticateToken, async (req, res) => {
  const { pacienteId } = req.query;
  if (!pacienteId) {
    return res.status(400).json({ success: false, message: 'Falta pacienteId' });
  }
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_HISTORIAL_PACIENTE(:pacienteId); END;`,
      { pacienteId: Number(pacienteId) }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Historial paciente error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Citas por Especialidad
app.get('/api/citas/por-especialidad', authenticateToken, async (req, res) => {
  const { especialidadId, fechaInicio, fechaFin } = req.query;
  if (!especialidadId || !fechaInicio || !fechaFin) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros' });
  }
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_CITAS_POR_ESPECIALIDAD(
         :especialidadId, TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')
       ); END;`,
      { especialidadId: Number(especialidadId), fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Citas por especialidad error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Citas por Estado
app.get('/api/citas/por-estado', authenticateToken, async (req, res) => {
  const { estadoCitaId, medicoId, fechaInicio, fechaFin } = req.query;
  if (!estadoCitaId || !fechaInicio || !fechaFin) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros' });
  }
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_CITAS_POR_ESTADO(
         :estadoCitaId, :medicoId, 
         TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')
       ); END;`,
      { 
        estadoCitaId: Number(estadoCitaId), 
        medicoId: medicoId ? Number(medicoId) : null,
        fechaInicio, 
        fechaFin 
      }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Citas por estado error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 5. REPORTES (PKG_REPORTES)
// ----------------------------------------------------

app.get('/api/reportes/citas-por-medico', authenticateToken, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Fechas requeridas' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_CITAS_POR_MEDICO(TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reportes/citas-por-especialidad', authenticateToken, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Fechas requeridas' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_CITAS_POR_ESPECIALIDAD(TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reportes/cancelaciones', authenticateToken, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Fechas requeridas' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_CANCELACIONES(TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reportes/cancelaciones-medico', authenticateToken, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Fechas requeridas' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_CANCEL_POR_MEDICO(TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reportes/cancelaciones-paciente', authenticateToken, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Fechas requeridas' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_CANCEL_POR_PACIENTE(TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reportes/pacientes-atendidos', authenticateToken, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Fechas requeridas' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_PACIENTES_ATENDIDOS(TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reportes/ocupacion-horaria', authenticateToken, async (req, res) => {
  const { medicoId, fechaInicio, fechaFin } = req.query;
  if (!medicoId || !fechaInicio || !fechaFin) return res.status(400).json({ success: false, message: 'Faltan parámetros' });
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_REPORTES.FN_RPT_OCUPACION_HORARIA(:medicoId, TO_DATE(:fechaInicio, 'YYYY-MM-DD'), TO_DATE(:fechaFin, 'YYYY-MM-DD')); END;`,
      { medicoId: Number(medicoId), fechaInicio, fechaFin }
    );
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 6. AUDITORÍA Y NOTIFICACIONES
// ----------------------------------------------------

app.get('/api/auditoria', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := SEG_CLINICA.PKG_SEGURIDAD.FN_LISTAR_AUDITORIA(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get auditoria error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/notificaciones', authenticateToken, async (req, res) => {
  try {
    const list = await executeWithCursor(
      `BEGIN :ret := APP_CLINICA.PKG_CONSULTAS.FN_LISTAR_NOTIFICACIONES(); END;`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get notificaciones error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/notificaciones/marcar-leida', authenticateToken, async (req, res) => {
  const { notificacionId } = req.body;
  try {
    await executeDb(
      `BEGIN APP_CLINICA.PKG_CONSULTAS.SP_MARCAR_NOTIF_LEIDA(:notificacionId); END;`,
      { notificacionId: Number(notificacionId) }
    );
    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Express APP
initializeDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Bridge API Server listening on port ${PORT}`);
  });
});
