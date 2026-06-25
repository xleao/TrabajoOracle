-- ==============================================================================
-- SCRIPT 04: PAQUETE PKG_SEGURIDAD (ESPECIFICACIÓN Y CUERPO)
-- ==============================================================================

CREATE OR REPLACE PACKAGE SEG_CLINICA.PKG_SEGURIDAD AS
    -- Genera hash SHA256 de una cadena de texto
    FUNCTION FN_HASH_PASSWORD(p_password IN VARCHAR2) RETURN RAW;
    
    -- Valida usuario y contraseña. Retorna USUARIO_ID o -1 si es inválido
    FUNCTION FN_AUTENTICAR(p_user IN VARCHAR2, p_pass IN VARCHAR2) RETURN NUMBER;
    
    -- Registra la sesión y genera un token seguro
    PROCEDURE SP_CREAR_SESION(p_usuario_id IN NUMBER, p_ip IN VARCHAR2, p_token OUT VARCHAR2);
    
    -- Cierra explícitamente una sesión
    PROCEDURE SP_CERRAR_SESION(p_token IN VARCHAR2);
    
    -- Retorna TRUE si el usuario tiene el rol indicado, FALSE si no.
    FUNCTION FN_VALIDAR_ROL(p_usuario_id IN NUMBER, p_rol IN VARCHAR2) RETURN BOOLEAN;
    
    -- Nuevos métodos de acceso para cumplimiento estricto
    FUNCTION FN_VALIDAR_TOKEN_SESION(p_token IN VARCHAR2) RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_USUARIOS RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_ROLES RETURN SYS_REFCURSOR;
    FUNCTION FN_LISTAR_AUDITORIA RETURN SYS_REFCURSOR;
END PKG_SEGURIDAD;
/

CREATE OR REPLACE PACKAGE BODY SEG_CLINICA.PKG_SEGURIDAD AS

    FUNCTION FN_HASH_PASSWORD(p_password IN VARCHAR2) RETURN RAW IS
    BEGIN
        RETURN SYS.DBMS_CRYPTO.HASH(
            src => UTL_I18N.STRING_TO_RAW(p_password, 'AL32UTF8'),
            typ => SYS.DBMS_CRYPTO.HASH_SH256
        );
    END FN_HASH_PASSWORD;

    FUNCTION FN_AUTENTICAR(p_user IN VARCHAR2, p_pass IN VARCHAR2) RETURN NUMBER IS
        v_usuario_id NUMBER;
        v_hash_input RAW(64);
    BEGIN
        v_hash_input := FN_HASH_PASSWORD(p_pass);
        
        SELECT USUARIO_ID INTO v_usuario_id
        FROM SEG_CLINICA.USUARIOS
        WHERE UPPER(USERNAME) = UPPER(p_user)
          AND PASSWORD_HASH = v_hash_input
          AND ESTADO = 'A';
          
        -- Actualizar fecha de último acceso
        UPDATE SEG_CLINICA.USUARIOS SET ULTIMO_ACCESO = SYSTIMESTAMP WHERE USUARIO_ID = v_usuario_id;
        COMMIT;
        
        RETURN v_usuario_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN -1;
    END FN_AUTENTICAR;

    PROCEDURE SP_CREAR_SESION(p_usuario_id IN NUMBER, p_ip IN VARCHAR2, p_token OUT VARCHAR2) IS
        v_raw_token RAW(32);
    BEGIN
        -- Generar un token único usando DBMS_CRYPTO.RANDOMBYTES (32 bytes)
        v_raw_token := SYS.DBMS_CRYPTO.RANDOMBYTES(32);
        p_token := RAWTOHEX(v_raw_token);
        
        INSERT INTO SEG_CLINICA.SESIONES (
            USUARIO_ID, TOKEN, FECHA_EXPIRACION, IP_CLIENTE, ESTADO
        ) VALUES (
            p_usuario_id, 
            p_token, 
            SYSTIMESTAMP + INTERVAL '12' HOUR, -- Sesión válida por 12 horas
            p_ip, 
            'A'
        );
        COMMIT;
    END SP_CREAR_SESION;

    PROCEDURE SP_CERRAR_SESION(p_token IN VARCHAR2) IS
    BEGIN
        UPDATE SEG_CLINICA.SESIONES
        SET ESTADO = 'C'
        WHERE TOKEN = p_token AND ESTADO = 'A';
        COMMIT;
    END SP_CERRAR_SESION;

    FUNCTION FN_VALIDAR_ROL(p_usuario_id IN NUMBER, p_rol IN VARCHAR2) RETURN BOOLEAN IS
        v_count NUMBER;
    BEGIN
        SELECT COUNT(1) INTO v_count
        FROM SEG_CLINICA.USUARIOS u
        JOIN SEG_CLINICA.ROLES r ON u.ROL_ID = r.ROL_ID
        WHERE u.USUARIO_ID = p_usuario_id
          AND r.NOMBRE = UPPER(p_rol)
          AND u.ESTADO = 'A'
          AND r.ESTADO = 'A';
          
        IF v_count > 0 THEN RETURN TRUE; ELSE RETURN FALSE; END IF;
    END FN_VALIDAR_ROL;

    FUNCTION FN_VALIDAR_TOKEN_SESION(p_token IN VARCHAR2) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT s.USUARIO_ID, u.USERNAME, u.NOMBRE_COMPLETO, u.ROL_ID, r.NOMBRE as ROL_NAME, u.MEDICO_ID
            FROM SEG_CLINICA.SESIONES s
            JOIN SEG_CLINICA.USUARIOS u ON s.USUARIO_ID = u.USUARIO_ID
            JOIN SEG_CLINICA.ROLES r ON u.ROL_ID = r.ROL_ID
            WHERE s.TOKEN = p_token 
              AND s.ESTADO = 'A' 
              AND s.FECHA_EXPIRACION > SYSTIMESTAMP;
        RETURN v_cursor;
    END FN_VALIDAR_TOKEN_SESION;

    FUNCTION FN_LISTAR_USUARIOS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT u.USUARIO_ID, u.USERNAME, u.NOMBRE_COMPLETO, u.EMAIL, u.ROL_ID, r.NOMBRE as ROL_NOMBRE, u.MEDICO_ID, u.ESTADO
            FROM SEG_CLINICA.USUARIOS u
            JOIN SEG_CLINICA.ROLES r ON u.ROL_ID = r.ROL_ID;
        RETURN v_cursor;
    END FN_LISTAR_USUARIOS;

    FUNCTION FN_LISTAR_ROLES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT ROL_ID, NOMBRE, DESCRIPCION, ESTADO FROM SEG_CLINICA.ROLES;
        RETURN v_cursor;
    END FN_LISTAR_ROLES;

    FUNCTION FN_LISTAR_AUDITORIA RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT a.AUDITORIA_ID, u.NOMBRE_COMPLETO as USUARIO, a.TABLA_AFECTADA, 
                   a.OPERACION, a.REGISTRO_ID, TO_CHAR(a.DATOS_ANTES) AS DATOS_ANTES, 
                   TO_CHAR(a.DATOS_DESPUES) AS DATOS_DESPUES, a.FECHA_HORA, a.IP_CLIENTE
            FROM SEG_CLINICA.AUDITORIA a
            LEFT JOIN SEG_CLINICA.USUARIOS u ON a.USUARIO_ID = u.USUARIO_ID
            ORDER BY a.FECHA_HORA DESC;
        RETURN v_cursor;
    END FN_LISTAR_AUDITORIA;

END PKG_SEGURIDAD;
/
