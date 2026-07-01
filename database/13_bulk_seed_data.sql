-- ==============================================================================
-- SCRIPT 13: CARGA MASIVA DE DATOS DE PRUEBA (BULK SEED DATA)
-- ==============================================================================
-- Este script realiza una limpieza de datos previos (excepto el Administrador con ID 1)
-- y genera un volumen alto de registros realistas de prueba:
--   - 12 Especialidades médicas
--   - 15 Médicos con sus respectivas cuentas de usuario y correos institucionales
--   - 2 Recepcionistas de turno con sus respectivas cuentas
--   - Horarios de atención (Lunes a Viernes, Mañana y Tarde) para cada médico (150 registros)
--   - 80 Pacientes con datos completos e independientes
--   - 400 Citas médicas distribuidas entre -30 y +30 días en diferentes estados (Pendiente,
--     Confirmada, En Atención, Atendida, Cancelada) con motivos realistas.
-- ==============================================================================

ALTER SESSION SET "_ORACLE_SCRIPT"=true;

-- 1. LIMPIEZA DE DATOS PREVIOS (Evita violación de llaves foráneas en cascada)
PROMPT [1/6] Iniciando limpieza de datos previos...
DELETE FROM APP_CLINICA.NOTIFICACIONES;
DELETE FROM APP_CLINICA.CITAS;
DELETE FROM APP_CLINICA.HORARIOS_MEDICO;
UPDATE SEG_CLINICA.USUARIOS SET MEDICO_ID = NULL;

-- Preservamos el usuario ADMIN_SISTEMA (ID 1)
DELETE FROM SEG_CLINICA.USUARIOS WHERE USUARIO_ID > 1;

DELETE FROM APP_CLINICA.MEDICOS;
DELETE FROM APP_CLINICA.PACIENTES;
DELETE FROM SEG_CLINICA.SESIONES;
DELETE FROM SEG_CLINICA.AUDITORIA;

-- Mantenemos las 4 básicas para recrear las demás en orden
DELETE FROM APP_CLINICA.ESPECIALIDADES WHERE ESPECIALIDAD_ID > 4;

-- 2. REINICIO DE SECUENCIAS
PROMPT [2/6] Reiniciando secuencias...
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE APP_CLINICA.SEQ_MEDICOS';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_CLINICA.SEQ_MEDICOS START WITH 1 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE APP_CLINICA.SEQ_PACIENTES';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_CLINICA.SEQ_PACIENTES START WITH 1 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE APP_CLINICA.SEQ_CITAS';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_CLINICA.SEQ_CITAS START WITH 1 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE APP_CLINICA.SEQ_NOTIFICACIONES';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_CLINICA.SEQ_NOTIFICACIONES START WITH 1 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE APP_CLINICA.SEQ_HORARIOS';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_CLINICA.SEQ_HORARIOS START WITH 1 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE SEG_CLINICA.SEQ_USUARIOS';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SEG_CLINICA.SEQ_USUARIOS START WITH 2 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE SEG_CLINICA.SEQ_AUDITORIA';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SEG_CLINICA.SEQ_AUDITORIA START WITH 1 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE APP_CLINICA.SEQ_ESPECIALIDADES';
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_CLINICA.SEQ_ESPECIALIDADES START WITH 5 INCREMENT BY 1';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- IMPORTANTE: Volver a otorgar privilegios sobre secuencias recreadas ya que al hacer DROP se eliminan
PROMPT Otorgando privilegios sobre las nuevas secuencias a APP_CLINICA...
GRANT SELECT ON SEG_CLINICA.SEQ_AUDITORIA TO APP_CLINICA;
GRANT SELECT ON SEG_CLINICA.SEQ_USUARIOS TO APP_CLINICA;

PROMPT Recompilando objetos dependientes para evitar errores de validación...
ALTER TRIGGER APP_CLINICA.TRG_AUDITORIA_CITAS COMPILE;
ALTER PACKAGE APP_CLINICA.PKG_ADMINISTRACION COMPILE BODY;
ALTER PACKAGE APP_CLINICA.PKG_VALOR COMPILE BODY;

