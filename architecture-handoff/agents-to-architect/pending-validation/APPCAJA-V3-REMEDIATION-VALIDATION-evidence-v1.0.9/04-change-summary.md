# 04 — Change Summary

**Campaña:** APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.9
**Fecha:** 2026-07-15

## Remediación A — Asesor IA

### `contracts/prompts/advisor/01-explain-financial-context.md`

**Qué cambió:** el prompt se reescribió para declarar de forma explícita que `citationCatalog` es el único conjunto factual citable, que `allowedSourceIds` es la lista cerrada de IDs permitidos y que `sourceId` debe coincidir byte a byte con esa lista. Se prohíbe citar rutas internas como `summary.*`, nombres de campos del esquema, labels o descripciones como si fueran IDs. Se incorporó una sección "MODO REPARACIÓN" con instrucciones precisas sobre cómo corregir únicamente los errores informados sin alterar el resto del contrato.

**Por qué:** la auditoría v1.0.8 demostró que el modelo recibía el contexto CajaApp completo (incluido `summary`) sin un catálogo cerrado ni lista explícita de IDs permitidos, y producía fuentes inexistentes como `summary.currencies.ARS` que los guardrails rechazaban correctamente.

**Causa raíz corregida:** contrato con el modelo ambiguo que permitía al LLM inferir IDs a partir de rutas JSON.

**Versión:** bumped de `advisor-prompt-v1.0.0` → `advisor-prompt-v1.1.0` (cambio de contrato, no retrocompatible).

### `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`

**Qué cambió:**
1. Versión del prompt: `advisor-prompt-v1.0.0` → `advisor-prompt-v1.1.0`.
2. Nueva constante `AI_ADVISOR_PROVIDER_REQUEST_VERSION = "advisor-request-v1.1.0"`.
3. Nuevos tipos exportados: `AiAdvisorCitationCatalogEntry`, `AiAdvisorRepairInstructions`, `AiAdvisorProviderPayload`.
4. Nueva función exportada `buildProviderPayload(context, input, options)` que arma el payload visible por el proveedor con `mode`, `untrustedUserQuestion`, `nonFactualMetadata`, `citationCatalog`, `allowedSourceIds` y `outputContract`. No expone `summary`, `sources` ni el `structuredContext` interno.
5. Nueva función exportada `isRecoverableAdvisorError(code)` que clasifica los errores recuperables (`AI_ADVISOR_OUTPUT_SCHEMA_INVALID`, `AI_ADVISOR_UNKNOWN_SOURCE`, `AI_ADVISOR_UNGROUNDED_NUMBER`).
6. Método `ask()` reemplazado por una versión con bucle de hasta dos intentos (inicial + reparación controlada). El primer fallo recuperable se reenvía con `repairInstructions` específicas y se re-valida la respuesta. La respuesta final expone `provider.attempts` con metadatos completos de cada intento (requestId, durationMs, outcome, rejection.code, rejection.message).
7. Persistencia: `requestJson` registra `payloadSchemaVersion` y los `attempts` con sus requestId/outcome/rejection. `responseJson` contiene `provider.attempts`. Sin columnas nuevas en Prisma (fuera de alcance).

**Por qué:** la auditoría v1.0.8 confirmó que el backend no exponía un catálogo cerrado ni realizaba reparación controlada de salidas no determinísticas del modelo.

**Causa raíz corregida:** (a) contrato con el proveedor ambiguo; (b) ausencia de un único intento de recuperación; (c) trazabilidad insuficiente de los intentos.

### `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`

**Qué cambió:** se incorporaron 9 tests nuevos en un bloque `describe("Asesor IA v1.0.9 — contrato y recuperación")` que cubren los 10 requisitos de la sección 5.6:

1. `summary.currencies.ARS` rechazado como fuente inexistente.
2. `buildProviderPayload` enumera todos y solo los IDs válidos.
3. `buildProviderPayload` no expone `summary` ni `structuredContext`.
4. `isRecoverableAdvisorError` clasifica los códigos recuperables y no recuperables.
5. `ask` dispara exactamente un intento de reparación cuando la primera respuesta cita una fuente inexistente y termina en 201 con citas materializadas.
6. `ask` finaliza en 422 sin tercer intento cuando la reparación también falla.
7. `ask` no repara cuando el primer fallo es no recuperable (lenguaje prescriptivo).
8. `ask` persiste petición inicial y reparación en `requestJson`/`responseJson` sin secretos.
9. `ask` no modifica registros financieros (movements/budgets/goals).

