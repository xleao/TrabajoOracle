const oracledb = require('oracledb');
require('dotenv').config();

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || 'JRODRIGUEZ',
      connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/orcl',
    });
    
    const sql = `
      DECLARE
        v_total_pacientes NUMBER;
        v_paciente_id NUMBER;
        v_estado NUMBER;
        v_hora_ini VARCHAR2(5);
        v_hora_fin VARCHAR2(5);
      BEGIN
        -- Desactivar el trigger de conflicto temporalmente para evitar problemas de solapamiento
        EXECUTE IMMEDIATE 'ALTER TRIGGER APP_CLINICA.TRG_IMPEDIR_EMPATE_CITA DISABLE';
        
        SELECT COUNT(*) INTO v_total_pacientes FROM APP_CLINICA.PACIENTES;
        
        -- 1. Asegurar que los médicos tengan horario los domingos (1) para que funcione bien la interfaz
        FOR m IN (SELECT MEDICO_ID FROM APP_CLINICA.MEDICOS) LOOP
            BEGIN
                INSERT INTO APP_CLINICA.HORARIOS_MEDICO (HORARIO_ID, MEDICO_ID, DIA_SEMANA, HORA_INICIO, HORA_FIN, DURACION_CITA_MIN, ESTADO)
                VALUES (APP_CLINICA.SEQ_HORARIOS.NEXTVAL, m.MEDICO_ID, 1, '08:00', '18:00', 30, 'A');
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;
        
        -- 2. Insertar citas para HOY (Domingo)
        FOR m IN (SELECT MEDICO_ID, ESPECIALIDAD_ID FROM APP_CLINICA.MEDICOS) LOOP
            FOR i IN 1..5 LOOP
                v_paciente_id := TRUNC(DBMS_RANDOM.VALUE(1, v_total_pacientes + 1));
                -- horas: 08:00, 09:00, 10:00, 11:00, 12:00
                v_hora_ini := LPAD(7 + i, 2, '0') || ':00';
                v_hora_fin := LPAD(7 + i, 2, '0') || ':30';
                
                -- estados (1: Pendiente, 2: Confirmada, 3: En Atención, 4: Atendida)
                v_estado := TRUNC(DBMS_RANDOM.VALUE(1, 5));
                
                INSERT INTO APP_CLINICA.CITAS (
                    CITA_ID, PACIENTE_ID, MEDICO_ID, ESPECIALIDAD_ID, FECHA_CITA, 
                    HORA_INICIO, HORA_FIN, ESTADO_CITA_ID, MOTIVO_CONSULTA, USUARIO_CREACION
                ) VALUES (
                    APP_CLINICA.SEQ_CITAS.NEXTVAL, v_paciente_id, m.MEDICO_ID, m.ESPECIALIDAD_ID, 
                    TRUNC(SYSDATE), v_hora_ini, v_hora_fin, v_estado, 'Cita programada para prueba de interfaz', 1
                );
            END LOOP;
        END LOOP;
        
        COMMIT;
        EXECUTE IMMEDIATE 'ALTER TRIGGER APP_CLINICA.TRG_IMPEDIR_EMPATE_CITA ENABLE';
      END;
    `;
    
    await connection.execute(sql);
    console.log('Citas generadas para HOY exitosamente.');
    
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}
run();
