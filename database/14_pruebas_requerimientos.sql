-- ==============================================================================
-- SCRIPT 14: PRUEBAS DE REQUERIMIENTOS — MATRIZ DE TRAZABILIDAD
-- ==============================================================================
-- Demuestra los 25 requerimientos de la PC4 a nivel puro de base de datos.
-- Cada bloque muestra: llamada al paquete + resultado visible en DBMS_OUTPUT.
-- Ejecutar como APP_CLINICA con SERVEROUTPUT ON.
-- Los DML de prueba se deshacen con ROLLBACK al final (los datos semilla persisten).
-- ==============================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED;
ALTER SESSION SET NLS_DATE_FORMAT = 'DD/MM/YYYY';

DECLARE
    -- Variables de control
    v_cita_id       NUMBER;
    v_nueva_cita_id NUMBER;
    v_disponible    NUMBER;
    v_cursor        SYS_REFCURSOR;

    -- Variables genéricas para fetch de cursores
    v_str1  VARCHAR2(500); v_str2 VARCHAR2(500); v_str3 VARCHAR2(500);
    v_str4  VARCHAR2(500); v_str5 VARCHAR2(500); v_str6 VARCHAR2(500);
    v_num1  NUMBER;        v_num2 NUMBER;        v_num3 NUMBER;        v_num4 NUMBER;
    v_date1 DATE;
    v_char1 CHAR(1);
    v_clob1 CLOB;          v_clob2 CLOB;

    -- Seguridad
    v_hash   RAW(32);
    v_token  VARCHAR2(128);
    v_auth   NUMBER;
    v_rol_ok BOOLEAN;

    -- Utilidad: imprime primera fila de cursor o avisa si está vacío
    PROCEDURE print_first_row(p_req VARCHAR2, p_label VARCHAR2) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE(p_req || ': ' || p_label);
    END;

