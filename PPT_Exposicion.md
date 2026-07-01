# PRESENTACIÓN DE EXPOSICIÓN TÉCNICA
## SISTEMA DE CITAS MÉDICAS Y AUDITORÍA - CLÍNICA SALUD Y VIDA

---

### DIAPOSITIVA 1: PORTADA Y CARÁTULA
* **Título:** Sistema Integral de Citas Médicas y Auditoría Centralizada Multiesquema
* **Subtítulo:** Sustentación de Proyecto Final (PC4)
* **Curso:** Diseño y Arquitectura de Base de Datos (SW609 - SEC-U)
* **Presentadores:** Grupo de Proyecto
* **Tecnologías:** Oracle Database 19c, PL/SQL, Node.js/Express, React.js

---

### DIAPOSITIVA 2: CONTEXTO DEL CASO Y PROBLEMA A RESOLVER
* **Contexto:** La *Clínica Salud y Vida* necesitaba migrar su antigua gestión de citas manuales/descentralizada a una plataforma corporativa en la nube.
* **Problemáticas Identificadas:**
  * **Solapamiento horaria:** Citas duplicadas para el mismo médico a la misma hora (colisiones de negocio).
  * **Inseguridad de datos:** Credenciales de usuario guardadas en texto plano y visibilidad descontrolada de datos de pacientes.
  * **Falta de Trazabilidad:** No existía registro histórico de quién agendaba, cancelaba o modificaba los registros clínicos.
  * **Rendimiento Lento:** Consultas lentas de disponibilidad de médicos durante horas pico.

---

### DIAPOSITIVA 3: ARQUITECTURA DE ESQUEMAS EN ORACLE
* **Separación de Responsabilidades:** Implementación de arquitectura multiesquema para aislar la capa de seguridad de la capa de negocio.
* **1. Esquema `SEG_CLINICA` (Seguridad):**
  * Tabla `ROLES` y `USUARIOS` (con hashes y exclusión del campo password en vistas).
  * Tabla `SESIONES` (tokens generados criptográficamente).
  * Tabla `AUDITORIA` (bitácora centralizada de eventos).
* **2. Esquema `APP_CLINICA` (Negocio):**
  * Tablas `PACIENTES`, `MEDICOS`, `ESPECIALIDADES`, `HORARIOS_MEDICO`, `CITAS`, `NOTIFICACIONES`.
  * Comunicación regulada mediante `GRANTS` precisos y `SINÓNIMOS` privados para evitar acoplamientos.

---

### DIAPOSITIVA 4: PROTOCOLO DE SEGURIDAD (DBMS_CRYPTO)
* **Hashing de Contraseñas (SEG01):**
  * Uso de la función `SYS.DBMS_CRYPTO.HASH` con algoritmo `HASH_SH256` y salting para contraseñas de usuarios. Nunca se almacena texto plano.
* **Tokens de Sesión (SEG02 / SEG04):**
  * Generación dinámica de UUID de 128 bits mediante `SYS_GUID()` al iniciar sesión. Expiración controlada en base de datos.
* **Aislamiento por Médico (SEG03):**
  * Utilización de funciones de filtro para que un médico únicamente pueda consultar su propia agenda basándose en el ID de su token de sesión.

---

### DIAPOSITIVA 5: ARQUITECTURA DE PAQUETES PL/SQL
* **Premisa de Diseño:** Toda la lógica de negocio debe residir en la base de datos para garantizar la integridad y velocidad.
* **Estructura de Paquetes:**
  * `PKG_SEGURIDAD`: Login, validación de tokens y sesiones.
  * `PKG_ADMINISTRACION`: CRUD seguro de entidades del sistema.
  * `PKG_VALOR` (Ex PKG_CITAS): Reglas de negocio de citas.
  * `PKG_CONSULTAS`: Búsqueda de franjas libres y agendas diarias.
  * `PKG_REPORTES`: Consultas gerenciales complejas consolidadas.
