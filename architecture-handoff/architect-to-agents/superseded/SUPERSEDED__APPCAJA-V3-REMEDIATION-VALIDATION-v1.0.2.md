# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.2

## 1. Objetivo único

Validar desde cero el estado consolidado de CajaApp V3 después de la implementación completa del backlog funcional y del backlog de paridad útil P1, P2, P3 y P4.

Esta campaña debe comprobar, sin modificar código, que el proyecto puede instalarse, migrarse, compilarse, arrancarse y utilizarse en el entorno obligatorio, incluyendo los verticales agregados después de la campaña `v1.0.1`:

- privacidad visual de importes;
- ahorro y tasa de ahorro;
- resúmenes agregados de Presupuestos y Objetivos;
- búsqueda global;
- centro de alertas determinísticas;
- tendencia compacta y modos visuales de gráficos;
- precursor y módulo completo de Salud Financiera;
- Asesor IA sobre contexto financiero estructurado.

La tarea es **exclusivamente de validación**. El agente no implementa, remedia ni adapta el producto.

Veredictos permitidos:

- `PASS`: todos los gates obligatorios fueron ejecutados y aprobados;
- `FAIL`: se reprodujo al menos un defecto del producto, del repositorio o de la configuración versionada;
- `BLOCKED`: una condición externa o de infraestructura impidió ejecutar la campaña y no constituye por sí misma un defecto del repositorio.

## 2. Autoridad y alcance

- Proyecto: CajaApp V3.
- Root autorizado: `I:\cajaApp-V3`.
- Backend: `I:\cajaApp-V3\workspace\backend`.
- Frontend: `I:\cajaApp-V3\workspace\frontend`.
- Contratos: `I:\cajaApp-V3\contracts`.
- Script headless autoritativo: `I:\cajaApp-V3\cajaapp-headless-up.ps1`.
- SQLite real: `I:\cajaApp-V3\workspace\backend\prisma\dev.db`.
- Carpeta de instrucciones emitidas: `I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued`.
- Carpeta única de entrega: `I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.2`.

Repositorios y ubicaciones prohibidos:

- `I:\cajaApp-V2`;
- cualquier copia, clone, ZIP o carpeta temporal de CajaApp;
- cualquier repo ajeno a `I:\cajaApp-V3`.

Si el agente no está operando exactamente sobre `I:\cajaApp-V3`, debe declarar `BLOCKED` sin cambiar de carpeta, repo, rama o proyecto por iniciativa propia.

## 3. Entorno obligatorio

- Windows x64.
- Node.js exacto: `v24.18.0`.
- Node de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`.
- npm de referencia: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`.
- Zona horaria funcional: `America/Argentina/Tucuman`.

