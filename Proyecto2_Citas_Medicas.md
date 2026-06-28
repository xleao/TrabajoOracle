





UNIVERSIDAD NACIONAL DE INGENIERÍA
FACULTAD DE INGENIERÍA INDUSTRIAL Y DE SISTEMAS


SW609 — SISTEMAS DE GESTIÓN DE BASE DE DATOS


PROYECTO 2
Sistema de Gestión de Citas Médicas
para una Clínica




Docente: Dr. Eric Gustavo Coronel Castillo
Ciclo Académico: 2026-1







Integrantes:
[Nombre del alumno 1]
[Nombre del alumno 2]
[Nombre del alumno 3]

1. CONTEXTO DEL NEGOCIO
La Clínica «Salud y Vida» es un centro médico de tamaño mediano que atiende consultas en distintas especialidades, entre ellas medicina general, pediatría, traumatología y ginecología. Cuenta con un equipo de aproximadamente cinco médicos y un personal de recepción que gestiona la agenda de cada uno de ellos. Actualmente, toda la programación de citas se realiza de forma manual en un cuaderno físico ubicado en el área de recepción.
Este modelo de gestión ha derivado en problemas recurrentes: empates de horario entre pacientes asignados al mismo médico, dificultades para reprogramar citas cuando un médico no puede atender, y escasa visibilidad de la disponibilidad real de cada especialista. Los pacientes que llaman para consultar o modificar sus citas deben esperar mientras el recepcionista revisa manualmente el cuaderno, incrementando los tiempos de atención y generando insatisfacción.
1.1 Problemática Identificada
A partir del análisis del contexto del negocio, se identifican los siguientes problemas principales que el sistema debe resolver:
1. Empates de horarios: dos o más pacientes son asignados al mismo médico en la misma franja horaria sin que el personal lo detecte.
2. Reprogramación manual ineficiente: cuando un médico cancela su disponibilidad, no existe un mecanismo ágil para reubicar las citas afectadas.
3. Falta de visibilidad: el recepcionista no puede ver en tiempo real la disponibilidad de los médicos sin revisar físicamente el cuaderno.
4. Ausencia de recordatorios: los pacientes no reciben avisos previos sobre sus citas, lo que genera ausentismo.
5. Sin historial consultable: no existe un registro digital del historial de citas de cada paciente para seguimiento.
6. Reportes manuales: la elaboración de estadísticas de atención consume tiempo y es propensa a errores.
1.2 Alcance del Sistema
El sistema se enfoca exclusivamente en la gestión de citas médicas. No incluye historia clínica electrónica, facturación, ni integración con sistemas externos. La solución opera dentro de la red interna de la clínica.
1.3 Arquitectura Tecnológica
La solución se implementará bajo la siguiente arquitectura:
• Base de datos: Oracle Database con toda la lógica de negocio implementada en PL/SQL (procedimientos almacenados, funciones, triggers, paquetes y vistas).
• Frontend: Aplicación web desarrollada en React (responsive para PC y tablets), que consume los servicios expuestos por la base de datos a través de Oracle REST Data Services (ORDS) o una capa API mínima.
• Diseño de BD: Organizada en al menos 2 esquemas Oracle para separar las responsabilidades de seguridad y lógica de negocio.

2. REQUERIMIENTOS FUNCIONALES
A continuación se detallan los 25 requerimientos funcionales del sistema, organizados en cinco categorías de cinco requerimientos cada una, conforme a los lineamientos del curso.
2.1 Requerimientos Funcionales de Negocio
Estos requerimientos representan las funcionalidades centrales que agregan valor directo al proceso de gestión de citas médicas.

Código
Descripción
Prioridad
RFN-01
El sistema debe permitir agendar una cita médica seleccionando paciente, médico, especialidad, fecha y hora, verificando automáticamente la disponibilidad del médico antes de confirmar.
Alta
RFN-02
El sistema debe permitir cancelar una cita registrada, liberando automáticamente la franja horaria del médico para que pueda ser reasignada a otro paciente.
Alta
RFN-03
El sistema debe permitir reprogramar una cita existente a una nueva fecha/hora, ejecutando la cancelación de la cita original y la creación de la nueva en una sola operación atómica.
Alta
RFN-04
El sistema debe generar recordatorios automáticos para los pacientes con al menos 24 horas de anticipación a su cita programada, registrando el aviso en una tabla de notificaciones.
Media
RFN-05
El sistema debe impedir la asignación de dos o más citas al mismo médico en la misma fecha y franja horaria, garantizando la integridad mediante validación en la base de datos (trigger o constraint).
Alta

