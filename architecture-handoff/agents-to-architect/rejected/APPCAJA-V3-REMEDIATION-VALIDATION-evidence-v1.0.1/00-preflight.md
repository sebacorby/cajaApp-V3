# 00-preflight.md

Ejecutado: 2026-07-13 00:37:04 -03:00 (America/Buenos_Aires, UTC-3)

## §6.1 Root — resultados

Ver `00-preflight-root.txt` para el detalle completo. Resumen:

- Script `cajaapp-headless-up.ps1` existe, comienza con `[CmdletBinding()]`, no contiene shebang bash, expone los parámetros exigidos, resuelve `node.exe`/`npm.cmd`/`cmd.exe`/`taskkill.exe`, no aplica `.Trim()` sobre `$null`.
- Todos los archivos prohibidos están **ausentes** (`cajaapp-headless-up.sh`, `start-cajaapp-temp.ps1`, `diag-node.ps1`, `diag-env.ps1`, `plan.md`).
- `detect-env.sh` está **presente** — permitido por la tarea como histórico.

## §6.2 Backend — resultados

| Control                                                                       | Resultado |
| ----------------------------------------------------------------------------- | --------- |
| `workspace\backend\package.json` contiene `"prisma:migrate:status": "prisma migrate status"` | OK        |
| Existe una sola prueba canónica `tests\movements\categories.rules.test.ts`   | TRUE      |
| `tests\imports\ai-job-timeout.test.ts` existe                                 | TRUE      |
| `tests\imports\watchdog-timeout.test.ts` NO existe                            | TRUE      |
| **Ningún archivo en `workspace\backend\tests` contiene `(1)`**                | **FAIL**  |

### §6.2 Violación detectada

Archivo prohibido encontrado:

- `I:\cajaApp-V3\workspace\backend\tests\movements\categories (1).rules.test.ts`

Contiene (extracto):

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeCategoryText,
  pickCategorySuggestion,
  type CategorySuggestionRule,
} from "../../src/modules/movements/categories.service.js";

const rules: CategorySuggestionRule[] = [ ... ];
```

→ Es una copia `(1)` del test canónico `categories.rules.test.ts`. Viola §6.2 ("no existe ningún archivo cuyo nombre contenga `(1)`") y activa la regla de §4 + §6.3.

## §6.3 Frontend — resultados

| Control                                                                       | Resultado |
| ----------------------------------------------------------------------------- | --------- |
| Existe una sola prueba canónica `tests\categories.spec.ts`                    | TRUE      |
| `category-management-sheet (1).tsx` NO existe                                 | TRUE      |
| **Ningún archivo en `workspace\frontend\tests` o `workspace\frontend\tests\e2e` contiene `(1)`** | **FAIL** |

### §6.3 Violación detectada (FAIL inmediato)

Archivo prohibido encontrado:

- `I:\cajaApp-V3\workspace\frontend\tests\categories (1).spec.ts`

Contiene (extracto):

```ts
import { expect, test } from "@playwright/test";

const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";

test.describe("Administración de categorías", () => { ... });
```

→ Es una copia `(1)` del spec canónico `categories.spec.ts`. §6.3 indica expresamente: "Si aparece `tests\categories (1).spec.ts` o cualquier otra copia `(1)`, declarar `FAIL` inmediatamente. No eliminarla."

## §3 Fuente de verdad — verificación

Ruta exigida: `I:\cajaApp-V3\docs\00-context\APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`

- Existe en esa ruta exacta: **FALSE**
- Existe en el directorio `00-context` un archivo con prefijo `SUPERSEDED__`: `SUPERSEDED__APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`
- Existe también un `.gdoc` con título `APPCAJA V3 - SSOT de ejecución vigente.gdoc` — la tarea aclara que la autoridad es el documento "nativo vigente en Drive", lo cual es coherente con la ausencia del `.md` local.

El agente no puede editar la SSOT, y no la editó. La autoridad arquitectónica reside en Drive (`.gdoc`). Se documenta como observación, no como modificable.

## Otros archivos `(1)` en el repositorio (no en `tests/`, no explícitamente prohibidos por §6.2/§6.3 pero anoto para contexto)

| Ruta                                                                                                       | Tipo                       |
| ---------------------------------------------------------------------------------------------------------- | -------------------------- |
| `workspace\backend\src\modules\ai\TEMP-ai-extraction (1).service.ts`                                       | source duplicado           |
| `workspace\backend\src\modules\movements\categories (1).service.ts`                                        | source duplicado           |
| `workspace\backend\prisma\dev (1).db`                                                                      | DB duplicada               |
| `workspace\backend\prisma\migrations\20260711234500_add_category_rules\migration (1).sql`                 | migración duplicada        |
| `workspace\backend\dist\modules\ai\TEMP-ai-extraction (1).service.*`                                       | build artifact             |
| `workspace\backend\dist\modules\movements\categories (1).service.*`                                        | build artifact             |
| `workspace\frontend\.next\**\** (1).*` (múltiples)                                                         | build artifact             |
| `architecture-handoff\agents-to-architect\rejected\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.0\00-verdict (1).md` | evidencia histórica |

Los `(1)` en `dist/` y `.next/` son artefactos de build y se regeneran. Los `(1)` en `src/` y `prisma/migrations/` no son nombrados expresamente en §6.2/§6.3 pero constituyen copia residual observable. Los `(1)` en `rejected/` pertenecen a la evidencia histórica de v1.0.0 y no son parte del proyecto.

## Conclusión del preflight

**PREFLIGHT: FAIL** — §6.2 (backend tests) y §6.3 (frontend tests) violados por presencia de archivos `(1)`.

Consecuencia (per §4 + §6.3): se omite §8 (gate backend), §9 (gate frontend), §10 (arranque headless), §11 (smoke API), §12 (Playwright completo) y §13 (responsive/a11y). Se ejecutan §7 (resguardo SQLite) y §14 (cleanup) y se genera el verdict `FAIL`.
