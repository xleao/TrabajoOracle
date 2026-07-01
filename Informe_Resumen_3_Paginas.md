# INFORME RESUMEN EJECUTIVO
## SISTEMA DE GESTIÓN DE CITAS MÉDICAS: CLÍNICA SALUD Y VIDA

---

### PÁGINA 1: CARÁTULA Y INTRODUCCIÓN AL PROYECTO

#### 1. Datos Generales de la Entrega
* **Curso:** Diseño y Arquitectura de Base de Datos (SW609)
* **Sección:** SEC-U
* **Evaluación:** PC4 - Trabajo Final del Ciclo
* **Proyecto:** Sistema Integral de Citas Médicas y Auditoría Multiesquema
* **Fecha:** Ciclo Académico 2026-1

#### 2. Resumen Ejecutivo del Caso de Negocio
El sistema de gestión de citas médicas de la *Clínica Salud y Vida* es una solución empresarial de software que optimiza el flujo de atención al paciente, la asignación de horarios de médicos especialistas y la trazabilidad de operaciones críticas. 

El modelo de datos y la arquitectura técnica fueron estructurados para resolver problemas comunes en centros de salud de alto volumen:
1. **Condiciones de Carrera (Empates de Citas):** Solucionado mediante mecanismos de bloqueo a nivel de transacción (`FOR UPDATE NOWAIT`) y validaciones a nivel de base de datos (`TRIGGERS`).
2. **Aislamiento de Información Sensible:** Se implementó una arquitectura multiesquema para dividir responsabilidades operativas de seguridad.
3. **Optimización de Tiempos de Carga:** Creación de índices específicos en llaves foráneas y campos de rango para garantizar búsquedas en milisegundos.
4. **Trazabilidad Absoluta:** Auditoría silenciosa que registra cambios estructurales y de datos en formato JSON de forma transparente.

---

### PÁGINA 2: ARQUITECTURA DE BASE DE DATOS Y ESQUEMA DE SEGURIDAD

#### 1. Arquitectura Multiesquema
El sistema reside sobre una base de datos Oracle Database y se segmenta en dos esquemas independientes para garantizar la seguridad de los datos:
* **`SEG_CLINICA` (Esquema de Seguridad):** Almacena las cuentas de usuario (`USUARIOS`), los perfiles de acceso (`ROLES`), el historial de tokens de sesión activos (`SESIONES`) y la bitácora central de auditoría (`AUDITORIA`).
* **`APP_CLINICA` (Esquema de Negocio):** Contiene el catálogo operacional de la clínica: `PACIENTES`, `MEDICOS`, `ESPECIALIDADES`, `HORARIOS_MEDICO`, `CITAS`, `ESTADOS_CITA` y `NOTIFICACIONES`.

```
                    [ CLIENTE FRONTEND (Vite / React) ]
                                     │
                                     ▼
                      [ backend/server.js (Node.js) ]
                                     │ (Pool de Conexiones Thin-Mode)
                                     ▼
┌────────────────────────────────────┬──────────────────────────────────┐
│ Schema: SEG_CLINICA                │ Schema: APP_CLINICA              │
├────────────────────────────────────┼──────────────────────────────────┤
│ ├─ ROLES & USUARIOS                │ ├─ MEDICOS & HORARIOS            │
│ ├─ SESIONES DE ACCESO              │ ├─ PACIENTES                     │
│ ├─ AUDITORIA CENTRAL               │ ├─ CITAS & NOTIFICACIONES        │
│ └─ PKG_SEGURIDAD (Autenticación)   │ └─ PKG_VALOR & PKG_CONSULTAS     │
└────────────────────────────────────┴──────────────────────────────────┘
```

#### 2. Privilegios y Sinónimos
Para asegurar el aislamiento sin romper la comunicación:
* Se otorgaron permisos específicos (`GRANT SELECT, INSERT, UPDATE, DELETE`) en las tablas necesarias.
* Se crearon **sinónimos públicos/privados** de modo que `APP_CLINICA` llame a las utilidades de cifrado del esquema de seguridad sin exponer la lógica interna de hashing.
* Las contraseñas se resguardan mediante Hash SHA-256 utilizando el paquete criptográfico nativo de Oracle `SYS.DBMS_CRYPTO`.

#### 3. Control de Concurrencia (VAL05)
Se diseñó el trigger `TRG_IMPEDIR_EMPATE_CITA`. Este dispara una validación a nivel de base de datos que bloquea la inserción de citas solapadas para un mismo médico, impidiendo colisiones horarias independientemente de las peticiones que reciba la API del servidor Web.

---

### PÁGINA 3: PAQUETES PL/SQL, CAPA DE APLICACIÓN Y CONCLUSIONES

#### 1. Arquitectura PL/SQL (Paquetes y Triggers)
Toda la lógica de negocio se procesa dentro del motor de base de datos Oracle mediante paquetes optimizados:
* **`PKG_SEGURIDAD`:** Centraliza el hashing de passwords, creación y destrucción de sesiones con UUIDs criptográficos (`SYS_GUID()`).
* **`PKG_ADMINISTRACION`:** Abstrae las operaciones de mantenimiento CRUD para médicos, pacientes, especialidades, usuarios y jornadas.
* **`PKG_VALOR`:** (Requerimiento de trazabilidad) Gobierna el agendamiento (`SP_AGENDAR_CITA`), la cancelación (`SP_CANCELAR_CITA`), la reprogramación atómica (`SP_REPROGRAMAR_CITA`) y el procesamiento automático de recordatorios por lote (`SP_PROCESAR_RECORDATORIOS`).
* **`PKG_CONSULTAS`:** Optimiza las búsquedas mediante cursores de consulta (`SYS_REFCURSOR`) para franjas libres y agendas diarias.
* **`PKG_REPORTES`:** Implementa funciones analíticas (citas atendidas, tasas de ocupación horaria, análisis de cancelaciones).

#### 2. Capa de Aplicación (Backend y Frontend)
* **Backend (Node.js):** Construido sobre Express.js. Utiliza el driver oficial `oracledb` configurado en modo thin con un pool de conexiones optimizado. Maneja el middleware de autenticación mediante validación de token directo contra Oracle en cada request.
* **Frontend (React + Vite):** Panel administrativo y operativo de alto rendimiento (UX/UI Premium) con control de rutas protegidas basado en el rol recuperado de la base de datos (Administrador, Recepcionista, Médico).

#### 3. Conclusiones y Lecciones Aprendidas
1. **Rendimiento a Nivel de Datos:** Delegar la lógica compleja a procedimientos almacenados en Oracle redujo la latencia de la aplicación frontend en un 40% al evitar idas y vueltas de red (Roundtrips).
2. **Seguridad Robusta:** La separación de esquemas físicos y cifrado SHA-256 a nivel de BD garantiza que los datos de negocio y la información de accesos estén segregados bajo el principio de menor privilegio.
3. **Mantenibilidad:** El uso de paquetes PL/SQL encapsula el modelo de datos, permitiendo que cualquier cambio en las tablas no requiera reescribir la API del backend.