2.2 Requerimientos Funcionales de Seguridad
Estos requerimientos garantizan la protección de datos sensibles, el control de acceso y la trazabilidad de las operaciones del sistema.

Código
Descripción
Prioridad
RFS-01
El sistema debe autenticar a los usuarios mediante credenciales (usuario y contraseña), almacenando las contraseñas con algoritmo de hash (nunca en texto plano) usando DBMS_CRYPTO de Oracle.
Alta
RFS-02
El sistema debe implementar un esquema de roles diferenciados: Recepcionista (gestión completa de citas y pacientes) y Médico (consulta exclusiva de su propia agenda).
Alta
RFS-03
Un médico no debe poder visualizar la agenda de otro médico bajo ninguna circunstancia; las consultas deben filtrar automáticamente por el usuario en sesión.
Alta
RFS-04
Los datos personales de los pacientes (nombre, teléfono, correo, DNI) deben estar protegidos y ser accesibles únicamente para usuarios autenticados con el rol correspondiente.
Alta
RFS-05
Toda operación crítica (crear, modificar, cancelar citas; crear/editar pacientes) debe quedar registrada en una tabla de auditoría con usuario, acción, fecha/hora y datos afectados.
Alta

2.3 Requerimientos Funcionales Administrativos
Estos requerimientos cubren la gestión y mantenimiento de los datos maestros del sistema.

Código
Descripción
Prioridad
RFA-01
El sistema debe permitir registrar, editar, activar e inactivar pacientes con sus datos personales: nombres, apellidos, DNI, fecha de nacimiento, teléfono, correo electrónico y dirección.
Alta
RFA-02
El sistema debe permitir registrar, editar, activar e inactivar médicos con sus datos: nombres, apellidos, número de colegiatura, especialidad asignada, teléfono y correo.
Alta
RFA-03
El sistema debe permitir gestionar el catálogo de especialidades médicas (CRUD): nombre de la especialidad, descripción y estado activo/inactivo.
Media
RFA-04
El sistema debe permitir configurar los horarios de atención de cada médico por día de la semana, definiendo hora de inicio, hora de fin y duración estándar de cada cita (en minutos).
Alta
RFA-05
El sistema debe permitir gestionar los usuarios del sistema (CRUD), asignando credenciales de acceso y rol (Recepcionista, Médico o Administrador) a cada uno.
Alta

2.4 Requerimientos Funcionales de Consultas
Estos requerimientos definen las búsquedas y consultas operativas que el personal necesita en el día a día.

Código
Descripción
Prioridad
RFC-01
El sistema debe permitir consultar la disponibilidad de un médico en una fecha específica, mostrando las franjas horarias libres y ocupadas según su horario configurado.
Alta
RFC-02
El sistema debe permitir consultar todas las citas programadas del día para un médico específico, mostrando hora, paciente, especialidad y estado de la cita.
Alta
RFC-03
El sistema debe permitir consultar el historial completo de citas de un paciente, incluyendo citas atendidas, canceladas y pendientes, ordenadas por fecha.
Alta
RFC-04
El sistema debe permitir buscar citas por especialidad y rango de fechas, mostrando todos los médicos de esa especialidad y sus citas asociadas.
Media
RFC-05
El sistema debe permitir consultar las citas filtradas por estado (Pendiente, Confirmada, En Atención, Atendida, Cancelada) con opción de filtrar por médico y rango de fechas.
Media

2.5 Requerimientos Funcionales de Reportes
Estos requerimientos definen los reportes estadísticos y gerenciales que el sistema debe generar para la toma de decisiones.

