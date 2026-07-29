# PRD — Spec 003: Revisar drafts pendientes

**Producto:** CajaApp V3
**Tipo:** Product Requirements Document
**Estado:** BORRADOR PARA VALIDACIÓN FUNCIONAL — NO AUTORIZA IMPLEMENTACIÓN
**Versión:** 1.0.0
**Fecha:** 24 de julio de 2026
**Repositorio canónico:** `/Javier Corbella/cajaApp-V3`
**SSOT relacionado:** `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`

---

## 1. Resumen ejecutivo

Hoy, después de subir un PDF de resumen de tarjeta, el usuario puede terminar con borradores en dos estados terminales:

- `preview_ready` — la IA extrajo datos utilizables, pero el usuario todavía no los aceptó.
- `failed` — la IA no pudo producir un preview utilizable (validación rota, repair agotado, error de provider).

Estos borradores se quedan "sueltos" en el Centro de importaciones mezclados con el historial de resúmenes ya aceptados, sin un lugar explícito donde revisarlos y resolverlos. El usuario tiene que abrir cada resumen uno por uno desde Tarjetas para llegar al botón "Aceptar", y no tiene ninguna forma de descartar un draft fallido sin tocar la base de datos.

Esta spec agrega al **Centro de importaciones** una zona dedicada a **"Drafts pendientes de revisión"** que lista los borradores en estado `preview_ready` y `failed` y le ofrece al usuario tres acciones por ítem: **Aceptar**, **Ver** y **Descartar** (esta última con modal de confirmación).

---

## 2. Problema

### 2.1 Estados terminales sin triage

Después de cada corrida del worker de IA, una `CardStatementDraft` queda en uno de estos estados:

| Estado            | Significado                                                  |
|-------------------|--------------------------------------------------------------|
| `preview_ready`   | Preview JSON válido, listo para que el usuario lo revise y acepte. |
| `failed`          | La IA no produjo un preview aceptable.                       |
| `accepted`        | Ya fue convertido en `CardStatement`.                        |

Cualquier borrador que no se acepta en la misma sesión queda perdido en el historial. No hay una vista dedicada que le diga al usuario "tenés N drafts esperando tu decisión".

### 2.2 Acciones faltantes

Desde la UI actual solo existen dos formas de resolver un draft:

1. Abrir Tarjetas, esperar el polling del worker y aceptar el preview (lento, requiere navegación completa).
2. No existe una acción visible de "Descartar". Si el usuario quiere tirar un draft fallido, no hay ruta de UI.

### 2.3 Riesgo

Sin un triage visible, los drafts se acumulan y el usuario pierde de vista qué PDFs ya procesó, cuáles fallaron y cuáles siguen esperando aceptación. En particular, los `failed` quedan sin superficie para ser revisados o eliminados.

---

## 3. Solución propuesta

Extender el Centro de importaciones (sección `importaciones`) con un panel dedicado a los **drafts pendientes** que muestra:

- Todos los `CardStatementDraft` en estado `preview_ready`.
- Todos los `CardStatementDraft` en estado `failed`.

Para cada ítem, el panel expone tres acciones (solo en `preview_ready`) o una (en `failed`):

| Acción      | Disponible en `preview_ready` | Disponible en `failed` | Comportamiento                                                                 |
|-------------|-------------------------------|------------------------|--------------------------------------------------------------------------------|
| **Aceptar** | Sí                            | No                     | Convierte el draft en `CardStatement` (idéntico a la aceptación actual).       |
| **Ver**     | Sí                            | No                     | Navega a la sección Tarjetas con el preview del draft cargado, en modo editable. |
| **Descartar** | Sí                          | Sí                     | Abre un modal de confirmación; al confirmar, elimina el draft y su `UploadedDocument` asociado. |

Para `failed`, además, el panel muestra el mensaje de error (`AiExtractionRun.errorMessage` o el primer `validationErrors`) para que el usuario sepa por qué falló antes de descartarlo.

### 3.1 Out of scope

- Edición inline del preview desde el Centro de importaciones. El usuario edita el preview en Tarjetas como hoy.
- Reprocesamiento automático o manual del draft. Eso lo cubre el flujo de re-upload.
- Reemplazo del Centro de importaciones. Esta spec **extiende** la pantalla actual; no la rehace.

---

## 4. Criterios de aceptación (resumen)

Cubiertos en `features/FEAT-025-revisar-drafts-pendientes.feature`:

1. Con borradores `preview_ready` y `failed` presentes, abrir Centro de importaciones muestra ambos listados con su estado.
2. Sobre un draft `preview_ready`, "Aceptar" crea una `CardStatement` con los mismos datos que el draft.
3. Sobre un draft `preview_ready`, "Ver" navega a Tarjetas con el preview cargado en modo editable.
4. Sobre un draft `preview_ready` o `failed`, "Descartar" abre un modal de confirmación; al confirmar, el draft y su documento se eliminan.
5. Sobre un draft `failed`, el panel muestra el motivo del error y permite descartarlo.
6. La lista refleja cambios inmediatamente después de cada acción (refresco automático o revalidación).

---

## 5. Restricciones

- **No tocar el modelo de datos.** La distinción entre `preview_ready` y `failed` ya existe en `CardStatementDraft.status`. Esta spec no introduce migraciones.
- **No duplicar la pantalla de detalle de Tarjetas.** El botón "Ver" reutiliza la ruta existente de carga del draft.
- **El modal de confirmación debe bloquear la acción hasta respuesta explícita.** Cancelar el modal no debe descartar el draft.
- **Idempotencia.** Aceptar dos veces el mismo draft no debe crear dos `CardStatement`. Si la API ya devuelve 409 o similar, el panel debe reflejarlo y refrescar.

---

## 6. Preguntas abiertas (resueltas con el usuario)

| # | Pregunta                                                                                          | Respuesta                                                                |
|---|---------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| 1 | ¿Qué estados deben aparecer en la lista?                                                          | `preview_ready` + `failed`.                                              |
| 2 | ¿Dónde debe vivir la lista?                                                                       | Extender el **Centro de importaciones** existente.                       |
| 3 | ¿La acción de descartar requiere confirmación?                                                    | Sí, con modal de confirmación.                                           |
| 4 | ¿Qué debe hacer "Ver"?                                                                            | Cargar el preview en Tarjetas en modo editable.                          |

---

## 7. Referencias

- `docs/technical.md` — mapa de módulos (`import-center`, `cards`, `imports`).
- `docs/domain.md` — entidades `CardStatementDraft`, `AiExtractionRun`, `UploadedDocument`, `CardStatement`.
- `features/FEAT-001-card-statement-import.feature` — flujo de import existente (contexto).
- `features/FEAT-024-fix-period-key.feature` — estilo Gherkin en español para escenarios de flujo.