* **Ventaja:** Cero código de negocio en el backend (Node.js). Si cambia el flujo de citas, solo se actualiza PL/SQL sin apagar los servidores web.

---

### DIAPOSITIVA 6: LOGICA DE NEGOCIO PRINCIPAL (PKG_VALOR)
* **Agendar Cita (VAL01):** Operación que valida de forma atómica la existencia del médico, especialidad y horario de atención antes de consolidar.
* **Cancelar Cita (VAL02):** Cambia estado a 'Cancelada' y libera la franja horaria inmediatamente.
* **Reprogramar Cita (VAL03):** Operación transaccional con `SAVEPOINT`. Cancela la cita previa y agenda la nueva de forma atómica. Si una falla, se hace rollback completo.
* **Impedir Empates de Citas (VAL05):** El trigger `TRG_IMPEDIR_EMPATE_CITA` a nivel de base de datos impide de manera absoluta que exista traslape de citas para un mismo médico, incluso si las peticiones se realizan simultáneamente por hilos diferentes.

---

### DIAPOSITIVA 7: TRAZABILIDAD Y AUDITORÍA SILENCIOSA
* **Triggers de Auditoría (SEG05):**
  * Diseñados en `APP_CLINICA` para interceptar `INSERT`, `UPDATE` y `DELETE` en las tablas `CITAS` y `PACIENTES`.
* **Registro de Auditoría:**
  * En lugar de insertar directo, llaman de manera segura al procedimiento centralizado `SEG_CLINICA.PKG_SEGURIDAD.SP_REGISTRAR_AUDITORIA`.
  * Se almacena el estado completo anterior y posterior del registro en formato JSON dentro de una columna de tipo `CLOB` para auditorías técnicas avanzadas.

---

### DIAPOSITIVA 8: OPTIMIZACIÓN Y REPORTES GERENCIALES
* **Búsquedas Rápidas (Índices):**
  * Creación de índices compuestos B-Tree sobre `FECHA_CITA`, `ESTADO_CITA_ID` e índices individuales sobre llaves foráneas (`PACIENTE_ID`, `MEDICO_ID`). Búsquedas reducidas de segundos a milisegundos.
* **Reportes Analíticos Implementados:**
  * **REP01:** Citas por médico (Totales, Atendidas, Canceladas, Promedio Diario).
  * **REP02:** Ocupación por especialidades en un rango de fechas.
  * **REP03:** Análisis de motivos comunes de cancelaciones.
  * **REP04:** Tasa de retorno de pacientes (Pacientes Nuevos vs. Recurrentes).
  * **REP05:** Tasa de ocupación de franjas horarias (Mañana vs. Tarde).

---

### DIAPOSITIVA 9: CAPA DE APLICACIÓN Y FULL STACK INTEGRATION
* **Backend (Node.js & Express):**
  * Funciona como un orquestador ligero y seguro.
  * Autenticación vía middleware que valida el token del header directamente en la tabla `SESIONES` de Oracle.
* **Frontend (React.js SPA):**
  * Dashboard gerencial responsivo con gráficos interactivos.
  * Paneles diferenciados con menús adaptables en tiempo real según el rol del usuario autenticado (Administrador, Recepcionista, Médico).
  * Consumo ágil de servicios REST con Axios.

---

### DIAPOSITIVA 10: CONCLUSIONES Y LECCIONES TÉCNICAS
1. **Delegación Inteligente:** Procesar la lógica compleja (como reprogramaciones y recordatorios por jobs) directamente en Oracle evita latencias de red y agiliza el backend.
2. **Seguridad Integrada:** El uso de hashes SHA-256 e identidades criptográficas previene la inyección y el robo de credenciales en reposo.
3. **Robustez Transaccional:** La combinación de triggers a nivel de BD con la lógica transaccional en paquetes asegura que las reglas de negocio se cumplan siempre, sin importar de qué aplicación cliente provengan las peticiones.