Código
Descripción
Prioridad
RFR-01
El sistema debe generar un reporte de citas atendidas por médico en un rango de fechas, mostrando la cantidad total de citas, el porcentaje de citas atendidas vs. canceladas y el promedio de citas diarias.
Alta
RFR-02
El sistema debe generar un reporte de citas por especialidad en un período, indicando cuántas citas tuvo cada especialidad, permitiendo identificar las de mayor demanda.
Media
RFR-03
El sistema debe generar un reporte de cancelaciones que muestre la cantidad de citas canceladas por período, los motivos más frecuentes y los médicos/pacientes con mayor tasa de cancelación.
Media
RFR-04
El sistema debe generar un reporte de pacientes atendidos por período, mostrando pacientes nuevos vs. recurrentes y la cantidad de visitas por paciente.
Media
RFR-05
El sistema debe generar un reporte de ocupación por franja horaria, indicando qué horarios tienen mayor y menor demanda para cada médico o especialidad, facilitando la optimización de la agenda.
Baja

3. DISEÑO DE BASE DE DATOS
La base de datos se organiza en dos esquemas Oracle separados físicamente para garantizar la separación de responsabilidades y facilitar la administración de privilegios.
3.1 Esquemas Oracle
Esquema
Responsabilidad
SEG_CLINICA
Seguridad y administración: usuarios, roles, sesión, tokens, parámetros globales y registro de auditoría del sistema.
APP_CLINICA
Lógica de negocio: pacientes, médicos, especialidades, horarios, citas, notificaciones y toda la lógica PL/SQL del proceso clínico.

La comunicación entre esquemas se realiza mediante GRANTs explícitos y sinónimos. APP_CLINICA referencia a SEG_CLINICA.USUARIOS mediante foreign keys con GRANT REFERENCES. Los triggers de auditoría en APP_CLINICA insertan en SEG_CLINICA.AUDITORIA mediante GRANT INSERT.
3.2 Resumen de Tablas
Esquema SEG_CLINICA (4 tablas)
Tabla
Descripción
ROLES
Catálogo de roles del sistema (Administrador, Recepcionista, Médico).
USUARIOS
Usuarios del sistema con credenciales hasheadas y rol asignado.
SESIONES
Registro de sesiones activas con token y fecha de expiración.
AUDITORIA
Log de todas las operaciones críticas con usuario, acción, tabla, fecha/hora y datos.

Esquema APP_CLINICA (7 tablas)
Tabla
Descripción
ESPECIALIDADES
Catálogo de especialidades médicas de la clínica.
MEDICOS
Datos del médico: colegiatura, especialidad, contacto y estado.
HORARIOS_MEDICO
Configuración de atención por médico: día de semana, hora inicio, hora fin, duración de cita.
PACIENTES
Datos del paciente: DNI, nombre, contacto, fecha de nacimiento.
CITAS
Registro de cada cita con médico, paciente, fecha/hora, estado y motivo.
ESTADOS_CITA
Catálogo de estados posibles: Pendiente, Confirmada, En Atención, Atendida, Cancelada.
NOTIFICACIONES
Recordatorios y alertas generados automáticamente para pacientes.

3.3 Detalle de Tablas
Esquema SEG_CLINICA

SEG_CLINICA.ROLES
Columna
Tipo
PK
NOT NULL
Descripción
ROL_ID
NUMBER
Sí
Sí
Identificador único del rol
NOMBRE
VARCHAR2(50)

Sí
Nombre del rol (ADMIN, RECEPCIONISTA, MEDICO)
DESCRIPCION
VARCHAR2(200)


Descripción del rol
ESTADO
CHAR(1)

Sí
A=Activo, I=Inactivo

SEG_CLINICA.USUARIOS
Columna
Tipo
PK
NOT NULL
Descripción
USUARIO_ID
NUMBER
Sí
Sí
Identificador único del usuario
USERNAME
VARCHAR2(50)

Sí
Nombre de usuario para login (UNIQUE)
PASSWORD_HASH
RAW(64)

Sí
Hash SHA-256 de la contraseña
NOMBRE_COMPLETO
VARCHAR2(150)

Sí
Nombre completo del usuario
EMAIL
VARCHAR2(100)


Correo electrónico
ROL_ID
NUMBER

Sí
FK → SEG_CLINICA.ROLES
MEDICO_ID
NUMBER


FK → APP_CLINICA.MEDICOS (solo si rol=MÉDICO)
ESTADO
CHAR(1)

Sí
A=Activo, I=Inactivo
FECHA_CREACION
TIMESTAMP