Se mockean `prisma`, `dashboardService`, `budgetsService`, `goalsService`, `futureService`, `financialHealthService` para poder ejecutar `ask()` de forma aislada, y se inyecta un `TextExtractionProvider` simulado.

**Por qué:** la auditoría v1.0.8 no encontró regresiones que demostraran que el contrato y la recuperación funcionan de forma robusta.

**Causa raíz corregida:** ausencia de cobertura explícita del contrato de citas y de la recuperación.

## Remediación B — Sidebar accesible en altura reducida

### `workspace/frontend/src/components/finance/layout/app-shell.tsx`

**Qué cambió:** el contenedor desktop del sidebar pasó de `<div className="sticky top-0 h-screen">` a `<div className="sticky top-0 h-screen overflow-y-auto overscroll-contain">`. Mantiene altura completa y sticky, y añade scroll vertical propio con aislamiento del scroll chaining.

**Por qué:** la auditoría v1.0.8 confirmó que en viewport 1280x720 el sidebar tenía altura fija sin overflow, dejando los indicadores (sin clasificar, alertas, último dato actualizado) fuera del viewport. Playwright no podía ni siquiera desplazarlos.

**Causa raíz corregida:** contenedor desktop sin scroll vertical propio.

### `workspace/frontend/src/components/finance/layout/sidebar.tsx`

**Qué cambió:** el `<div>` raíz del Sidebar pasó de `flex h-full flex-col` a `flex h-full min-h-0 flex-col`. El `<nav>` pasó de `flex flex-1 flex-col gap-1` a `flex min-h-0 flex-1 flex-col gap-1`. Esto evita que el nav absorba altura indefinida y empuje los indicadores por debajo del viewport.

**Por qué:** sin `min-h-0`, el `flex-1` del nav crecía hasta agotar toda la altura disponible dentro del wrapper, sin permitir que el wrapper mostrara los indicadores restantes por scroll.

**Causa raíz corregida:** estructura flex sin `min-h-0` que permitía crecimiento indefinido.

### `workspace/frontend/tests/sidebar-data-quality.spec.ts`

**Qué cambió:**
1. Viewport desktop explícitamente fijado a 1280×720 al inicio.
2. Verificación previa: el contenedor debe tener `overflow-y` en `auto` o `scroll` y `scrollHeight >= clientHeight` antes de continuar (es decir, es visible o desplazable).
3. Cada click sobre un indicador del sidebar usa `scrollIntoViewIfNeeded()` antes de `click({ force: false })` — sin `force` ni tiempos inflados.
4. Se conserva intacta la validación mobile final (390×844 con botón "Abrir menú").

**Por qué:** la auditoría v1.0.8 confirmó que los clicks a indicadores del sidebar eran interceptados por el viewport.

**Causa raíz corregida:** el test asumía visibilidad directa sin sincronización con el contenedor scrollable.

## Remediación C — Seis correcciones de Playwright/UAT

### `workspace/frontend/tests/categories.spec.ts`

**Qué cambió:** tras cerrar el sheet con Escape, antes de reabrir, el test:
1. Captura un locator estable del sheet.
2. Espera que el sheet esté desmontado (`waitFor({ state: "detached" })`).
3. Espera que cualquier overlay de Radix Portal/Dialog Overlay quede desmontado.
4. Reabre el sheet.
5. Espera visibilidad del sheet antes de buscar "Restaurar categoría".

**Por qué:** la auditoría v1.0.8 confirmó que el overlay anterior interceptaba la reapertura del sheet (race condition).

**Causa raíz corregida:** reapertura del sheet sin esperar el desmontaje completo del overlay.

### `workspace/frontend/tests/chart-parity.spec.ts`

**Qué cambió:** el selector del botón "Actualizar" pasó de `page.getByRole("button", { name: "Actualizar" })` (selector global que matcheaba dos botones) a `page.getByTestId("dashboard-section").getByRole("button", { name: "Actualizar" })`, acotado a la sección de dashboard.

