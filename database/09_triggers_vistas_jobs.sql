-- ==============================================================================
-- SCRIPT 09: TRIGGERS, VISTAS Y JOBS (CONSOLIDADO)
-- ==============================================================================

-- ==============================================================================
-- 1. DISPARADORES / TRIGGERS (5 Requeridos)
-- ==============================================================================

-- TRG_FECHA_MODIFICACION: Actualiza FECHA_MODIFICACION en CITAS antes de cualquier UPDATE
CREATE OR REPLACE TRIGGER APP_CLINICA.TRG_FECHA_MODIFICACION
BEFORE UPDATE ON APP_CLINICA.CITAS
FOR EACH ROW
BEGIN
    :NEW.FECHA_MODIFICACION := SYSTIMESTAMP;
END;
/

-- TRG_SEQ_CITA_ID: Asigna automáticamente el ID de cita desde su secuencia al insertar
CREATE OR REPLACE TRIGGER APP_CLINICA.TRG_SEQ_CITA_ID
BEFORE INSERT ON APP_CLINICA.CITAS
FOR EACH ROW
BEGIN
    IF :NEW.CITA_ID IS NULL THEN
        :NEW.CITA_ID := APP_CLINICA.SEQ_CITAS.NEXTVAL;
    END IF;
END;
/

-- TRG_IMPEDIR_EMPATE_CITA: Evita traslape de citas para el mismo médico
CREATE OR REPLACE TRIGGER APP_CLINICA.TRG_IMPEDIR_EMPATE_CITA
FOR INSERT OR UPDATE ON APP_CLINICA.CITAS
COMPOUND TRIGGER

    TYPE t_cita_rec IS RECORD (
        medico_id NUMBER,
        fecha_cita DATE,
        hora_inicio VARCHAR2(5),
        hora_fin VARCHAR2(5),
        estado_cita_id NUMBER
    );
    TYPE t_citas_tab IS TABLE OF t_cita_rec INDEX BY PLS_INTEGER;
    v_citas t_citas_tab;
    v_idx PLS_INTEGER := 0;

    BEFORE STATEMENT IS
    BEGIN
        v_idx := 0;
        v_citas.DELETE;
    END BEFORE STATEMENT;

    BEFORE EACH ROW IS
    BEGIN
        -- Solo verificar si es una cita activa (Pendiente = 1 o Confirmada = 2)
        IF :NEW.ESTADO_CITA_ID IN (1, 2) THEN
            v_idx := v_idx + 1;
            v_citas(v_idx).medico_id := :NEW.MEDICO_ID;
            v_citas(v_idx).fecha_cita := :NEW.FECHA_CITA;
            v_citas(v_idx).hora_inicio := :NEW.HORA_INICIO;
            v_citas(v_idx).hora_fin := :NEW.HORA_FIN;
            v_citas(v_idx).estado_cita_id := :NEW.ESTADO_CITA_ID;
        END IF;
    END BEFORE EACH ROW;

    AFTER STATEMENT IS
        v_count NUMBER;
    BEGIN
        FOR i IN 1 .. v_idx LOOP
            -- Al estar en AFTER STATEMENT, la tabla CITAS ya no muta
            SELECT COUNT(1) INTO v_count
            FROM APP_CLINICA.CITAS
            WHERE MEDICO_ID = v_citas(i).medico_id
              AND FECHA_CITA = v_citas(i).fecha_cita
              AND ESTADO_CITA_ID IN (1, 2)
              AND (
                    (v_citas(i).hora_inicio >= HORA_INICIO AND v_citas(i).hora_inicio < HORA_FIN) OR
                    (v_citas(i).hora_fin > HORA_INICIO AND v_citas(i).hora_fin <= HORA_FIN) OR
                    (v_citas(i).hora_inicio <= HORA_INICIO AND v_citas(i).hora_fin >= HORA_FIN)
                  );
            
            -- Puesto que el registro ya fue insertado/actualizado, 
            -- v_count será al menos 1 (la propia cita). Si es mayor a 1, hay empalme.
            IF v_count > 1 THEN
                RAISE_APPLICATION_ERROR(-20002, 'Violación de integridad: El médico ya tiene una cita reservada en ese horario.');
            END IF;
        END LOOP;
    END AFTER STATEMENT;
END TRG_IMPEDIR_EMPATE_CITA;
/

-- TRG_AUDITORIA_CITAS: Registra en SEG_CLINICA.AUDITORIA cada inserción/cambio/eliminación de cita
CREATE OR REPLACE TRIGGER APP_CLINICA.TRG_AUDITORIA_CITAS
AFTER INSERT OR UPDATE OR DELETE ON APP_CLINICA.CITAS
FOR EACH ROW
DECLARE
    v_operacion VARCHAR2(10);
    v_antes CLOB;
    v_despues CLOB;
    v_registro_id NUMBER;
    v_usuario NUMBER;
