# APPCAJA-V3 — APP-AI-UX-STABILITY-001 v1.0.3-R2.1

## E2E candidate no resueltos — ejecución manual serial

Estado: ACTIVA Y ÚNICA INSTRUCCIÓN VIGENTE.

## Decisión del arquitecto

El backend queda aceptado como ESTABLE PARA E2E.

La evidencia válida demuestra:

- build CommonJS limpio;
- Ollama disponible en `http://127.0.0.1:11434`;
- modelo `gemma4:31b-cloud`;
- preflight antes del listen;
- una sola instancia backend estable;
- 10/10 health checks pre-IA;
- smoke real de IA HTTP 201;
- 10/10 health checks post-IA;
- mismo PID durante la ejecución;
- worker y Prisma estables;
- ausencia de errores fatales.

El FAIL del cierre R2 se clasifica como LIMITACIÓN DEL HARNESS EN WINDOWS: `Stop-Process` termina el proceso sin entregar un `SIGINT` de consola capturable por Node. Este punto no invalida la estabilidad operativa necesaria para E2E y deja de ser gate bloqueante.

No repetir gates de Ollama, build o estabilidad backend.

## Objetivo único

Ejecutar manualmente, uno por uno, únicamente los casos E2E candidate que todavía no tienen PASS confiable.

No ejecutar baseline, suite completa, promoción ni tests ya cerrados como PASS.

## Prohibiciones absolutas

Está prohibido:

- crear o usar scripts `.ps1`, `.cmd`, `.bat`, `.py`, `.js` o similares para ejecutar tests;
- usar loops, `for`, `foreach`, `while`, pipelines o coordinadores;
- usar Task Scheduler, PM2 o Docker;
- ejecutar más de un test Playwright por comando;
- ejecutar una spec completa cuando contenga más de un test;
- ejecutar toda la suite;
- usar retries;
- usar más de un worker;
- agregar skips, `.only`, filtros permanentes o cambios de timeout;
- modificar código, configuración, fixtures, packages o tests;
- reiniciar automáticamente backend o frontend;
- proyectar resultados no ejecutados;
- detener la tanda por un FAIL_APP individual.

## Entorno obligatorio

Repositorio:

`C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`

Node:

`I:\Tools\node-v24.18.0-win-x64\node.exe`

Servicios:

- Ollama: `127.0.0.1:11434`
- backend: `127.0.0.1:11436`
- frontend: `127.0.0.1:11437`

Modelo:

`gemma4:31b-cloud`

Backend env:

`workspace/backend/.env.candidate`

Playwright obligatorio:

- Chromium;
- workers=1;
- retries=0;
- un único test seleccionado inequívocamente por archivo y línea, o por título exacto cuando la selección por línea no sea posible.

## 1. Inventario de casos no resueltos

Tomar el inventario serial existente y construir manualmente `UNRESOLVED-CANDIDATE-INVENTORY.json`.

Debe incluir como mínimo los casos conocidos:

- `002`
- `010`
- `011`
- `012`
- `013`
- `018`
- `020`
- `022`
- `023`
- `024`
- `034`
- `035`
- `036`
- `037`
- `038`
- `039`
- `041`
- `042`
- `043`

Reconciliar este listado contra el inventario original. Si alguno ya posee un PASS individual válido posterior, marcarlo como cerrado con referencia exacta y no repetirlo. Si falta algún caso no-PASS, agregarlo antes de iniciar.

No asumir que el conteo previo de 18 o 19 es correcto: la fuente de verdad es la lista de IDs, specs, líneas y evidencia individual.

## 2. Inicio manual de servicios

Iniciar Ollama si no estuviera activo.

Iniciar una sola instancia backend desde `workspace/backend` con:

- Node absoluto;
- `dist/main.js`;
- `CAJAAPP_ENV_FILE` apuntando a `.env.candidate`.

Iniciar una sola instancia frontend desde `workspace/frontend` con:

- Node absoluto;
- `node_modules/next/dist/bin/next`;
- `start`;
- hostname `127.0.0.1`;
- port `11437`;
- working directory correcto.

No usar `npm`, `npx`, watchers ni supervisores.

Antes del primer E2E exigir:

- backend `/health` HTTP 200 tres veces consecutivas;
- frontend `/` HTTP 200 tres veces consecutivas;
- listener y PID identificados para ambos;
- una sola instancia de cada servicio;
- modelo y endpoint correctos en logs backend.

Guardar `E2E-SERVICES-STARTUP.json` y logs separados por PID.

## 3. Ejecución estrictamente uno por uno

Para cada entrada del inventario:

