# APPCAJA-V3-DEBT-001 — Validación exclusiva de Deuda y compromisos futuros

## 1. Objetivo único

Validar la implementación existente de:

```text
APP-DEBT-VERTICAL-001 — Deuda y compromisos futuros
```

El agente sólo ejecuta instalación reproducible, generación Prisma, migraciones existentes, build, tests, smoke, Playwright y UAT.

**No está autorizado a modificar código, configuración, schemas, migraciones, dependencias, documentación ni este SSOT.**

---

## 2. Entorno obligatorio

```text
Root: I:\cajaApp-V3
Backend: I:\cajaApp-V3\workspace\backend
Frontend: I:\cajaApp-V3\workspace\frontend
Sistema: Windows x64
Node.js exacto: v24.18.0
Distribución: node-v24.18.0-win-x64
Binario esperado: I:\Tools\node-v24.18.0-win-x64\node.exe
```

El gate de Node debe comparar la versión exacta:

```powershell
node --version
where.exe node
```

Si la versión no es exactamente `v24.18.0`, finalizar como `BLOCKED` sin instalar ni ejecutar builds.

---

## 3. Alcance funcional que debe existir

### Backend

```text
GET /api/future-commitments?from=YYYY-MM&months=N
```

Debe consolidar por mes:

- ingresos confirmados y proyectados;
- deuda confirmada de tarjeta;
- otros compromisos confirmados;
- compromisos proyectados;
- resultado confirmado y resultado esperado;
- componentes trazables por tarjeta, fuente de ingreso o movimiento;
- ARS y USD separados;
- indicador de datos faltantes o fechas estimadas.

La deuda de tarjeta originada en resúmenes aceptados y sus cuotas debe distinguirse de estimaciones no confirmadas.

### Frontend

Debe existir la opción de navegación:

```text
Deuda futura
```

La pantalla debe incluir:

- horizonte seleccionable de 6, 12, 18 y 24 meses;
- resumen del horizonte;
- timeline o tabla mensual accesible;
- expansión por tarjeta o fuente;
- etiquetas `Confirmado` y `Proyectado`;
- navegación a Tarjetas, Ingresos o Movimientos según el origen;
- estados reales de carga, error y vacío;
- advertencias de calidad de datos;
- montos ARS y USD sin conversión implícita.

El frontend no debe sumar ni recalcular totales financieros.

---

## 4. Prohibiciones

El agente no puede:

- editar archivos;
- corregir errores encontrados;
- crear wrappers o scripts auxiliares;
- ejecutar `npm install`;
- ejecutar `npm audit fix` o `npm audit fix --force`;
- actualizar paquetes;
- modificar Prisma;
- borrar o resetear SQLite;
- usar `prisma db push`;
- modificar `package.json` o lockfiles;
- modificar `APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`;
- declarar PASS si una etapa requerida no se ejecutó.

Si algo falla, debe conservar el error exacto y reportar `FAIL` o `BLOCKED` sin remediar.

---

## 5. Backend

Ubicarse en:

```powershell
Set-Location "I:\cajaApp-V3\workspace\backend"
```

Ejecutar:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run test
```

La suite debe descubrir y ejecutar como mínimo:

```text
tests/future/future.service.test.ts
```

El test específico debe resultar como mínimo:

```text
4/4 PASS
```

Debe validar:

- separación entre confirmado y proyectado;
- separación ARS/USD;
- exclusión de gastos cotidianos ya realizados;
- agrupación por origen;
- indicadores de fecha estimada.

### Smoke API

Iniciar el backend con el procedimiento normal del proyecto, sin crear scripts nuevos.

Ejecutar smoke de:

```text
GET /health
GET /api/future-commitments?from=2026-07&months=6
GET /api/future-commitments?from=2026-07&months=12
GET /api/future-commitments?from=2026-07&months=24
```

Comprobar que:

- `range.months` coincide con la consulta;
- existen `summary` y `months`;
- cada mes conserva componentes y grupos trazables;
- ARS y USD son campos independientes;
- el backend devuelve importes ya calculados;
- una consulta con `months=0` o `months=37` devuelve error de validación.

---

## 6. Frontend

Ubicarse en:

```powershell
Set-Location "I:\cajaApp-V3\workspace\frontend"
```

Ejecutar:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

El build sólo es PASS si también pasa el typecheck explícito.

No ejecutar `npm audit fix` por las vulnerabilidades moderadas preexistentes.

---

## 7. Playwright

Usar Playwright Test directamente:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = "never"
npx playwright test tests/future.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

No crear wrappers.

El test debe demostrar:

- creación de un compromiso futuro real mediante API;
- apertura de `Deuda futura` desde la navegación;
- presencia del componente en el mes correspondiente;
- etiqueta `Confirmado`;
- importe correcto;
- navegación desde el origen hacia Movimientos;
- limpieza del dato de prueba.

---

## 8. UAT funcional

Realizar UAT con datos reales o controlados, sin alterar código.

### Caso 1 — Cuota de tarjeta

- usar un resumen aceptado que tenga cuotas futuras;
- abrir `Deuda futura`;
- confirmar que la cuota aparece como deuda de tarjeta confirmada;
- verificar tarjeta/fuente y referencia de origen;
- verificar advertencia cuando el día exacto de vencimiento sea estimado.

### Caso 2 — Movimiento pendiente

- crear desde la aplicación un egreso pendiente con fecha futura;
- confirmar que aparece como otro compromiso confirmado;
- abrir su origen en Movimientos;
- anularlo al finalizar la prueba.

### Caso 3 — Ingreso proyectado

- usar una fuente de ingreso activa con proyección futura;
- confirmar que aparece como ingreso proyectado;
- comprobar que no se presenta como ingreso realizado.

### Caso 4 — Monedas

- incluir al menos un componente ARS y uno USD;
- comprobar que no se suman ni convierten entre sí.

### Caso 5 — Horizonte

- cambiar entre 6, 12, 18 y 24 meses;
- comprobar que la cantidad de meses y el rango del backend cambian realmente.

### Caso 6 — Persistencia

- recargar la página;
- confirmar que los componentes siguen visibles porque provienen de las fuentes persistidas.

---

## 9. Integridad

Confirmar que la tarea no modificó archivos gobernados.

Son aceptables sólo artifacts de instalación, compilación y pruebas:

```text
node_modules/
dist/
.next/
test-results/
playwright-report/
tsconfig.tsbuildinfo
```

No borrar estos artifacts durante la recolección de evidencia.

---

## 10. Entregable

Crear un único Markdown, sin ZIP:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-DEBT-001-result-v1.0.0.md
```

Debe incluir:

- resultado global `PASS`, `FAIL` o `BLOCKED`;
- SO, arquitectura, Node, npm y rutas;
- salida de `npm ci`, Prisma, build y tests del backend;
- resultado específico `4/4` de future service;
- smoke API completo;
- typecheck, lint y build frontend;
- Playwright y ubicación de traces/screenshots;
- resultado de cada caso UAT;
- control de integridad;
- warnings y deuda no bloqueante;
- evidencia completa de cualquier error.

El agente no mueve su propio resultado fuera de `pending-validation`. El arquitecto lo hará después de auditarlo.