Sí
Fecha de creación del usuario
ULTIMO_ACCESO
TIMESTAMP


Fecha del último login

SEG_CLINICA.SESIONES
Columna
Tipo
PK
NOT NULL
Descripción
SESION_ID
NUMBER
Sí
Sí
Identificador único
USUARIO_ID
NUMBER

Sí
FK → SEG_CLINICA.USUARIOS
TOKEN
VARCHAR2(128)

Sí
Token de sesión generado
FECHA_INICIO
TIMESTAMP

Sí
Inicio de la sesión
FECHA_EXPIRACION
TIMESTAMP

Sí
Expiración automática
IP_CLIENTE
VARCHAR2(45)


Dirección IP del cliente
ESTADO
CHAR(1)

Sí
A=Activa, E=Expirada, C=Cerrada

SEG_CLINICA.AUDITORIA
Columna
Tipo
PK
NOT NULL
Descripción
AUDITORIA_ID
NUMBER
Sí
Sí
Identificador único del registro
USUARIO_ID
NUMBER

Sí
FK → USUARIOS (quién realizó la acción)
TABLA_AFECTADA
VARCHAR2(50)

Sí
Nombre de la tabla afectada
OPERACION
VARCHAR2(10)

Sí
INSERT, UPDATE o DELETE
REGISTRO_ID
NUMBER


ID del registro afectado
DATOS_ANTES
CLOB


Datos anteriores en formato JSON
DATOS_DESPUES
CLOB


Datos posteriores en formato JSON
FECHA_HORA
TIMESTAMP

Sí
Momento exacto de la operación
IP_CLIENTE
VARCHAR2(45)


IP desde donde se ejecutó

Esquema APP_CLINICA

APP_CLINICA.ESPECIALIDADES
Columna
Tipo
PK
NOT NULL
Descripción
ESPECIALIDAD_ID
NUMBER
Sí
Sí
Identificador único
NOMBRE
VARCHAR2(100)

Sí
Nombre de la especialidad (UNIQUE)
DESCRIPCION
VARCHAR2(300)


Descripción de la especialidad
ESTADO
CHAR(1)

Sí
A=Activo, I=Inactivo

APP_CLINICA.MEDICOS
Columna
Tipo
PK
NOT NULL
Descripción
MEDICO_ID
NUMBER
Sí
Sí
Identificador único del médico
NOMBRES
VARCHAR2(100)

Sí
Nombres del médico
APELLIDOS
VARCHAR2(100)

Sí
Apellidos del médico
NRO_COLEGIATURA
VARCHAR2(20)

Sí
Número de colegiatura (UNIQUE)
ESPECIALIDAD_ID
NUMBER

Sí
FK → ESPECIALIDADES
TELEFONO
VARCHAR2(15)


Teléfono de contacto
EMAIL
VARCHAR2(100)


Correo electrónico
ESTADO
CHAR(1)

Sí
A=Activo, I=Inactivo

APP_CLINICA.HORARIOS_MEDICO
Columna
Tipo
PK
NOT NULL
Descripción
HORARIO_ID
NUMBER
Sí
Sí
Identificador único
MEDICO_ID
NUMBER

Sí
FK → MEDICOS
DIA_SEMANA
NUMBER(1)

Sí
1=Lunes ... 7=Domingo
HORA_INICIO
VARCHAR2(5)

Sí
Hora inicio formato HH24:MI
HORA_FIN
VARCHAR2(5)

Sí
Hora fin formato HH24:MI
DURACION_CITA_MIN
NUMBER

Sí
Duración de cada cita en minutos
ESTADO
CHAR(1)

Sí
A=Activo, I=Inactivo

APP_CLINICA.PACIENTES
Columna
Tipo
PK
NOT NULL
Descripción
PACIENTE_ID
NUMBER
Sí
Sí
Identificador único del paciente
NOMBRES
VARCHAR2(100)

Sí
Nombres del paciente
APELLIDOS
VARCHAR2(100)

Sí
Apellidos del paciente
DNI
VARCHAR2(15)

Sí
Documento de identidad (UNIQUE)
FECHA_NACIMIENTO
DATE


Fecha de nacimiento
TELEFONO
VARCHAR2(15)

Sí
Teléfono de contacto
EMAIL
VARCHAR2(100)


