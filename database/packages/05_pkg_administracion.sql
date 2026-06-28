-- ==============================================================================
-- SCRIPT 05: PAQUETE PKG_ADMINISTRACION (ESPECIFICACIÓN Y CUERPO)
-- ==============================================================================

CREATE OR REPLACE PACKAGE APP_CLINICA.PKG_ADMINISTRACION AS
    PROCEDURE SP_GESTIONAR_PACIENTE(
        p_accion IN CHAR, -- 'I' = Insert, 'U' = Update
        p_paciente_id IN OUT NUMBER,
        p_nombres IN VARCHAR2, p_apellidos IN VARCHAR2, p_dni IN VARCHAR2,
        p_fecha_nacimiento IN DATE, p_telefono IN VARCHAR2, p_email IN VARCHAR2,
        p_direccion IN VARCHAR2, p_estado IN CHAR
    );

    PROCEDURE SP_GESTIONAR_MEDICO(
        p_accion IN CHAR,
        p_medico_id IN OUT NUMBER,
        p_nombres IN VARCHAR2, p_apellidos IN VARCHAR2, p_nro_colegiatura IN VARCHAR2,
        p_especialidad_id IN NUMBER, p_telefono IN VARCHAR2, p_email IN VARCHAR2, p_estado IN CHAR
    );

    PROCEDURE SP_GESTIONAR_ESPECIALIDAD(
        p_accion IN CHAR, p_especialidad_id IN OUT NUMBER,
        p_nombre IN VARCHAR2, p_descripcion IN VARCHAR2, p_estado IN CHAR
    );

    PROCEDURE SP_GESTIONAR_HORARIO(
        p_accion IN CHAR, p_horario_id IN OUT NUMBER,
        p_medico_id IN NUMBER, p_dia_semana IN NUMBER, p_hora_inicio IN VARCHAR2,
        p_hora_fin IN VARCHAR2, p_duracion_cita_min IN NUMBER, p_estado IN CHAR
    );

    PROCEDURE SP_GESTIONAR_USUARIO(
        p_accion IN CHAR, p_usuario_id IN OUT NUMBER,
        p_username IN VARCHAR2, p_password IN VARCHAR2, p_nombre_completo IN VARCHAR2,
        p_email IN VARCHAR2, p_rol_id IN NUMBER, p_medico_id IN NUMBER, p_estado IN CHAR
    );
END PKG_ADMINISTRACION;
/