-- 3. CARGAR ESPECIALIDADES ADICIONALES
PROMPT [3/6] Insertando especialidades adicionales...
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Cardiologia', 'Prevencion, diagnostico y tratamiento de enfermedades cardiovasculares');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Dermatologia', 'Tratamiento de afecciones de la piel, cabello y unas');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Oftalmologia', 'Salud ocular, agudeza visual y cirugias oftalmicas');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Neurologia', 'Diagnostico y tratamiento de trastornos del cerebro y sistema nervioso');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Gastroenterologia', 'Enfermedades del tracto digestivo y glandulas anexas');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Urologia', 'Aparato urinario y reproductor masculino, y sistema renal');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Odontologia', 'Salud bucal, prevencion de caries y tratamientos dentales');
INSERT INTO APP_CLINICA.ESPECIALIDADES (ESPECIALIDAD_ID, NOMBRE, DESCRIPCION) VALUES (APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL, 'Psiquiatria', 'Salud mental, trastornos emocionales y del comportamiento');

-- 4. PL/SQL ANÓNIMO PARA GENERACIÓN MASIVA DINÁMICA
PROMPT [4/6] Iniciando generación de médicos, horarios, pacientes y citas (esto puede tardar unos segundos)...
DECLARE
    -- Arreglos para datos aleatorios
    TYPE t_arr IS TABLE OF VARCHAR2(100);
    v_nombres_m t_arr := t_arr('Juan', 'Carlos', 'Jose', 'Luis', 'Pedro', 'Manuel', 'Jorge', 'Francisco', 'David', 'Miguel', 'Angel', 'Alejandro', 'Roberto', 'Daniel', 'Javier', 'Julio', 'Cesar', 'Victor', 'Hugo', 'Walter', 'Ricardo', 'Fernando', 'Alberto', 'Guillermo', 'Enrique', 'Raul', 'Arturo', 'Oscar');
    v_nombres_f t_arr := t_arr('Maria', 'Ana', 'Luisa', 'Carmen', 'Rosa', 'Lucia', 'Juana', 'Teresa', 'Sofia', 'Elena', 'Patricia', 'Isabel', 'Valeria', 'Monica', 'Gabriela', 'Silvia', 'Laura', 'Beatriz', 'Julia', 'Sandra', 'Diana', 'Cecilia', 'Beatriz', 'Vanessa', 'Roxana', 'Alicia');
    v_apellidos t_arr := t_arr('Garcia', 'Martinez', 'Rodriguez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Gomez', 'Flores', 'Diaz', 'Cruz', 'Morales', 'Reyes', 'Ramos', 'Ruiz', 'Torres', 'Mendoza', 'Delgado', 'Castro', 'Ortiz', 'Silva', 'Guzman', 'Rivas', 'Rojas', 'Salazar', 'Benitez', 'Vargas', 'Alvarez', 'Jimenez', 'Castillo', 'Campos', 'Guerrero', 'Soto', 'Medina', 'Pena', 'Flores');

    v_nom VARCHAR2(100);
    v_ape VARCHAR2(100);
    v_dni VARCHAR2(15);
    v_tel VARCHAR2(15);
    v_email VARCHAR2(100);
    v_dir VARCHAR2(200);
    v_especialidad_id NUMBER;
    v_medico_id NUMBER;
    v_paciente_id NUMBER;
    v_usuario_id NUMBER;
    v_username VARCHAR2(50);
    v_fecha_nac DATE;
    
    v_total_medicos NUMBER := 15;
    v_total_pacientes NUMBER := 80;
    v_total_citas NUMBER := 400;
    
    -- Bloques horarios definidos
    TYPE t_slots IS TABLE OF VARCHAR2(5);
    v_slots_m t_slots := t_slots('08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30');
    v_slots_a t_slots := t_slots('14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30');
    
    v_fecha DATE;
    v_day VARCHAR2(3);
    v_hora_ini VARCHAR2(5);
    v_hora_fin VARCHAR2(5);
    v_estado_cita NUMBER;
    v_motivo VARCHAR2(200);
    v_slot_idx NUMBER;
    v_rand_val NUMBER;
