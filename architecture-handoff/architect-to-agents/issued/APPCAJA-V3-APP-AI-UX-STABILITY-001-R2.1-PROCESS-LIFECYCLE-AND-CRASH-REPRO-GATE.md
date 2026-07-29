# APPCAJA-V3 — APP-AI-UX-STABILITY-001 v1.0.3-R2.1

## PROCESS-LIFECYCLE-AND-CRASH-REPRO-GATE

Estado: ACTIVA Y ÚNICA INSTRUCCIÓN VIGENTE.

## Decisión del arquitecto

La ejecución `candidate-unresolved-rejected-run` no demuestra una fuga de memoria ni un defecto general del backend.

Hallazgos obligatorios:

- los 10 PIDs backend fueron iniciados mediante `C:\Users\javie\AppData\Local\Temp\start_prod.py`;
- el script se invocó nueve veces;
- no existen stdout, stderr ni exit codes de esos procesos;
- el backend desapareció también después de tests livianos que habían terminado PASS (`018`, `022`, `024`, `035`, `042`);
- el manifiesto y los JSON individuales contienen PIDs contradictorios;
- el gate backend directo anterior sí sostuvo un único PID, 20 health checks y una llamada real de IA.

La hipótesis principal es un defecto del harness de inicio/seguimiento de procesos. No modificar código hasta obtener un crash reproducible con el backend iniciado directamente y logs persistentes.

## Objetivo único

Distinguir de forma concluyente entre:

1. proceso backend terminado por el harness Python o su árbol de procesos; y
2. excepción, OOM o defecto real del backend durante los casos `002`, `036` o `039`.

## Prohibiciones

Está prohibido:

- ejecutar `start_prod.py` o cualquier otro `.py`;
- crear o usar scripts `.ps1`, `.cmd`, `.bat`, `.js`, `.ts` o coordinadores;
- usar loops para ejecutar Playwright;
- ejecutar más de un test por comando;
- reiniciar backend o frontend si alguno muere;
- modificar código, configuración, tests, fixtures, Prisma, packages o lockfiles;
- ejecutar los otros 16 casos unresolved;
- ejecutar baseline o promoción;
- afirmar fuga de memoria sin métricas y causa de salida.

## 1. Preservar el harness defectuoso

Sin ejecutarlo, copiar:

`C:\Users\javie\AppData\Local\Temp\start_prod.py`

