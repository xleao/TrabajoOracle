-- ==============================================================================
-- SCRIPT 06: PAQUETE PKG_VALOR (ESPECIFICACIÓN Y CUERPO)
-- ==============================================================================

CREATE OR REPLACE PACKAGE APP_CLINICA.PKG_VALOR AS
    FUNCTION FN_VERIFICAR_DISPONIBILIDAD(
        p_medico_id IN NUMBER, p_fecha IN DATE, p_hora_inicio IN VARCHAR2, p_hora_fin IN VARCHAR2
    ) RETURN NUMBER;

    PROCEDURE SP_AGENDAR_CITA(
        p_paciente_id IN NUMBER, p_medico_id IN NUMBER, p_especialidad_id IN NUMBER,
        p_fecha_cita IN DATE, p_hora_inicio IN VARCHAR2, p_hora_fin IN VARCHAR2,
        p_motivo_consulta IN VARCHAR2, p_usuario_creacion IN NUMBER, p_cita_id OUT NUMBER
    );

    PROCEDURE SP_CANCELAR_CITA(
        p_cita_id IN NUMBER, p_motivo_cancelacion IN VARCHAR2, p_usuario_modificacion IN NUMBER
    );

    PROCEDURE SP_REPROGRAMAR_CITA(
        p_cita_id IN NUMBER, p_nueva_fecha IN DATE, p_nueva_hora_inicio IN VARCHAR2,
        p_nueva_hora_fin IN VARCHAR2, p_usuario_modificacion IN NUMBER, p_nueva_cita_id OUT NUMBER
    );

    PROCEDURE SP_PROCESAR_RECORDATORIOS;
END PKG_VALOR;
/

