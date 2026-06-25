@echo off
chcp 65001 > nul
set NLS_LANG=.AL32UTF8
echo ==========================================================
echo    🚀 INSTALADOR AUTOMÁTICO DE BASE DE DATOS ORACLE 🚀
echo             Sistema Clinica Salud y Vida
echo ==========================================================
echo.
echo Para crear todos los esquemas, tablas y paquetes en tu Oracle,
echo necesitamos conectarnos a traves de SQL*Plus.
echo.

set /p ORACLE_SID="1. Ingresa el nombre de tu servicio Oracle (ej. XE, ORCL, XEPDB1): "
set /p SYS_PASS="2. Ingresa la contraseña de tu usuario SYSTEM: "

echo.
echo ==========================================================
echo INICIANDO DESPLIEGUE EN ORACLE...
echo ==========================================================

echo [1/9] Creando Esquemas y Tablas...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"01_esquemas_y_tablas.sql"

echo [2/9] Aplicando Grants y Sinonimos...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"02_grants_sinonimos.sql"

echo [3/9] Insertando Datos Semilla Básicos...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"03_datos_semilla.sql"

echo [4/9] Compilando PKG_SEGURIDAD...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"packages\04_pkg_seguridad.sql"

echo [5/9] Compilando PKG_ADMINISTRACION...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"packages\05_pkg_administracion.sql"

echo [6/9] Compilando PKG_CITAS...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"packages\06_pkg_citas.sql"

echo [7/9] Compilando PKG_CONSULTAS...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"packages\07_pkg_consultas.sql"

echo [8/9] Compilando PKG_REPORTES...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"packages\08_pkg_reportes.sql"

echo [9/9] Creando Triggers, Vistas y Jobs...
echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"09_triggers_vistas_jobs.sql"

echo.
echo ==========================================================
echo CARGA DE DATOS DE PRUEBA ADICIONALES
echo ==========================================================
set /p LOAD_SEEDS="¿Deseas cargar los datos de prueba masivos (400 citas, 15 médicos, 80 pacientes, etc.)? (S/N): "
if /i "%LOAD_SEEDS%"=="S" (
    echo.
    echo Cargando Datos de Prueba Masivos...
    echo exit | sqlplus -S system/%SYS_PASS%@localhost/%ORACLE_SID% @"13_bulk_seed_data.sql"
)

echo.
echo ==========================================================
echo ✅ DESPLIEGUE FINALIZADO. REVISA SI HUBO ERRORES ARRIBA.
echo ==========================================================
pause