BEGIN
    -- Desactivamos temporalmente el trigger que impide empates de citas para poder poblar
    -- masivamente sin preocuparnos por colisiones aleatorias de horarios en la generación.
    EXECUTE IMMEDIATE 'ALTER TRIGGER APP_CLINICA.TRG_IMPEDIR_EMPATE_CITA DISABLE';
    
    -- 1. REGISTRO DE 15 MÉDICOS, SUS USUARIOS Y SUS JORNADAS SEMANALES
    FOR i IN 1..v_total_medicos LOOP
        -- Nombre aleatorio basado en género
        IF MOD(i, 2) = 0 THEN
            v_nom := v_nombres_f(TRUNC(DBMS_RANDOM.VALUE(1, v_nombres_f.COUNT + 1)));
        ELSE
            v_nom := v_nombres_m(TRUNC(DBMS_RANDOM.VALUE(1, v_nombres_m.COUNT + 1)));
        END IF;
        
        -- Dos apellidos aleatorios
        v_ape := v_apellidos(TRUNC(DBMS_RANDOM.VALUE(1, v_apellidos.COUNT + 1))) || ' ' || 
                 v_apellidos(TRUNC(DBMS_RANDOM.VALUE(1, v_apellidos.COUNT + 1)));
        
        -- Asignar especialidad secuencial (1 al 12)
        v_especialidad_id := MOD(i - 1, 12) + 1;
        
        v_dni := LPAD(TRUNC(DBMS_RANDOM.VALUE(40000000, 49999999)), 8, '0');
        v_tel := '9' || LPAD(TRUNC(DBMS_RANDOM.VALUE(10000000, 99999999)), 8, '0');
        v_email := LOWER(REPLACE(v_nom, ' ', '')) || '.' || LOWER(REPLACE(SUBSTR(v_ape, 1, INSTR(v_ape, ' ') - 1), ' ', '')) || '@clinicasaludyvida.com';
        
        v_medico_id := APP_CLINICA.SEQ_MEDICOS.NEXTVAL;
        
        -- Insertar Médico
        INSERT INTO APP_CLINICA.MEDICOS (MEDICO_ID, NOMBRES, APELLIDOS, NRO_COLEGIATURA, ESPECIALIDAD_ID, TELEFONO, EMAIL, ESTADO)
        VALUES (v_medico_id, v_nom, v_ape, 'CMP-' || (50000 + i), v_especialidad_id, v_tel, v_email, 'A');
        
        -- Crear Cuenta de Usuario para el Médico (Clave por defecto: Medico123*)
        v_username := 'medico' || v_medico_id;
        v_usuario_id := SEG_CLINICA.SEQ_USUARIOS.NEXTVAL;
        
        INSERT INTO SEG_CLINICA.USUARIOS (USUARIO_ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, EMAIL, ROL_ID, MEDICO_ID, ESTADO)
        VALUES (
            v_usuario_id,
            v_username,
            SEG_CLINICA.PKG_SEGURIDAD.FN_HASH_PASSWORD('Medico123*'),
            'Dr(a). ' || v_nom || ' ' || v_ape,
            v_email,
            3, -- ROL_ID 3: MEDICO
            v_medico_id,
            'A'
        );
        
        -- Generar Horarios de Atención (Lunes a Viernes, dia_semana 2 al 6 en NLS estándar)
        FOR d IN 2..6 LOOP
            -- Turno mañana (08:00 a 12:00)
            INSERT INTO APP_CLINICA.HORARIOS_MEDICO (HORARIO_ID, MEDICO_ID, DIA_SEMANA, HORA_INICIO, HORA_FIN, DURACION_CITA_MIN, ESTADO)
            VALUES (APP_CLINICA.SEQ_HORARIOS.NEXTVAL, v_medico_id, d, '08:00', '12:00', 30, 'A');
            
            -- Turno tarde (14:00 a 18:00)
            INSERT INTO APP_CLINICA.HORARIOS_MEDICO (HORARIO_ID, MEDICO_ID, DIA_SEMANA, HORA_INICIO, HORA_FIN, DURACION_CITA_MIN, ESTADO)
            VALUES (APP_CLINICA.SEQ_HORARIOS.NEXTVAL, v_medico_id, d, '14:00', '18:00', 30, 'A');
        END LOOP;
    END LOOP;

    -- 2. REGISTRO DE 2 RECEPCIONISTAS (Clave por defecto: Recep123*)
    FOR r IN 1..2 LOOP
        v_usuario_id := SEG_CLINICA.SEQ_USUARIOS.NEXTVAL;
        INSERT INTO SEG_CLINICA.USUARIOS (USUARIO_ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, EMAIL, ROL_ID, MEDICO_ID, ESTADO)
        VALUES (
            v_usuario_id,
            'recep' || r,
            SEG_CLINICA.PKG_SEGURIDAD.FN_HASH_PASSWORD('Recep123*'),
            'Recepcionista Personal ' || r,
            'recepcion' || r || '@clinicasaludyvida.com',
            2, -- ROL_ID 2: RECEPCIONISTA
            NULL,
            'A'
        );
    END LOOP;

    -- 3. REGISTRO DE 80 PACIENTES
    FOR j IN 1..v_total_pacientes LOOP
        IF MOD(j, 2) = 0 THEN
            v_nom := v_nombres_f(TRUNC(DBMS_RANDOM.VALUE(1, v_nombres_f.COUNT + 1)));
        ELSE
            v_nom := v_nombres_m(TRUNC(DBMS_RANDOM.VALUE(1, v_nombres_m.COUNT + 1)));
        END IF;
        
        v_ape := v_apellidos(TRUNC(DBMS_RANDOM.VALUE(1, v_apellidos.COUNT + 1))) || ' ' || 
                 v_apellidos(TRUNC(DBMS_RANDOM.VALUE(1, v_apellidos.COUNT + 1)));
        
        v_dni := LPAD(TRUNC(DBMS_RANDOM.VALUE(10000000, 79999999)), 8, '0');
        v_tel := '9' || LPAD(TRUNC(DBMS_RANDOM.VALUE(10000000, 99999999)), 8, '0');
        v_email := LOWER(REPLACE(v_nom, ' ', '')) || '.' || LOWER(REPLACE(SUBSTR(v_ape, 1, INSTR(v_ape, ' ') - 1), ' ', '')) || '@gmail.com';
        v_dir := 'Av. ' || v_apellidos(TRUNC(DBMS_RANDOM.VALUE(1, v_apellidos.COUNT + 1))) || ' Nro. ' || TRUNC(DBMS_RANDOM.VALUE(100, 999)) || ', Lima';
        
        -- Fecha nacimiento aleatoria (entre 10 y 75 años de edad)
        v_fecha_nac := SYSDATE - (365 * DBMS_RANDOM.VALUE(10, 75));
        
        INSERT INTO APP_CLINICA.PACIENTES (PACIENTE_ID, NOMBRES, APELLIDOS, DNI, FECHA_NACIMIENTO, TELEFONO, EMAIL, DIRECCION, ESTADO)
        VALUES (APP_CLINICA.SEQ_PACIENTES.NEXTVAL, v_nom, v_ape, v_dni, v_fecha_nac, v_tel, v_email, v_dir, 'A');
    END LOOP;

    -- 4. REGISTRO DE 400 CITAS MÉDICAS DISTRIBUIDAS
    FOR k IN 1..v_total_citas LOOP
        v_paciente_id := TRUNC(DBMS_RANDOM.VALUE(1, v_total_pacientes + 1));
        v_medico_id := TRUNC(DBMS_RANDOM.VALUE(1, v_total_medicos + 1));
        
        -- Obtener especialidad del médico
        SELECT ESPECIALIDAD_ID INTO v_especialidad_id FROM APP_CLINICA.MEDICOS WHERE MEDICO_ID = v_medico_id;
        
        -- Fecha aleatoria entre -30 días y +30 días
        v_fecha := TRUNC(SYSDATE + DBMS_RANDOM.VALUE(-30, 30));
        
        -- Asegurar que la cita sea de Lunes a Viernes (NLS-independiente)
        v_day := TO_CHAR(v_fecha, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH');
        IF v_day = 'SAT' THEN
            v_fecha := v_fecha + 2;
        ELSIF v_day = 'SUN' THEN
            v_fecha := v_fecha + 1;
        END IF;
        
        -- Seleccionar turno y hora de forma aleatoria
        v_rand_val := DBMS_RANDOM.VALUE(0, 1);
        IF v_rand_val < 0.5 THEN
            -- Mañana
            v_slot_idx := TRUNC(DBMS_RANDOM.VALUE(1, v_slots_m.COUNT + 1));
            v_hora_ini := v_slots_m(v_slot_idx);
            IF SUBSTR(v_hora_ini, 4, 2) = '00' THEN
                v_hora_fin := SUBSTR(v_hora_ini, 1, 2) || ':30';
            ELSE
                v_hora_fin := LPAD(TO_CHAR(TO_NUMBER(SUBSTR(v_hora_ini, 1, 2)) + 1), 2, '0') || ':00';
            END IF;
        ELSE
            -- Tarde
            v_slot_idx := TRUNC(DBMS_RANDOM.VALUE(1, v_slots_a.COUNT + 1));
            v_hora_ini := v_slots_a(v_slot_idx);
            IF SUBSTR(v_hora_ini, 4, 2) = '00' THEN
                v_hora_fin := SUBSTR(v_hora_ini, 1, 2) || ':30';
            ELSE
                v_hora_fin := LPAD(TO_CHAR(TO_NUMBER(SUBSTR(v_hora_ini, 1, 2)) + 1), 2, '0') || ':00';
            END IF;
        END IF;

        -- Motivos realistas de consulta
        CASE TRUNC(DBMS_RANDOM.VALUE(1, 6))
            WHEN 1 THEN v_motivo := 'Chequeo general preventivo anual';
            WHEN 2 THEN v_motivo := 'Dolor abdominal recurrente y náuseas';
            WHEN 3 THEN v_motivo := 'Control de hipertensión y reajuste de dosis';
            WHEN 4 THEN v_motivo := 'Lectura y análisis de exámenes auxiliares';
            ELSE v_motivo := 'Síntomas de resfriado severo, dolor de garganta y malestar general';
        END CASE;

        -- Lógica de estado según fecha
        IF v_fecha < TRUNC(SYSDATE) THEN
            -- Pasado: Atendida (4) o Cancelada (5)
            IF DBMS_RANDOM.VALUE(0, 1) < 0.88 THEN
                v_estado_cita := 4; -- Atendida
            ELSE
                v_estado_cita := 5; -- Cancelada
            END IF;
        ELSIF v_fecha = TRUNC(SYSDATE) THEN
            -- Hoy: mezcla de estados
            v_rand_val := DBMS_RANDOM.VALUE(0, 1);
            IF v_rand_val < 0.25 THEN v_estado_cita := 1; -- Pendiente
            ELSIF v_rand_val < 0.55 THEN v_estado_cita := 2; -- Confirmada
            ELSIF v_rand_val < 0.75 THEN v_estado_cita := 3; -- En Atención
            ELSIF v_rand_val < 0.90 THEN v_estado_cita := 4; -- Atendida
            ELSE v_estado_cita := 5; -- Cancelada
            END IF;
        ELSE
            -- Futuro: Pendiente (1), Confirmada (2) o Cancelada (5)
            v_rand_val := DBMS_RANDOM.VALUE(0, 1);
            IF v_rand_val < 0.55 THEN v_estado_cita := 1; -- Pendiente
            ELSIF v_rand_val < 0.92 THEN v_estado_cita := 2; -- Confirmada
            ELSE v_estado_cita := 5; -- Cancelada
            END IF;
        END IF;
        
        -- Asignar motivo de cancelación si corresponde
        DECLARE
            v_motivo_can VARCHAR2(200) := NULL;
        BEGIN
            IF v_estado_cita = 5 THEN
                v_motivo_can := 'El paciente canceló su asistencia por cruce de horarios laborales.';
            END IF;
            
            INSERT INTO APP_CLINICA.CITAS (CITA_ID, PACIENTE_ID, MEDICO_ID, ESPECIALIDAD_ID, FECHA_CITA, HORA_INICIO, HORA_FIN, ESTADO_CITA_ID, MOTIVO_CONSULTA, MOTIVO_CANCELACION, USUARIO_CREACION)
            VALUES (APP_CLINICA.SEQ_CITAS.NEXTVAL, v_paciente_id, v_medico_id, v_especialidad_id, v_fecha, v_hora_ini, v_hora_fin, v_estado_cita, v_motivo, v_motivo_can, 1);
        END;
    END LOOP;

    -- Reactivamos el trigger para mantener la integridad en futuras operaciones del sistema
    EXECUTE IMMEDIATE 'ALTER TRIGGER APP_CLINICA.TRG_IMPEDIR_EMPATE_CITA ENABLE';
    
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Carga masiva de datos completada exitosamente.');
EXCEPTION
    WHEN OTHERS THEN
        EXECUTE IMMEDIATE 'ALTER TRIGGER APP_CLINICA.TRG_IMPEDIR_EMPATE_CITA ENABLE';
        ROLLBACK;
        RAISE;
END;
/

-- 5. AGREGAR ALGUNAS NOTIFICACIONES DE PRUEBA
PROMPT [5/6] Creando notificaciones iniciales...
INSERT INTO APP_CLINICA.NOTIFICACIONES (NOTIFICACION_ID, CITA_ID, PACIENTE_ID, TIPO, MENSAJE, LEIDA)
SELECT APP_CLINICA.SEQ_NOTIFICACIONES.NEXTVAL, CITA_ID, PACIENTE_ID, 'RECORDATORIO', UTL_RAW.CAST_TO_VARCHAR2(HEXTORAW('4c65207265636f7264616d6f7320717565207469656e6520756e612063697461206dc3a9646963612070726f6772616d61646120656e206c6173207072c3b378696d617320323420686f7261732e')), 'N'
FROM APP_CLINICA.CITAS
WHERE ESTADO_CITA_ID = 2 AND FECHA_CITA > SYSDATE AND ROWNUM <= 15;

COMMIT;

-- 6. VERIFICACIÓN DE TOTALES
PROMPT [6/6] VERIFICACIÓN DE REGISTROS INSERTADOS:
SELECT 'Especialidades' AS Tabla, COUNT(1) AS Cantidad FROM APP_CLINICA.ESPECIALIDADES
UNION ALL
SELECT 'Médicos' AS Tabla, COUNT(1) AS Cantidad FROM APP_CLINICA.MEDICOS
UNION ALL
SELECT 'Horarios Médicos' AS Tabla, COUNT(1) AS Cantidad FROM APP_CLINICA.HORARIOS_MEDICO
UNION ALL
SELECT 'Pacientes' AS Tabla, COUNT(1) AS Cantidad FROM APP_CLINICA.PACIENTES
UNION ALL
SELECT 'Citas' AS Tabla, COUNT(1) AS Cantidad FROM APP_CLINICA.CITAS
UNION ALL
SELECT 'Usuarios del Sistema' AS Tabla, COUNT(1) AS Cantidad FROM SEG_CLINICA.USUARIOS
UNION ALL
SELECT 'Notificaciones' AS Tabla, COUNT(1) AS Cantidad FROM APP_CLINICA.NOTIFICACIONES;

PROMPT Carga masiva completada con éxito.
EXIT;