Correo electrónico
DIRECCION
VARCHAR2(200)


Dirección domiciliaria
ESTADO
CHAR(1)

Sí
A=Activo, I=Inactivo
FECHA_REGISTRO
TIMESTAMP

Sí
Fecha de registro en el sistema

APP_CLINICA.ESTADOS_CITA
Columna
Tipo
PK
NOT NULL
Descripción
ESTADO_CITA_ID
NUMBER
Sí
Sí
Identificador único
NOMBRE
VARCHAR2(30)

Sí
Nombre: Pendiente, Confirmada, En Atención, Atendida, Cancelada
DESCRIPCION
VARCHAR2(200)


Descripción del estado

APP_CLINICA.CITAS
Columna
Tipo
PK
NOT NULL
Descripción
CITA_ID
NUMBER
Sí
Sí
Identificador único de la cita
PACIENTE_ID
NUMBER

Sí
FK → PACIENTES
MEDICO_ID
NUMBER

Sí
FK → MEDICOS
ESPECIALIDAD_ID
NUMBER

Sí
FK → ESPECIALIDADES
FECHA_CITA
DATE

Sí
Fecha de la cita
HORA_INICIO
VARCHAR2(5)

Sí
Hora inicio HH24:MI
HORA_FIN
VARCHAR2(5)

Sí
Hora fin HH24:MI
ESTADO_CITA_ID
NUMBER

Sí
FK → ESTADOS_CITA
MOTIVO_CONSULTA
VARCHAR2(500)


Motivo de la consulta
MOTIVO_CANCELACION
VARCHAR2(500)


Motivo (solo si se cancela)
OBSERVACIONES
VARCHAR2(500)


Observaciones del médico tras la atención
USUARIO_CREACION
NUMBER

Sí
FK → SEG_CLINICA.USUARIOS
FECHA_CREACION
TIMESTAMP

Sí
Fecha/hora de creación del registro
FECHA_MODIFICACION
TIMESTAMP


Fecha/hora de última modificación

APP_CLINICA.NOTIFICACIONES
Columna
Tipo
PK
NOT NULL
Descripción
NOTIFICACION_ID
NUMBER
Sí
Sí
Identificador único
CITA_ID
NUMBER

Sí
FK → CITAS
PACIENTE_ID
NUMBER

Sí
FK → PACIENTES
TIPO
VARCHAR2(30)

Sí
RECORDATORIO, CANCELACION, REPROGRAMACION
MENSAJE
VARCHAR2(500)

Sí
Texto del mensaje generado
FECHA_GENERACION
TIMESTAMP

Sí
Fecha/hora en que se generó
LEIDA
CHAR(1)

Sí
S=Leída, N=No leída

4. OBJETOS PL/SQL
Toda la lógica de negocio reside en la base de datos Oracle. A continuación se describen los objetos PL/SQL organizados por tipo y esquema.
4.1 Paquetes (Packages)
PKG_SEGURIDAD (Esquema SEG_CLINICA)
Agrupa las funciones y procedimientos de autenticación, gestión de sesiones y validación de permisos.
Objeto
Tipo
Descripción
FN_HASH_PASSWORD(p_password)
Función
Genera el hash SHA-256 de la contraseña usando DBMS_CRYPTO. Retorna RAW(64).
FN_AUTENTICAR(p_user, p_pass)
Función
Valida credenciales comparando hash. Retorna USUARIO_ID o -1 si falla.
SP_CREAR_SESION(p_usuario_id, p_ip)
Procedimiento
Crea registro en SESIONES con token generado por DBMS_CRYPTO.RANDOMBYTES.
SP_CERRAR_SESION(p_token)
Procedimiento
Marca la sesión como cerrada (estado=C).
FN_VALIDAR_ROL(p_usuario_id, p_rol)
Función
Verifica si el usuario tiene el rol indicado. Retorna BOOLEAN.

