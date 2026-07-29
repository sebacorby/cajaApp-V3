# APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.0

## 1. Objetivo único

Ejecutar la campaña local final y consolidada de CajaApp V3 sobre el repositorio real, después de que el arquitecto completó el backlog funcional.

Esta tarea es **exclusivamente de validación y evidencia**. El agente no implementa, no repara y no cambia alcance. Debe entregar un veredicto técnico honesto: `PASS`, `FAIL` o `BLOCKED`.

## 2. Fuente de verdad y entorno obligatorio

Antes de ejecutar, leer en modo sólo lectura:

```text
I:\cajaApp-V3\docs\00-context\APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md
```

Entorno autoritativo:

- sistema operativo: Windows x64;
- root: `I:\cajaApp-V3`;
- backend: `I:\cajaApp-V3\workspace\backend`;
- frontend: `I:\cajaApp-V3\workspace\frontend`;
- Node.js exacto: `v24.18.0`;
- ejecutable de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`;
- npm: el incluido con esa distribución;
- base de datos: SQLite real de la instalación local.

Si `node --version` no devuelve exactamente `v24.18.0`, declarar `BLOCKED`. No usar otra instalación ni modificar el entorno oficial.


## 2.1. Arranque único y obligatorio del ecosistema

Antes de ejecutar **cualquier** prueba, smoke, UAT, llamada API, build que dependa del runtime o suite Playwright, el agente debe levantar CajaApp exclusivamente mediante:

```text
I:\cajaApp-V3\cajaapp-headless-up.ps1
```

Esta es la única herramienta autorizada para iniciar backend y frontend durante esta campaña.

Está expresamente prohibido:

- iniciar backend o frontend con `npm run dev`, `npm start`, `node`, `Start-Process` manual, `start-cajaapp.ps1`, VS Code, terminales separadas o cualquier otro mecanismo;
- elegir manualmente otros comandos de arranque;
- lanzar procesos individuales;
- continuar las pruebas si el script no informó un estado utilizable;
- reemplazar, editar o envolver `cajaapp-headless-up.ps1`.

La documentación operativa complementaria es:

```text
APPCAJA-V3-OPS-002-headless-agents-v1.0.0.md
```

### Ejecución desde Bash

Si el agente está operando desde Bash o Git Bash, debe invocar PowerShell de esta forma:

```bash
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -JsonOnly
```

Si `powershell.exe` no está disponible directamente en `PATH`:

```bash
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -JsonOnly
```

También puede usarse `pwsh.exe` únicamente si ya está instalado:

```bash
pwsh.exe -NoLogo -NoProfile -NonInteractive -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -JsonOnly
```

No instalar PowerShell ni modificar el entorno. Si ninguna variante puede ejecutar el script, declarar `BLOCKED`.

### Espera obligatoria antes de las pruebas

Después de iniciar el script:

1. registrar el código de salida y la salida JSON;
2. esperar como mínimo `30` segundos;
3. no esperar más de `60` segundos sin verificar estado;
4. consultar el estado con el mismo script;
5. confirmar que backend y frontend estén disponibles;
6. recién entonces ejecutar pruebas.

Ejemplo desde Bash:

```bash
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -JsonOnly
up_exit=$?

printf 'HEADLESS_UP_EXIT_CODE=%s\n' "$up_exit"

if [ "$up_exit" -ne 0 ]; then
  exit "$up_exit"
fi

sleep 30

powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -Status
status_exit=$?

if [ "$status_exit" -ne 0 ]; then
  sleep 30
  powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -Status
  status_exit=$?
fi

if [ "$status_exit" -ne 0 ]; then
  exit "$status_exit"
fi
```

El agente debe respetar una espera total comprendida entre `30` y `60` segundos antes de iniciar cualquier prueba. No debe reemplazar esta espera por intentos inmediatos repetidos.

### Estado autoritativo

El script administra el estado en:

```text
%TEMP%\cajaapp-headless\state.json
```

El agente debe usar:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Status
```

Debe registrar:

- salida del `Up`;
- código de salida;
- hora de inicio;
- duración de la espera;
- salida de `-Status`;
- URLs y puertos informados;
- PIDs informados;
- confirmación de disponibilidad del backend y frontend.

Si el estado no existe, no es válido o no confirma disponibilidad después de `60` segundos, declarar `BLOCKED`. No intentar levantar el entorno por otro método.

### Reinicio permitido

Si el ecosistema ya estaba levantado pero requiere reinicio controlado, usar exclusivamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Restart -JsonOnly
```

Después de `-Restart`, volver a esperar entre `30` y `60` segundos y repetir `-Status`.

### Apagado y limpieza obligatorios

Al finalizar toda la campaña, o ante un fallo que obligue a detenerla, usar exclusivamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop
```

Desde Bash:

```bash
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File 'I:\cajaApp-V3\cajaapp-headless-up.ps1' -Stop
```

No matar procesos por nombre global ni usar otra estrategia de cleanup mientras el script pueda gestionar los PIDs y puertos del run.


## 3. Alcance que debe validarse

La campaña cubre conjuntamente:

1. identidad CajaApp y retiro completo del modo prototipo;
2. importación y extracción de resúmenes de tarjeta;
3. historial y versionado seguro de resúmenes;
4. ingresos recurrentes, eventos, bonos y proyecciones;
5. ledger unificado y CRUD de movimientos manuales;
6. importación CSV de débito, aceptación, reversión y deduplicación;
7. categorías, reglas determinísticas y recategorización;
8. Dashboard real y alertas determinísticas;
9. Deuda y compromisos futuros;
10. cotización persistente USD/ARS y equivalentes explícitos;
11. Reportes, drilldown y exportaciones CSV;
12. Configuración mínima local y tema global;
13. Objetivos reales con aportes e historial;
14. Presupuestos por categoría, rollover y alertas transparentes;
15. calidad transversal, navegación, responsive, accesibilidad básica y ausencia de controles ficticios.

## 4. Prohibiciones estrictas

El agente no puede:

- modificar código fuente, tests, schemas, migraciones, configuración o dependencias;
- modificar `package.json`, lockfiles, Prisma, SQLite o scripts para hacer pasar un gate;
- editar, regenerar, mover o reemplazar el SSOT;
- crear wrappers, runners, scripts auxiliares o atajos para ejecutar Playwright, mover archivos o validar operaciones;
- omitir, filtrar, deshabilitar o reescribir tests;
- ejecutar `npm audit fix --force` ni actualizaciones indiscriminadas;
- borrar datos reales;
- imprimir secretos, tokens o contenido sensible de documentos financieros;
- declarar `PASS` con pasos omitidos o evidencia incompleta;
- abrir otro vertical de desarrollo.

Ante un defecto técnico, registrar el caso y declarar `FAIL`. No corregirlo dentro de esta tarea.

## 5. Preparación y resguardo obligatorio

Antes de cualquier migración o UAT:

1. registrar versión de Windows;
2. registrar `where.exe node`, `where.exe npm`, `node --version` y `npm --version`;
3. identificar la SQLite real efectivamente utilizada;
4. detener procesos de CajaApp que bloqueen archivos;
5. crear respaldo binario de la SQLite;
6. registrar ruta, tamaño y SHA-256 del original y del respaldo;
7. registrar el estado inicial de preferencias locales;
8. registrar puertos ocupados y procesos iniciados durante la campaña.

No continuar si no puede garantizarse restauración.

## 6. Gate backend completo

Ejecutar desde:

```text
I:\cajaApp-V3\workspace\backend
```