hacia:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/process-lifecycle-gate/start_prod.py.txt`

Crear `START-PROD-PY-INSPECTION.json` con:

- SHA-256;
- contenido íntegro preservado;
- procesos que inicia;
- uso de `subprocess`, `Popen`, `run`, `wait`, `communicate`, `terminate`, `kill`, `creationflags` o `shell`;
- si redirige stdout/stderr;
- si espera a los hijos;
- si sale inmediatamente;
- si registra PIDs reales;
- cualquier cleanup o finalizer.

No corregir el script.

## 2. Preflight de procesos

Antes de iniciar servicios:

- verificar dos veces que `11436` y `11437` están libres;
- enumerar todos los procesos `node.exe`, `python.exe`, `pythonw.exe` y `ollama.exe`;
- registrar PID, ParentProcessId, command line y executable path;
- confirmar Ollama en `127.0.0.1:11434` con `gemma4:31b-cloud`;
- confirmar que no existe backend o frontend previo.

Guardar `PROCESS-PREFLIGHT.json`.

## 3. Inicio directo obligatorio

Abrir una única sesión PowerShell y mantenerla abierta durante todo el gate.

Repositorio:

`C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`

Node:

`I:\Tools\node-v24.18.0-win-x64\node.exe`

### Backend

Iniciar directamente `workspace/backend/dist/main.js` desde `workspace/backend`, con `CAJAAPP_ENV_FILE` apuntando a `.env.candidate`.

Usar `Start-Process -PassThru` únicamente como comando manual en la sesión abierta y redirigir desde el primer byte a:

- `backend-direct.stdout.log`
- `backend-direct.stderr.log`

Registrar el objeto Process devuelto, PID, ParentProcessId, command line y hora de inicio.

### Frontend

Iniciar directamente Next desde `workspace/frontend` con Node absoluto, `node_modules/next/dist/bin/next`, `start`, host `127.0.0.1` y puerto `11437`.

Redirigir desde el primer byte a:

- `frontend-direct.stdout.log`
- `frontend-direct.stderr.log`

No usar `npm`, `npx`, watchers, Python ni wrappers.

Guardar `DIRECT-SERVICES-STARTUP.json`.

## 4. Estabilidad sin E2E

Antes de Playwright, mantener ambos servicios durante al menos diez minutos.

Realizar comprobaciones manuales independientes al inicio y aproximadamente en los minutos 1, 2, 3, 5, 7 y 10.

En cada muestra registrar:

- HTTP backend `/health`;
- HTTP frontend `/`;
- PID backend y frontend;
- ParentProcessId;
- `HasExited`;
- WorkingSet64;
- PrivateMemorySize64;
- Handles;
- cantidad de threads;
- listener de `11436` y `11437`;
- tamaño actual de stdout/stderr.

No usar loop ni script. Guardar `DIRECT-IDLE-STABILITY.json`.

Si un servicio muere durante esta fase:

- no reiniciar;
- registrar ExitCode desde el objeto Process cuando esté disponible;
- capturar los últimos logs;
- capturar eventos de Windows Application/System desde el inicio del gate;
- guardar `DIRECT-PROCESS-DEATH.json`;
- detener el gate.

## 5. Reproducción controlada

Sólo si ambos servicios sobreviven la fase idle.

Ejecutar exactamente estos casos, en este orden, con un comando separado por caso:

1. `002` — `ai-advisor.spec.ts:60`
2. `036` — `incomes.spec.ts:20`
3. `039` — `financial-health.spec.ts:53`

Playwright obligatorio:

- Chromium;
- workers=1;
- retries=0;
- un único test por comando;
- sin cambios de timeout o test.

Antes y después de cada caso registrar health, PIDs y métricas de proceso.

Tras cada caso esperar varios minutos con el mismo backend y tomar al menos dos muestras adicionales.

No reiniciar entre casos.

## 6. Si el backend muere

Detener toda la ejecución inmediatamente.

Capturar:

- ID del caso y paso exacto;
- PID y ParentProcessId;
- ExitCode;
- stdout/stderr completos;
- últimas 200 líneas;
- WorkingSet/PrivateMemory/Handles antes de morir;
- eventos de Windows Application/System;
- estado de Ollama;
- puertos;
- request o cleanup activo;
- stack, `uncaughtException`, `unhandledRejection`, OOM o señal si aparece.

No clasificar como fuga de memoria salvo evidencia explícita de OOM o crecimiento sostenido asociado.

## 7. Si los tres casos pasan

Mantener backend y frontend vivos cinco minutos adicionales, con dos health checks y métricas.

Clasificar la ejecución anterior como `HARNESS_INVALIDATED`: las desapariciones fueron consecuencia del método Python o de su seguimiento, no reproducidas con inicio directo.

## 8. Evidencia

Sincronizar progresivamente en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/process-lifecycle-gate/`

Archivos mínimos:

- `start_prod.py.txt`
- `START-PROD-PY-INSPECTION.json`
- `PROCESS-PREFLIGHT.json`
- `DIRECT-SERVICES-STARTUP.json`
- `DIRECT-IDLE-STABILITY.json`
- `TEST-002.json`
- `TEST-036.json` si corresponde
- `TEST-039.json` si corresponde
- `PROCESS-METRICS.json`
- `WINDOWS-EVENTS.json`
- `PROCESS-LIFECYCLE-VERDICT.json`
- `backend-direct.stdout.log`
- `backend-direct.stderr.log`
- `frontend-direct.stdout.log`
- `frontend-direct.stderr.log`
- evidencia Playwright individual.

## 9. Veredicto

Resultados permitidos:

### HARNESS_INVALIDATED

Los servicios sobreviven idle y los tres casos con el mismo PID. El run Python queda confirmado como no confiable.

### BACKEND_CRASH_PROVEN

El backend iniciado directamente muere y existe evidencia de salida/stack/evento/métrica asociada.

### FRONTEND_CRASH_PROVEN

El frontend iniciado directamente muere con evidencia equivalente.

### BLOCKED

Sólo por impedimento técnico demostrado antes de ejecutar Playwright.

Después del veredicto, detenerse. No modificar código, no ejecutar otros tests y no reiniciar servicios para continuar.