# APPCAJA-V3-DASH-ALERTS-FE-001 — Gate exclusivo de frontend para Alertas determinísticas

## 1. Objetivo único

Validar exclusivamente el frontend ya implementado de `APP-DASH-ALERTS-VERTICAL-001 — Alertas determinísticas del Dashboard` sobre el repositorio real.

El backend del vertical ya fue validado `PASS`. Esta tarea no repite el gate backend, no implementa funcionalidad nueva y no abre otro vertical. El agente sólo ejecuta el gate frontend, recopila evidencia y entrega un veredicto técnico.

## 2. Entorno obligatorio

- Sistema operativo: Windows x64.
- Root del proyecto: `I:\cajaApp-V3`.
- Directorio principal de ejecución: `I:\cajaApp-V3\workspace\frontend`.
- Backend existente: `I:\cajaApp-V3\workspace\backend`, sólo para levantar la aplicación durante Playwright/UAT.
- Node.js obligatorio y exacto: `v24.18.0`.
- Ejecutable de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`.

Si `node --version` no devuelve exactamente `v24.18.0`, el resultado debe ser `BLOCKED`.

## 3. Alcance permitido

El agente puede:

- leer frontend, configuración de Playwright y tests existentes;
- ejecutar instalación reproducible, typecheck, lint y build;
- iniciar backend y frontend mediante los mecanismos existentes;
- ejecutar el spec oficial por CLI nativa de Playwright;
- usar datos UAT mínimos cuando el test o la navegación lo requieran;
- limpiar completamente los datos UAT creados;
- escribir evidencia en `architecture-handoff/agents-to-architect/pending-validation`.

## 4. Prohibiciones

El agente no puede:

- modificar código, tests, dependencias, lockfiles, configuración o scripts;
- editar, regenerar, reemplazar o mover el SSOT `APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`;
- repetir Prisma, migraciones, build o suite del backend ya validados;
- ejecutar otros specs Playwright salvo una regresión mínima expresamente indicada aquí;
- abrir Configuración, Reportes, Tarjetas, Categorías u otro gate como tarea independiente;
- crear wrappers, runners o scripts auxiliares;
- usar `npm audit fix`, actualizar dependencias o relajar TypeScript/lint;
- agregar scoring, porcentajes de salud financiera o recomendaciones de IA;
- dejar datos UAT activos al finalizar;
- declarar `PASS` si algún paso obligatorio fue omitido.

Si aparece un defecto técnico, documentarlo con evidencia y declarar `FAIL`. No corregirlo dentro de esta tarea.

## 5. Gate obligatorio

### 5.1 Entorno

Registrar:

- versión de Windows;
- ruta efectiva de `node.exe` y `npm`;
- `node --version`;
- `npm --version`;
- estado inicial de procesos y puertos utilizados.

### 5.2 Instalación y calidad estática

Desde `I:\cajaApp-V3\workspace\frontend`:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

Criterios:

- todos los comandos terminan con código `0`;
- no se ignoran errores TypeScript;
- no se agregan excepciones de lint;
- el build no descarga fuentes externas ni depende de servicios no declarados.

### 5.3 Playwright oficial

Usar la CLI nativa, sin wrapper:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = "never"
npx playwright test tests/dashboard-alerts.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

Registrar puertos, PIDs y comandos de inicio de backend/frontend. Liberar únicamente los procesos iniciados por la tarea.

### 5.4 Contrato visual y funcional

Confirmar en la aplicación real:

1. el Dashboard carga sin error y mantiene balance, métricas, categorías, evolución, movimientos y compromisos;
2. aparece el panel `Alertas basadas en reglas`;
3. existe estado explícito y comprensible cuando no hay alertas;
4. cada tarjeta visible muestra severidad, mensaje, regla y evidencia;
5. el orden visual respeta crítica, atención e información;
6. la acción de movimientos sin clasificar abre `Movimientos` con banner o filtro identificable;
7. las acciones relacionadas con saldo, gasto o ingresos llevan al origen correcto;
8. las acciones de vencimiento o cotización llevan a `Tarjetas` cuando el escenario existe;
9. la acción de ingresos pendientes/proyectados lleva a `Ingresos`;
10. volver al Dashboard no pierde el rango temporal global;
11. no aparece un porcentaje de salud financiera, scoring subjetivo ni recomendación de IA;
12. no hay datos mock, cifras ficticias ni botones sin efecto dentro del panel.

### 5.5 Responsive y accesibilidad mínima

Validar al menos:

- viewport de escritorio;
- viewport móvil usado por la configuración existente;
- textos sin corte crítico;
- acciones operables por teclado;
- foco visible;
- nombres accesibles de botones/enlaces;
- contraste y severidad no dependientes únicamente del color.

### 5.6 Regresión mínima

Sin abrir otro vertical como tarea, comprobar únicamente que:

- el Dashboard real sigue consultando el backend;
- abrir Movimientos desde una alerta no rompe el ledger;
- abrir Tarjetas o Ingresos desde una alerta no produce error de navegación;
- limpiar el filtro o volver al Dashboard restaura una navegación normal.

## 6. Datos UAT y limpieza

Antes de crear datos, registrar un inventario. Al finalizar:

- eliminar, anular o revertir todo movimiento, importación o cambio UAT;
- confirmar que no quedó una cotización alterada;
- confirmar que no quedaron resúmenes, compras o ingresos de prueba;
- registrar IDs creados y su estado final;
- detener los procesos iniciados y registrar la liberación de puertos.

Sin evidencia de limpieza no puede existir `PASS`.

## 7. Entrega requerida

Crear:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-DASH-ALERTS-FE-001-evidence-v1.0.0/
```

Contenido mínimo:

```text
00-verdict.md
01-environment.txt
02-frontend-npm-ci.log
03-frontend-typecheck.log
04-frontend-lint.log
05-frontend-build.log
06-playwright-dashboard-alerts.log
07-playwright-trace.zip
08-uat-matrix.md
09-navigation-evidence.md
10-responsive-accessibility.md
11-uat-data-cleanup.md
12-process-port-cleanup.md
13-known-issues.md
screenshots/
```

`08-uat-matrix.md` debe contener una fila por criterio funcional, con resultado, evidencia exacta y observaciones.

## 8. Veredicto

`00-verdict.md` debe declarar exactamente uno:

- `PASS`: todos los pasos obligatorios ejecutados y conformes;
- `FAIL`: defecto técnico reproducible del frontend;
- `BLOCKED`: imposibilidad externa precisa.

Debe incluir:

- resumen ejecutivo;
- comandos ejecutados;
- resultado de `npm ci`, typecheck, lint y build;
- resultado exacto del spec Playwright;
- navegación validada;
- responsive y accesibilidad mínima;
- limpieza de datos, procesos y puertos;
- defectos, bloqueos y known issues;
- afirmación explícita de que no se modificó código ni el SSOT.

## 9. Cierre

No avanzar a otro gate. La tarea termina al dejar la evidencia completa en `pending-validation` para auditoría del arquitecto.
