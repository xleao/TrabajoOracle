# Presentación PPT — PC4 SW609 2026-1
## Sistema de Gestión de Citas Médicas — Clínica "Salud y Vida"
### Guía diapositiva por diapositiva

---

## DIAPOSITIVA 1 — CARÁTULA

**Título principal:**
> Sistema de Gestión de Citas Médicas
> Clínica "Salud y Vida"

**Subtítulo:**
> Práctica Calificada 4 — SW609 Sistemas de Gestión de Base de Datos

**Contenido visual:**
- Logo UNI centrado arriba
- Fondo azul oscuro (#1A3C6B) con franja naranja en la base
- Nombres de los integrantes (3 columnas)
- Docente: Dr. Eric Gustavo Coronel Castillo
- Sección U · Ciclo 2026-1 · Fecha 02/07/2026

**Notas del expositor:**
- Presentar brevemente a cada integrante y el tema que expone cada uno.

---

## DIAPOSITIVA 2 — AGENDA DE LA PRESENTACIÓN

**Título:** Agenda

**Contenido (lista numerada):**
1. Caso de negocio y problemática
2. Solución propuesta y alcance
3. Arquitectura de esquemas Oracle
4. Modelo de datos
5. Paquetes PL/SQL
6. Mecanismos de seguridad e integridad
7. Consultas operativas
8. Reportes gerenciales
9. Evidencias de prueba
10. Conclusiones

**Visual:**
- Íconos pequeños junto a cada punto (BD, seguridad, gráfico, etc.)
- Fondo blanco, texto azul oscuro

---

## DIAPOSITIVA 3 — CASO DE NEGOCIO: LA CLÍNICA

**Título:** ¿Quién es la Clínica "Salud y Vida"?

**Contenido (dos columnas):**

Columna izquierda — Datos del cliente:
- Centro médico de tamaño mediano en Lima, Perú
- 4 especialidades: Medicina General, Pediatría, Traumatología, Ginecología
- ~5 médicos activos en consulta
- ~50 citas diarias en temporada alta
- Personal: recepcionistas, médicos y administrador

Columna derecha — Situación actual:
- Agenda gestionada en **cuaderno físico** en recepción
- Sin sistema informático de ningún tipo
- Sin historial consultable de pacientes
- Sin mecanismo de recordatorios

**Visual:**
- Ícono de cuaderno/libreta vs. ícono de base de datos
- Flecha de transición "antes → después"

---

## DIAPOSITIVA 4 — PROBLEMÁTICA IDENTIFICADA

**Título:** El Problema (6 puntos críticos)

**Contenido (6 tarjetas visuales, 2 filas × 3 columnas):**

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Empates de horario** — mismo médico, misma franja | Conflictos en consulta, mala experiencia |
| 2 | **Reprogramación manual ineficiente** | Tiempo perdido, errores frecuentes |
| 3 | **Sin visibilidad de disponibilidad** | Recepcionista no sabe si hay cupo sin revisar cuaderno |
| 4 | **Sin recordatorios automáticos** | Ausentismo elevado de pacientes |
| 5 | **Sin historial consultable** | No se puede rastrear el historial de un paciente |
| 6 | **Sin reportes estadísticos** | Gerencia no puede tomar decisiones basadas en datos |

**Visual:**
- Cada tarjeta con ícono de alerta (rojo/naranja)
- Fondo ligeramente gris para las tarjetas

---

## DIAPOSITIVA 5 — SOLUCIÓN PROPUESTA Y ALCANCE

**Título:** Solución: Oracle 19c + Node.js + React

**Contenido (3 bloques verticales):**

```
[ Oracle 19c ]          [ Node.js/Express ]       [ React + Vite ]
2 esquemas              API REST                   SPA
5 paquetes PL/SQL       Pool oracledb              Rutas por rol
11 tablas               Middleware JWT-like         Dashboard por usuario
5 triggers              authenticateToken          Login, agenda, citas
5 vistas                                           Reportes
2 jobs
```

**Dentro del alcance:**
- Gestión completa del ciclo de vida de citas
- Autenticación, roles y auditoría
- Notificaciones y recordatorios automáticos
- Consultas operativas y reportes gerenciales

**Fuera del alcance:**
- Historia clínica electrónica
- Facturación / seguros
- App móvil nativa
- Teleconsulta

---

## DIAPOSITIVA 6 — ARQUITECTURA DE ESQUEMAS ORACLE

**Título:** Dos Esquemas Separados — Principio de Mínimo Privilegio

**Visual principal (diagrama de dos cajas):**

```
┌─────────────────────────────┐        ┌──────────────────────────────────────┐
│      SEG_CLINICA            │        │           APP_CLINICA                │
│   (Seguridad e Identidad)   │        │         (Lógica de Negocio)          │
├─────────────────────────────┤        ├──────────────────────────────────────┤
│ ROLES                       │◄──FK───│ USUARIOS.MEDICO_ID → MEDICOS         │
│ USUARIOS                    │        │ ESPECIALIDADES                        │
│ SESIONES                    │        │ MEDICOS                               │
│ AUDITORIA                   │        │ HORARIOS_MEDICO                       │
├─────────────────────────────┤        │ PACIENTES                             │
│ PKG_SEGURIDAD               │        │ ESTADOS_CITA                          │
│ VW_USUARIOS_ACTIVOS         │        │ CITAS                                 │
│ JOB_EXPIRAR_SESIONES        │        │ NOTIFICACIONES                        │
└─────────────────────────────┘        ├──────────────────────────────────────┤
          ▲                            │ PKG_VALOR · PKG_ADMINISTRACION        │
          │  GRANT EXECUTE             │ PKG_CONSULTAS · PKG_REPORTES          │
          │  GRANT SELECT/INSERT       │ 5 triggers · 4 vistas                 │
          │  Sinónimos privados        │ JOB_RECORDATORIOS_24H                 │
          └────────────────────────────┘
```

**Puntos clave a mencionar:**
- APP_CLINICA accede a SEG_CLINICA solo mediante GRANTs explícitos
- Sinónimos privados encapsulan referencias cruzadas
- FK cruzada USUARIOS.MEDICO_ID → APP_CLINICA.MEDICOS con GRANT REFERENCES

---

## DIAPOSITIVA 7 — MODELO DE DATOS (DIAGRAMA E-R)

**Título:** Modelo Entidad-Relación — 11 Tablas

**Visual:**
- Insertar aquí el **Diagrama_ER_Perfecto_HD.png**
- Tamaño: ocupar 80% de la diapositiva
- Leyenda abajo: azul = SEG_CLINICA · verde = APP_CLINICA · rojo punteado = FK cruzada

**Puntos a señalar con flecha/puntero durante la exposición:**
1. FK cruzada entre esquemas (USUARIOS → MEDICOS)
2. CITAS como tabla central con 5 FK
3. NOTIFICACIONES como tabla de eventos automáticos
4. ESTADOS_CITA como catálogo de ciclo de vida

---

## DIAPOSITIVA 8 — MODELO FÍSICO: TABLAS CLAVE

**Título:** Decisiones de Implementación Física

**Contenido (tabla):**

| Tabla | Decisión técnica | Justificación |
|-------|-----------------|---------------|
| USUARIOS | PASSWORD_HASH RAW(64) | SHA-256 nativo con DBMS_CRYPTO, nunca texto plano |
| CITAS | HORA_INICIO/FIN VARCHAR2(5) | Comparación simple HH24:MI sin conversión de zona horaria |
| CITAS | USUARIO_CREACION FK cruzada | Trazabilidad del actor que agendó, cumple SEG05 |
| HORARIOS_MEDICO | DURACION_CITA_MIN NUMBER | Define el tamaño de franja, base de CON01 |
| AUDITORIA | DATOS_ANTES/DESPUES CLOB | JSON completo del registro antes y después del cambio |
| NOTIFICACIONES | LEIDA CHAR(1) | Control simple de lectura sin tabla extra |

**Índices (6 justificados):**

| Índice | Columnas | Req. que optimiza |
|--------|----------|-------------------|
| IDX_CITAS_MEDICO_FECHA | MEDICO_ID, FECHA_CITA | VAL01, CON02 |
| IDX_CITAS_PACIENTE | PACIENTE_ID | CON03 |
| IDX_CITAS_ESTADO | ESTADO_CITA_ID | CON05, REP03 |
| IDX_PACIENTES_DNI | DNI | ADM01 |
| IDX_HORARIOS_DIA | DIA_SEMANA | CON01 |
| IDX_AUDITORIA_USUARIO | USUARIO_ID | SEG05 |

---

## DIAPOSITIVA 9 — LOS 25 REQUERIMIENTOS

**Título:** 25 Requerimientos Funcionales — 5 Bloques

**Visual (5 tarjetas horizontales, una por bloque):**

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   PKG_VALOR  │  │PKG_SEGURIDAD │  │PKG_ADMINISTR.│  │PKG_CONSULTAS │  │ PKG_REPORTES │
│  VAL01–VAL05 │  │  SEG01–SEG05 │  │  ADM01–ADM05 │  │  CON01–CON05 │  │  REP01–REP05 │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ Agendar cita │  │ Hash SHA-256 │  │ CRUD Paciente│  │ Franjas lib. │  │ Por médico   │
│ Cancelar     │  │ Roles        │  │ CRUD Médico  │  │ Agenda diaria│  │ Especialidad │
│ Reprogramar  │  │ Solo su agen.│  │ Especialidad │  │ Historial    │  │ Cancelaciones│
│ Recordatorios│  │ Sesiones+JWT │  │ Horarios     │  │ Por espec.   │  │ Nuevos/recu. │
│ Anti-colisión│  │ Auditoría    │  │ Usuarios     │  │ Por estado   │  │ Ocupación    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**Nota:** Cada paquete en un color distinto, con ícono representativo.

---

## DIAPOSITIVA 10 — PKG_VALOR: LÓGICA DE CITAS

**Título:** PKG_VALOR — El Corazón del Sistema (VAL01–VAL05)

**Contenido (flujo visual de una cita):**

```
RECEPCIONISTA
     │
     ▼
SP_AGENDAR_CITA
     │
     ├── FOR UPDATE NOWAIT ──► bloquea fila del médico
     │
     ├── FN_VERIFICAR_DISPONIBILIDAD ──► ¿slot libre?
     │        │
     │      NO └──► ORA-20001 "Sin disponibilidad"
     │
     ├── INSERT CITAS (estado=Pendiente)
     │
     ├── INSERT NOTIFICACIONES (tipo=CONFIRMACION)
     │
     ▼
  CITA CREADA ──► [cancelar] SP_CANCELAR_CITA ──► estado=5 + notif. CANCELACION
                       │
                       └──► [reprogramar] SP_REPROGRAMAR_CITA
                                   │
                                   ├── SAVEPOINT sv_reprogramacion
                                   ├── SP_CANCELAR_CITA (original)
                                   ├── SP_AGENDAR_CITA (nueva fecha)
                                   ├── INSERT notif. REPROGRAMACION
                                   └── ROLLBACK TO si cualquier paso falla
```

**VAL04:** `SP_PROCESAR_RECORDATORIOS` — ejecutado por `JOB_RECORDATORIOS_24H` cada hora. Inserta RECORDATORIO para citas del día siguiente sin duplicar.

**VAL05:** `TRG_IMPEDIR_EMPATE_CITA` — trigger COMPOUND (BEFORE STATEMENT + BEFORE EACH ROW) como segunda línea de defensa contra solapamientos.

---

## DIAPOSITIVA 11 — PKG_SEGURIDAD: AUTENTICACIÓN Y AUDITORÍA

**Título:** PKG_SEGURIDAD — Seguridad Real en Oracle (SEG01–SEG05)

**Contenido (dos bloques):**

**Bloque 1 — Flujo de autenticación:**
```
LOGIN (usuario + password)
        │
        ▼
FN_HASH_PASSWORD(password)
   DBMS_CRYPTO.HASH(..., HASH_SH256)
        │
        ▼
FN_AUTENTICAR → compara RAW(64) en USUARIOS
        │
        ├── FALLO → retorna -1
        │
        └── OK → SP_CREAR_SESION
                     │
                     └── DBMS_CRYPTO.RANDOMBYTES(32)
                         → token hex 64 chars
                         → expira SYSTIMESTAMP + 12h
                         → retorna token al backend
```

**Bloque 2 — Auditoría automática:**
- `TRG_AUDITORIA_CITAS` + `TRG_AUDITORIA_PACIENTES`
- AFTER INSERT OR UPDATE OR DELETE
- Llaman a `SP_REGISTRAR_AUDITORIA` con JSON :OLD/:NEW
- Registro en AUDITORIA con actor, tabla, operación, timestamp, IP

**SEG03:** El backend valida que `MEDICO_ID` del token = `MEDICO_ID` del parámetro solicitado → médico solo ve su agenda.

---

## DIAPOSITIVA 12 — PKG_ADMINISTRACION: CRUD MAESTROS

**Título:** PKG_ADMINISTRACION — Gestión de Entidades (ADM01–ADM05)

**Contenido (tabla resumen):**

| Req. | Procedimiento | Acción | Validación incluida |
|------|--------------|--------|---------------------|
| ADM01 | SP_GESTIONAR_PACIENTE(I/U) | INSERT / UPDATE PACIENTES | DNI único, estado A/I |
| ADM02 | SP_GESTIONAR_MEDICO(I/U) | INSERT / UPDATE MEDICOS | NRO_COLEGIATURA único |
| ADM03 | SP_GESTIONAR_ESPECIALIDAD(I/U) | INSERT / UPDATE ESPECIALIDADES | NOMBRE único |
| ADM04 | SP_GESTIONAR_HORARIO(I/U) | INSERT / UPDATE HORARIOS_MEDICO | **Detecta solapamiento de franjas** antes de insertar |
| ADM05 | SP_GESTIONAR_USUARIO(I/U) | INSERT / UPDATE USUARIOS | Llama FN_HASH_PASSWORD automáticamente |

**Punto clave a destacar:**
- ADM04 valida que el nuevo horario no se solape con horarios existentes del mismo médico en el mismo día.
- ADM05 nunca almacena contraseña en texto plano — la hashea internamente.

---

## DIAPOSITIVA 13 — PKG_CONSULTAS: DISPONIBILIDAD Y AGENDA

**Título:** PKG_CONSULTAS — Consultas Operativas del Día a Día (CON01–CON05)

**Contenido (5 fichas):**

**CON01 — FN_OBTENER_FRANJAS_LIBRES(medico_id, fecha)**
- Técnica: `CONNECT BY LEVEL <= 100` genera todos los slots del horario
- Filtra con `NOT EXISTS` los slots que ya tienen cita activa (estado 1 o 2)
- Retorna: FRANJA_INICIO, FRANJA_FIN, DURACION_CITA_MIN

**CON02 — FN_AGENDA_DIARIA(medico_id, fecha)**
- JOIN CITAS–PACIENTES–ESTADOS_CITA
- Filtra por MEDICO_ID y TRUNC(FECHA_CITA)
- Base de la pantalla principal del médico

**CON03 — FN_HISTORIAL_PACIENTE(paciente_id)**
- JOIN 4 tablas: CITAS, MEDICOS, ESPECIALIDADES, ESTADOS_CITA
- ORDER BY FECHA_CITA DESC → la más reciente primero

**CON04 — FN_CITAS_POR_ESPECIALIDAD(esp_id, f_ini, f_fin)**
- BETWEEN TRUNC(f_ini) AND TRUNC(f_fin) sobre ESPECIALIDAD_ID

**CON05 — FN_CITAS_POR_ESTADO(estado_id, medico_id, f_ini, f_fin)**
- `c.MEDICO_ID = p_medico_id OR p_medico_id IS NULL` → NULL = todos los médicos

---

## DIAPOSITIVA 14 — PKG_REPORTES: TOMA DE DECISIONES

**Título:** PKG_REPORTES — Inteligencia para la Gerencia (REP01–REP05)

**Contenido (tabla):**

| Req. | Función | Indicadores | Decisión que habilita |
|------|---------|-------------|----------------------|
| REP01 | FN_RPT_CITAS_POR_MEDICO | Total, Atendidas, Canceladas, Promedio/día | Detectar sobrecarga o subutilización de médicos |
| REP02 | FN_RPT_CITAS_POR_ESPECIALIDAD | Ranking por volumen de citas | Ampliar o reducir servicios por especialidad |
| REP03a | FN_RPT_CANCELACIONES | Motivos y frecuencia | Acciones preventivas según causa raíz |
| REP03b | FN_RPT_CANCEL_POR_MEDICO | Tasa % de cancelación | Identificar médicos con mayor ausentismo de pacientes |
| REP03c | FN_RPT_CANCEL_POR_PACIENTE | Tasa % por paciente | Detectar pacientes que no asisten sistemáticamente |
| REP04 | FN_RPT_PACIENTES_ATENDIDOS | NUEVO vs RECURRENTE + visitas | Estrategia de captación y fidelización |
| REP05 | FN_RPT_OCUPACION_HORARIA | Franja → demanda total | Optimizar distribución de turnos de atención |

**Dato real de la prueba:**
> REP02: Medicina General → 85 citas (la más demandada)
> REP03: Motivo más frecuente: "cruce de horarios laborales" — 47 veces
> REP05: Franja de mayor demanda: 17:00 — 33 citas

---

## DIAPOSITIVA 15 — EVIDENCIA: SCRIPT DE PRUEBAS

**Título:** Pruebas — 25 Requerimientos Demostrados

**Visual:**
- Captura de pantalla del DBMS Output del script `14_pruebas_requerimientos.sql`
- Resaltar con flechas o recuadros de colores las líneas clave:

```
VAL01 | SP_AGENDAR_CITA => Cita ID 419 creada (estado: Pendiente)     ← resaltar verde
VAL05 | OCUPADO — anti-colision activa (correcto)                      ← resaltar verde
SEG01 | FN_HASH_PASSWORD => RAW(32): 240BE518FABD2724...               ← resaltar azul
SEG05 | Ultimo reg: ID=578 Tabla=CITAS Operacion=INSERT                ← resaltar azul
CON01 | FN_OBTENER_FRANJAS_LIBRES => Primera franja: 08:00-08:30       ← resaltar naranja
REP01 | Cesar Castro Diaz | Total=55 | Atendidas=21 | Canceladas=15    ← resaltar naranja
>>> 25 REQUERIMIENTOS DEMOSTRADOS EXITOSAMENTE <<<                     ← resaltar grande
```

**Nota al pie:**
- Script idempotente: termina con ROLLBACK + DELETE de datos ADM
- Base de datos vuelve al estado semilla original después de cada ejecución

---

## DIAPOSITIVA 16 — EVIDENCIA: CON01 FRANJAS LIBRES

**Título:** CON01 — Disponibilidad del Médico en Tiempo Real

**Visual:**
- Captura de pantalla del bloque DECLARE ejecutado en SQL Developer mostrando las franjas libres del médico 1 para una fecha concreta (ej: 2026-07-01)
- Ejemplo de salida esperada:
```
FRANJA_INICIO | FRANJA_FIN | MIN
08:00 - 08:30 | 30 min
08:30 - 09:00 | 30 min
09:00 - 09:30 | 30 min
...
17:30 - 18:00 | 30 min
```

**Punto técnico a destacar:**
- `CONNECT BY LEVEL <= 100` en SQL puro sin tabla de números auxiliar
- El `NOT EXISTS` filtra solo las franjas con cita activa (estado Pendiente=1 o Confirmada=2)
- Citas Canceladas o Atendidas **no** bloquean la franja

---

## DIAPOSITIVA 17 — EVIDENCIA: FRONTEND (capturas)

**Título:** Interfaz Web — React + Vite

**Visual (3 capturas en mosaico):**
1. **Pantalla de Login** — formulario usuario/contraseña, fondo de la clínica
2. **Dashboard Recepcionista** — agenda del día, botón "Nueva Cita", lista de citas
3. **Pantalla de Agendar Cita** — selector de médico → fecha → franja libre disponible

**Puntos a mencionar:**
- El frontend consume exclusivamente la API Node.js
- La API llama directamente a los paquetes PL/SQL
- No hay lógica de negocio en el frontend ni en el backend
- Rutas protegidas por rol: médico no puede acceder a pantallas de administración

---

## DIAPOSITIVA 18 — MECANISMOS DE INTEGRIDAD Y CONCURRENCIA

**Título:** ¿Cómo Garantizamos que Nunca Haya Empates?

**Contenido (flujo visual de doble defensa):**

```
           CLIENTE A                    CLIENTE B
        SP_AGENDAR_CITA              SP_AGENDAR_CITA
               │                           │
        FOR UPDATE NOWAIT ◄──────────────── │ ← espera o lanza ORA-54
               │
        FN_VERIFICAR_DISPONIBILIDAD
          (1ra línea de defensa)
               │
          INSERT en CITAS
               │
        TRG_IMPEDIR_EMPATE_CITA ← COMPOUND
          (2da línea de defensa)
          BEFORE STATEMENT: acumula en colección PL/SQL
          BEFORE EACH ROW:  verifica solapamiento
          → Si hay conflicto: RAISE_APPLICATION_ERROR(-20002)
```

**Resultado real:**
> VAL05 | FN_VERIFICAR_DISPONIBILIDAD (slot ya ocupado) => **OCUPADO — anti-colision activa (correcto)**

---

## DIAPOSITIVA 19 — ARQUITECTURA COMPLETA DEL SISTEMA

**Título:** Vista Completa de la Arquitectura

**Visual (diagrama de capas):**

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│              React + Vite SPA (frontend/)                    │
│    Login · Dashboard · Citas · Pacientes · Reportes          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP REST (fetch/axios)
┌─────────────────────────▼───────────────────────────────────┐
│                    CAPA DE API                               │
│              Node.js + Express (backend/server.js)           │
│    authenticateToken · routing · oracledb pool (thin mode)   │
└─────────────────────────┬───────────────────────────────────┘
                          │ oracledb (llamadas a PL/SQL)
┌─────────────────────────▼───────────────────────────────────┐
│                  ORACLE DATABASE 19c                         │
│  ┌───────────────────┐    ┌──────────────────────────────┐  │
│  │   SEG_CLINICA     │    │        APP_CLINICA           │  │
│  │ PKG_SEGURIDAD     │◄───│ PKG_VALOR · PKG_CONSULTAS   │  │
│  │ USUARIOS/SESIONES │    │ PKG_ADMINISTRACION           │  │
│  │ AUDITORIA         │    │ PKG_REPORTES                 │  │
│  └───────────────────┘    │ CITAS · MEDICOS · PACIENTES  │  │
│                           └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## DIAPOSITIVA 20 — CONCLUSIONES

**Título:** Conclusiones

**Contenido (5 puntos con ícono):**

**C1 — Separación de esquemas = seguridad real**
> La arquitectura de dos esquemas Oracle implementa mínimo privilegio a nivel de motor de base de datos, no solo a nivel de aplicación.

**C2 — Lógica en PL/SQL = integridad garantizada**
> FOR UPDATE NOWAIT + trigger COMPOUND eliminan condiciones de carrera independientemente del número de clientes concurrentes.

**C3 — DBMS_CRYPTO = seguridad criptográfica nativa**
> SHA-256 para contraseñas y RANDOMBYTES(32) para tokens, sin dependencias externas.

**C4 — Triggers = auditoría transparente**
> TRG_AUDITORIA_CITAS y TRG_AUDITORIA_PACIENTES registran todo en JSON sin modificar ningún paquete.

**C5 — Reportes en Oracle = decisiones sin herramientas extra**
> Los 5 reportes gerenciales permiten optimizar agenda, detectar ausentismo y tomar decisiones desde SQL*Plus o el frontend.

---

## DIAPOSITIVA 21 — CIERRE Y PREGUNTAS

**Título:** ¡Gracias!

**Contenido:**
- Repetir: nombres de los integrantes
- Logo UNI
- Frase de cierre: *"25 requerimientos funcionales demostrados. Base de datos íntegra, segura y auditable."*
- **¿Preguntas?**

**Visual:**
- Fondo azul oscuro institucional
- Texto blanco centrado
- Mismo estilo que la carátula

---


**Total: 21 diapositivas**

---

