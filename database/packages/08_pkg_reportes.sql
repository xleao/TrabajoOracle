-- ==============================================================================
-- SCRIPT 08: PAQUETE PKG_REPORTES (ESPECIFICACIÓN Y CUERPO)
-- ==============================================================================

CREATE OR REPLACE PACKAGE APP_CLINICA.PKG_REPORTES AS
    -- RFR-01: Citas por médico en un período
    FUNCTION FN_RPT_CITAS_POR_MEDICO(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    -- RFR-02: Demanda por especialidad en un período
    FUNCTION FN_RPT_CITAS_POR_ESPECIALIDAD(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    -- RFR-03a: Motivos de cancelación más frecuentes
    FUNCTION FN_RPT_CANCELACIONES(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    -- RFR-03b: Tasa de cancelación por médico
    FUNCTION FN_RPT_CANCEL_POR_MEDICO(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    -- RFR-03c: Tasa de cancelación por paciente
    FUNCTION FN_RPT_CANCEL_POR_PACIENTE(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    -- RFR-04: Pacientes atendidos: nuevos vs recurrentes
    FUNCTION FN_RPT_PACIENTES_ATENDIDOS(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR;
    -- RFR-05: Ocupación por franja horaria
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
            GROUP BY m.MEDICO_ID, m.NOMBRES, m.APELLIDOS
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

    -- RFR-03a: Motivos más frecuentes de cancelación
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

    -- RFR-03b: Tasa de cancelación por médico (médicos con mayor tasa primero)
    FUNCTION FN_RPT_CANCEL_POR_MEDICO(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT m.NOMBRES || ' ' || m.APELLIDOS AS MEDICO,
                   COUNT(c.CITA_ID) AS TOTAL_CITAS,
                   SUM(CASE WHEN c.ESTADO_CITA_ID = 5 THEN 1 ELSE 0 END) AS CANCELADAS,
                   ROUND(
                       SUM(CASE WHEN c.ESTADO_CITA_ID = 5 THEN 1 ELSE 0 END) * 100.0
                       / GREATEST(COUNT(c.CITA_ID), 1),
                   1) AS PCT_CANCELACION
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.MEDICOS m ON c.MEDICO_ID = m.MEDICO_ID
            WHERE TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY m.MEDICO_ID, m.NOMBRES, m.APELLIDOS
            ORDER BY PCT_CANCELACION DESC, CANCELADAS DESC;
        RETURN v_cursor;
    END FN_RPT_CANCEL_POR_MEDICO;

    -- RFR-03c: Tasa de cancelación por paciente (solo los que tienen al menos 1 cancelación)
    FUNCTION FN_RPT_CANCEL_POR_PACIENTE(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
                   COUNT(c.CITA_ID) AS TOTAL_CITAS,
                   SUM(CASE WHEN c.ESTADO_CITA_ID = 5 THEN 1 ELSE 0 END) AS CANCELADAS,
                   ROUND(
                       SUM(CASE WHEN c.ESTADO_CITA_ID = 5 THEN 1 ELSE 0 END) * 100.0
                       / GREATEST(COUNT(c.CITA_ID), 1),
                   1) AS PCT_CANCELACION
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
            WHERE TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY p.PACIENTE_ID, p.NOMBRES, p.APELLIDOS
            HAVING SUM(CASE WHEN c.ESTADO_CITA_ID = 5 THEN 1 ELSE 0 END) > 0
            ORDER BY PCT_CANCELACION DESC, CANCELADAS DESC;
        RETURN v_cursor;
    END FN_RPT_CANCEL_POR_PACIENTE;

    -- RFR-04: Pacientes atendidos con clasificación nuevo/recurrente desde la BD
    FUNCTION FN_RPT_PACIENTES_ATENDIDOS(p_fecha_inicio IN DATE, p_fecha_fin IN DATE) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT p.NOMBRES || ' ' || p.APELLIDOS AS PACIENTE,
                   COUNT(c.CITA_ID) AS TOTAL_VISITAS,
                   CASE WHEN COUNT(c.CITA_ID) = 1 THEN 'NUEVO' ELSE 'RECURRENTE' END AS TIPO_PACIENTE
            FROM APP_CLINICA.CITAS c
            JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
            WHERE c.ESTADO_CITA_ID = 4
              AND TRUNC(c.FECHA_CITA) BETWEEN TRUNC(p_fecha_inicio) AND TRUNC(p_fecha_fin)
            GROUP BY p.PACIENTE_ID, p.NOMBRES, p.APELLIDOS
            ORDER BY TOTAL_VISITAS DESC, PACIENTE ASC;
        RETURN v_cursor;
    END FN_RPT_PACIENTES_ATENDIDOS;

    -- RFR-05: Ocupación por franja horaria (todos los médicos o uno específico)
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