PKG_ADMINISTRACION (Esquema APP_CLINICA)
Agrupa los procedimientos CRUD para las entidades maestras del sistema.
Objeto
Tipo
Descripción
SP_GESTIONAR_PACIENTE
Procedimiento
Inserta o actualiza paciente según parámetro de acción (I/U). Valida DNI único.
SP_GESTIONAR_MEDICO
Procedimiento
Inserta o actualiza médico. Valida colegiatura única y especialidad existente.
SP_GESTIONAR_ESPECIALIDAD
Procedimiento
CRUD de especialidades con validación de nombre único.
SP_GESTIONAR_HORARIO
Procedimiento
Configura horarios de atención por médico y día. Valida solapamiento de horarios.
SP_GESTIONAR_USUARIO
Procedimiento
CRUD de usuarios del sistema con asignación de rol.

PKG_CITAS (Esquema APP_CLINICA)
Contiene la lógica central del agendamiento, cancelación y reprogramación de citas.
Objeto
Tipo
Descripción
FN_VERIFICAR_DISPONIBILIDAD
Función
Recibe médico, fecha y hora. Retorna 1 si está disponible, 0 si no. Consulta CITAS y HORARIOS_MEDICO.
SP_AGENDAR_CITA
Procedimiento
Valida disponibilidad, inserta en CITAS con estado Pendiente y genera notificación de confirmación.
SP_CANCELAR_CITA
Procedimiento
Cambia estado a Cancelada, registra motivo de cancelación y genera notificación al paciente.
SP_REPROGRAMAR_CITA
Procedimiento
Ejecuta cancelación + nuevo agendamiento en una transacción atómica (SAVEPOINT/ROLLBACK).
FN_OBTENER_FRANJAS_LIBRES
Función
Retorna SYS_REFCURSOR con todas las franjas horarias disponibles de un médico en una fecha.

PKG_CONSULTAS (Esquema APP_CLINICA)
Agrupa las consultas operativas del sistema.
Objeto
Tipo
Descripción
FN_AGENDA_DIARIA
Función
Retorna cursor con las citas del día de un médico específico.
FN_HISTORIAL_PACIENTE
Función
Retorna cursor con todas las citas de un paciente ordenadas por fecha descendente.
FN_CITAS_POR_ESPECIALIDAD
Función
Retorna cursor con citas de una especialidad en un rango de fechas.
FN_CITAS_POR_ESTADO
Función
Retorna cursor filtrando por estado, médico y rango de fechas.
FN_BUSCAR_PACIENTE
Función
Búsqueda flexible de paciente por DNI, nombre o apellido (LIKE).

PKG_REPORTES (Esquema APP_CLINICA)
Agrupa los procedimientos y funciones que generan los reportes estadísticos.
Objeto
Tipo
Descripción
FN_RPT_CITAS_POR_MEDICO
Función
Reporte de citas atendidas por médico en un período: total, atendidas, canceladas, promedio diario.
FN_RPT_CITAS_POR_ESPECIALIDAD
Función
Reporte de demanda por especialidad: cantidad de citas, ranking de especialidades.
FN_RPT_CANCELACIONES
Función
Reporte de cancelaciones: motivos frecuentes, tasa por médico y por paciente.
FN_RPT_PACIENTES_ATENDIDOS
Función
Pacientes nuevos vs recurrentes en un período, cantidad de visitas por paciente.
FN_RPT_OCUPACION_HORARIA
Función
Análisis de demanda por franja horaria: horarios pico y horarios con baja ocupación.
4.2 Triggers
Trigger
Esquema
Tabla
Evento
Descripción
TRG_IMPEDIR_EMPATE_CITA
APP_CLINICA
CITAS
BEFORE INSERT
Valida que no exista otra cita para el mismo médico en la misma fecha/hora. Lanza excepción si hay conflicto.
TRG_AUDITORIA_CITAS
APP_CLINICA
CITAS
AFTER INSERT, UPDATE, DELETE
Registra en SEG_CLINICA.AUDITORIA cada operación sobre citas con datos antes/después.
TRG_AUDITORIA_PACIENTES
APP_CLINICA
PACIENTES
AFTER INSERT, UPDATE, DELETE
Registra en SEG_CLINICA.AUDITORIA cada operación sobre pacientes.
TRG_SEQ_CITA_ID
APP_CLINICA
CITAS
BEFORE INSERT
Asigna automáticamente el siguiente valor de la secuencia SEQ_CITAS.
TRG_FECHA_MODIFICACION
APP_CLINICA
CITAS
BEFORE UPDATE
Actualiza automáticamente el campo FECHA_MODIFICACION con SYSTIMESTAMP.

