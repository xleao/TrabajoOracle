-- ==============================================================================
-- SCRIPT 08: PAQUETE PKG_REPORTES (ESPECIFICACIÓN Y CUERPO)
-- ==============================================================================

CREATE OR REPLACE PACKAGE APP_CLINICA.PKG_REPORTES AS
    FUNCTION FN_RPT_CITAS_POR_MEDICO(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_RPT_CITAS_POR_ESPECIALIDAD(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_RPT_CANCELACIONES(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_RPT_PACIENTES_ATENDIDOS(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION FN_RPT_OCUPACION_HORARIA(p_medico_id IN NUMBER, p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
END PKG_REPORTES;
/

CREATE OR REPLACE PACKAGE BODY APP_CLINICA.PKG_REPORTES AS

    -- RFR-01
    FUNCTION FN_RPT_CITAS_POR_MEDICO(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
                   COUNT(c.CITA_ID) AS TOTAL_CITAS,
                   SUM(CASE WHEN c.ESTADO_CITA_ID = 4 THEN 1 ELSE 0 END) AS ATENDIDAS,
                   SUM(CASE WHEN c.ESTADO_CITA_ID = 5 THEN 1 ELSE 0 END) AS CANCELADAS,
                   ROUND(COUNT(c.CITA_ID) / GREATEST(1, p_fecha_fin - p_fecha_inicio), 2) AS PROMEDIO_DIARIO
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
            WHERE TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY m.NOMBRES, m.APELLIDOS
            ORDER BY TOTAL_CITAS DESC;
        RETURN v_cursor;
    END FN_RPT_CITAS_POR_MEDICO;

    -- RFR-02
    FUNCTION FN_RPT_CITAS_POR_ESPECIALIDAD(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT e.NOMBRE AS ESPECIALIDAD,
                   COUNT(c.CITA_ID) AS CANTIDAD_CITAS
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.ESPECIALIDADES e ON c.ESPECIALIDAD_ID = e.ESPECIALIDAD_ID
            WHERE TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY e.NOMBRE
            ORDER BY CANTIDAD_CITAS DESC;
        RETURN v_cursor;
    END FN_RPT_CITAS_POR_ESPECIALIDAD;

    -- RFR-03
    FUNCTION FN_RPT_CANCELACIONES(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT NVL(MOTIVO_CANCELACION, 'Sin motivo registrado') AS MOTIVO,
                   COUNT(CITA_ID) AS CANTIDAD
            FROM APP_CLINICA.CITAS
            WHERE ESTADO_CITA_ID = 5
              AND TRUNC(FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY NVL(MOTIVO_CANCELACION, 'Sin motivo registrado')
            ORDER BY CANTIDAD DESC;
        RETURN v_cursor;
    END FN_RPT_CANCELACIONES;

    -- RFR-04
    FUNCTION FN_RPT_PACIENTES_ATENDIDOS(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        -- Pacientes recurrentes (con más de 1 visita) vs únicos
        OPEN v_cursor FOR
            SELECT p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
                   COUNT(c.CITA_ID) AS TOTAL_VISITAS
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
            WHERE c.ESTADO_CITA_ID = 4 -- Atendidas
              AND TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY p.NOMBRES, p.APELLIDOS
            ORDER BY TOTAL_VISITAS DESC;
        RETURN v_cursor;
    END FN_RPT_PACIENTES_ATENDIDOS;

    -- RFR-05
    FUNCTION FN_RPT_OCUPACION_HORARIA(p_medico_id IN NUMBER, p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT HORA_INICIO AS FRANJA_HORARIA,
                   COUNT(CITA_ID) AS DEMANDA
            FROM APP_CLINICA.CITAS
            WHERE (MEDICO_ID = p_medico_id OR p_medico_id IS NULL)
              AND TRUNC(FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY HORA_INICIO
            ORDER BY DEMANDA DESC, FRANJA_HORARIA ASC;
        RETURN v_cursor;
    END FN_RPT_OCUPACION_HORARIA;

END PKG_REPORTES;
/