En este orden:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run test
```

Además:

- ejecutar `npm run prisma:migrate:status` si el script o Prisma CLI disponible lo permite sin modificar estado;
- confirmar que todas las migraciones incrementales quedaron aplicadas sin reset ni pérdida de datos;
- confirmar especialmente:
  - `20260712150000_add_card_statement_history`;
  - `20260712153000_add_local_app_settings`;
  - `20260712180000_add_savings_goals`;
  - `20260712183000_add_category_budgets`;
- confirmar existencia y relaciones de `SavingsGoal`, `GoalContribution`, `GoalActivity` y `CategoryBudget`;
- confirmar suite completa `PASS`, sin tests omitidos o filtrados;
- confirmar descubrimiento y ejecución de las suites de settings, dashboard alerts, goals, budgets y quality.

### 6.1 Smoke técnico de API

Usar el backend ya iniciado por `I:\cajaApp-V3\cajaapp-headless-up.ps1`. Está prohibido iniciar otro backend, elegir otro mecanismo o lanzar procesos manuales. Usar las URL y puertos informados por el script y su `state.json`.

Validar al menos:

- health/estado técnico disponible;
- `GET`, `PUT` y persistencia tras reinicio de `/api/settings`;
- `GET /api/settings/system` sin afirmaciones ficticias;
- Dashboard y colección determinística `alerts`;
- ledger y filtros de Movimientos;
- exportación CSV exacta del filtro;
- endpoints de Reportes y descarga CSV;
- historial/versionado de resúmenes;
- deuda futura y cotización;
- CRUD de categorías y sugerencias determinísticas.

### 6.2 Objetivos

Validar mediante API y base real respaldada:

- crear objetivo ARS;
- crear objetivo USD;
- impedir importes cero o negativos;
- rechazar fecha imposible, por ejemplo `2026-02-31`;
- editar un objetivo mutable;
- registrar aporte manual;
- registrar aporte con referencia opcional completa;
- rechazar referencia incompleta;
- confirmar progreso con centavos y sin `parseFloat`;
- confirmar finalización automática al alcanzar la meta;
- eliminar aporte y confirmar recálculo/reapertura determinística;
- confirmar que el aporte no crea ni modifica un movimiento del ledger;
- eliminar los objetivos UAT al finalizar.

### 6.3 Presupuestos

Validar mediante API y base real respaldada:

- crear presupuesto por categoría, moneda y período;
- rechazar períodos invertidos;
- rechazar solapamientos de categoría + moneda + período;
- confirmar que sólo egresos `actual` consumen presupuesto;
- confirmar que pendientes y proyectados no consumen presupuesto;
- confirmar umbral de atención exactamente desde 80%;
- confirmar severidad crítica exactamente desde 100%;
- confirmar ARS y USD separados;
- confirmar rollover únicamente desde un período anterior contiguo y sólo por saldo positivo;
- consultar con filtros y confirmar que el rollover mantiene toda la cadena histórica;
- pausar, reanudar y cerrar;
- limpiar presupuestos y movimientos UAT.

## 7. Gate frontend completo

Ejecutar desde:

```text
I:\cajaApp-V3\workspace\frontend
```

En este orden:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

Todos deben finalizar con código `0`.

No aceptar un build que oculte errores TypeScript. Registrar cualquier warning por separado; un error de typecheck, lint o build implica `FAIL`.

## 8. Playwright y UAT integral

Antes de Playwright, ejecutar obligatoriamente `I:\cajaApp-V3\cajaapp-headless-up.ps1`, esperar entre 30 y 60 segundos y validar `-Status`.

Usar únicamente Playwright CLI oficial contra el ecosistema levantado por ese script.

- tomar backend URL, frontend URL, puertos, PIDs y carpeta de datos desde la salida del script o `state.json`;
- no iniciar backend ni frontend con ningún otro comando;
- no reemplazar los puertos informados salvo mediante parámetros soportados por el propio script;
- registrar la salida completa del `Up`, la espera y el `Status`;
- al finalizar, ejecutar exclusivamente `cajaapp-headless-up.ps1 -Stop`;
- no matar procesos ajenos por nombre global.

Ejecutar la suite completa:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = "never"
npx playwright test --project=chromium --workers=1 --retries=0 --trace=on
```

No ejecutar solamente los specs nuevos. Deben descubrirse todos los specs vigentes del repositorio, incluyendo:

- movimientos;
- CSV de débito;
- categorías — una sola versión autoritativa de `categories.spec.ts`;
- Dashboard y alertas;
- ingresos;
- tarjetas e historial;
- deuda;
- reportes y exportaciones;
- configuración;
- objetivos;
- presupuestos;
- `quality-audit.spec.ts`.

