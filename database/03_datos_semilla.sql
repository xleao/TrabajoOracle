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
-- Nota: La contraseña aquí es el HASH SHA-256 de "admin123" generado vía DBMS_CRYPTO.HASH(UTL_I18N.STRING_TO_RAW('admin123', 'AL32UTF8'), DBMS_CRYPTO.HASH_SH256)
-- Para este script semilla, insertaremos un valor raw de ejemplo. 
-- El HASH real SHA256 de 'admin123' es: 8C6976E5B5410415BDE908BD4DEE15DFB167A9C873FC4BB8A81F6F2AB448A918
INSERT INTO SEG_CLINICA.USUARIOS (
    USUARIO_ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, EMAIL, ROL_ID, MEDICO_ID
) VALUES (
    SEG_CLINICA.SEQ_USUARIOS.NEXTVAL,
    'admin',
    HEXTORAW('8C6976E5B5410415BDE908BD4DEE15DFB167A9C873FC4BB8A81F6F2AB448A918'),
    'Administrador del Sistema',
    'admin@saludyvida.com',
    1, -- ROL: ADMINISTRADOR
    NULL
);

COMMIT;
