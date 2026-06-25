# Sistema de Gestión de Citas Médicas — Clínica "Salud y Vida"

**Universidad Nacional de Ingeniería — Facultad de Ingeniería Industrial y de Sistemas**  
**Curso:** SW609 — Sistemas de Gestión de Base de Datos  
**Docente:** Dr. Eric Gustavo Coronel Castillo  
**Ciclo Académico:** 2026-1  
**Proyecto:** Número 2

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura del Repositorio](#4-estructura-del-repositorio)
5. [Base de Datos Oracle](#5-base-de-datos-oracle)
   - 5.1 [Esquemas](#51-esquemas)
   - 5.2 [Tablas](#52-tablas)
   - 5.3 [Secuencias](#53-secuencias)
   - 5.4 [Paquetes PL/SQL](#54-paquetes-plsql)
   - 5.5 [Triggers](#55-triggers)
   - 5.6 [Vistas](#56-vistas)
   - 5.7 [Jobs Programados](#57-jobs-programados)
   - 5.8 [Grants y Sinónimos](#58-grants-y-sinónimos)
6. [Backend — API Bridge Node.js](#6-backend--api-bridge-nodejs)
   - 6.1 [Endpoints](#61-endpoints)
7. [Frontend — React SPA](#7-frontend--react-spa)
   - 7.1 [Pantallas por Rol](#71-pantallas-por-rol)
   - 7.2 [Estructura de Componentes](#72-estructura-de-componentes)
8. [Seguridad](#8-seguridad)
9. [Requerimientos Funcionales](#9-requerimientos-funcionales)
10. [Instalación y Ejecución](#10-instalación-y-ejecución)
11. [Datos Semilla](#11-datos-semilla)
12. [Flujos Principales](#12-flujos-principales)

---

## 1. Descripción General

La Clínica "Salud y Vida" es un centro médico de tamaño mediano que atiende consultas en distintas especialidades (Medicina General, Pediatría, Traumatología, Ginecología) con aproximadamente cinco médicos activos y un volumen de operación de **50 citas diarias**.

El sistema digitaliza íntegramente la gestión de citas médicas, eliminando el cuaderno físico de recepción. Permite:

- Agendar, cancelar y reprogramar citas con validación automática de disponibilidad.
- Controlar el acceso mediante roles diferenciados (Administrador, Recepcionista, Médico).
- Generar recordatorios automáticos 24 horas antes de cada cita.
- Consultar historial completo de citas por paciente.
- Producir reportes estadísticos para la toma de decisiones gerenciales.
- Registrar auditoría completa de todas las operaciones críticas.

> **Alcance:** Exclusivamente gestión de citas. No incluye historia clínica electrónica ni facturación.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Rol |
|---|---|---|---|
| Base de datos | Oracle Database | 19c / 21c | Motor principal, lógica de negocio completa en PL/SQL |
| API Bridge | Node.js + Express | 18 LTS / 4.x | Puente HTTP mínimo entre React y Oracle |
| Frontend | React + Vite | 18 / 5.x | SPA responsive (PC y tablets) |
| Routing | React Router DOM | 6.x | Navegación SPA sin recarga |
| HTTP Client | Axios | 1.x | Consumo de la API Bridge |
| Iconografía | Lucide React | Latest | Iconos SVG |
| ORM/Driver | node-oracledb | 6.x | Conexión Node.js ↔ Oracle con pool de conexiones |
| Estilos | CSS Variables + Flexbox/Grid | — | Diseño responsive sin framework externo |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)                   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │         React SPA (Vite + React Router)         │   │
│   │  Login │ Dashboard │ Citas │ Pacientes │ ...    │   │
│   └──────────────────────┬──────────────────────────┘   │
│                          │ HTTP/JSON (Axios)             │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              API BRIDGE  (Node.js + Express)             │
│                     localhost:5000                       │
│                                                         │
│  • Pool de conexiones Oracle (node-oracledb)            │
│  • Middleware autenticación (valida token en Oracle)     │
│  • Rutas HTTP → llaman paquetes PL/SQL via EXECUTE       │
│  • Sin lógica de negocio: solo traduce HTTP ↔ PL/SQL    │
└──────────────────────────┬──────────────────────────────┘
                           │ TCP/IP (Oracle Net)
                           │ localhost:1521/orcl
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  ORACLE DATABASE                         │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │   SEG_CLINICA    │    │       APP_CLINICA          │  │
│  │                  │◄───┤                           │  │
│  │ ROLES            │    │ ESPECIALIDADES             │  │
│  │ USUARIOS         │    │ MEDICOS                   │  │
│  │ SESIONES         │    │ HORARIOS_MEDICO           │  │
│  │ AUDITORIA        │    │ PACIENTES                 │  │
│  │                  │    │ ESTADOS_CITA              │  │
│  │ PKG_SEGURIDAD    │    │ CITAS                     │  │
│  │                  │    │ NOTIFICACIONES            │  │
│  │ JOB_EXPIRAR_SES  │    │                           │  │
│  └──────────────────┘    │ PKG_ADMINISTRACION        │  │
│                          │ PKG_CITAS                 │  │
│                          │ PKG_CONSULTAS             │  │
│                          │ PKG_REPORTES              │  │
│                          │                           │  │
│                          │ Triggers (5)              │  │
│                          │ Vistas (5)                │  │
│                          │ JOB_RECORDATORIOS_24H     │  │
│                          └───────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Principio clave:** Toda la lógica de negocio reside en Oracle (PL/SQL). El backend Node.js es un adaptador HTTP sin lógica propia. El frontend no contiene validaciones de negocio.

---

## 4. Estructura del Repositorio

```
TrabajoOracle/
│
├── database/                          # Scripts Oracle (ejecutar en orden)
│   ├── 01_esquemas_y_tablas.sql       # Creación de esquemas, secuencias y tablas
│   ├── 02_grants_sinonimos.sql        # Permisos cruzados entre esquemas y sinónimos
│   ├── 03_datos_semilla.sql           # Roles, estados de cita, especialidades base, usuario admin
│   ├── 09_triggers_vistas_jobs.sql    # Triggers, vistas y jobs programados
│   ├── 13_bulk_seed_data.sql          # Datos de prueba (50 citas diarias aprox.)
│   │
│   └── packages/
│       ├── 04_pkg_seguridad.sql       # PKG_SEGURIDAD (hash, autenticación, sesiones)
│       ├── 05_pkg_administracion.sql  # PKG_ADMINISTRACION (CRUD maestros)
│       ├── 06_pkg_citas.sql           # PKG_CITAS (agendar, cancelar, reprogramar)
│       ├── 07_pkg_consultas.sql       # PKG_CONSULTAS (consultas operativas)
│       └── 08_pkg_reportes.sql        # PKG_REPORTES (5 reportes estadísticos)
│
├── backend/
│   ├── server.js                      # Express API Bridge (único archivo de servidor)
│   ├── .env                           # Variables de entorno (credenciales Oracle)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                   # Punto de entrada React
│   │   ├── App.jsx                    # Routing principal + rutas protegidas
│   │   ├── App.css                    # Variables CSS globales y estilos base
│   │   ├── index.css                  # Reset y estilos globales
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Estado de sesión global + interceptor Axios
│   │   │
│   │   ├── components/
│   │   │   └── Layout.jsx             # Shell: sidebar por rol + header
│   │   │
│   │   └── views/
│   │       ├── Login.jsx              # Autenticación
│   │       ├── Dashboard.jsx          # Panel principal (resumen diario)
│   │       ├── RecepcionAgenda.jsx    # Agendar / cancelar / reprogramar citas
│   │       ├── MedicoAgenda.jsx       # Agenda personal del médico (solo lectura)
│   │       ├── AdminPacientes.jsx     # CRUD pacientes + historial con filtros
│   │       ├── AdminMedicos.jsx       # CRUD médicos
│   │       ├── AdminEspecialidades.jsx# CRUD especialidades
│   │       ├── AdminHorarios.jsx      # Configuración horarios por médico/día
│   │       ├── AdminUsuarios.jsx      # CRUD usuarios del sistema
│   │       ├── AdminReportes.jsx      # 5 reportes con gráficos
│   │       └── Notificaciones.jsx     # Bandeja de notificaciones con filtros
│   │
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── DOCUMENTACION.md                   # Este archivo
```

---

## 5. Base de Datos Oracle

### 5.1 Esquemas

| Esquema | Responsabilidad |
|---|---|
| `SEG_CLINICA` | Seguridad: usuarios, roles, sesiones activas, auditoría de operaciones |
| `APP_CLINICA` | Lógica de negocio: pacientes, médicos, especialidades, horarios, citas, notificaciones |

La comunicación entre esquemas se realiza mediante `GRANT` explícitos y sinónimos privados en `APP_CLINICA`.

### 5.2 Tablas

#### SEG_CLINICA (4 tablas)

| Tabla | Descripción | Columnas clave |
|---|---|---|
| `ROLES` | Catálogo de roles del sistema | `ROL_ID`, `NOMBRE` (ADMIN / RECEPCIONISTA / MEDICO), `ESTADO` |
| `USUARIOS` | Credenciales y perfil de cada usuario | `USUARIO_ID`, `USERNAME`, `PASSWORD_HASH RAW(32)`, `ROL_ID FK`, `MEDICO_ID FK`, `ESTADO` |
| `SESIONES` | Tokens de sesión activos con expiración | `SESION_ID`, `USUARIO_ID FK`, `TOKEN`, `FECHA_EXPIRACION`, `ESTADO` (A/E/C) |
| `AUDITORIA` | Log inmutable de operaciones críticas | `AUDITORIA_ID`, `USUARIO_ID`, `TABLA_AFECTADA`, `OPERACION`, `DATOS_ANTES CLOB`, `DATOS_DESPUES CLOB` |

#### APP_CLINICA (7 tablas)

| Tabla | Descripción | Columnas clave |
|---|---|---|
| `ESPECIALIDADES` | Catálogo de especialidades médicas | `ESPECIALIDAD_ID`, `NOMBRE UNIQUE`, `DESCRIPCION`, `ESTADO` |
| `MEDICOS` | Datos del médico | `MEDICO_ID`, `NOMBRES`, `APELLIDOS`, `NRO_COLEGIATURA UNIQUE`, `ESPECIALIDAD_ID FK`, `ESTADO` |
| `HORARIOS_MEDICO` | Horarios de atención por médico y día | `HORARIO_ID`, `MEDICO_ID FK`, `DIA_SEMANA` (1-7), `HORA_INICIO`, `HORA_FIN`, `DURACION_CITA_MIN` |
| `PACIENTES` | Datos demográficos de pacientes | `PACIENTE_ID`, `NOMBRES`, `APELLIDOS`, `DNI UNIQUE`, `FECHA_NACIMIENTO`, `TELEFONO`, `ESTADO` |
| `ESTADOS_CITA` | Catálogo de estados de cita | `ESTADO_CITA_ID`, `NOMBRE` (Pendiente / Confirmada / En Atención / Atendida / Cancelada) |
| `CITAS` | Registro central de citas | `CITA_ID`, `PACIENTE_ID FK`, `MEDICO_ID FK`, `ESPECIALIDAD_ID FK`, `FECHA_CITA`, `HORA_INICIO`, `HORA_FIN`, `ESTADO_CITA_ID FK`, `MOTIVO_CONSULTA`, `MOTIVO_CANCELACION`, `USUARIO_CREACION FK` |
| `NOTIFICACIONES` | Recordatorios y alertas automáticas | `NOTIFICACION_ID`, `CITA_ID FK`, `PACIENTE_ID FK`, `TIPO` (RECORDATORIO / CANCELACION / REPROGRAMACION), `MENSAJE`, `LEIDA` |

### 5.3 Secuencias

| Secuencia | Esquema | Tabla objetivo |
|---|---|---|
| `SEQ_USUARIOS` | SEG_CLINICA | USUARIOS.USUARIO_ID |
| `SEQ_AUDITORIA` | SEG_CLINICA | AUDITORIA.AUDITORIA_ID |
| `SEQ_ESPECIALIDADES` | APP_CLINICA | ESPECIALIDADES.ESPECIALIDAD_ID |
| `SEQ_MEDICOS` | APP_CLINICA | MEDICOS.MEDICO_ID |
| `SEQ_PACIENTES` | APP_CLINICA | PACIENTES.PACIENTE_ID |
| `SEQ_CITAS` | APP_CLINICA | CITAS.CITA_ID |
| `SEQ_NOTIFICACIONES` | APP_CLINICA | NOTIFICACIONES.NOTIFICACION_ID |
| `SEQ_HORARIOS` | APP_CLINICA | HORARIOS_MEDICO.HORARIO_ID |

### 5.4 Paquetes PL/SQL

#### PKG_SEGURIDAD — `SEG_CLINICA`

Centraliza autenticación, gestión de sesiones y validación de permisos.

| Objeto | Tipo | Descripción |
|---|---|---|
| `FN_HASH_PASSWORD(p_password)` | Función | SHA-256 via `DBMS_CRYPTO.HASH` + `UTL_I18N.STRING_TO_RAW`. Retorna `RAW(32)`. |
| `FN_AUTENTICAR(p_user, p_pass)` | Función | Valida credenciales comparando hash. Retorna `USUARIO_ID` o `-1` si falla. Actualiza `ULTIMO_ACCESO`. |
| `SP_CREAR_SESION(p_usuario_id, p_ip, p_token OUT)` | Procedimiento | Genera token único via `SYS_GUID()`. Inserta en SESIONES con expiración de 12 horas. |
| `SP_CERRAR_SESION(p_token)` | Procedimiento | Marca sesión como cerrada (`ESTADO = 'C'`). |
| `FN_VALIDAR_ROL(p_usuario_id, p_rol)` | Función | Retorna `1` si el usuario tiene el rol indicado, `0` si no. |
| `FN_VALIDAR_TOKEN_SESION(p_token)` | Función | Retorna `SYS_REFCURSOR` con datos del usuario si el token es válido y no expiró. Usado por el middleware de autenticación. |
| `FN_LISTAR_USUARIOS` | Función | Cursor con todos los usuarios y su rol (sin exponer hash). |
| `FN_LISTAR_ROLES` | Función | Cursor con catálogo de roles activos. |
| `FN_LISTAR_AUDITORIA` | Función | Cursor con log de auditoría completo, ordenado por fecha descendente. |

---

#### PKG_ADMINISTRACION — `APP_CLINICA`

CRUD de las entidades maestras del sistema. Usa parámetro `p_accion IN CHAR` con valores `'I'` (INSERT) o `'U'` (UPDATE).

| Procedimiento | Descripción |
|---|---|
| `SP_GESTIONAR_PACIENTE` | Inserta o actualiza paciente. Valida DNI único vía constraint de BD. |
| `SP_GESTIONAR_MEDICO` | Inserta o actualiza médico. Valida colegiatura única y especialidad existente. |
| `SP_GESTIONAR_ESPECIALIDAD` | CRUD de especialidades. Activa/inactiva por `ESTADO`. |
| `SP_GESTIONAR_HORARIO` | Configura horarios de atención por médico y día de semana. |
| `SP_GESTIONAR_USUARIO` | CRUD de usuarios. Llama a `PKG_SEGURIDAD.FN_HASH_PASSWORD` para nunca almacenar contraseña en texto plano. |

---

#### PKG_CITAS — `APP_CLINICA`

Núcleo de la lógica de agendamiento.

| Objeto | Tipo | Descripción |
|---|---|---|
| `FN_VERIFICAR_DISPONIBILIDAD(p_medico_id, p_fecha, p_hora_inicio, p_hora_fin)` | Función | Detecta traslapes con citas activas (estado Pendiente o Confirmada). Retorna `1` si disponible, `0` si no. |
| `SP_AGENDAR_CITA(...)` | Procedimiento | Verifica disponibilidad, inserta cita con estado Pendiente. Lanza excepción `-20001` si no hay disponibilidad. |
| `SP_CANCELAR_CITA(p_cita_id, p_motivo, p_usuario)` | Procedimiento | Cambia estado a Cancelada y registra motivo. |
| `SP_REPROGRAMAR_CITA(p_cita_id, nueva_fecha, ...)` | Procedimiento | Cancela la cita original y agenda una nueva en transacción atómica con `SAVEPOINT` / `ROLLBACK`. |
| `FN_OBTENER_FRANJAS_LIBRES(p_medico_id, p_fecha)` | Función | Retorna cursor con horario configurado del médico y citas ocupadas para calcular franjas libres. |

---

#### PKG_CONSULTAS — `APP_CLINICA`

Consultas operativas del día a día.

| Función | Descripción |
|---|---|
| `FN_AGENDA_DIARIA(p_medico_id, p_fecha)` | Citas del día de un médico: hora, paciente, motivo, estado. |
| `FN_HISTORIAL_PACIENTE(p_paciente_id)` | Historial completo de citas de un paciente, ordenado por fecha DESC. |
| `FN_CITAS_POR_ESPECIALIDAD(p_especialidad_id, p_desde, p_hasta)` | Citas de una especialidad en rango de fechas. |
| `FN_CITAS_POR_ESTADO(p_estado_id, p_medico_id, p_desde, p_hasta)` | Citas filtradas por estado, médico opcional y rango de fechas. |
| `FN_BUSCAR_PACIENTE(p_filtro)` | Búsqueda flexible por DNI, nombre o apellido (operador LIKE). |
| `FN_LISTAR_MEDICOS` | Todos los médicos con nombre de especialidad. |
| `FN_LISTAR_ESPECIALIDADES` | Catálogo completo de especialidades. |
| `FN_LISTAR_HORARIOS(p_medico_id)` | Horarios configurados; filtra por médico si se provee. |
| `FN_LISTAR_ESTADOS_CITA` | Catálogo de los 5 estados de cita. |
| `FN_LISTAR_NOTIFICACIONES` | Notificaciones con nombre de paciente, ordenadas por fecha DESC. |

---

#### PKG_REPORTES — `APP_CLINICA`

Reportes estadísticos para la gestión gerencial.

| Función | RF | Descripción |
|---|---|---|
| `FN_RPT_CITAS_POR_MEDICO(p_desde, p_hasta)` | RFR-01 | Total, atendidas, canceladas y promedio diario por médico. |
| `FN_RPT_CITAS_POR_ESPECIALIDAD(p_desde, p_hasta)` | RFR-02 | Cantidad de citas por especialidad, ordenadas por demanda. |
| `FN_RPT_CANCELACIONES(p_desde, p_hasta)` | RFR-03 | Motivos de cancelación más frecuentes con conteo. |
| `FN_RPT_PACIENTES_ATENDIDOS(p_desde, p_hasta)` | RFR-04 | Pacientes atendidos con total de visitas (identifica recurrentes). |
| `FN_RPT_OCUPACION_HORARIA(p_medico_id, p_desde, p_hasta)` | RFR-05 | Franjas horarias con mayor y menor demanda. |

### 5.5 Triggers

| Trigger | Tabla | Evento | Descripción |
|---|---|---|---|
| `TRG_IMPEDIR_EMPATE_CITA` | CITAS | BEFORE INSERT OR UPDATE | Llama a `FN_VERIFICAR_DISPONIBILIDAD`. Lanza excepción `-20002` si hay traslape. Garantiza integridad a nivel de BD. |
| `TRG_AUDITORIA_CITAS` | CITAS | AFTER INSERT / UPDATE / DELETE | Registra en `SEG_CLINICA.AUDITORIA` el estado anterior y posterior en formato JSON. |
| `TRG_AUDITORIA_PACIENTES` | PACIENTES | AFTER INSERT / UPDATE / DELETE | Registra en `AUDITORIA` los datos del paciente antes y después de cada operación. |
| `TRG_SEQ_CITA_ID` | CITAS | BEFORE INSERT | Asigna `CITA_ID` desde `SEQ_CITAS` si no viene informado. |
| `TRG_FECHA_MODIFICACION` | CITAS | BEFORE UPDATE | Actualiza `FECHA_MODIFICACION = SYSTIMESTAMP` automáticamente. |

### 5.6 Vistas

| Vista | Esquema | Descripción |
|---|---|---|
| `VW_AGENDA_DIARIA` | APP_CLINICA | JOIN de CITAS + PACIENTES + MEDICOS + ESTADOS_CITA. Agenda legible completa. |
| `VW_DISPONIBILIDAD_MEDICO` | APP_CLINICA | Cruza HORARIOS_MEDICO con MEDICOS y ESPECIALIDADES. Muestra horarios activos con nombre del día. |
| `VW_HISTORIAL_PACIENTE` | APP_CLINICA | Historial completo de citas con médico, especialidad, observaciones. Ordenado por fecha DESC. |
| `VW_RESUMEN_CITAS` | APP_CLINICA | Estadística de citas agrupada por médico, especialidad y estado (primera/última fecha). |
| `VW_USUARIOS_ACTIVOS` | SEG_CLINICA | Lista usuarios con su rol. Excluye `PASSWORD_HASH`. |

### 5.7 Jobs Programados

| Job | Esquema | Frecuencia | Descripción |
|---|---|---|---|
| `JOB_RECORDATORIOS_24H` | APP_CLINICA | Cada 1 hora | Detecta citas Confirmadas para las próximas 24 horas sin notificación de recordatorio y las inserta en `NOTIFICACIONES`. |
| `JOB_EXPIRAR_SESIONES` | SEG_CLINICA | Cada 30 minutos | Marca como expiradas (`ESTADO = 'E'`) las sesiones cuya `FECHA_EXPIRACION` ya pasó. |

Implementados con `DBMS_SCHEDULER.CREATE_JOB` (PL/SQL nativo).

### 5.8 Grants y Sinónimos

#### Grants de SEG_CLINICA → APP_CLINICA
```sql
GRANT SELECT ON SEG_CLINICA.ROLES        TO APP_CLINICA;
GRANT SELECT ON SEG_CLINICA.USUARIOS     TO APP_CLINICA;
GRANT INSERT ON SEG_CLINICA.AUDITORIA    TO APP_CLINICA;
GRANT SELECT, UPDATE ON SEG_CLINICA.SESIONES TO APP_CLINICA;
GRANT EXECUTE ON SEG_CLINICA.PKG_SEGURIDAD   TO APP_CLINICA;
GRANT INSERT, UPDATE ON SEG_CLINICA.USUARIOS TO APP_CLINICA;
GRANT SELECT ON SEG_CLINICA.SEQ_USUARIOS     TO APP_CLINICA;
```

#### Grants de APP_CLINICA → SEG_CLINICA
```sql
GRANT REFERENCES ON APP_CLINICA.MEDICOS  TO SEG_CLINICA;
GRANT REFERENCES ON SEG_CLINICA.USUARIOS TO APP_CLINICA;
```

#### Sinónimos privados en APP_CLINICA
```sql
CREATE SYNONYM APP_CLINICA.ROLES     FOR SEG_CLINICA.ROLES;
CREATE SYNONYM APP_CLINICA.USUARIOS  FOR SEG_CLINICA.USUARIOS;
CREATE SYNONYM APP_CLINICA.AUDITORIA FOR SEG_CLINICA.AUDITORIA;
CREATE SYNONYM APP_CLINICA.SESIONES  FOR SEG_CLINICA.SESIONES;
```

---

## 6. Backend — API Bridge Node.js

El servidor Express actúa exclusivamente como adaptador HTTP↔Oracle. **No contiene lógica de negocio.**

**Archivo único:** `backend/server.js`

Componentes internos:
- **Pool de conexiones** (`oracledb.createPool`): mínimo 2, máximo 10 conexiones simultáneas.
- **`executeDb(query, binds)`**: ejecuta statements DML/DDL y retorna `outBinds`.
- **`executeWithCursor(query, binds)`**: ejecuta funciones que retornan `SYS_REFCURSOR` y materializa todas las filas como array JSON.
- **Middleware `authenticateToken`**: extrae el Bearer token del header `Authorization` y llama a `PKG_SEGURIDAD.FN_VALIDAR_TOKEN_SESION`. Rechaza con HTTP 401 si el token es inválido o expirado.

### 6.1 Endpoints

#### Autenticación

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| POST | `/api/auth/login` | Autentica usuario, crea sesión, retorna token y perfil | `FN_AUTENTICAR` + `SP_CREAR_SESION` |
| POST | `/api/auth/logout` | Cierra la sesión activa | `SP_CERRAR_SESION` |

#### Pacientes

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/pacientes?filtro=` | Busca pacientes por DNI / nombre / apellido | `FN_BUSCAR_PACIENTE` |
| POST | `/api/pacientes/gestionar` | Crea o actualiza paciente (`accion: I/U`) | `SP_GESTIONAR_PACIENTE` |

#### Médicos

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/medicos` | Lista todos los médicos con especialidad | `FN_LISTAR_MEDICOS` |
| POST | `/api/medicos/gestionar` | Crea o actualiza médico | `SP_GESTIONAR_MEDICO` |

#### Especialidades

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/especialidades` | Lista catálogo de especialidades | `FN_LISTAR_ESPECIALIDADES` |
| POST | `/api/especialidades/gestionar` | Crea o actualiza especialidad | `SP_GESTIONAR_ESPECIALIDAD` |

#### Horarios

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/horarios?medicoId=` | Lista horarios (filtro opcional por médico) | `FN_LISTAR_HORARIOS` |
| POST | `/api/horarios/gestionar` | Crea o actualiza horario | `SP_GESTIONAR_HORARIO` |

#### Usuarios y Roles

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/usuarios` | Lista usuarios con rol | `FN_LISTAR_USUARIOS` |
| GET | `/api/roles` | Catálogo de roles | `FN_LISTAR_ROLES` |
| POST | `/api/usuarios/gestionar` | Crea o actualiza usuario | `SP_GESTIONAR_USUARIO` |

#### Citas

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/citas/disponibilidad?medicoId=&fecha=` | Horarios libres de un médico en una fecha | `FN_OBTENER_FRANJAS_LIBRES` |
| POST | `/api/citas/agendar` | Agenda una nueva cita | `SP_AGENDAR_CITA` |
| POST | `/api/citas/cancelar` | Cancela una cita con motivo | `SP_CANCELAR_CITA` |
| POST | `/api/citas/reprogramar` | Reprograma cita (atómica) | `SP_REPROGRAMAR_CITA` |
| GET | `/api/citas/estados` | Catálogo de estados de cita | `FN_LISTAR_ESTADOS_CITA` |
| GET | `/api/citas/agenda-diaria?medicoId=&fecha=` | Citas del día de un médico | `FN_AGENDA_DIARIA` |
| GET | `/api/citas/historial-paciente?pacienteId=` | Historial completo de un paciente | `FN_HISTORIAL_PACIENTE` |
| GET | `/api/citas/por-especialidad?especialidadId=&fechaInicio=&fechaFin=` | Citas por especialidad y período | `FN_CITAS_POR_ESPECIALIDAD` |
| GET | `/api/citas/por-estado?estadoCitaId=&medicoId=&fechaInicio=&fechaFin=` | Citas filtradas por estado | `FN_CITAS_POR_ESTADO` |

#### Reportes

| Método | Ruta | RF | PL/SQL |
|---|---|---|---|
| GET | `/api/reportes/citas-por-medico?fechaInicio=&fechaFin=` | RFR-01 | `FN_RPT_CITAS_POR_MEDICO` |
| GET | `/api/reportes/citas-por-especialidad?fechaInicio=&fechaFin=` | RFR-02 | `FN_RPT_CITAS_POR_ESPECIALIDAD` |
| GET | `/api/reportes/cancelaciones?fechaInicio=&fechaFin=` | RFR-03 | `FN_RPT_CANCELACIONES` |
| GET | `/api/reportes/pacientes-atendidos?fechaInicio=&fechaFin=` | RFR-04 | `FN_RPT_PACIENTES_ATENDIDOS` |
| GET | `/api/reportes/ocupacion-horaria?medicoId=&fechaInicio=&fechaFin=` | RFR-05 | `FN_RPT_OCUPACION_HORARIA` |

#### Auditoría y Notificaciones

| Método | Ruta | Descripción | PL/SQL |
|---|---|---|---|
| GET | `/api/auditoria` | Log completo de operaciones | `FN_LISTAR_AUDITORIA` |
| GET | `/api/notificaciones` | Todas las notificaciones con paciente | `FN_LISTAR_NOTIFICACIONES` |
| POST | `/api/notificaciones/marcar-leida` | Marca notificación como leída | `SP_MARCAR_NOTIF_LEIDA` |

---

## 7. Frontend — React SPA

### 7.1 Pantallas por Rol

| Pantalla | Archivo | Ruta | Rol |
|---|---|---|---|
| Login | `Login.jsx` | `/login` | Todos |
| Dashboard | `Dashboard.jsx` | `/` | Admin / Recepcionista |
| Agendar Cita | `RecepcionAgenda.jsx` | `/recepcion/agenda` | Recepcionista |
| Mi Agenda | `MedicoAgenda.jsx` | `/medico/agenda` | Médico |
| Gestión de Pacientes | `AdminPacientes.jsx` | `/admin/pacientes` | Admin / Recepcionista |
| Gestión de Médicos | `AdminMedicos.jsx` | `/admin/medicos` | Admin |
| Gestión de Especialidades | `AdminEspecialidades.jsx` | `/admin/especialidades` | Admin |
| Horarios Médicos | `AdminHorarios.jsx` | `/admin/horarios` | Admin |
| Gestión de Usuarios | `AdminUsuarios.jsx` | `/admin/usuarios` | Admin |
| Reportes Gerenciales | `AdminReportes.jsx` | `/admin/reportes` | Admin / Recepcionista |
| Notificaciones | `Notificaciones.jsx` | `/recepcion/notificaciones` | Recepcionista |

> **Historial de Paciente**: accesible desde el icono de historial en `AdminPacientes.jsx` (modal con filtros por estado y rango de fechas) y desde `MedicoAgenda.jsx` (timeline cronológico).

### 7.2 Estructura de Componentes

```
AuthProvider (AuthContext.jsx)
└── Router
    ├── /login → Login.jsx
    └── ProtectedRoute
        └── Layout.jsx (sidebar dinámico por rol + header)
            ├── Dashboard.jsx
            ├── RecepcionAgenda.jsx
            ├── MedicoAgenda.jsx
            ├── AdminPacientes.jsx    (modal historial con filtros)
            ├── AdminMedicos.jsx
            ├── AdminEspecialidades.jsx
            ├── AdminHorarios.jsx
            ├── AdminUsuarios.jsx
            ├── AdminReportes.jsx
            └── Notificaciones.jsx
```

**Gestión de sesión:** `AuthContext` almacena token en `localStorage`, configura `axios.defaults.headers.common['Authorization']` automáticamente e intercepta respuestas HTTP 401 para limpiar la sesión.

---

## 8. Seguridad

| Mecanismo | Implementación |
|---|---|
| **Hash de contraseñas** | `DBMS_CRYPTO.HASH` con `HASH_SH256` + `UTL_I18N.STRING_TO_RAW` (AL32UTF8). Nunca texto plano. |
| **Tokens de sesión** | Generados con `SYS_GUID()` (128 bits de entropía). Expiran en 12 horas. |
| **Autenticación por request** | Middleware Express valida cada request contra `SESIONES` en Oracle via `FN_VALIDAR_TOKEN_SESION`. |
| **Aislamiento de agenda médica** | `FN_AGENDA_DIARIA` filtra siempre por `MEDICO_ID` del token en sesión. Un médico no puede ver la agenda de otro. |
| **Control de acceso por rol** | El sidebar y las rutas React se renderizan según el rol almacenado en el token. |
| **Auditoría** | Triggers `TRG_AUDITORIA_CITAS` y `TRG_AUDITORIA_PACIENTES` registran automáticamente en `SEG_CLINICA.AUDITORIA` el estado antes/después en JSON. |
| **Integridad de traslapes** | `TRG_IMPEDIR_EMPATE_CITA` garantiza a nivel de BD que ningún médico tenga dos citas simultáneas, independientemente de la capa de aplicación. |
| **Expiración de sesiones** | `JOB_EXPIRAR_SESIONES` corre cada 30 minutos para invalidar tokens vencidos. |
| **Acceso a datos sensibles** | `VW_USUARIOS_ACTIVOS` excluye `PASSWORD_HASH`. Los datos de pacientes solo son accesibles con token válido. |

---

## 9. Requerimientos Funcionales

### RF de Negocio

| Código | Descripción | Estado |
|---|---|---|
| RFN-01 | Agendar cita verificando disponibilidad del médico antes de confirmar | ✅ `SP_AGENDAR_CITA` + `FN_VERIFICAR_DISPONIBILIDAD` |
| RFN-02 | Cancelar cita liberando la franja horaria | ✅ `SP_CANCELAR_CITA` |
| RFN-03 | Reprogramar cita en operación atómica (cancelar + crear) | ✅ `SP_REPROGRAMAR_CITA` con SAVEPOINT |
| RFN-04 | Recordatorios automáticos 24h antes de la cita | ✅ `JOB_RECORDATORIOS_24H` cada hora |
| RFN-05 | Impedir asignación de dos citas al mismo médico en la misma franja | ✅ `TRG_IMPEDIR_EMPATE_CITA` (nivel BD) |

### RF de Seguridad

| Código | Descripción | Estado |
|---|---|---|
| RFS-01 | Contraseñas con hash SHA-256 via DBMS_CRYPTO, nunca texto plano | ✅ `FN_HASH_PASSWORD` |
| RFS-02 | Roles diferenciados: Administrador, Recepcionista, Médico | ✅ Tabla ROLES + sidebar por rol |
| RFS-03 | Un médico no puede ver la agenda de otro | ✅ `FN_AGENDA_DIARIA` filtra por medicoId en sesión |
| RFS-04 | Datos de pacientes accesibles solo para personal autenticado | ✅ Middleware `authenticateToken` en todos los endpoints |
| RFS-05 | Auditoría de operaciones críticas con usuario, acción, datos y timestamp | ✅ `TRG_AUDITORIA_CITAS` + `TRG_AUDITORIA_PACIENTES` |

### RF Administrativos

| Código | Descripción | Estado |
|---|---|---|
| RFA-01 | CRUD completo de pacientes (registrar, editar, activar, inactivar) | ✅ `SP_GESTIONAR_PACIENTE` + `AdminPacientes.jsx` |
| RFA-02 | CRUD completo de médicos con especialidad | ✅ `SP_GESTIONAR_MEDICO` + `AdminMedicos.jsx` |
| RFA-03 | Gestión del catálogo de especialidades (CRUD + estado) | ✅ `SP_GESTIONAR_ESPECIALIDAD` + `AdminEspecialidades.jsx` |
| RFA-04 | Configurar horarios de atención por médico y día de semana | ✅ `SP_GESTIONAR_HORARIO` + `AdminHorarios.jsx` |
| RFA-05 | CRUD de usuarios del sistema con asignación de rol | ✅ `SP_GESTIONAR_USUARIO` + `AdminUsuarios.jsx` |

### RF de Consultas

| Código | Descripción | Estado |
|---|---|---|
| RFC-01 | Consultar disponibilidad de un médico en fecha específica | ✅ `FN_OBTENER_FRANJAS_LIBRES` + `RecepcionAgenda.jsx` |
| RFC-02 | Consultar citas del día para un médico (agenda diaria) | ✅ `FN_AGENDA_DIARIA` + `MedicoAgenda.jsx` |
| RFC-03 | Historial completo de citas de un paciente por fecha | ✅ `FN_HISTORIAL_PACIENTE` + modal en `AdminPacientes.jsx` |
| RFC-04 | Buscar citas por especialidad y rango de fechas | ✅ `FN_CITAS_POR_ESPECIALIDAD` + `AdminReportes.jsx` |
| RFC-05 | Filtrar citas por estado, médico y rango de fechas | ✅ `FN_CITAS_POR_ESTADO` + `RecepcionAgenda.jsx` |

### RF de Reportes

| Código | Descripción | Estado |
|---|---|---|
| RFR-01 | Reporte de citas atendidas por médico: total, atendidas, canceladas, promedio diario | ✅ `FN_RPT_CITAS_POR_MEDICO` |
| RFR-02 | Reporte de citas por especialidad en período | ✅ `FN_RPT_CITAS_POR_ESPECIALIDAD` |
| RFR-03 | Reporte de cancelaciones: motivos frecuentes y tasas | ✅ `FN_RPT_CANCELACIONES` |
| RFR-04 | Reporte de pacientes atendidos: nuevos vs recurrentes | ✅ `FN_RPT_PACIENTES_ATENDIDOS` |
| RFR-05 | Reporte de ocupación por franja horaria | ✅ `FN_RPT_OCUPACION_HORARIA` |

---

## 10. Instalación y Ejecución

### Requisitos previos

- Oracle Database 19c o superior (con Oracle Net en `localhost:1521/orcl`)
- Node.js 18 LTS o superior
- npm 9+

### 1. Configurar la Base de Datos Oracle

Conectar como SYSDBA y ejecutar los scripts **en el siguiente orden**:

```sql
-- 1. Esquemas, secuencias y tablas
@database/01_esquemas_y_tablas.sql

-- 2. Grants y sinónimos entre esquemas
@database/02_grants_sinonimos.sql

-- 3. Paquetes PL/SQL (ejecutar conectado como el esquema correspondiente)
@database/packages/04_pkg_seguridad.sql
@database/packages/05_pkg_administracion.sql
@database/packages/06_pkg_citas.sql
@database/packages/07_pkg_consultas.sql
@database/packages/08_pkg_reportes.sql

-- 4. Triggers, vistas y jobs
@database/09_triggers_vistas_jobs.sql

-- 5. Datos semilla obligatorios
@database/03_datos_semilla.sql

-- 6. Datos de prueba (opcional, volumen de 50 citas)
@database/13_bulk_seed_data.sql
```

### 2. Configurar el Backend

```bash
cd backend
```

Editar `.env` con las credenciales de Oracle:

```env
PORT=5000
DB_USER=system
DB_PASSWORD=TU_PASSWORD_ORACLE
DB_CONNECTION_STRING=localhost:1521/orcl
```

Instalar dependencias e iniciar:

```bash
npm install
node server.js
```

El servidor queda escuchando en `http://localhost:5000`.

### 3. Configurar el Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

### Credenciales por defecto

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin` | ADMINISTRADOR |

> La contraseña se almacena como SHA-256 en `SEG_CLINICA.USUARIOS`. Ver `03_datos_semilla.sql` para el hash exacto.

---

## 11. Datos Semilla

El script `03_datos_semilla.sql` inserta:

- **3 roles:** ADMINISTRADOR, RECEPCIONISTA, MEDICO
- **5 estados de cita:** Pendiente (1), Confirmada (2), En Atención (3), Atendida (4), Cancelada (5)
- **4 especialidades base:** Medicina General, Pediatría, Traumatología, Ginecología
- **1 usuario sistema** (`USUARIO_ID = -1`) para operaciones automáticas y triggers
- **1 usuario administrador** (`admin` / `admin`)

El script `13_bulk_seed_data.sql` agrega médicos, pacientes, horarios y citas de prueba para simular el volumen de operación de 50 citas diarias.

---

## 12. Flujos Principales

### Flujo: Login

```
Usuario ingresa credenciales
  → POST /api/auth/login
    → FN_AUTENTICAR (verifica hash SHA-256)
    → SP_CREAR_SESION (genera token, inserta en SESIONES)
    → FN_VALIDAR_TOKEN_SESION (retorna perfil del usuario)
  ← Token + perfil (nombre, rol, medicoId)
→ AuthContext almacena en localStorage
→ Axios configura header Authorization: Bearer {token}
→ Redirect a Dashboard según rol
```

### Flujo: Agendar Cita

```
Recepcionista selecciona médico + fecha
  → GET /api/citas/disponibilidad?medicoId=X&fecha=Y
    → FN_OBTENER_FRANJAS_LIBRES (horario base + citas ocupadas)
  ← Franjas libres calculadas en frontend

Recepcionista selecciona franja + paciente + motivo
  → POST /api/citas/agendar
    → SP_AGENDAR_CITA
      → FN_VERIFICAR_DISPONIBILIDAD (doble verificación)
      → INSERT CITAS (estado: Pendiente)
      → TRG_AUDITORIA_CITAS (registra en AUDITORIA)
      → TRG_IMPEDIR_EMPATE_CITA (guarda de seguridad a nivel BD)
  ← citaId confirmado
```

### Flujo: Recordatorio Automático

```
JOB_RECORDATORIOS_24H (cada 1 hora, ejecutado por DBMS_SCHEDULER)
  → Busca CITAS con ESTADO_CITA_ID = 2 (Confirmada)
     Y FECHA_CITA = SYSDATE + 1
     Y sin NOTIFICACION de tipo RECORDATORIO
  → INSERT NOTIFICACIONES (tipo: RECORDATORIO)
  → Disponible en GET /api/notificaciones para el recepcionista
```

### Flujo: Consulta de Agenda (Médico)

```
Médico accede a /medico/agenda
  → GET /api/citas/agenda-diaria?medicoId={medicoId_del_token}&fecha=HOY
    → FN_AGENDA_DIARIA (filtra SOLO por el medicoId del token en sesión)
  ← Lista de citas propias del día
  ← No puede solicitar citas de otro medicoId (el backend toma el ID del token)
```

---

*Documentación generada para el Proyecto 2 — SW609 SGBD — UNI 2026-1*