BEGIN
    DBMS_OUTPUT.PUT_LINE('======================================================');
    DBMS_OUTPUT.PUT_LINE('  PRUEBAS PC4 — 25 REQUERIMIENTOS FUNCIONALES');
    DBMS_OUTPUT.PUT_LINE('======================================================');

    -- =========================================================================
    -- BLOQUE 1 — PKG_VALOR (VAL01 a VAL05)
    -- =========================================================================
    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- BLOQUE 1: PKG_VALOR ---');

    -- VAL01: Agendar cita
    APP_CLINICA.PKG_VALOR.SP_AGENDAR_CITA(
        p_paciente_id     => 1,     p_medico_id       => 1,
        p_especialidad_id => 1,     p_fecha_cita      => SYSDATE + 20,
        p_hora_inicio     => '09:00', p_hora_fin      => '09:30',
        p_motivo_consulta => 'Prueba VAL01 - Control general',
        p_usuario_creacion => 1,    p_cita_id         => v_cita_id
    );
    DBMS_OUTPUT.PUT_LINE('VAL01 | SP_AGENDAR_CITA => Cita ID ' || v_cita_id || ' creada (estado: Pendiente)');

    -- Verificar que el slot ahora esté ocupado (helper interno de VAL01)
    v_disponible := APP_CLINICA.PKG_VALOR.FN_VERIFICAR_DISPONIBILIDAD(
        1, SYSDATE + 20, '09:00', '09:30'
    );
    DBMS_OUTPUT.PUT_LINE('VAL01 | FN_VERIFICAR_DISPONIBILIDAD tras agendar => '
        || CASE WHEN v_disponible = 0 THEN 'OCUPADO (correcto)' ELSE 'ERROR: deberia estar ocupado' END);

    -- VAL02: Cancelar cita
    APP_CLINICA.PKG_VALOR.SP_CANCELAR_CITA(
        v_cita_id, 'Prueba VAL02 - cancelacion por test', 1
    );
    DBMS_OUTPUT.PUT_LINE('VAL02 | SP_CANCELAR_CITA(cita=' || v_cita_id || ') => Cancelada con notificacion generada');

    -- Preparar cita para reprogramar
    APP_CLINICA.PKG_VALOR.SP_AGENDAR_CITA(
        1, 1, 1, SYSDATE + 21, '10:00', '10:30', 'Cita original para reprogramar', 1, v_cita_id
    );

    -- VAL03: Reprogramar cita (SAVEPOINT/ROLLBACK interno)
    APP_CLINICA.PKG_VALOR.SP_REPROGRAMAR_CITA(
        p_cita_id           => v_cita_id,
        p_nueva_fecha       => SYSDATE + 22,
        p_nueva_hora_inicio => '11:00',
        p_nueva_hora_fin    => '11:30',
        p_usuario_modificacion => 1,
        p_nueva_cita_id     => v_nueva_cita_id
    );
    DBMS_OUTPUT.PUT_LINE('VAL03 | SP_REPROGRAMAR_CITA => Cita ' || v_cita_id
        || ' reprogramada => nueva cita ID ' || v_nueva_cita_id);

    -- VAL04: Procesar recordatorios automáticos (ejecutado por JOB_RECORDATORIOS_24H)
    APP_CLINICA.PKG_VALOR.SP_PROCESAR_RECORDATORIOS;
    DBMS_OUTPUT.PUT_LINE('VAL04 | SP_PROCESAR_RECORDATORIOS => Ejecutado OK (genera notif. para citas de manana)');

    -- VAL05: Impedir citas solapadas — TRG_IMPEDIR_EMPATE_CITA actúa como segunda línea de defensa
    v_disponible := APP_CLINICA.PKG_VALOR.FN_VERIFICAR_DISPONIBILIDAD(1, SYSDATE + 22, '11:00', '11:30');
    DBMS_OUTPUT.PUT_LINE('VAL05 | FN_VERIFICAR_DISPONIBILIDAD (slot ya ocupado por VAL03) => '
        || CASE WHEN v_disponible = 0 THEN 'OCUPADO — anti-colision activa (correcto)' ELSE 'DISPONIBLE' END);


    -- =========================================================================
    -- BLOQUE 2 — PKG_SEGURIDAD (SEG01 a SEG05)
    -- =========================================================================
    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- BLOQUE 2: PKG_SEGURIDAD ---');

    -- SEG01: Hash SHA-256 de contraseña con DBMS_CRYPTO
    v_hash := SEG_CLINICA.PKG_SEGURIDAD.FN_HASH_PASSWORD('admin123');
    DBMS_OUTPUT.PUT_LINE('SEG01 | FN_HASH_PASSWORD => RAW(32) generado: ' || SUBSTR(RAWTOHEX(v_hash), 1, 16) || '...');

    -- SEG02: Autenticación por credenciales
    v_auth := SEG_CLINICA.PKG_SEGURIDAD.FN_AUTENTICAR('admin', 'admin123');
    DBMS_OUTPUT.PUT_LINE('SEG02 | FN_AUTENTICAR(''admin'') => Usuario ID = '
        || CASE WHEN v_auth > 0 THEN TO_CHAR(v_auth) || ' (OK)' ELSE 'FALLO (-1)' END);

    -- SEG03: Validar rol del usuario
    v_rol_ok := SEG_CLINICA.PKG_SEGURIDAD.FN_VALIDAR_ROL(1, 'ADMINISTRADOR');
    DBMS_OUTPUT.PUT_LINE('SEG03 | FN_VALIDAR_ROL(usuario=1, rol=ADMINISTRADOR) => '
        || CASE WHEN v_rol_ok THEN 'TRUE (autorizado)' ELSE 'FALSE (denegado)' END);

    -- SEG04: Gestión de sesiones (crear + cerrar)
    SEG_CLINICA.PKG_SEGURIDAD.SP_CREAR_SESION(1, '127.0.0.1', v_token);
    DBMS_OUTPUT.PUT_LINE('SEG04 | SP_CREAR_SESION => Token: ' || SUBSTR(v_token, 1, 12) || '... (expira en 12h)');
    SEG_CLINICA.PKG_SEGURIDAD.SP_CERRAR_SESION(v_token);
    DBMS_OUTPUT.PUT_LINE('SEG04 | SP_CERRAR_SESION => Sesion cerrada (estado=C)');

    -- SEG05: Auditoría — los triggers ya escribieron registros en AUDITORIA
    v_cursor := SEG_CLINICA.PKG_SEGURIDAD.FN_LISTAR_AUDITORIA;
    FETCH v_cursor INTO v_num1, v_str4, v_str1, v_str2, v_str3, v_clob1, v_clob2;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('SEG05 | FN_LISTAR_AUDITORIA => Ultimo reg: ID='
            || v_num1 || ' Tabla=' || v_str1 || ' Operacion=' || v_str2);
    ELSE
        DBMS_OUTPUT.PUT_LINE('SEG05 | FN_LISTAR_AUDITORIA => Sin registros aun');
    END IF;
    CLOSE v_cursor;


    -- =========================================================================
    -- BLOQUE 3 — PKG_ADMINISTRACION (ADM01 a ADM05)
    -- =========================================================================
    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- BLOQUE 3: PKG_ADMINISTRACION ---');

    -- Pre-limpieza: eliminar datos de test anteriores para que el script sea idempotente.
    -- PKG_ADMINISTRACION hace COMMIT interno en cada SP, por eso no alcanza el ROLLBACK final.
    DELETE FROM SEG_CLINICA.USUARIOS WHERE USERNAME = 'recepTest';
    DELETE FROM APP_CLINICA.HORARIOS_MEDICO
        WHERE MEDICO_ID IN (SELECT MEDICO_ID FROM APP_CLINICA.MEDICOS WHERE NRO_COLEGIATURA = 'CMP-TEST-01');
    DELETE FROM APP_CLINICA.MEDICOS WHERE NRO_COLEGIATURA = 'CMP-TEST-01';
    DELETE FROM APP_CLINICA.PACIENTES WHERE DNI = '99887766';
    DELETE FROM APP_CLINICA.ESPECIALIDADES WHERE NOMBRE = 'Geriatria_Test';
    COMMIT;

    -- ADM03: Especialidad (primero para usarla en médico)
    v_num2 := NULL;
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_ESPECIALIDAD(
        'I', v_num2, 'Geriatria_Test', 'Especialidad de prueba PC4', 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM03 | SP_GESTIONAR_ESPECIALIDAD(INSERT) => ID ' || v_num2);

    -- ADM03 update: cambiar descripción
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_ESPECIALIDAD(
        'U', v_num2, 'Geriatria_Test', 'Especialidad de prueba PC4 - actualizada', 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM03 | SP_GESTIONAR_ESPECIALIDAD(UPDATE) => Descripcion actualizada OK');

    -- ADM02: Médico
    v_num3 := NULL;
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_MEDICO(
        'I', v_num3, 'Carlos', 'TestMedico', 'CMP-TEST-01', v_num2, '987654321', 'medtest@clinica.pe', 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM02 | SP_GESTIONAR_MEDICO(INSERT) => ID ' || v_num3);

    -- ADM01: Paciente
    v_num1 := NULL;
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_PACIENTE(
        'I', v_num1, 'Ana', 'TestPaciente', '99887766', TO_DATE('1985-03-15','YYYY-MM-DD'),
        '912345678', 'ana@test.pe', 'Av. Test 123', 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM01 | SP_GESTIONAR_PACIENTE(INSERT) => ID ' || v_num1);

    -- ADM01 update: modificar email
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_PACIENTE(
        'U', v_num1, 'Ana', 'TestPaciente', '99887766', TO_DATE('1985-03-15','YYYY-MM-DD'),
        '912345678', 'ana.updated@test.pe', 'Av. Test 456', 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM01 | SP_GESTIONAR_PACIENTE(UPDATE) => Email actualizado OK');

    -- ADM04: Horario del médico de prueba
    v_num4 := NULL;
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_HORARIO(
        'I', v_num4, v_num3, 2, '08:00', '13:00', 30, 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM04 | SP_GESTIONAR_HORARIO(INSERT) => ID ' || v_num4 || ' (Lunes 08:00-13:00, 30 min)');

    -- ADM05: Usuario recepcionista
    v_num1 := NULL;
    APP_CLINICA.PKG_ADMINISTRACION.SP_GESTIONAR_USUARIO(
        'I', v_num1, 'recepTest', 'Recep2026!', 'Recepcionista Test', 'rec@clinica.pe', 2, NULL, 'A'
    );
    DBMS_OUTPUT.PUT_LINE('ADM05 | SP_GESTIONAR_USUARIO(INSERT) => Usuario ID ' || v_num1);


    -- =========================================================================
    -- BLOQUE 4 — PKG_CONSULTAS (CON01 a CON05)
    -- =========================================================================
    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- BLOQUE 4: PKG_CONSULTAS ---');

    -- CON01: Disponibilidad del médico — franjas libres en una fecha
    v_cursor := APP_CLINICA.PKG_CONSULTAS.FN_OBTENER_FRANJAS_LIBRES(1, SYSDATE + 20);
    FETCH v_cursor INTO v_str1, v_str2, v_num1;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('CON01 | FN_OBTENER_FRANJAS_LIBRES(medico=1, +20d) => Primera franja: '
            || v_str1 || ' - ' || v_str2 || ' (' || v_num1 || ' min)');
    ELSE
        DBMS_OUTPUT.PUT_LINE('CON01 | FN_OBTENER_FRANJAS_LIBRES => Sin horario configurado para ese dia');
    END IF;
    CLOSE v_cursor;

    -- CON02: Agenda diaria del médico (usamos la cita pendiente creada en VAL03)
    v_cursor := APP_CLINICA.PKG_CONSULTAS.FN_AGENDA_DIARIA(1, SYSDATE + 22);
    FETCH v_cursor INTO v_num1, v_num2, v_str1, v_str2, v_str3, v_str4, v_str5;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('CON02 | FN_AGENDA_DIARIA(medico=1, +22d) => Cita ID='
            || v_num1 || ' | ' || v_str1 || '-' || v_str2 || ' | Pac: ' || v_str3 || ' | ' || v_str4);
    ELSE
        DBMS_OUTPUT.PUT_LINE('CON02 | FN_AGENDA_DIARIA => Sin citas para esa fecha');
    END IF;
    CLOSE v_cursor;

    -- CON03: Historial clínico del paciente (datos semilla)
    v_cursor := APP_CLINICA.PKG_CONSULTAS.FN_HISTORIAL_PACIENTE(1);
    FETCH v_cursor INTO v_num1, v_date1, v_str1, v_str2, v_str3, v_str4, v_str5, v_str6, v_char1;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('CON03 | FN_HISTORIAL_PACIENTE(pac=1) => Cita ID='
            || v_num1 || ' | ' || TO_CHAR(v_date1,'DD/MM/YYYY') || ' | Med: ' || v_str3 || ' | ' || v_str5);
    ELSE
        DBMS_OUTPUT.PUT_LINE('CON03 | FN_HISTORIAL_PACIENTE => Sin historial para paciente 1');
    END IF;
    CLOSE v_cursor;

    -- CON04: Citas por especialidad en rango de fechas
    v_cursor := APP_CLINICA.PKG_CONSULTAS.FN_CITAS_POR_ESPECIALIDAD(1, SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_num1, v_date1, v_str1, v_str2, v_str3;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('CON04 | FN_CITAS_POR_ESPECIALIDAD(esp=1) => Cita ID='
            || v_num1 || ' | ' || TO_CHAR(v_date1,'DD/MM/YYYY') || ' | Med: ' || v_str1 || ' | Estado: ' || v_str3);
    ELSE
        DBMS_OUTPUT.PUT_LINE('CON04 | FN_CITAS_POR_ESPECIALIDAD => Sin citas en rango');
    END IF;
    CLOSE v_cursor;

    -- CON05: Citas filtradas por estado (estado=1 Pendiente, medico=1)
    v_cursor := APP_CLINICA.PKG_CONSULTAS.FN_CITAS_POR_ESTADO(1, 1, SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_num1, v_date1, v_str1, v_str2, v_num2, v_str3, v_str4;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('CON05 | FN_CITAS_POR_ESTADO(estado=1,med=1) => Cita ID='
            || v_num1 || ' | ' || TO_CHAR(v_date1,'DD/MM/YYYY') || ' | Pac: ' || v_str3);
    ELSE
        DBMS_OUTPUT.PUT_LINE('CON05 | FN_CITAS_POR_ESTADO => Sin citas Pendientes para ese medico');
    END IF;
    CLOSE v_cursor;


    -- =========================================================================
    -- BLOQUE 5 — PKG_REPORTES (REP01 a REP05)
    -- =========================================================================
    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- BLOQUE 5: PKG_REPORTES ---');

    -- REP01: Citas por médico con promedio diario
    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_CITAS_POR_MEDICO(SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1, v_num2, v_num3, v_num4;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP01 | FN_RPT_CITAS_POR_MEDICO => Medico: ' || v_str1
            || ' | Total=' || v_num1 || ' | Atendidas=' || v_num2
            || ' | Canceladas=' || v_num3 || ' | Prom/dia=' || v_num4);
    ELSE
        DBMS_OUTPUT.PUT_LINE('REP01 | FN_RPT_CITAS_POR_MEDICO => Sin datos en rango');
    END IF;
    CLOSE v_cursor;

    -- REP02: Demanda por especialidad
    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_CITAS_POR_ESPECIALIDAD(SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP02 | FN_RPT_CITAS_POR_ESPECIALIDAD => '
            || v_str1 || ': ' || v_num1 || ' citas');
    ELSE
        DBMS_OUTPUT.PUT_LINE('REP02 | FN_RPT_CITAS_POR_ESPECIALIDAD => Sin datos');
    END IF;
    CLOSE v_cursor;

    -- REP03: Análisis de cancelaciones (motivos + tasa por médico + tasa por paciente)
    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_CANCELACIONES(SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP03 | FN_RPT_CANCELACIONES => Motivo: "'
            || v_str1 || '" | Frecuencia: ' || v_num1);
    ELSE
        DBMS_OUTPUT.PUT_LINE('REP03 | FN_RPT_CANCELACIONES => Sin cancelaciones en rango');
    END IF;
    CLOSE v_cursor;

    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_CANCEL_POR_MEDICO(SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1, v_num2, v_num3;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP03 | FN_RPT_CANCEL_POR_MEDICO => '
            || v_str1 || ' | Total=' || v_num1 || ' | Canceladas=' || v_num2 || ' | %=' || v_num3);
    END IF;
    CLOSE v_cursor;

    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_CANCEL_POR_PACIENTE(SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1, v_num2, v_num3;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP03 | FN_RPT_CANCEL_POR_PACIENTE => '
            || v_str1 || ' | Total=' || v_num1 || ' | Canceladas=' || v_num2 || ' | %=' || v_num3);
    ELSE
        DBMS_OUTPUT.PUT_LINE('REP03 | FN_RPT_CANCEL_POR_PACIENTE => Sin pacientes con cancelaciones');
    END IF;
    CLOSE v_cursor;

    -- REP04: Pacientes atendidos con clasificación NUEVO / RECURRENTE
    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_PACIENTES_ATENDIDOS(SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1, v_str2;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP04 | FN_RPT_PACIENTES_ATENDIDOS => '
            || v_str1 || ' | Visitas=' || v_num1 || ' | Tipo=' || v_str2);
    ELSE
        DBMS_OUTPUT.PUT_LINE('REP04 | FN_RPT_PACIENTES_ATENDIDOS => Sin citas Atendidas en rango');
    END IF;
    CLOSE v_cursor;

    -- REP05: Franja horaria con mayor demanda
    v_cursor := APP_CLINICA.PKG_REPORTES.FN_RPT_OCUPACION_HORARIA(NULL, SYSDATE - 365, SYSDATE + 365);
    FETCH v_cursor INTO v_str1, v_num1;
    IF v_cursor%FOUND THEN
        DBMS_OUTPUT.PUT_LINE('REP05 | FN_RPT_OCUPACION_HORARIA(todos los medicos) => '
            || 'Franja ' || v_str1 || ' | Demanda: ' || v_num1 || ' citas');
    ELSE
        DBMS_OUTPUT.PUT_LINE('REP05 | FN_RPT_OCUPACION_HORARIA => Sin datos en rango');
    END IF;
    CLOSE v_cursor;

    -- =========================================================================
    DBMS_OUTPUT.PUT_LINE(CHR(10) || '======================================================');
    DBMS_OUTPUT.PUT_LINE('  >>> 25 REQUERIMIENTOS DEMOSTRADOS EXITOSAMENTE <<<');
    DBMS_OUTPUT.PUT_LINE('======================================================');

    -- Deshacer DML de VAL/SEG/CON (sin COMMIT interno): citas, notificaciones, sesiones de prueba.
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('(DML VAL/SEG/CON revertidos con ROLLBACK)');

    -- Post-limpieza de datos ADM (ya comprometidos por COMMIT interno de PKG_ADMINISTRACION).
    -- Orden inverso de FKs: usuario → horario → médico → paciente → especialidad
    DELETE FROM SEG_CLINICA.USUARIOS WHERE USERNAME = 'recepTest';
    DELETE FROM APP_CLINICA.HORARIOS_MEDICO
        WHERE MEDICO_ID IN (SELECT MEDICO_ID FROM APP_CLINICA.MEDICOS WHERE NRO_COLEGIATURA = 'CMP-TEST-01');
    DELETE FROM APP_CLINICA.MEDICOS WHERE NRO_COLEGIATURA = 'CMP-TEST-01';
    DELETE FROM APP_CLINICA.PACIENTES WHERE DNI = '99887766';
    DELETE FROM APP_CLINICA.ESPECIALIDADES WHERE NOMBRE = 'Geriatria_Test';
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('(Datos ADM de prueba eliminados — script idempotente)');

    DBMS_OUTPUT.PUT_LINE(CHR(10) || '>>> FIN: base de datos en estado semilla original <<<');

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        -- Intentar limpiar ADM de prueba aunque el bloque principal haya fallado
        BEGIN
            DELETE FROM SEG_CLINICA.USUARIOS WHERE USERNAME = 'recepTest';
            DELETE FROM APP_CLINICA.HORARIOS_MEDICO
                WHERE MEDICO_ID IN (SELECT MEDICO_ID FROM APP_CLINICA.MEDICOS WHERE NRO_COLEGIATURA = 'CMP-TEST-01');
            DELETE FROM APP_CLINICA.MEDICOS WHERE NRO_COLEGIATURA = 'CMP-TEST-01';
            DELETE FROM APP_CLINICA.PACIENTES WHERE DNI = '99887766';
            DELETE FROM APP_CLINICA.ESPECIALIDADES WHERE NOMBRE = 'Geriatria_Test';
            COMMIT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        DBMS_OUTPUT.PUT_LINE('ERROR en prueba: ' || SQLERRM);
        RAISE;
END;
/