1. comprobar backend health HTTP 200;
2. comprobar frontend HTTP 200;
3. registrar PIDs actuales;
4. ejecutar un único test mediante un único comando Playwright;
5. guardar stdout y stderr exclusivos del caso;
6. guardar resultado JSON exclusivo del caso;
7. capturar screenshot y trace cuando falle;
8. registrar consola y red cuando corresponda;
9. comprobar nuevamente ambos servicios;
10. clasificar el resultado;
11. sincronizar la evidencia de ese caso en Dropbox;
12. recién entonces continuar con el siguiente.

Formato de carpeta por caso:

`candidate-unresolved/test-<ID>/`

Archivos mínimos:

- `COMMAND.txt`
- `PRE-HEALTH.json`
- `RESULT.json`
- `stdout.log`
- `stderr.log`
- `POST-HEALTH.json`
- trace/screenshot cuando aplique
- `CLASSIFICATION.json`

## 4. Clasificaciones permitidas

### PASS

El caso cumple todas sus aserciones.

### FAIL_APP

El producto respondió pero incumplió una expectativa funcional, visual o contractual.

Registrar:

- aserción exacta;
- valor esperado;
- valor obtenido;
- selector o endpoint;
- screenshot/trace;
- stack;
- posible archivo de producto relacionado, sin modificarlo.

Continuar con el siguiente test.

### FAIL_INFRA

Sólo usar si existe evidencia real de infraestructura:

- proceso muerto;
- puerto sin listener;
- `ERR_CONNECTION_REFUSED`;
- archivo bloqueado por otro proceso;
- navegador no iniciado;
- dependencia externa caída.

Si backend o frontend muere durante la tanda:

- no reiniciar;
- registrar PID, exit code y últimos logs;
- clasificar el test afectado como FAIL_INFRA;
- detener la tanda completa, porque los resultados posteriores serían inválidos.

### BLOCKED_PROVEN

Sólo cuando un recurso obligatorio no existe y se demuestra mediante:

- ruta esperada;
- búsqueda manual;
- referencia del test;
- ausencia real del recurso.

Para `011` y `012`, verificar una vez el PDF requerido. No crear, copiar ni inventar fixtures. Si continúa ausente, mantener BLOCKED_PROVEN y seguir con el caso siguiente.

### TIMEOUT

No clasificar automáticamente como infraestructura.

Para `035` a `039`, capturar el último paso completado, URL, selector esperado, screenshot, trace, consola, red y estado de ambos servicios. Luego clasificar como FAIL_APP, FAIL_INFRA o TEST_DEBT con causa concreta. `TIMEOUT` sin causa no es veredicto final aceptable.

## 5. Reglas específicas

- Los casos anteriormente marcados FAIL_INFRA por caída backend deben repetirse, porque la causa de Ollama fue corregida.
- Los casos anteriormente marcados FAIL_APP deben repetirse una vez para confirmar que siguen siendo defectos actuales.
- `EBUSY` debe incluir archivo exacto, PID dueño si puede determinarse y operación que falló.
- Un HTTP 500 debe incluir response body, correlation ID y log backend asociado.
- Una diferencia de texto debe incluir ambos textos completos y selector.
- Un elemento no encontrado debe incluir DOM relevante, selector y screenshot.
- No corregir defectos durante esta tanda.

## 6. Cierre de la tanda

Crear:

- `UNRESOLVED-CANDIDATE-INVENTORY.json`
- `UNRESOLVED-CANDIDATE-RESULTS.json`
- `UNRESOLVED-CANDIDATE-SUMMARY.md`
- `E2E-SERVICES-FINAL-STATE.json`

El resumen debe mostrar por caso:

- ID;
- spec;
- línea/título;
- comando exacto;
- resultado;
- duración;
- PID backend;
- PID frontend;
- clasificación;
- causa exacta;
- evidencia asociada.

Debe confirmar:

- cada ID del inventario tiene exactamente un resultado final;
- no hay omisiones;
- no hay duplicados;
- no se ejecutaron tests ya cerrados;
- no se usaron scripts;
- no se modificó el repo;
- backend y frontend mantuvieron sus PIDs, salvo FAIL_INFRA demostrado.

## 7. Evidencia Dropbox

Sincronizar progresivamente en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/candidate-unresolved/`

La evidencia local que no esté visible en Dropbox no se considera entregada.

## 8. Regla de detención

Al completar todos los casos no resueltos, detenerse y entregar el resumen.

No ejecutar baseline.

No modificar código.

No promover.

No iniciar una segunda tanda sin nueva instrucción del arquitecto.
