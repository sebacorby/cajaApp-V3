# APP-AI-UX-STABILITY-001 v1.0.3-R2.1 — E2E MANUAL SERIAL, UN TEST POR VEZ

Estado: ACTIVA. Es la única instrucción de ejecución E2E válida para esta campaña.

## Decisión de gobierno

Se prohíben coordinadores, scripts y ejecuciones en lote. Los intentos con PowerShell coordinador y Task Scheduler quedan anulados porque iniciaron Playwright sin frontend operativo y generaron resultados inválidos.

El agente debe ejecutar cada caso E2E de forma manual, individual y secuencial. Debe recoger y cerrar la evidencia de un test antes de iniciar el siguiente.

## Prohibiciones absolutas

No crear ni ejecutar:

- archivos `.ps1`, `.cmd`, `.bat`, `.js`, `.ts` o Python para coordinar tests;
- loops, `foreach`, pipelines que recorran tests o comandos generados;
- Task Scheduler, PM2, Docker o servicios adicionales;
- `playwright test` sin archivo y línea o sin selección inequívoca de un único caso;
- una suite completa, varios archivos o varios tests en el mismo comando;
- `--retries` mayor que cero, ejecución paralela, `.skip`, `.only` o filtros para ocultar fallos;
- aumentos de timeout global, cambios en `playwright.config`, packages o dependencias;
- resultados proyectados, extrapolados o reconstruidos desde una ejecución con frontend caído.

No tocar canonical ni promover hasta cerrar todos los gates.

## 1. Servidores candidate iniciados manualmente

Abrir procesos separados mediante comandos individuales escritos manualmente. No guardar los comandos dentro de un script.

Usar rutas absolutas y `127.0.0.1`:

- backend candidate: `127.0.0.1:11436`;
- frontend candidate: `127.0.0.1:11437`;
- Ollama: `127.0.0.1:11434`;
- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`.

Antes de cualquier test demostrar:

1. backend vivo y health PASS;
2. frontend vivo;
3. listener TCP correcto;
4. tres respuestas HTTP 200 consecutivas del frontend;
5. Chromium puede abrir la página;
6. DB candidate descartable e íntegra;
7. PID y comando de ambos servicios registrados.

Si un servicio cae, detener el test actual, capturar el error del servicio, reiniciarlo manualmente y repetir únicamente ese test. No reiniciar toda la campaña.

## 2. Inventario obligatorio

Ejecutar una sola vez el comando Playwright `--list` únicamente para obtener el inventario. No ejecuta tests y no cuenta como lote.

Guardar:

- `E2E-INVENTORY-CANDIDATE.txt`;
- cantidad total de casos;
- ruta, línea y título de cada caso;
- hash SHA-256 del inventario.

El inventario es la lista de trabajo. Cada caso debe tener estado individual `PENDING`, `PASS`, `FAIL_APP`, `FAIL_INFRA` o `BLOCKED_PROVEN`.

No puede existir ningún caso omitido.

## 3. Comando permitido por test

Cada invocación Playwright debe seleccionar exactamente un caso mediante `archivo:línea` o una selección inequívoca equivalente.

Formato obligatorio:

`<node-absoluto> <playwright-cli-absoluto> test <archivo.spec.ts:linea> --project=chromium --workers=1 --retries=0 --reporter=line`

No combinar dos líneas, dos títulos o dos archivos.

El agente debe escribir y ejecutar cada comando manualmente. No generarlo mediante loop ni leerlo desde una lista ejecutable.

## 4. Evidencia cerrada después de cada test

Después de cada caso y antes de continuar crear:

- `serial/candidate/<NNN>-<nombre>.out.txt`;
- `serial/candidate/<NNN>-<nombre>.err.txt`;
- `serial/candidate/<NNN>-<nombre>.json`.

El JSON debe contener como mínimo:

- número secuencial;
- target `candidate`;
- archivo, línea y título;
- comando exacto;
- inicio y fin;
- duración;
- exit code;
- resultado;
- PID backend y frontend;
- health HTTP antes y después;
- DB usada y hash;
- screenshot, video o trace cuando exista;
- aserción y stack si falla;
- clasificación provisional;
- cleanup realizado;
- confirmación de que no se ejecutó otro test simultáneo.

Actualizar manualmente `SERIAL-E2E-INDEX-CANDIDATE.json` después de cada caso.

No iniciar el siguiente hasta que estos archivos existan y sean legibles.

## 5. Tratamiento de fallos

Si un caso falla:

1. conservar el primer intento;
2. verificar inmediatamente health de backend y frontend;
3. inspeccionar stdout/stderr de servicios;
4. distinguir fallo de producto de fallo de infraestructura;
5. corregir sólo la causa mínima autorizada;
6. repetir manualmente únicamente el mismo caso;
7. conservar ambos intentos;
8. registrar la resolución antes de avanzar.

No modificar el test para hacerlo pasar salvo que se demuestre un selector ambiguo o un defecto del propio test. Se prohíben `.first()`, `.last()`, `nth()`, sleeps arbitrarios y selectores laxos para ocultar duplicados.

## 6. Gates AI prioritarios

Antes del inventario completo ejecutar, siempre un caso por comando:

### Focal Run 1

1. primer caso de `ai-advisor.spec.ts`;
2. segundo caso de `ai-advisor.spec.ts`.

Resultado requerido: 2/2 PASS.

### Focal Run 2

Repetir los mismos dos casos, individualmente, con los mismos servidores y sin resetear la DB.

Resultado requerido: 2/2 PASS.

### Orden month-close seguido de AI

Ejecutar en este orden, cuatro comandos separados:

1. primer caso `month-close.spec.ts`;
2. segundo caso `month-close.spec.ts`;
3. primer caso `ai-advisor.spec.ts`;
4. segundo caso `ai-advisor.spec.ts`.

Resultado requerido: 4/4 PASS.

También demostrar el camino 422 visible, retry manual y una única request HTTP por submit.

## 7. Candidate completo serial

Con los mismos servidores candidate, ejecutar todos los casos del inventario uno por uno.

Un agregado candidate sólo es válido si:

- todos los casos inventariados tienen evidencia individual;
- la cantidad ejecutada coincide exactamente con el inventario;
- no existen duplicados ni omisiones;
- `workers=1`, `retries=0` y Chromium se usaron en todos;
- ningún test se ejecutó en lote;
- cada health pre/post está registrado.

Generar `CANDIDATE-SERIAL-SUMMARY.json` a partir de la evidencia individual, sin ejecutar scripts de agregación.

## 8. Baseline completo serial

Después de terminar candidate:

1. detener manualmente sólo sus PIDs;
2. comprobar puertos libres;
3. crear/restaurar DB baseline equivalente;
4. iniciar backend y frontend baseline manualmente;
5. comprobar health completo;
6. crear `E2E-INVENTORY-BASELINE.txt`;
7. verificar que coincide con candidate;
8. ejecutar cada caso baseline uno por uno y en el mismo orden.

Usar una carpeta equivalente:

- `serial/baseline/<NNN>-<nombre>.*`;
- `SERIAL-E2E-INDEX-BASELINE.json`;
- `BASELINE-SERIAL-SUMMARY.json`.

## 9. Comparación

Comparar caso por caso usando los dos índices individuales.

PASS requiere:

- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- focal Run 1 = 2/2;
- focal Run 2 = 2/2;
- orden = 4/4;
- backend focal 32/32;
- backend completo 175/175;
- API real nueva 5/5;
- frontend typecheck, lint y build PASS.

Un fallo común sólo puede declararse deuda cuando candidate y baseline coincidan en caso, aserción, stack y causa raíz con ambos servicios operativos.

## 10. Evidencia Dropbox

Sincronizar progresivamente, no sólo al final, en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

Agregar:

- inventarios candidate y baseline;
- índices seriales;
- evidencia individual de cada caso;
- resúmenes seriales;
- API real 5/5;
- focales y orden;
- `COMPARISON.json`;
- `AI-STABILITY-GATES.json`;
- hashes;
- SQLite preflights;
- estado final de procesos y puertos.

No declarar entrega si la evidencia existe sólo en `%LOCALAPPDATA%`.

## 11. Promoción

No promover hasta que todos los gates sean verificables.

Después de PASS:

1. generar `PROMOTION-PLAN.json`;
2. listar archivos exactos a promover;
3. comprobar autorización y hashes;
4. promover atómicamente;
5. ejecutar smoke canonical;
6. comprobar canonical = candidate;
7. packages intactos;
8. SQLite canónica intacta/restaurada;
9. puertos libres;
10. generar `PROMOTION.json`.

## Cierre

El agente no debe pedir confirmación intermedia. Debe avanzar test por test, cerrar evidencia, informar progreso real y detenerse únicamente ante un FAIL funcional demostrado o un BLOCKED con evidencia directa del caso individual.
