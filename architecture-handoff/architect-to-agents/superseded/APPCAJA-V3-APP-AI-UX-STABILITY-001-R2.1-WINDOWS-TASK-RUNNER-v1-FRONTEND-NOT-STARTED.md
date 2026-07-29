# APP-AI-UX-STABILITY-001 v1.0.3-R2.1 — WINDOWS TASK RUNNER

Estado: ACTIVA. Complementa la orden principal y el anexo técnico R2.1. No cambia alcance de producto.

## Decisión

SQLite quedó descartada como causa raíz: DBs aisladas e íntegras, sin WAL/SHM/JOURNAL y 5/5 updates en 14–16 ms. El bloqueo vigente es la vida útil del proceso que coordina Playwright.

No instalar PM2, Docker ni dependencias. No modificar package files, configuración Playwright, timeouts globales ni canonical.

## Runner obligatorio

Crear fuera del repo:

`%LOCALAPPDATA%\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2.1\task-runner\coordinator.ps1`

Registrar una tarea de Windows Task Scheduler con nombre:

`CajaApp-APP-AI-UX-STABILITY-001-R2.1`

La tarea debe ejecutar `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <coordinator.ps1>` bajo el usuario actual y poder iniciarse mediante `Start-ScheduledTask` o `schtasks /Run`. No debe depender de la shell del agente.

## Coordinator

El script debe ejecutar secuencialmente:

1. preflight de rutas, Node, Python, SQLite y puertos;
2. crear/restaurar DB candidate descartable;
3. iniciar backend candidate con `Start-Process -PassThru`;
4. iniciar frontend candidate con `Start-Process -PassThru`;
5. esperar health checks en `127.0.0.1`;
6. API real 5/5;
7. focal AI Run 1;
8. focal AI Run 2 con los mismos servidores;
9. month-close seguido de AI;
10. suite candidate completa, Chromium, workers=1, retries=0;
11. detener candidate y liberar puertos;
12. crear/restaurar DB baseline equivalente;
13. iniciar baseline con variables equivalentes;
14. suite baseline completa;
15. comparar resultados;
16. cleanup final y sincronización de evidencia a Dropbox.

Cada comando largo debe ejecutarse con `Start-Process -PassThru -Wait` y redirección a stdout/stderr separados. Guardar PID, comando, working directory, inicio, fin, exit code y duración.

## Persistencia y observabilidad

Escribir en `task-runner`:

- `TASK-RUN-STATUS.json` actualizado atómicamente;
- `heartbeat.json` cada 15 segundos mientras la tarea esté activa;
- `coordinator.pid`;
- `backend.pid`;
- `frontend.pid`;
- `playwright.pid`;
- logs por etapa;
- marcadores `.started`, `.completed`, `.failed`;
- `TASK-SCHEDULER.xml` exportado;
- `TASK-SCHEDULER-INFO.txt` con estado y último resultado.

Estados válidos: `CREATED`, `PREFLIGHT`, `CANDIDATE_RUNNING`, `BASELINE_RUNNING`, `COMPARING`, `PROMOTING`, `COMPLETED`, `FAILED`.

El agente debe continuar en sesiones posteriores leyendo estos archivos; no reiniciar una etapa activa si el heartbeat es reciente y el PID existe.

## Cleanup

Usar `try/finally`. Detener sólo PIDs registrados por la campaña, con árbol de procesos. Confirmar puertos libres. Eliminar la tarea programada únicamente después de capturar su XML, historial y último resultado. No borrar logs ni DBs hasta sincronizar evidencia.

## Gates

No declarar BLOCKED por expiración de shell. BLOCKED sólo si Task Scheduler también termina externamente la tarea y existe evidencia de:

- tarea registrada;
- hora de inicio y fin;
- `LastTaskResult`;
- historial/eventos del Task Scheduler;
- heartbeat interrumpido;
- PIDs y logs truncados;
- ausencia de error funcional previo.

PASS continúa exigiendo backend 32/32 y 175/175, API 5/5, focal 2/2 dos veces, orden 4/4, suites candidate/baseline completas, `candidateNewFailures=0`, `baselinePassedCandidateFailed=0`, promoción comprobada, packages intactos, SQLite canónica intacta y puertos libres.

## Evidencia nueva

Agregar a la carpeta R2.1:

- `WINDOWS-TASK-RUNNER.json`
- `TASK-RUN-STATUS.json`
- `TASK-SCHEDULER.xml`
- `TASK-SCHEDULER-INFO.txt`
- `heartbeat-final.json`
- logs sanitizados de coordinator y etapas.

Continuar sin pedir confirmación intermedia.