CREATE OR REPLACE PACKAGE BODY APP_CLINICA.PKG_ADMINISTRACION AS

    PROCEDURE SP_GESTIONAR_PACIENTE(
        p_accion IN CHAR, p_paciente_id IN OUT NUMBER, p_nombres IN VARCHAR2,
        p_apellidos IN VARCHAR2, p_dni IN VARCHAR2, p_fecha_nacimiento IN DATE,
        p_telefono IN VARCHAR2, p_email IN VARCHAR2, p_direccion IN VARCHAR2, p_estado IN CHAR
    ) IS
    BEGIN
        IF p_accion = 'I' THEN
            p_paciente_id := APP_CLINICA.SEQ_PACIENTES.NEXTVAL;
            INSERT INTO APP_CLINICA.PACIENTES (
                PACIENTE_ID, NOMBRES, APELLIDOS, DNI, FECHA_NACIMIENTO, TELEFONO, EMAIL, DIRECCION, ESTADO
            ) VALUES (
                p_paciente_id, p_nombres, p_apellidos, p_dni, p_fecha_nacimiento, p_telefono, p_email, p_direccion, p_estado
            );
        ELSIF p_accion = 'U' THEN
            UPDATE APP_CLINICA.PACIENTES SET
                NOMBRES = p_nombres, APELLIDOS = p_apellidos, DNI = p_dni,
                FECHA_NACIMIENTO = p_fecha_nacimiento, TELEFONO = p_telefono,
                EMAIL = p_email, DIRECCION = p_direccion, ESTADO = p_estado
            WHERE PACIENTE_ID = p_paciente_id;
        END IF;
        COMMIT;
    END SP_GESTIONAR_PACIENTE;

    PROCEDURE SP_GESTIONAR_MEDICO(
        p_accion IN CHAR, p_medico_id IN OUT NUMBER, p_nombres IN VARCHAR2,
        p_apellidos IN VARCHAR2, p_nro_colegiatura IN VARCHAR2, p_especialidad_id IN NUMBER,
        p_telefono IN VARCHAR2, p_email IN VARCHAR2, p_estado IN CHAR
    ) IS
    BEGIN
        IF p_accion = 'I' THEN
            p_medico_id := APP_CLINICA.SEQ_MEDICOS.NEXTVAL;
            INSERT INTO APP_CLINICA.MEDICOS (
                MEDICO_ID, NOMBRES, APELLIDOS, NRO_COLEGIATURA, ESPECIALIDAD_ID, TELEFONO, EMAIL, ESTADO
            ) VALUES (
                p_medico_id, p_nombres, p_apellidos, p_nro_colegiatura, p_especialidad_id, p_telefono, p_email, p_estado
            );
        ELSIF p_accion = 'U' THEN
            UPDATE APP_CLINICA.MEDICOS SET
                NOMBRES = p_nombres, APELLIDOS = p_apellidos, NRO_COLEGIATURA = p_nro_colegiatura,
                ESPECIALIDAD_ID = p_especialidad_id, TELEFONO = p_telefono, EMAIL = p_email, ESTADO = p_estado
            WHERE MEDICO_ID = p_medico_id;
        END IF;
        COMMIT;
    END SP_GESTIONAR_MEDICO;

    PROCEDURE SP_GESTIONAR_ESPECIALIDAD(
        p_accion IN CHAR, p_especialidad_id IN OUT NUMBER,
        p_nombre IN VARCHAR2, p_descripcion IN VARCHAR2, p_estado IN CHAR
    ) IS
    BEGIN
        IF p_accion = 'I' THEN
            p_especialidad_id := APP_CLINICA.SEQ_ESPECIALIDADES.NEXTVAL;
            INSERT INTO APP_CLINICA.ESPECIALIDADES (
                ESPECIALIDAD_ID, NOMBRE, DESCRIPCION, ESTADO
            ) VALUES (
                p_especialidad_id, p_nombre, p_descripcion, p_estado
            );
        ELSIF p_accion = 'U' THEN
            UPDATE APP_CLINICA.ESPECIALIDADES SET
                NOMBRE = p_nombre, DESCRIPCION = p_descripcion, ESTADO = p_estado
            WHERE ESPECIALIDAD_ID = p_especialidad_id;
        END IF;
        COMMIT;
    END SP_GESTIONAR_ESPECIALIDAD;

    PROCEDURE SP_GESTIONAR_HORARIO(
        p_accion IN CHAR, p_horario_id IN OUT NUMBER, p_medico_id IN NUMBER,
        p_dia_semana IN NUMBER, p_hora_inicio IN VARCHAR2, p_hora_fin IN VARCHAR2,
        p_duracion_cita_min IN NUMBER, p_estado IN CHAR
    ) IS
        v_overlap_count NUMBER;
    BEGIN
        -- Validar solapamiento de horarios (solo si el nuevo/modificado estado es Activo)
        IF p_estado = 'A' THEN
            SELECT COUNT(1) INTO v_overlap_count
            FROM APP_CLINICA.HORARIOS_MEDICO
            WHERE MEDICO_ID = p_medico_id
              AND DIA_SEMANA = p_dia_semana
              AND ESTADO = 'A'
              AND HORA_INICIO < p_hora_fin
              AND HORA_FIN > p_hora_inicio
              AND (p_accion = 'I' OR HORARIO_ID <> p_horario_id);
              
            IF v_overlap_count > 0 THEN
                RAISE_APPLICATION_ERROR(-20005, 'El horario ingresado se solapa con otro horario activo del médico en el mismo día.');
            END IF;
        END IF;

        IF p_accion = 'I' THEN
            p_horario_id := APP_CLINICA.SEQ_HORARIOS.NEXTVAL;
            INSERT INTO APP_CLINICA.HORARIOS_MEDICO (
                HORARIO_ID, MEDICO_ID, DIA_SEMANA, HORA_INICIO, HORA_FIN, DURACION_CITA_MIN, ESTADO
            ) VALUES (
                p_horario_id, p_medico_id, p_dia_semana, p_hora_inicio, p_hora_fin, p_duracion_cita_min, p_estado
            );
        ELSIF p_accion = 'U' THEN
            UPDATE APP_CLINICA.HORARIOS_MEDICO SET
                MEDICO_ID = p_medico_id, DIA_SEMANA = p_dia_semana, HORA_INICIO = p_hora_inicio,
                HORA_FIN = p_hora_fin, DURACION_CITA_MIN = p_duracion_cita_min, ESTADO = p_estado
            WHERE HORARIO_ID = p_horario_id;
        END IF;
        COMMIT;
    END SP_GESTIONAR_HORARIO;

    PROCEDURE SP_GESTIONAR_USUARIO(
        p_accion IN CHAR, p_usuario_id IN OUT NUMBER, p_username IN VARCHAR2,
        p_password IN VARCHAR2, p_nombre_completo IN VARCHAR2, p_email IN VARCHAR2,
        p_rol_id IN NUMBER, p_medico_id IN NUMBER, p_estado IN CHAR
    ) IS
        v_hash RAW(64);
    BEGIN
        IF p_password IS NOT NULL THEN
            v_hash := SEG_CLINICA.PKG_SEGURIDAD.FN_HASH_PASSWORD(p_password);
        ELSIF p_accion = 'I' THEN
            RAISE_APPLICATION_ERROR(-20006, 'La contraseña es obligatoria al registrar un usuario.');
        END IF;

        IF p_accion = 'I' THEN
            p_usuario_id := SEG_CLINICA.SEQ_USUARIOS.NEXTVAL;
            INSERT INTO SEG_CLINICA.USUARIOS (
                USUARIO_ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, EMAIL, ROL_ID, MEDICO_ID, ESTADO
            ) VALUES (
                p_usuario_id, p_username, v_hash, p_nombre_completo, p_email, p_rol_id, p_medico_id, p_estado
            );
        ELSIF p_accion = 'U' THEN
            IF p_password IS NOT NULL THEN
                UPDATE SEG_CLINICA.USUARIOS SET
                    USERNAME = p_username, PASSWORD_HASH = v_hash, NOMBRE_COMPLETO = p_nombre_completo,
                    EMAIL = p_email, ROL_ID = p_rol_id, MEDICO_ID = p_medico_id, ESTADO = p_estado
                WHERE USUARIO_ID = p_usuario_id;
            ELSE
                UPDATE SEG_CLINICA.USUARIOS SET
                    USERNAME = p_username, NOMBRE_COMPLETO = p_nombre_completo,
                    EMAIL = p_email, ROL_ID = p_rol_id, MEDICO_ID = p_medico_id, ESTADO = p_estado
                WHERE USUARIO_ID = p_usuario_id;
            END IF;
        END IF;
        COMMIT;
    END SP_GESTIONAR_USUARIO;

END PKG_ADMINISTRACION;
/