Registrar al inicio:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\node.exe" --version
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" --version
[System.Environment]::OSVersion.VersionString
[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
```

Si Node no devuelve exactamente `v24.18.0`, declarar `BLOCKED` y no ejecutar instalaciones, migraciones ni arranque.

## 4. Fuente de verdad y antecedentes

La autoridad vigente es el SSOT nativo de Drive:

```text
APPCAJA V3 — SSOT de ejecución vigente
```

El agente no puede editar el SSOT, el backlog ni los documentos de gobierno.

Antecedentes obligatorios:

- `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1` terminó en `FAIL` por copias `(1)` en tests backend y frontend;
- la evidencia `v1.0.1` es histórica y no puede reutilizarse;
- esta campaña debe crear evidencia completamente nueva;
- un hallazgo estructural produce `FAIL`, pero no cancela automáticamente los gates restantes.

Regla de continuidad:

- continuar todos los gates no destructivos aunque ya exista un motivo de `FAIL`;
- detener únicamente si no puede garantizarse la restauración de SQLite, el entorno obligatorio no existe, se pierde integridad del repositorio o una ejecución posterior podría destruir información;
- registrar cada gate como `PASS`, `FAIL`, `BLOCKED` o `NOT RUN`, explicando el motivo.

## 5. Prohibiciones absolutas

El agente no puede:

- modificar código fuente, tests, migraciones, schemas, prompts, configuración, dependencias o lockfiles;
- eliminar, renombrar, mover o corregir archivos duplicados;
- crear wrappers, runners o scripts auxiliares `.ps1`, `.bat`, `.cmd`, `.sh`, `.py`, `.js`, `.mjs` o `.ts`;
- sustituir PowerShell por Bash o viceversa;
- iniciar backend o frontend manualmente;
- usar scripts alternativos a `cajaapp-headless-up.ps1`;
- filtrar, omitir, reescribir o deshabilitar tests;
- usar `--grep`, `.only`, exclusiones nuevas, retries distintos de cero o workers adicionales;
- usar `npm audit fix`, `npm audit fix --force` o actualizar dependencias;
- modificar `.env` o exponer secretos en logs, capturas o entregables;
- borrar o alterar SQLite fuera del procedimiento autorizado de backup, migración y restauración;
- reutilizar evidencia, logs, traces, capturas o resultados de campañas anteriores;
- realizar commits, pushes, cambios de rama o publicaciones;
- declarar `PASS` con gates omitidos, tests skipped, provider IA simulado o cleanup incompleto.

Están permitidos únicamente los artefactos generados naturalmente por los comandos autorizados:

- `node_modules` mediante `npm ci`;
- `dist`, `.next`, cachés de build y Prisma Client;
- reportes y traces de Playwright;
- cambios temporales en `prisma\dev.db` provocados por migraciones y UAT, siempre restaurados al final;
- logs naturales del script headless;
- archivos de evidencia dentro de la carpeta única de entrega.

Ante un defecto, registrar evidencia y continuar cuando sea seguro. No corregirlo.

## 6. Carpeta y estructura única de evidencia

Crear únicamente:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.2
```

Estructura mínima esperada:

```text
00-verdict.md
01-environment.md
02-integrity-preflight.md
03-file-inventory.txt
04-sqlite-initial.md
05-backend-install.log
06-prisma.log
07-backend-build.log
08-backend-tests.log
09-backend-test-matrix.md
10-frontend-install.log
11-frontend-typecheck.log
12-frontend-lint.log
13-frontend-build.log
14-headless-start.json
15-headless-status.json
16-smoke-api.md
17-playwright-discovery.txt
18-playwright.log
19-playwright-report/
20-ai-provider.md
21-ai-advisor-validation.md
22-responsive-accessibility.md
23-data-cleanup.md
24-processes-ports-final.md
25-sqlite-final.md
26-known-issues.md
27-evidence-inventory.txt
```

Puede agregar archivos numerados cuando aporten evidencia real. No puede escribir evidencia fuera de esa carpeta, salvo:

- logs y `state.json` generados naturalmente en `%TEMP%\cajaapp-headless`;
- resultados naturales de build, test y Playwright dentro de sus carpetas estándar.

## 7. Preflight de integridad

### 7.1 Estado del root

Confirmar que existe:

```text
I:\cajaApp-V3\cajaapp-headless-up.ps1
```

Validar que:

- comienza con `[CmdletBinding()]`;
- no contiene un script Bash disfrazado;
- acepta `-Status`, `-Stop`, `-Restart`, `-Rebuild`, `-SkipMigrate` y `-JsonOnly`;
- resuelve explícitamente `node.exe`, `npm.cmd`, `cmd.exe` y `taskkill.exe`;
- controla stdout y stderr sin llamar `.Trim()` sobre `$null`.

Registrar si existen archivos auxiliares no autorizados en el root, incluyendo:

```text
cajaapp-headless-up.sh
start-cajaapp-temp.ps1
diag-node.ps1
diag-env.ps1
smoke.ps1
playwright-run.ps1
plan.md
```

`detect-env.sh` puede registrarse como histórico preexistente, pero no debe ejecutarse.

### 7.2 Inventario de duplicados y residuos

Generar un listado recursivo bajo `I:\cajaApp-V3\workspace` e identificar:

- nombres que contengan `(1)`, ` copy`, `-copy`, ` copia` o `Copy of`;
- bases `dev (1).db` o equivalentes;
- migraciones duplicadas;
- componentes o specs duplicados;
- archivos temporales o wrappers creados por campañas previas.

Cualquier copia ejecutable o ambigua es `FAIL`.

A diferencia de `v1.0.1`, **no detener automáticamente la campaña** por este hallazgo. Continuar los gates seguros y consolidar todos los defectos.

Confirmar específicamente:

Backend:

- existe una sola `tests\movements\categories.rules.test.ts`;
- no existe `tests\movements\categories (1).rules.test.ts`;
- existe `tests\imports\ai-job-timeout.test.ts`;
- no existe `tests\imports\watchdog-timeout.test.ts`;
- existe una sola prueba canónica del Asesor IA;
- existe una sola prueba canónica de Salud Financiera.

Frontend:

- existe una sola `tests\categories.spec.ts`;
- no existe `tests\categories (1).spec.ts`;
- no existe `category-management-sheet (1).tsx`;
- existe una sola `tests\ai-advisor.spec.ts`;
- existe una sola prueba UAT de Salud Financiera;
- existe una sola `dashboard-trend-visual.spec.ts`;
- no hay specs duplicados con sufijos.

### 7.3 Integridad de archivos críticos

Registrar tamaño, fecha y SHA-256 de:

```text
cajaapp-headless-up.ps1
workspace\backend\package.json
workspace\backend\package-lock.json
workspace\backend\prisma\schema.prisma
workspace\backend\src\app.ts
workspace\backend\src\config\env.ts
workspace\backend\src\modules\financial-health\financial-health.service.ts
workspace\backend\src\modules\ai-advisor\ai-advisor.service.ts
contracts\prompts\advisor\01-explain-financial-context.md
contracts\schemas\advisor\ai-advisor-response.schema.json
workspace\frontend\package.json
workspace\frontend\package-lock.json
workspace\frontend\src\lib\finance\ui-store.ts
workspace\frontend\src\lib\finance\nav.ts
workspace\frontend\src\components\finance\sections\asesor-ia-section.tsx
```

Repetir los hashes al final. Los archivos fuente y lockfiles deben permanecer idénticos.

## 8. Resguardo inicial y restauración de SQLite

Antes de ejecutar migraciones o pruebas:

1. Detener la aplicación exclusivamente con:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

2. Verificar el backup limpio histórico:

```text
C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db
```

3. Registrar tamaño y SHA-256 del backup histórico.
4. Registrar tamaño y SHA-256 del `prisma\dev.db` actual.
5. Restaurar el backup histórico sobre `prisma\dev.db` como estado inicial autorizado.
6. Confirmar igualdad de hash.
7. Crear una copia nueva de campaña dentro de la carpeta de evidencia o en `%TEMP%\cajaapp-sqlite-backups`, con nombre inequívoco `PRE-v1.0.2`.
8. Registrar hash de esa copia.

No continuar si:

- el backup no existe;
- el hash no puede verificarse;
- SQLite está bloqueado por un proceso no controlado;
- no existe una copia limpia restaurable.

En esos casos declarar `BLOCKED` y ejecutar igualmente el cierre seguro posible.

## 9. Gate backend

Desde `I:\cajaApp-V3\workspace\backend`, ejecutar directamente y en este orden:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" ci
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run prisma:generate
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run prisma:migrate:deploy
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run prisma:migrate:status
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run build
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run test
```

Registrar para cada comando:

- comando exacto;
- directorio de ejecución;
- fecha de inicio y fin;
- exit code;
- stdout y stderr completos.

Criterios backend:

- todos los comandos terminan con exit code `0`;
- `npm ci` no modifica `package-lock.json`;
- Prisma Client se genera correctamente;
- `prisma migrate deploy` aplica únicamente migraciones pendientes;
- `prisma migrate status` informa esquema actualizado;
- `schema.prisma` contiene una sola definición de `FinancialHealthSnapshot` y una sola de `AiAdvisorInteraction`;
- la migración de privacidad agrega `hideAmounts` sin perder preferencias existentes;
- la migración de Salud Financiera crea snapshots e índices;
- la migración del Asesor IA crea historial e índices;
- build backend `PASS`;
- suite completa `PASS`;
- cero tests skipped, `.only`, filtrados o todo pendientes;
- ningún archivo duplicado se ejecuta;
- no aparece `getWorkerHardTimeoutMs is not a function`;
- no hay regresiones en importación PDF, polling, estados terminales, movimientos, CSV, Dashboard, alertas, Reportes, Presupuestos, Objetivos, Configuración, privacidad ni exports.

Cobertura explícita requerida en la matriz backend:

- timeout vigente de IA;
- reglas determinísticas de Dashboard y Alert Center;
- resúmenes agregados de Presupuestos y Objetivos;
- precursor de calidad del dato;
- fórmula `fh-v1.0.0`, confianza, bloqueos, huella y snapshots;
- Asesor IA: simulación aislada, fuente inexistente, número no fundamentado, simulación no solicitada y lenguaje prescriptivo.

Si una prueba falla, declarar `FAIL`, conservar el log completo y continuar con los gates siguientes cuando sea seguro.

## 10. Gate frontend

Desde `I:\cajaApp-V3\workspace\frontend`, ejecutar:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" ci
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run typecheck
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run lint
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run build
```

Criterios frontend:

- todos los comandos terminan con exit code `0`;
- `package-lock.json` no cambia;
- typecheck sin errores;
- lint sin errores ni warnings;
- no aparecen errores de `react-hooks/set-state-in-effect` ni `react-hooks/preserve-manual-memoization`;
- build de producción finaliza correctamente;
- no existen imports rotos ni secciones inaccesibles;
- las once secciones forman parte de navegación y router;
- no existe ningún spec o componente duplicado con `(1)`;
- las vulnerabilidades moderadas preexistentes se documentan, pero no se ejecuta ninguna remediación de dependencias.

Registrar el resultado separado de install, typecheck, lint y build.

## 11. Arranque headless autoritativo

Usar exclusivamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -JsonOnly
```

No iniciar servicios con `npm run`, `Start-Process`, `cmd /c start`, Bash ni otro script.

Validar:

- exit code `0`;
- stdout contiene un único JSON válido;
- `ok` es `true`;
- `node.version` es `v24.18.0`;
- `node.path` apunta al ejecutable requerido;
- backend y frontend informan PID, puerto, URL y archivo de log;
- `state.json` existe y coincide con el estado emitido;
- `-Status -JsonOnly` reporta los mismos procesos;
- health backend responde `200`;
- frontend responde `200`;
- no aparecen errores por `.Trim()` sobre `$null`, `taskkill.exe`, npm no encontrado o Bash dentro del `.ps1`.

No corregir el script si falla. Registrar `FAIL` con stdout, stderr, logs y estado.

## 12. Smoke API canónico

Usar únicamente la URL backend informada por el script headless.

Usar fechas válidas del período corriente en `America/Argentina/Tucuman` y registrar método, URL, status, duración y resumen de respuesta.

### 12.1 Lecturas base

```text
GET /health
GET /api/settings
GET /api/settings/system
GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/movements?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/movements/categories?includeInactive=true
GET /api/movements/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/future-commitments?from=YYYY-MM&months=6
GET /api/card-statements/statements?limit=100&includeArchived=true
GET /api/card-statements/exchange-rate
GET /api/goals
GET /api/budgets
GET /api/search?q=presupuesto&limit=10
```

### 12.2 Salud Financiera

```text
GET /api/financial-health?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/financial-health/history?limit=20
POST /api/financial-health/snapshots
DELETE /api/financial-health/snapshots/:snapshotId
```

Validar:

- fórmula `fh-v1.0.0`;
- ARS y USD separados;
- mismo contexto produce mismo resultado;
- faltantes reducen confianza o impiden calcular;
- snapshot se guarda o deduplica según huella;
- el snapshot UAT se elimina al finalizar.

### 12.3 Asesor IA

```text
GET /api/ai-advisor/context?from=YYYY-MM-DD&to=YYYY-MM-DD
POST /api/ai-advisor/ask
GET /api/ai-advisor/history?limit=20
GET /api/ai-advisor/history/:interactionId
DELETE /api/ai-advisor/history/:interactionId
```

Validar:

- `advisor-context-v1.0.0`;
- `advisor-prompt-v1.0.0`;
- `advisor-response-v1.0.0`;
- `sourceFingerprint` SHA-256 de 64 caracteres;
- `sourceCount` positivo cuando existen datos;
- proveedor y modelo identificados;
- request ID real no vacío;
- cada claim cita fuentes existentes;
- cada cita incluye período, valor, regla y acción;
- ninguna respuesta mezcla ARS y USD;
- el historial permite leer y eliminar la interacción creada;
- no se envían documentos originales al proveedor;
- no se registra ni imprime ninguna API key, token o secreto.

Una respuesta 4xx por payload inválido debe diferenciarse de un defecto del endpoint. Guardar request y respuesta sanitizados.

## 13. Gate del proveedor IA real

La campaña debe validar el proveedor realmente configurado por CajaApp.

Precondiciones:

- `AI_MOCK_MODE` debe ser `false` para el UAT del Asesor IA;
- el proveedor configurado debe pasar su preflight;
- el modelo efectivo debe coincidir con la configuración vigente;
- no se permite reemplazar el proveedor por un mock;
- no se permite mostrar credenciales en evidencia.

Ejecutar una consulta controlada usando únicamente datos UAT creados por la campaña:

```text
Explicá el balance realizado y esperado usando sólo fuentes de CajaApp.
```

Criterios:

- respuesta HTTP exitosa;
- provider request ID presente;
- prompt version y SHA-256 presentes;
- al menos un claim;
- todas las fuentes citadas existen en `answer.citations`;
- la huella de la interacción coincide con la obtenida previamente desde `/context`;
- no aparecen órdenes, garantías ni lenguaje prescriptivo;
- la respuesta no modifica movimientos ni otras entidades financieras.

Clasificación de fallos:

- credencial ausente, inválida o configuración versionada incorrecta: `FAIL`;
- integración o parsing del proveedor defectuosos: `FAIL`;
- indisponibilidad externa demostrable del proveedor, con configuración correcta: puede ser `BLOCKED`, pero requiere evidencia objetiva y no autoriza `PASS` parcial;
- mock activo: `FAIL`.

## 14. Playwright completo

Desde `I:\cajaApp-V3\workspace\frontend`, ejecutar exactamente:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" exec -- playwright test --project=chromium --workers=1 --retries=0 --trace=on
```

No agregar filtros ni modificar configuración.

Antes de ejecutar, guardar discovery completo mediante el mecanismo oficial de Playwright, sin alterar tests.

Criterios:

- exit code `0`;
- cero failed;
- cero skipped;
- cero flaky ocultos por retries;
- discovery incluye specs raíz y `tests\e2e`;
- ningún archivo `(1)` aparece en discovery;
- todos los tests descubiertos se ejecutan;
- importación PDF real usa un PDF byte-distinto y alcanza `preview_ready`;
- camino `failed` detiene polling y muestra `Reintentar`;
- no se ejecuta un spec redundante `card-statement-failed.spec.ts`;
- no hay strict-mode violations ni timeouts terminados manualmente;
- cleanup de cada UAT se ejecuta incluso cuando una aserción falla.

La matriz debe identificar cobertura de:

- Movimientos y categorías;
- importación CSV;
- Ingresos;
- Tarjetas, PDF real, preview e historial;
- Deuda futura;
- Dashboard, ahorro, alertas y drilldowns;
- Presupuestos y Objetivos;
- Reportes y exports;
- búsqueda global;
- privacidad visual;
- tendencia compacta y paridad de gráficos;
- precursor de calidad del dato;
- Salud Financiera;
- Asesor IA y proveedor real;
- navegación desktop y mobile;
- Configuración.

## 15. Validación funcional específica del Asesor IA

Además del spec automático, documentar:

### 15.1 Contexto

- el backend construye el contexto desde servicios reales;
- no incluye contenido de PDFs ni documentos originales;
- cada fuente tiene ID estable, período, moneda, valor, regla y acción;
- ARS y USD permanecen separados;
- la huella cambia cuando cambia el contexto autoritativo.

### 15.2 Guardrails

Confirmar mediante pruebas backend que se rechazan:

- fuentes inexistentes;
- números que no aparecen en las fuentes citadas;
- simulaciones no solicitadas;
- lenguaje prescriptivo o de certeza;
- respuestas fuera del JSON Schema.

### 15.3 Simulación

Ejecutar el escenario controlado previsto por el UAT o por API:

- moneda única;
- delta de ingresos;
- delta de egresos;
- delta de compromisos;
- supuestos explícitos.

Validar que:

- el resultado matemático coincide con el backend;
- queda etiquetado como simulación;
- no persiste cambios en movimientos, presupuestos, objetivos ni proyecciones;
- sólo la interacción del historial puede persistirse;
- la interacción se elimina durante cleanup.

### 15.4 Historial

Validar:

- orden descendente;
- detalle recuperable por ID;
- versión de prompt, hash, modelo, request ID y huella presentes;
- eliminación funcional;
- ausencia de documentos originales o secretos.

## 16. Responsive, accesibilidad y honestidad funcional

`quality-audit.spec.ts` debe demostrar:

- once secciones navegables en desktop y mobile;
- `aria-current="page"` en desktop;
- menú móvil funcional;
- foco inicial no queda en `BODY`;
- controles accesibles por teclado;
- Asesor IA visible y navegable en ambas vistas;
- citas del asesor operables mediante botón;
- estados loading, error, vacío y respuesta legibles;
- Salud Financiera enlaza a `Explicar con IA`;
- privacidad visual conserva su estado al recargar;
- tema oscuro persiste;
- tablas o textos equivalentes acompañan los gráficos;
- ausencia de overflow horizontal significativo en 390x844;
- ausencia de login, sesión, contraseña, cuentas bancarias conectadas y notificaciones inexistentes;
- ausencia de textos `prototipo demo`, `datos simulados`, `datos ficticios`, `fase posterior`, `fuera del MVP`, `Hello, world!`, `Próximamente`, `En desarrollo` y `Coming soon`.

Los disclaimers del Asesor IA deben ser visibles y no deben presentarlo como asesoramiento profesional ni como ejecutor de decisiones.

## 17. Verificación de datos y no regresión

Antes y después de las pruebas, registrar conteos de entidades relevantes cuando exista endpoint o consulta soportada por la aplicación:

- movimientos manuales;
- importaciones CSV;
- resúmenes de tarjeta;
- presupuestos;
- objetivos y aportes;
- snapshots de Salud Financiera;
- interacciones del Asesor IA.

Todo dato UAT debe usar identificadores o descripciones inequívocas con prefijo:

```text
UAT-v1.0.2-
```

No usar datos personales reales ni documentos distintos del fixture autorizado.

Al terminar:

- no debe quedar ningún registro `UAT-v1.0.2-`;
- no debe quedar ningún snapshot creado por la campaña;
- no debe quedar ninguna interacción del Asesor IA creada por la campaña;
- no debe quedar ningún archivo de importación temporal.

## 18. Cleanup y restauración final

Ejecutar siempre, incluso ante `FAIL` o `BLOCKED`:

1. Registrar todos los datos UAT residuales antes del cleanup.
2. Ejecutar los cleanup previstos por APIs o tests.
3. Detener exclusivamente con:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

4. Restaurar la copia limpia `PRE-v1.0.2` sobre `prisma\dev.db`.
5. Confirmar SHA-256 final igual al hash inicial limpio.
6. Ejecutar:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Status -JsonOnly
```

7. Demostrar que no quedan PIDs gestionados activos.
8. Demostrar que los puertos informados están libres.
9. Eliminar únicamente temporales generados por esta campaña.
10. Repetir hashes de archivos críticos y demostrar que fuentes, tests, migraciones, prompts, schemas y lockfiles no cambiaron.

Si SQLite no puede restaurarse exactamente, el veredicto mínimo es `FAIL`; si existe riesgo de pérdida y no puede continuarse, `BLOCKED`. Nunca declarar `PASS`.

## 19. Reglas de veredicto

### PASS

Requiere simultáneamente:

- entorno exacto;
- integridad sin duplicados ejecutables ni residuos prohibidos;
- backup y restauración final de SQLite demostrados;
- Prisma generate/deploy/status `PASS`;
- backend install/build/tests `PASS`;
- frontend install/typecheck/lint/build `PASS`;
- arranque headless `PASS`;
- smoke API completo `PASS`;
- proveedor IA real `PASS`;
- Playwright completo `PASS`, sin skipped ni filtros;
- responsive, accesibilidad y honestidad funcional `PASS`;
- cleanup total;
- archivos críticos sin cambios;
- evidencia completa y nueva.

### FAIL

Corresponde ante cualquier defecto reproducido, incluyendo:

- archivo duplicado o `(1)`;
- migración o schema inconsistente;
- test, typecheck, lint, build, smoke o Playwright fallido;
- endpoint canónico defectuoso;
- mock del Asesor IA activo;
- respuesta IA sin citas, con números inventados o lenguaje prohibido;
- modificación no esperada de código o lockfiles;
- skipped, filtros o evidencia parcial;
- datos UAT residuales;
- hash final de SQLite distinto;
- proceso o puerto residual atribuible a CajaApp.

El agente debe completar los demás gates seguros y entregar una lista consolidada de defectos.

### BLOCKED

Sólo corresponde cuando una causa externa comprobable impide ejecutar la campaña, por ejemplo:

- Node exacto no disponible;
- unidad `I:` inaccesible;
- permisos de sistema impiden leer el proyecto;
- backup SQLite requerido ausente o irrecuperable;
- indisponibilidad externa demostrable del proveedor IA con configuración local correcta.

No usar `BLOCKED` para reemplazar un `FAIL` técnico del producto.

## 20. Contenido obligatorio de `00-verdict.md`

Debe ser final, no preliminar, y contener:

- veredicto único `PASS`, `FAIL` o `BLOCKED`;
- fecha y hora real de ejecución en 2026 con zona horaria;
- campaña `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.2`;
- root exacto;
- versión Node/npm/Windows;
- tabla de todos los gates con resultado;
- resumen ejecutivo;
- defectos bloqueantes y no bloqueantes;
- comandos ejecutados y omitidos;
- estado del proveedor IA;
- cantidad total de tests backend y Playwright;
- cantidad de failed, skipped y flaky;
- estado de cleanup;
- hash inicial y final de SQLite;
- confirmación de archivos críticos sin cambios;
- inventario de evidencia;
- recomendación técnica al arquitecto.

No usar una fecha histórica, no reutilizar texto de otro veredicto y no declarar un resultado antes de completar cleanup.

## 21. Cierre y entrega

Al terminar:

1. Completar `27-evidence-inventory.txt` con nombre, tamaño y SHA-256 de toda la evidencia.
2. Confirmar que toda la evidencia está dentro de la carpeta `v1.0.2`.
3. No mover la carpeta a `accepted` ni `rejected`.
4. No modificar SSOT ni backlog.
5. Informar al arquitecto únicamente:
   - veredicto;
   - ruta de evidencia;
   - defectos principales;
   - confirmación de restauración de SQLite;
   - confirmación de servicios detenidos.

El arquitecto auditará la evidencia y realizará el movimiento físico a `accepted` o `rejected`.

## 22. Regla de aceptación arquitectónica

Un `PASS` del agente no cierra automáticamente CajaApp V3.

Si la evidencia `v1.0.2` es completa y el arquitecto acepta el `PASS`, quedará habilitada la emisión de:

```text
APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.1
```

Cualquier `FAIL` confirmado volverá a código mediante una remediación específica, sin autorizar cambios por parte del agente validador.