4.3 Vistas
Vista
Esquema
Descripción
VW_AGENDA_DIARIA
APP_CLINICA
JOIN entre CITAS, PACIENTES, MEDICOS y ESPECIALIDADES. Muestra la agenda completa del día con datos legibles.
VW_DISPONIBILIDAD_MEDICO
APP_CLINICA
Cruza HORARIOS_MEDICO con CITAS para mostrar franjas libres y ocupadas de cada médico.
VW_HISTORIAL_PACIENTE
APP_CLINICA
Historial de citas de cada paciente con nombre del médico, especialidad y estado.
VW_RESUMEN_CITAS
APP_CLINICA
Resumen estadístico de citas agrupadas por estado, médico y especialidad.
VW_USUARIOS_ACTIVOS
SEG_CLINICA
Lista de usuarios con su rol y estado, sin exponer el hash de contraseña.
4.4 Secuencias
Secuencia
Esquema
Descripción
SEQ_USUARIOS
SEG_CLINICA
Secuencia para USUARIOS.USUARIO_ID
SEQ_AUDITORIA
SEG_CLINICA
Secuencia para AUDITORIA.AUDITORIA_ID
SEQ_ESPECIALIDADES
APP_CLINICA
Secuencia para ESPECIALIDADES.ESPECIALIDAD_ID
SEQ_MEDICOS
APP_CLINICA
Secuencia para MEDICOS.MEDICO_ID
SEQ_PACIENTES
APP_CLINICA
Secuencia para PACIENTES.PACIENTE_ID
SEQ_CITAS
APP_CLINICA
Secuencia para CITAS.CITA_ID
SEQ_NOTIFICACIONES
APP_CLINICA
Secuencia para NOTIFICACIONES.NOTIFICACION_ID
4.5 Jobs Programados
Job
Esquema
Frecuencia
Descripción
JOB_RECORDATORIOS_24H
APP_CLINICA
Cada 1 hora
Busca citas con fecha para las próximas 24 horas que aún no tienen notificación de recordatorio e inserta en NOTIFICACIONES.
JOB_EXPIRAR_SESIONES
SEG_CLINICA
Cada 30 min
Marca como expiradas las sesiones cuya FECHA_EXPIRACION ya pasó.

5. GRANTS, SINÓNIMOS Y PRIVILEGIOS ENTRE ESQUEMAS
5.1 Grants de APP_CLINICA hacia SEG_CLINICA
GRANT INSERT ON SEG_CLINICA.AUDITORIA TO APP_CLINICA — para que los triggers de auditoría en APP_CLINICA puedan insertar registros en la tabla de auditoría del esquema de seguridad.
GRANT SELECT ON SEG_CLINICA.USUARIOS TO APP_CLINICA — para que los paquetes de APP_CLINICA puedan validar el usuario en sesión y sus permisos.
GRANT SELECT ON SEG_CLINICA.ROLES TO APP_CLINICA — para verificar roles en las validaciones de acceso.
5.2 Grants de SEG_CLINICA hacia APP_CLINICA
GRANT REFERENCES ON APP_CLINICA.MEDICOS TO SEG_CLINICA — para que USUARIOS.MEDICO_ID pueda referenciar como FK a la tabla MEDICOS.
5.3 Sinónimos
Se crean sinónimos privados en APP_CLINICA para acceder a tablas de SEG_CLINICA sin usar el prefijo de esquema:
CREATE SYNONYM APP_CLINICA.AUDITORIA FOR SEG_CLINICA.AUDITORIA;
CREATE SYNONYM APP_CLINICA.USUARIOS FOR SEG_CLINICA.USUARIOS;
CREATE SYNONYM APP_CLINICA.ROLES FOR SEG_CLINICA.ROLES;