CREATE OR REPLACE PACKAGE BODY APP_CLINICA.PKG_VALOR AS

    FUNCTION FN_VERIFICAR_DISPONIBILIDAD(
        p_medico_id IN NUMBER, p_fecha IN DATE, p_hora_inicio IN VARCHAR2, p_hora_fin IN VARCHAR2
    ) RETURN NUMBER IS
        v_count NUMBER;
    BEGIN
        -- Verifica si ya existe una cita en estado pendiente (1) o confirmada (2) que se traslape en horario
        SELECT COUNT(1) INTO v_count
        FROM APP_CLINICA.CITAS
        WHERE MEDICO_ID = p_medico_id
          AND FECHA_CITA = p_fecha
          AND ESTADO_CITA_ID IN (1, 2)
          AND (
                (p_hora_inicio >= HORA_INICIO AND p_hora_inicio < HORA_FIN) OR
                (p_hora_fin > HORA_INICIO AND p_hora_fin <= HORA_FIN) OR
                (p_hora_inicio <= HORA_INICIO AND p_hora_fin >= HORA_FIN)
              );
              
        IF v_count > 0 THEN RETURN 0; ELSE RETURN 1; END IF;
    END FN_VERIFICAR_DISPONIBILIDAD;

    PROCEDURE SP_AGENDAR_CITA(
        p_paciente_id IN NUMBER, p_medico_id IN NUMBER, p_especialidad_id IN NUMBER,
        p_fecha_cita IN DATE, p_hora_inicio IN VARCHAR2, p_hora_fin IN VARCHAR2,
        p_motivo_consulta IN VARCHAR2, p_usuario_creacion IN NUMBER, p_cita_id OUT NUMBER
    ) IS
        v_disponible NUMBER;
        v_dummy NUMBER;
    BEGIN
        -- Bloqueo explícito para evitar condiciones de carrera (empates)
        -- a nivel de aplicación (respaldo del trigger)
        SELECT 1 INTO v_dummy FROM APP_CLINICA.MEDICOS WHERE MEDICO_ID = p_medico_id FOR UPDATE NOWAIT;
        
        v_disponible := FN_VERIFICAR_DISPONIBILIDAD(p_medico_id, p_fecha_cita, p_hora_inicio, p_hora_fin);
        
        IF v_disponible = 0 THEN
            RAISE_APPLICATION_ERROR(-20001, 'El médico no tiene disponibilidad en esa fecha y horario.');
        END IF;

        p_cita_id := APP_CLINICA.SEQ_CITAS.NEXTVAL;
        
        INSERT INTO APP_CLINICA.CITAS (
            CITA_ID, PACIENTE_ID, MEDICO_ID, ESPECIALIDAD_ID, FECHA_CITA, HORA_INICIO, HORA_FIN, 
            ESTADO_CITA_ID, MOTIVO_CONSULTA, USUARIO_CREACION
        ) VALUES (
            p_cita_id, p_paciente_id, p_medico_id, p_especialidad_id, p_fecha_cita, p_hora_inicio, p_hora_fin, 
            1, -- 1 = Pendiente
            p_motivo_consulta, p_usuario_creacion
        );

        -- Generar notificación de confirmación
        INSERT INTO APP_CLINICA.NOTIFICACIONES (
            NOTIFICACION_ID, CITA_ID, PACIENTE_ID, TIPO, MENSAJE, FECHA_GENERACION, LEIDA
        ) VALUES (
            APP_CLINICA.SEQ_NOTIFICACIONES.NEXTVAL,
            p_cita_id,
            p_paciente_id,
            'CONFIRMACION',
            'Su cita ha sido agendada para el ' || TO_CHAR(p_fecha_cita, 'DD/MM/YYYY') || ' a las ' || p_hora_inicio || '.',
            SYSTIMESTAMP,
            'N'
        );
        
    END SP_AGENDAR_CITA;

    PROCEDURE SP_CANCELAR_CITA(
        p_cita_id IN NUMBER, p_motivo_cancelacion IN VARCHAR2, p_usuario_modificacion IN NUMBER
    ) IS
        v_paciente_id NUMBER;
        v_fecha_cita DATE;
        v_hora_inicio VARCHAR2(5);
    BEGIN
        -- Obtener datos para la notificación
        SELECT PACIENTE_ID, FECHA_CITA, HORA_INICIO
        INTO v_paciente_id, v_fecha_cita, v_hora_inicio
        FROM APP_CLINICA.CITAS
        WHERE CITA_ID = p_cita_id;

        UPDATE APP_CLINICA.CITAS SET
            ESTADO_CITA_ID = 5, -- 5 = Cancelada
            MOTIVO_CANCELACION = p_motivo_cancelacion,
            FECHA_MODIFICACION = SYSTIMESTAMP
        WHERE CITA_ID = p_cita_id;
        
        -- Generar notificación de cancelación
        INSERT INTO APP_CLINICA.NOTIFICACIONES (
            NOTIFICACION_ID, CITA_ID, PACIENTE_ID, TIPO, MENSAJE, FECHA_GENERACION, LEIDA
        ) VALUES (
            APP_CLINICA.SEQ_NOTIFICACIONES.NEXTVAL,
            p_cita_id,
            v_paciente_id,
            'CANCELACION',
            'Su cita del ' || TO_CHAR(v_fecha_cita, 'DD/MM/YYYY') || ' a las ' || v_hora_inicio || ' ha sido cancelada. Motivo: ' || p_motivo_cancelacion,
            SYSTIMESTAMP,
            'N'
        );
        
    END SP_CANCELAR_CITA;

    PROCEDURE SP_REPROGRAMAR_CITA(
        p_cita_id IN NUMBER, p_nueva_fecha IN DATE, p_nueva_hora_inicio IN VARCHAR2,
        p_nueva_hora_fin IN VARCHAR2, p_usuario_modificacion IN NUMBER, p_nueva_cita_id OUT NUMBER
    ) IS
        v_paciente_id NUMBER;
        v_medico_id NUMBER;
        v_especialidad_id NUMBER;
        v_motivo_consulta VARCHAR2(500);
        v_fecha_cita DATE;
        v_hora_inicio VARCHAR2(5);
    BEGIN
        SAVEPOINT sv_reprogramacion;
        
        -- Obtener datos de la cita original
        SELECT PACIENTE_ID, MEDICO_ID, ESPECIALIDAD_ID, MOTIVO_CONSULTA, FECHA_CITA, HORA_INICIO
        INTO v_paciente_id, v_medico_id, v_especialidad_id, v_motivo_consulta, v_fecha_cita, v_hora_inicio
        FROM APP_CLINICA.CITAS
        WHERE CITA_ID = p_cita_id;
        
        -- Cancelar la cita original
        SP_CANCELAR_CITA(p_cita_id, 'Reprogramación solicitada', p_usuario_modificacion);
        
        -- Agendar la nueva cita
        SP_AGENDAR_CITA(
            v_paciente_id, v_medico_id, v_especialidad_id, p_nueva_fecha, 
            p_nueva_hora_inicio, p_nueva_hora_fin, v_motivo_consulta, 
            p_usuario_modificacion, p_nueva_cita_id
        );

        -- Generar notificación de reprogramación
        INSERT INTO APP_CLINICA.NOTIFICACIONES (
            NOTIFICACION_ID, CITA_ID, PACIENTE_ID, TIPO, MENSAJE, FECHA_GENERACION, LEIDA
        ) VALUES (
            APP_CLINICA.SEQ_NOTIFICACIONES.NEXTVAL,
            p_nueva_cita_id,
            v_paciente_id,
            'REPROGRAMACION',
            'Su cita del ' || TO_CHAR(v_fecha_cita, 'DD/MM/YYYY') || ' a las ' || v_hora_inicio || ' ha sido reprogramada para el ' || TO_CHAR(p_nueva_fecha, 'DD/MM/YYYY') || ' a las ' || p_nueva_hora_inicio || '.',
            SYSTIMESTAMP,
            'N'
        );
        
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK TO sv_reprogramacion;
        RAISE;
    END SP_REPROGRAMAR_CITA;

    PROCEDURE SP_PROCESAR_RECORDATORIOS IS
    BEGIN
        INSERT INTO APP_CLINICA.NOTIFICACIONES (
            NOTIFICACION_ID, CITA_ID, PACIENTE_ID, TIPO, MENSAJE, FECHA_GENERACION, LEIDA
        )
        SELECT APP_CLINICA.SEQ_NOTIFICACIONES.NEXTVAL,
               c.CITA_ID, c.PACIENTE_ID, 'RECORDATORIO',
               UTL_RAW.CAST_TO_VARCHAR2(HEXTORAW('5265636f726461746f72696f3a205573746564207469656e6520756e612063697461206d61c3b1616e6120')) || TO_CHAR(c.FECHA_CITA, 'DD/MM/YYYY') || ' a las ' || c.HORA_INICIO || '.',
               SYSTIMESTAMP, 'N'
        FROM APP_CLINICA.CITAS c
        WHERE c.ESTADO_CITA_ID = 1 -- Pendiente
          AND c.FECHA_CITA = TRUNC(SYSDATE + 1)
          AND NOT EXISTS (
              SELECT 1 FROM APP_CLINICA.NOTIFICACIONES n
              WHERE n.CITA_ID = c.CITA_ID AND n.TIPO = 'RECORDATORIO'
          );
        COMMIT;
    END SP_PROCESAR_RECORDATORIOS;

END PKG_VALOR;
/