BEGIN
    IF INSERTING THEN 
        v_operacion := 'INSERT'; 
        v_registro_id := :NEW.CITA_ID; 
        v_usuario := :NEW.USUARIO_CREACION;
    ELSIF UPDATING THEN 
        v_operacion := 'UPDATE'; 
        v_registro_id := :OLD.CITA_ID; 
        v_usuario := :NEW.USUARIO_CREACION;
    ELSE 
        v_operacion := 'DELETE'; 
        v_registro_id := :OLD.CITA_ID; 
        v_usuario := -1;
    END IF;

    IF UPDATING OR DELETING THEN
        v_antes := '{"paciente_id": ' || :OLD.PACIENTE_ID || ', "estado": ' || :OLD.ESTADO_CITA_ID || '}';
    END IF;
    
    IF INSERTING OR UPDATING THEN
        v_despues := '{"paciente_id": ' || :NEW.PACIENTE_ID || ', "estado": ' || :NEW.ESTADO_CITA_ID || '}';
    END IF;

    -- Llamada al paquete de seguridad (Requerimiento SEG05 encapsulado)
    SEG_CLINICA.PKG_SEGURIDAD.SP_REGISTRAR_AUDITORIA(
        p_usuario_id => v_usuario,
        p_tabla => 'CITAS',
        p_operacion => v_operacion,
        p_datos_antes => v_antes,
        p_datos_despues => v_despues
    );
END;
/

-- TRG_AUDITORIA_PACIENTES: Registra en SEG_CLINICA.AUDITORIA operaciones sobre pacientes
CREATE OR REPLACE TRIGGER APP_CLINICA.TRG_AUDITORIA_PACIENTES
AFTER INSERT OR UPDATE OR DELETE ON APP_CLINICA.PACIENTES
FOR EACH ROW
DECLARE
    v_operacion VARCHAR2(10);
    v_antes CLOB;
    v_despues CLOB;
    v_registro_id NUMBER;
BEGIN
    IF INSERTING THEN
        v_operacion := 'INSERT';
        v_registro_id := :NEW.PACIENTE_ID;
    ELSIF UPDATING THEN
        v_operacion := 'UPDATE';
        v_registro_id := :OLD.PACIENTE_ID;
    ELSE
        v_operacion := 'DELETE';
        v_registro_id := :OLD.PACIENTE_ID;
    END IF;

    IF UPDATING OR DELETING THEN
        v_antes := '{"paciente_id": ' || :OLD.PACIENTE_ID 
                || ', "dni": "' || :OLD.DNI 
                || '", "nombres": "' || :OLD.NOMBRES 
                || '", "apellidos": "' || :OLD.APELLIDOS 
                || '", "telefono": "' || :OLD.TELEFONO 
                || '", "estado": "' || :OLD.ESTADO || '"}';
    END IF;

    IF INSERTING OR UPDATING THEN
        v_despues := '{"paciente_id": ' || :NEW.PACIENTE_ID 
                  || ', "dni": "' || :NEW.DNI 
                  || '", "nombres": "' || :NEW.NOMBRES 
                  || '", "apellidos": "' || :NEW.APELLIDOS 
                  || '", "telefono": "' || :NEW.TELEFONO 
                  || '", "estado": "' || :NEW.ESTADO || '"}';
    END IF;

    -- Llamada al paquete de seguridad (Requerimiento SEG05 encapsulado)
    SEG_CLINICA.PKG_SEGURIDAD.SP_REGISTRAR_AUDITORIA(
        p_usuario_id => -1,
        p_tabla => 'PACIENTES',
        p_operacion => v_operacion,
        p_datos_antes => v_antes,
        p_datos_despues => v_despues
    );
END;
/


-- ==============================================================================
-- 3. VISTAS (5 Requeridas)
-- ==============================================================================

-- VW_AGENDA_DIARIA: Reporte legible de la agenda general de citas
CREATE OR REPLACE VIEW APP_CLINICA.VW_AGENDA_DIARIA AS
SELECT c.FECHA_CITA, c.HORA_INICIO, c.HORA_FIN, 
       p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
       m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
       e.NOMBRE AS ESTADO_CITA
FROM APP_CLINICA.CITAS c
JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
JOIN APP_CLINICA.ESTADOS_CITA e ON c.ESTADO_CITA_ID = e.ESTADO_CITA_ID;

-- VW_USUARIOS_ACTIVOS: Listado de usuarios activos excluyendo contraseñas y hashes
CREATE OR REPLACE VIEW SEG_CLINICA.VW_USUARIOS_ACTIVOS AS
SELECT u.USUARIO_ID, u.USERNAME, u.NOMBRE_COMPLETO, u.EMAIL, r.NOMBRE AS ROL, u.ESTADO
FROM SEG_CLINICA.USUARIOS u
JOIN SEG_CLINICA.ROLES r ON u.ROL_ID = r.ROL_ID;

