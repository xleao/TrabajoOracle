-- ==============================================================================
-- SCRIPT 07: PAQUETE PKG_CONSULTAS (ESPECIFICACIÓN Y CUERPO)
-- ==============================================================================

CREATE OR REPLACE PACKAGE APP_CLINICA.PKG_CONSULTAS AS
    -- CON01: Disponibilidad de un médico en una fecha (franjas libres)
    FUNCTION FN_OBTENER_FRANJAS_LIBRES(p_medico_id IN NUMBER, p_fecha IN DATE) RETURN SYS_REFCURSOR;
    -- CON02: Agenda diaria del médico
    FUNCTION FN_AGENDA_DIARIA(p_medico_id IN NUMBER, p_fecha IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_HISTORIAL_PACIENTE(p_paciente_id IN NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION FN_CITAS_POR_ESPECIALIDAD(p_especialidad_id IN NUMBER, p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_CITAS_POR_ESTADO(p_estado_cita_id IN NUMBER, p_medico_id IN NUMBER, p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_BUSCAR_PACIENTE(p_filtro IN VARCHAR2) RETURN SYS_REFCURSOR;
    
    -- Listados requeridos por el frontend (PL/SQL Puro)
    FUNCTION FN_LISTAR_MEDICOS RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_ESPECIALIDADES RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_HORARIOS(p_medico_id IN NUMBER DEFAULT NULL) RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_ESTADOS_CITA RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_NOTIFICACIONES RETURN SYS_REFCURSOR;
    PROCEDURE SP_MARCAR_NOTIF_LEIDA(p_notificacion_id IN NUMBER);
END PKG_CONSULTAS;
/

CREATE OR REPLACE PACKAGE BODY APP_CLINICA.PKG_CONSULTAS AS

    -- CON01: Franjas libres de un médico en una fecha
    FUNCTION FN_OBTENER_FRANJAS_LIBRES(p_medico_id IN NUMBER, p_fecha IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            WITH horario AS (
                SELECT HORA_INICIO, HORA_FIN, DURACION_CITA_MIN,
                       FLOOR(
                           (TO_DATE(HORA_FIN,   'HH24:MI') -
                            TO_DATE(HORA_INICIO, 'HH24:MI')) * 1440
                           / DURACION_CITA_MIN
                       ) AS NUM_SLOTS
                FROM APP_CLINICA.HORARIOS_MEDICO
                WHERE MEDICO_ID  = p_medico_id
                  AND DIA_SEMANA = TO_NUMBER(TO_CHAR(p_fecha, 'D'))
                  AND ESTADO     = 'A'
            ),
            numeros AS (
                SELECT LEVEL AS n FROM DUAL CONNECT BY LEVEL <= 100
            ),
            franjas AS (
                SELECT
                    TO_CHAR(TO_DATE(h.HORA_INICIO,'HH24:MI') + (n.n-1) * h.DURACION_CITA_MIN / 1440, 'HH24:MI') AS FRANJA_INICIO,
                    TO_CHAR(TO_DATE(h.HORA_INICIO,'HH24:MI') +  n.n    * h.DURACION_CITA_MIN / 1440, 'HH24:MI') AS FRANJA_FIN,
                    h.DURACION_CITA_MIN
                FROM horario h
                JOIN numeros n ON n.n <= h.NUM_SLOTS
            )
            SELECT f.FRANJA_INICIO, f.FRANJA_FIN, f.DURACION_CITA_MIN
            FROM franjas f
            WHERE NOT EXISTS (
                SELECT 1 FROM APP_CLINICA.CITAS c
                WHERE c.MEDICO_ID        = p_medico_id
                  AND TRUNC(c.FECHA_CITA) = TRUNC(p_fecha)
                  AND c.ESTADO_CITA_ID  IN (1, 2)
                  AND c.HORA_INICIO      < f.FRANJA_FIN
                  AND c.HORA_FIN         > f.FRANJA_INICIO
            )
            ORDER BY f.FRANJA_INICIO;
        RETURN v_cursor;
    END FN_OBTENER_FRANJAS_LIBRES;

    -- CON02: Agenda diaria del médico
    FUNCTION FN_AGENDA_DIARIA(p_medico_id IN NUMBER, p_fecha IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT c.CITA_ID, c.PACIENTE_ID, c.HORA_INICIO, c.HORA_FIN,
                   p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
                   e.NOMBRE AS ESTADO_CITA, c.MOTIVO_CONSULTA
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
            JOIN APP_CLINICA.ESTADOS_CITA e ON c.ESTADO_CITA_ID = e.ESTADO_CITA_ID
            WHERE c.MEDICO_ID = p_medico_id
              AND TRUNC(c.FECHA_CITA) = TRUNC(p_fecha)
            ORDER BY c.HORA_INICIO;
        RETURN v_cursor;
    END FN_AGENDA_DIARIA;

    FUNCTION FN_HISTORIAL_PACIENTE(p_paciente_id IN NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT c.CITA_ID, c.FECHA_CITA, c.HORA_INICIO, c.HORA_FIN,
                   m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
                   esp.NOMBRE AS ESPECIALIDAD, e.NOMBRE AS ESTADO_CITA,
                   c.MOTIVO_CONSULTA, c.OBSERVACIONES
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
            JOIN APP_CLINICA.ESPECIALIDADES esp ON c.ESPECIALIDAD_ID = esp.ESPECIALIDAD_ID
            JOIN APP_CLINICA.ESTADOS_CITA e ON c.ESTADO_CITA_ID = e.ESTADO_CITA_ID
            WHERE c.PACIENTE_ID = p_paciente_id
            ORDER BY c.FECHA_CITA DESC, c.HORA_INICIO DESC;
        RETURN v_cursor;
    END FN_HISTORIAL_PACIENTE;

    FUNCTION FN_CITAS_POR_ESPECIALIDAD(p_especialidad_id IN NUMBER, p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT c.CITA_ID, c.FECHA_CITA, 
                   m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
                   p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
                   e.NOMBRE AS ESTADO_CITA
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
            JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
            JOIN APP_CLINICA.ESTADOS_CITA e ON c.ESTADO_CITA_ID = e.ESTADO_CITA_ID
            WHERE c.ESPECIALIDAD_ID = p_especialidad_id
              AND TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            ORDER BY c.FECHA_CITA, c.HORA_INICIO;
        RETURN v_cursor;
    END FN_CITAS_POR_ESPECIALIDAD;

    FUNCTION FN_CITAS_POR_ESTADO(p_estado_cita_id IN NUMBER, p_medico_id IN NUMBER, p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT c.CITA_ID, c.FECHA_CITA, c.HORA_INICIO, c.HORA_FIN,
                   c.MEDICO_ID,
                   p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
                   m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
            JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
            WHERE c.ESTADO_CITA_ID = p_estado_cita_id
              AND (c.MEDICO_ID = p_medico_id OR p_medico_id IS NULL)
              AND TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            ORDER BY c.FECHA_CITA, c.HORA_INICIO;
        RETURN v_cursor;
    END FN_CITAS_POR_ESTADO;

    FUNCTION FN_BUSCAR_PACIENTE(p_filtro IN VARCHAR2) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT PACIENTE_ID, DNI, NOMBRES, APELLIDOS, TELEFONO, EMAIL, FECHA_NACIMIENTO, DIRECCION, ESTADO
            FROM APP_CLINICA.PACIENTES
            WHERE (DNI LIKE '%' || p_filtro || '%' OR
                   UPPER(NOMBRES) LIKE '%' || UPPER(p_filtro) || '%' OR
                   UPPER(APELLIDOS) LIKE '%' || UPPER(p_filtro) || '%');
        RETURN v_cursor;
    END FN_BUSCAR_PACIENTE;

    FUNCTION FN_LISTAR_MEDICOS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT m.MEDICO_ID, m.NOMBRES, m.APELLIDOS, m.NRO_COLEGIATURA, 
                   m.ESPECIALIDAD_ID, m.TELEFONO, m.EMAIL, m.ESTADO, 
                   e.NOMBRE as ESPECIALIDAD_NOMBRE 
            FROM APP_CLINICA.MEDICOS m 
            JOIN APP_CLINICA.ESPECIALIDADES e ON m.ESPECIALIDAD_ID = e.ESPECIALIDAD_ID;
        RETURN v_cursor;
    END FN_LISTAR_MEDICOS;

    FUNCTION FN_LISTAR_ESPECIALIDADES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT ESPECIALIDAD_ID, NOMBRE, DESCRIPCION, ESTADO FROM APP_CLINICA.ESPECIALIDADES;
        RETURN v_cursor;
    END FN_LISTAR_ESPECIALIDADES;

    FUNCTION FN_LISTAR_HORARIOS(p_medico_id IN NUMBER DEFAULT NULL) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        IF p_medico_id IS NOT NULL THEN
            OPEN v_cursor FOR
                SELECT h.HORARIO_ID, h.MEDICO_ID, h.DIA_SEMANA, h.HORA_INICIO, h.HORA_FIN, 
                       h.DURACION_CITA_MIN, h.ESTADO, m.NOMBRES || ' ' || m.APELLIDOS as MEDICO_NOMBRE
                FROM APP_CLINICA.HORARIOS_MEDICO h
                JOIN APP_CLINICA.MEDICOS m ON h.MEDICO_ID = m.MEDICO_ID
                WHERE h.MEDICO_ID = p_medico_id;
        ELSE
            OPEN v_cursor FOR
                SELECT h.HORARIO_ID, h.MEDICO_ID, h.DIA_SEMANA, h.HORA_INICIO, h.HORA_FIN, 
                       h.DURACION_CITA_MIN, h.ESTADO, m.NOMBRES || ' ' || m.APELLIDOS as MEDICO_NOMBRE
                FROM APP_CLINICA.HORARIOS_MEDICO h
                JOIN APP_CLINICA.MEDICOS m ON h.MEDICO_ID = m.MEDICO_ID;
        END IF;
        RETURN v_cursor;
    END FN_LISTAR_HORARIOS;

    FUNCTION FN_LISTAR_ESTADOS_CITA RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT ESTADO_CITA_ID, NOMBRE, DESCRIPCION FROM APP_CLINICA.ESTADOS_CITA;
        RETURN v_cursor;
    END FN_LISTAR_ESTADOS_CITA;

    FUNCTION FN_LISTAR_NOTIFICACIONES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT n.NOTIFICACION_ID, n.CITA_ID, n.PACIENTE_ID, p.NOMBRES || ' ' || p.APELLIDOS as PACIENTE_NOMBRE, 
                   n.TIPO, n.MENSAJE, n.FECHA_GENERACION, n.LEIDA
            FROM APP_CLINICA.NOTIFICACIONES n
            JOIN APP_CLINICA.PACIENTES p ON n.PACIENTE_ID = p.PACIENTE_ID
            ORDER BY n.FECHA_GENERACION DESC;
        RETURN v_cursor;
    END FN_LISTAR_NOTIFICACIONES;

    PROCEDURE SP_MARCAR_NOTIF_LEIDA(p_notificacion_id IN NUMBER) IS
    BEGIN
        UPDATE APP_CLINICA.NOTIFICACIONES
        SET LEIDA = 'S'
        WHERE NOTIFICACION_ID = p_notificacion_id;
        COMMIT;
    END SP_MARCAR_NOTIF_LEIDA;

END PKG_CONSULTAS;
/