### 8.1 UAT visual y funcional mínima

Confirmar en escritorio y viewport móvil:

- navegación de las nueve secciones activas;
- `aria-current` correcto;
- estados de carga, vacío y error recuperable;
- botón `Reintentar` funcional en Objetivos y Presupuestos;
- formularios conservados ante errores recuperables;
- Objetivos y Presupuestos visibles en navegación desktop y móvil;
- Header sin campana ficticia, login, sesión, cuentas bancarias o contraseña;
- ausencia de textos “prototipo demo”, “datos simulados”, “fase posterior”, “fuera del MVP”, `Hello, world!` y promesas no implementadas;
- foco visible y uso razonable por teclado en acciones principales;
- tablas, barras y progresos con alternativa textual;
- tema claro, oscuro y sistema;
- recarga preservando preferencias;
- ninguna conversión monetaria implícita.

## 9. Limpieza y restauración obligatorias

Antes del veredicto:

1. eliminar objetivos, aportes, presupuestos, categorías y movimientos creados para UAT;
2. revertir importaciones UAT cuando corresponda;
3. restaurar nombre, tema y moneda local originales;
4. ejecutar `I:\cajaApp-V3\cajaapp-headless-up.ps1 -Stop` y verificar que no queden procesos ni puertos abiertos por la campaña;
5. comparar la SQLite final con el estado esperado;
6. si la campaña alteró datos reales de forma no reversible, restaurar el respaldo y declarar `FAIL` o `BLOCKED` según causa;
7. registrar evidencia de limpieza.

Sin evidencia de limpieza y restauración no puede existir `PASS`.

## 10. Entrega de evidencia

Crear exactamente:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-evidence-v1.0.0\
```

Contenido mínimo:

```text
00-verdict.md
01-scope-and-integrity.md
02-environment.md
02A-headless-up-and-status.md
03-database-backup-and-hashes.md
04-backend-npm-ci.log
05-prisma-generate.log
06-prisma-migrate-deploy.log
07-prisma-migrate-status.log
08-backend-build.log
09-backend-tests.log
10-backend-suite-matrix.md
11-api-smoke-matrix.md
12-goals-uat.md
13-budgets-uat.md
14-frontend-npm-ci.log
15-frontend-typecheck.log
16-frontend-lint.log
17-frontend-build.log
18-playwright-full-suite.log
19-playwright-report/
20-playwright-traces/
21-responsive-accessibility.md
22-decorative-controls-audit.md
23-data-cleanup-and-restore.md
24-known-issues.md
25-filesystem-integrity.md
```

Los documentos deben incluir comandos exactos, códigos de salida, timestamps y rutas relevantes. Sanitizar datos financieros y secretos.

## 11. Criterio de veredicto

### PASS

Sólo si:

- Node es exactamente `v24.18.0`;
- respaldo y restauración están demostrados;
- migraciones, backend build y suite completa pasan;
- frontend typecheck, lint y build pasan;
- Playwright completo pasa sin filtros ni retries;
- smokes de Objetivos y Presupuestos cumplen todos los contratos;
- auditoría transversal no encuentra controles o textos ficticios;
- el ecosistema fue levantado exclusivamente con `cajaapp-headless-up.ps1`, se respetó la espera de 30 a 60 segundos y `-Status` confirmó disponibilidad;
- datos UAT y procesos quedan limpios mediante `cajaapp-headless-up.ps1 -Stop`;
- no se modificó ningún archivo prohibido.

### FAIL

Cuando el entorno es correcto pero existe cualquier defecto técnico reproducible, test fallido, contrato incumplido, residuo UAT o cambio no autorizado.

### BLOCKED

Únicamente cuando una condición externa impide ejecutar el gate: Node obligatorio ausente, permisos insuficientes, credenciales indispensables faltantes o imposibilidad de respaldar/restaurar la base.

## 12. Cierre

No mover esta instrucción ni editar el SSOT. Entregar únicamente la evidencia solicitada. El arquitecto auditará el resultado y moverá físicamente la entrega a `accepted` o `rejected`.
