-- ==============================================================================
-- SCRIPT 03: DATOS SEMILLA (INSERTS)
-- ==============================================================================
-- Cargar roles básicos, estados de cita, especialidades y usuario administrador.

-- 1. ROLES (SEG_CLINICA)
INSERT INTO SEG_CLINICA.ROLES (ROL_ID, NOMBRE, DESCRIPCION) VALUES (1, 'ADMINISTRADOR', 'Control total del sistema');
INSERT INTO SEG_CLINICA.ROLES (ROL_ID, NOMBRE, DESCRIPCION) VALUES (2, 'RECEPCIONISTA', 'Gestión de citas y pacientes');
INSERT INTO SEG_CLINICA.ROLES (ROL_ID, NOMBRE, DESCRIPCION) VALUES (3, 'MEDICO', 'Consulta exclusiva de agenda personal');

-- 2. ESTADOS DE CITA (APP_CLINICA)
INSERT INTO APP_CLINICA.ESTADOS_CITA (ESTADO_CITA_ID, NOMBRE, DESCRIPCION) VALUES (1, 'Pendiente', 'Cita agendada, esperando confirmación o asistencia.');
INSERT INTO APP_CLINICA.ESTADOS_CITA (ESTADO_CITA_ID, NOMBRE, DESCRIPCION) VALUES (2, 'Confirmada', 'El paciente confirmó su asistencia.');
INSERT INTO APP_CLINICA.ESTADOS_CITA (ESTADO_CITA_ID, NOMBRE, DESCRIPCION) VALUES (3, 'En Atención', 'El paciente está siendo atendido por el médico.');
INSERT INTO APP_CLINICA.ESTADOS_CITA (ESTADO_CITA_ID, NOMBRE, DESCRIPCION) VALUES (4, 'Atendida', 'La consulta ha finalizado.');
INSERT INTO APP_CLINICA.ESTADOS_CITA (ESTADO_CITA_ID, NOMBRE, DESCRIPCION) VALUES (5, 'Cancelada', 'Cita cancelada por paciente o médico.');

-- 3. ESPECIALIDADES BÁSICAS (APP_CLINICA)
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Medicina General', 'Atención médica primaria');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Pediatría', 'Atención de infantes y niños');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Traumatología', 'Lesiones del sistema locomotor');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Ginecología', 'Salud del sistema reproductor femenino');

-- Usuario del sistema para auditoría y operaciones automáticas (ID -1)
INSERT INTO SEG_CLINICA.USUARIOS (
    USUARIO_ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, EMAIL, ROL_ID, MEDICO_ID, ESTADO
) VALUES (
    -1,
    'system_audit',
    HEXTORAW('0000000000000000000000000000000000000000000000000000000000000000'),
    'Auditoría y Procesos del Sistema',
    'system@saludyvida.com',
    1, -- ADMINISTRADOR
    NULL,
    'A'
);

-- 4. USUARIO ADMINISTRADOR (SEG_CLINICA)
-- La contraseña se hashea con FN_HASH_PASSWORD para garantizar consistencia
-- con el algoritmo real de DBMS_CRYPTO instalado. Credenciales: admin / admin123
INSERT INTO SEG_CLINICA.USUARIOS (
    USUARIO_ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, EMAIL, ROL_ID, MEDICO_ID
) VALUES (
    SEG_CLINICA.SEQ_USUARIOS.NEXTVAL,
    'admin',
    SEG_CLINICA.PKG_SEGURIDAD.FN_HASH_PASSWORD('admin123'),
    'Administrador del Sistema',
    'admin@saludyvida.com',
    1, -- ROL: ADMINISTRADOR
    NULL
);

COMMIT;