-- VW_DISPONIBILIDAD_MEDICO: Muestra horarios y especialidades de médicos activos
CREATE OR REPLACE VIEW APP_CLINICA.VW_DISPONIBILIDAD_MEDICO AS
SELECT 
    h.MEDICO_ID,
    m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
    e.NOMBRE AS ESPECIALIDAD,
    h.DIA_SEMANA,
    CASE h.DIA_SEMANA
        WHEN 1 THEN 'Domingo'
        WHEN 2 THEN 'Lunes'
        WHEN 3 THEN 'Martes'
        WHEN 4 THEN 'Miercoles'
        WHEN 5 THEN 'Jueves'
        WHEN 6 THEN 'Viernes'
        WHEN 7 THEN 'Sabado'
    END AS DIA_NOMBRE,
    h.HORA_INICIO,
    h.HORA_FIN,
    h.DURACION_CITA_MIN,
    h.ESTADO AS HORARIO_ESTADO
FROM APP_CLINICA.HORARIOS_MEDICO h
JOIN APP_CLINICA.MEDICOS m ON h.MEDICO_ID = m.MEDICO_ID
JOIN APP_CLINICA.ESPECIALIDADES e ON m.ESPECIALIDAD_ID = e.ESPECIALIDAD_ID
WHERE h.ESTADO = 'A' AND m.ESTADO = 'A';

-- VW_HISTORIAL_PACIENTE: Historial unificado de citas clínicas
CREATE OR REPLACE VIEW APP_CLINICA.VW_HISTORIAL_PACIENTE AS
SELECT 
    c.CITA_ID,
    c.PACIENTE_ID,
    p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
    p.DNI,
    c.FECHA_CITA,
    c.HORA_INICIO,
    c.HORA_FIN,
    m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
    esp.NOMBRE AS ESPECIALIDAD,
    ec.NOMBRE AS ESTADO_CITA,
    c.MOTIVO_CONSULTA,
    c.OBSERVACIONES,
    c.FECHA_CREACION
FROM APP_CLINICA.CITAS c
JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
JOIN APP_CLINICA.ESPECIALIDADES esp ON c.ESPECIALIDAD_ID = esp.ESPECIALIDAD_ID
JOIN APP_CLINICA.ESTADOS_CITA ec ON c.ESTADO_CITA_ID = ec.ESTADO_CITA_ID
ORDER BY c.FECHA_CITA DESC, c.HORA_INICIO DESC;

-- VW_RESUMEN_CITAS: Consolidado de citas agrupado por médico, especialidad y estado
CREATE OR REPLACE VIEW APP_CLINICA.VW_RESUMEN_CITAS AS
SELECT 
    m.MEDICO_ID,
    m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
    esp.NOMBRE AS ESPECIALIDAD,
    ec.NOMBRE AS ESTADO_CITA,
    COUNT(*) AS TOTAL_CITAS,
    MIN(c.FECHA_CITA) AS PRIMERA_CITA,
    MAX(c.FECHA_CITA) AS ULTIMA_CITA
FROM APP_CLINICA.CITAS c
JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
JOIN APP_CLINICA.ESPECIALIDADES esp ON c.ESPECIALIDAD_ID = esp.ESPECIALIDAD_ID
JOIN APP_CLINICA.ESTADOS_CITA ec ON c.ESTADO_CITA_ID = ec.ESTADO_CITA_ID
GROUP BY m.MEDICO_ID, m.NOMBRES, m.APELLIDOS, esp.NOMBRE, ec.NOMBRE;


-- ==============================================================================
-- 4. TAREAS PROGRAMADAS / JOBS (2 Requeridos)
-- ==============================================================================

-- JOB_RECORDATORIOS_24H: Notifica a los pacientes con cita en las siguientes 24 horas
BEGIN
    BEGIN
        DBMS_SCHEDULER.drop_job(job_name => 'APP_CLINICA.JOB_RECORDATORIOS_24H', force => TRUE);
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

    DBMS_SCHEDULER.create_job (
        job_name        => 'APP_CLINICA.JOB_RECORDATORIOS_24H',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN APP_CLINICA.PKG_VALOR.SP_PROCESAR_RECORDATORIOS; END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'freq=hourly', -- Cada 1 hora
        enabled         => TRUE
    );
END;
/

-- JOB_EXPIRAR_SESIONES: Expira automáticamente sesiones inactivas pasadas su fecha de expiración
BEGIN
    BEGIN
        DBMS_SCHEDULER.drop_job(job_name => 'SEG_CLINICA.JOB_EXPIRAR_SESIONES', force => TRUE);
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

    DBMS_SCHEDULER.create_job (
        job_name        => 'SEG_CLINICA.JOB_EXPIRAR_SESIONES',
        job_type        => 'PLSQL_BLOCK',
        job_action      => '
            BEGIN
                UPDATE SEG_CLINICA.SESIONES 
                SET ESTADO = ''E'' 
                WHERE ESTADO = ''A'' 
                  AND FECHA_EXPIRACION < SYSTIMESTAMP;
                COMMIT;
            END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'freq=minutely;interval=30', -- Cada 30 minutos
        enabled         => TRUE
    );
END;
/

COMMIT;
