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
    const result = await connection.execute(
      `UPDATE APP_CLINICA.NOTIFICACIONES 
       SET MENSAJE = 'Recordatorio: Su cita médica es mañana.' 
       WHERE MENSAJE LIKE '%mÃ©dica%' OR MENSAJE LIKE '%maÃ±ana%'`
    );
    
    // Y actualizamos también la programación del job para futuros inserts
    try {
        await connection.execute(`
            BEGIN
                DBMS_SCHEDULER.drop_job(job_name => 'APP_CLINICA.JOB_RECORDATORIOS_24H', force => TRUE);
            EXCEPTION
                WHEN OTHERS THEN NULL;
            END;
        `);
        await connection.execute(`
            BEGIN
                DBMS_SCHEDULER.create_job (
                    job_name        => 'APP_CLINICA.JOB_RECORDATORIOS_24H',
                    job_type        => 'PLSQL_BLOCK',
                    job_action      => '
                        BEGIN
                            FOR r IN (
                                SELECT c.CITA_ID, c.PACIENTE_ID, p.NOMBRES
                                FROM APP_CLINICA.CITAS c
                                JOIN APP_CLINICA.PACIENTES p ON c.PACIENTE_ID = p.PACIENTE_ID
                                WHERE c.ESTADO_CITA_ID = 2 -- Confirmada
                                  AND TRUNC(c.FECHA_CITA) = TRUNC(SYSDATE + 1)
                                  AND c.CITA_ID NOT IN (SELECT CITA_ID FROM APP_CLINICA.NOTIFICACIONES WHERE TIPO = ''RECORDATORIO'')
                            ) LOOP
                                INSERT INTO APP_CLINICA.NOTIFICACIONES (NOTIFICACION_ID, CITA_ID, PACIENTE_ID, TIPO, MENSAJE)
                                VALUES (APP_CLINICA.SEQ_NOTIFICACIONES.NEXTVAL, r.CITA_ID, r.PACIENTE_ID, ''RECORDATORIO'', ''Recordatorio: Su cita médica es mañana.'');
                            END LOOP;
                            COMMIT;
                        END;',
                    start_date      => SYSTIMESTAMP,
                    repeat_interval => 'freq=hourly', -- Cada 1 hora
                    enabled         => TRUE
                );
            END;
        `);
    } catch (jobErr) {
        console.error("Error recreating job:", jobErr);
    }
    
    await connection.commit();
    console.log('Rows updated:', result.rowsAffected);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}
run();