**Por qué:** la auditoría v1.0.8 confirmó que el botón "Actualizar" del dashboard coincidía con otro botón "Actualizar" presente en la página.

**Causa raíz corregida:** selector global ambiguo.

### `workspace/frontend/tests/debit-csv-import.spec.ts`

**Qué cambió:** los selectores de fila importada pasaron de `[data-testid^="movement-row-"]` a `[data-testid^="movement-row-"]:visible`, aceptando que existan ambas representaciones (tabla desktop y tarjeta responsive) en el DOM, pero asegurando que se opera sobre la representación visible.

**Por qué:** la auditoría v1.0.8 confirmó que la misma descripción existía en la tabla desktop y en la tarjeta responsive dentro del DOM.

**Causa raíz corregida:** selector que asumía un único nodo global sin considerar la visibilidad.

### `workspace/frontend/tests/e2e/card-statement-import.spec.ts`

**Qué cambió:**
1. Se eliminó el umbral arbitrario `expect(rowCount).toBeGreaterThanOrEqual(125)`.
2. Se captura el body de la respuesta autoritativa del draft (`evidence.importResponses` ya lo registra).
3. Se calcula el número de filas renderizables: `preview.rows.filter(row => !OMITTED_ROW_TYPES.has(row.rowType))`, excluyendo únicamente los tipos `legal_text`, `section_header` y `group_header`.
4. Se exige igualdad exacta entre filas renderizables y nodos `card-statement-row`.
5. Se validan conteos semánticos: transacciones (`rowType === "transaction"`), impuestos (`rowType === "tax"`) y total (`rowType === "statement_total"`), comparados contra los testids `card-statement-row-transaction`, `card-statement-row-tax` y `card-statement-row-total`.
6. Se conserva la comprobación contra el valor monetario erróneo histórico (`311.884.250,00`).

**Por qué:** la auditoría v1.0.8 confirmó que el backend devuelve 118 filas y la UI omite intencionalmente 4 `legal_text` y 2 encabezados, dejando 112 nodos `card-statement-row`. El umbral 125 era arbitrario.

**Causa raíz corregida:** oráculo basado en umbral numérico en lugar de paridad semántica.

### `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts`

**Qué cambió:** la aserción de "Confirmado" pasó de `page.getByText("Confirmado", { exact: true })` (que matcheaba la etiqueta de grupo del total confirmado Y el badge de estado del componente) a:
1. Localizar el grupo del compromiso creado: `monthPanel.getByTestId(\`future-group-${movementId}\`)`.
2. Dentro de ese grupo, localizar el badge: `futureGroup.locator("span", { hasText: /^Confirmado$/ }).first()`.

**Por qué:** la auditoría v1.0.8 confirmó que "Confirmado" aparecía dos veces: como `<p>` (etiqueta del total del grupo) y como `<span>` (badge del componente). El modo estricto fallaba.

**Causa raíz corregida:** selector global de texto sin scoping al grupo ni al tipo de elemento badge.

### `workspace/frontend/tests/global-search.spec.ts`

**Qué cambió:** tras seleccionar el resultado desktop, antes de cambiar a mobile, el test:
1. Captura un locator estable del dialog.
2. Espera que el dialog esté desmontado (`waitFor({ state: "detached" })`).
3. Espera que cualquier overlay quede desmontado.
4. Cambia el viewport a 390×844.
5. Hace click en `header-global-search`.
6. Espera el nuevo dialog mobile visible y su input.

**Por qué:** la auditoría v1.0.8 confirmó que el overlay del dialog desktop seguía interceptando el click en el botón mobile.

**Causa raíz corregida:** cambio de viewport sin esperar el desmontaje completo del dialog desktop.

## Resumen de cambios totales

- 4 archivos de código modificados (servicio backend, prompt, app-shell, sidebar).
- 8 archivos de test modificados (1 backend, 7 frontend).
- Versiones bumped: prompt `advisor-prompt-v1.0.0` → `advisor-prompt-v1.1.0`.
- Nueva versión interna: `advisor-request-v1.1.0`.
- Cero cambios en Prisma, migraciones, dependencias, lockfiles o APIs ajenas al alcance.