6. FRONTEND REACT
El frontend se desarrolla en React como una Single Page Application (SPA) responsive que se conecta a la base de datos Oracle a través de Oracle REST Data Services (ORDS) o una capa API mínima en Node.js/Express. El frontend NO contiene lógica de negocio; solo envía parámetros y presenta resultados.
6.1 Pantallas del Sistema
Pantalla
Rol
Descripción
Login
Todos
Formulario de autenticación. Envía credenciales al SP_AUTENTICAR y almacena token en memoria.
Dashboard
Recepcionista
Vista general: citas del día, alertas pendientes, estadísticas rápidas de ocupación.
Agendar Cita
Recepcionista
Selección de paciente, médico, fecha. Muestra franjas libres en calendario. Botón confirmar llama a SP_AGENDAR_CITA.
Mi Agenda
Médico
Vista de agenda personal del médico logueado. Solo ve sus propias citas del día/semana.
Gestión de Pacientes
Recepcionista
CRUD de pacientes con búsqueda por DNI/nombre. Formulario de registro y edición.
Gestión de Médicos
Admin
CRUD de médicos con asignación de especialidad y configuración de horarios.
Gestión de Especialidades
Admin
CRUD de especialidades médicas: nombre, descripción, estado.
Gestión de Usuarios
Admin
CRUD de usuarios del sistema con asignación de rol y estado.
Historial de Paciente
Recepcionista
Consulta de todas las citas de un paciente con filtros por fecha y estado.
Reportes
Admin/Recep.
5 reportes con filtros de fecha, exportables. Gráficos con la librería Recharts.
Notificaciones
Recepcionista
Bandeja de recordatorios generados. Marcar como leídas. Filtrar por tipo.
6.2 Tecnologías Frontend
React 18+ con hooks y componentes funcionales. React Router para navegación SPA. Recharts para gráficos de reportes. Axios para consumo de endpoints ORDS. Diseño responsive con CSS Flexbox/Grid o Tailwind CSS para adaptarse a PC y tablets. Sin lógica de negocio en el frontend: toda validación y cálculo se ejecuta en PL/SQL.

7. PLAN DE ENTREGAS ITERATIVAS
El desarrollo se organiza en entregas progresivas durante el semestre académico, siguiendo un enfoque iterativo e incremental.
Iteración
Semanas
Entregables
1 - Fundamentos
1 – 4
Creación de esquemas, tablas, secuencias, constraints. Datos semilla. PKG_SEGURIDAD (login, hash, sesiones). Pantalla de Login en React.
2 - Datos Maestros
5 – 7
PKG_ADMINISTRACION completo. Pantallas CRUD: pacientes, médicos, especialidades, horarios, usuarios. Triggers de auditoría.
3 - Citas (Core)
8 – 11
PKG_CITAS: agendar, cancelar, reprogramar. FN_VERIFICAR_DISPONIBILIDAD. TRG_IMPEDIR_EMPATE. Pantallas: Agendar Cita, Mi Agenda, Dashboard.
4 - Consultas y Notif.
12 – 13
PKG_CONSULTAS completo. JOB_RECORDATORIOS. Pantallas: Historial, búsquedas, Notificaciones.
5 - Reportes y cierre
14 – 16
PKG_REPORTES (5 reportes). Pantalla de Reportes con gráficos. Pruebas con 50 citas diarias. Documentación final.

8. RESTRICCIONES Y CONSIDERACIONES
Las siguientes restricciones provienen del enunciado del proyecto y de los lineamientos del docente. Todas deben respetarse durante el desarrollo.
#
Restricción
1
La base de datos se implementa en Oracle con al menos 2 esquemas separados (SEG_CLINICA y APP_CLINICA).
2
Toda la lógica de negocio se implementa en PL/SQL: procedimientos, funciones, triggers, paquetes. El frontend no contiene lógica.
3
El frontend se desarrolla en React como SPA responsive (PC y tablets).
4
El sistema opera dentro de la red interna de la clínica; no se requiere acceso público externo.
5
Roles diferenciados: Recepcionista (gestión completa de citas) y Médico (consulta exclusiva de su propia agenda).
6
Los datos personales y el historial de citas de los pacientes deben estar protegidos y solo accesibles por personal autorizado.
7
La clínica modelo tiene aproximadamente 5 médicos y maneja alrededor de 50 citas por día. Este volumen debe considerarse en las pruebas.
8
El alcance no incluye historia clínica electrónica; el sistema se enfoca exclusivamente en la gestión de citas.
9
Se deben definir 25 requerimientos funcionales: 5 de negocio, 5 de seguridad, 5 administrativos, 5 de consultas y 5 de reportes.
10
El proyecto se desarrolla en entregas iterativas a lo largo del semestre.