# Resumen de Cambios - v1.0.11

## Objetivo
Remediación del flujo de reparación del Asesor IA para que el segundo intento reciba la respuesta anterior rechazada (`previousRejectedOutput`).

## Archivos Modificados

### 1. `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`

#### Cambios realizados:

1. **Actualización de versión de prompt** (línea 40):
   - Antes: `AI_ADVISOR_PROMPT_VERSION = "advisor-prompt-v1.1.0"`
   - Después: `AI_ADVISOR_PROMPT_VERSION = "advisor-prompt-v1.2.0"`

2. **Nuevo tipo `AiAdvisorRepairIssue`** (líneas 1050-1056):
   ```typescript
   export type AiAdvisorRepairIssue = {
     code: string;
     message: string;
     path?: string;
     rejectedValues?: string[];
     sourceIds?: string[];
   };
   ```

3. **Tipo `AiAdvisorRepairInstructions` actualizado** (líneas 1058-1062):
   - Añadido campo `issues: AiAdvisorRepairIssue[]`
   - Añadido campo `previousRejectedOutput: unknown`
   - Removido campo `errors: Array<{ code: string; message: string }>`

4. **Nueva función `getValidationIssues`** (líneas 876-948):
   - Devuelve array de `AiAdvisorRepairIssue` con información estructurada
   - Incluye paths de Zod para errores de schema
   - Incluye `rejectedValues` para números no respaldados
   - Incluye `sourceIds` para fuentes inválidas

5. **`validateAiAdvisorOutput` refactorizado** (líneas 950-985):
   - Ahora usa `getValidationIssues` internamente
   - Lanza error con el primer issue si hay errores

6. **Bloque de reparación en `ask` mejorado** (líneas 1367-1389):
   - Captura `previousRejectedOutput` del rawJson del proveedor
   - Si el JSON puede parsearse, usa el objeto parseado
   - Si no puede parsearse, crea objeto con flags `_untrusted`, `_truncated`, `_text`
   - Construye `repairInstructions` con `attempt: 2`, `issues`, y `previousRejectedOutput`

### 2. `contracts/prompts/advisor/01-explain-financial-context.md`

#### Cambios realizados:

1. **Versión del prompt actualizada**:
   - Antes: `advisor-prompt-v1.1.0`
   - Después: `advisor-prompt-v1.2.0`

2. **Sección MODO REPARACIÓN expandida** (líneas 76-85):
   - Punto 1: `previousRejectedOutput` es el borrador obligatorio
   - Punto 4: Cada issue incluye code, message, path, rejectedValues, sourceIds
   - Punto 5: Reemplazar o eliminar IDs inválidos
   - Punto 6: Eliminar números no respaldados o reescribir con literales
   - Punto 7: Eliminar claims/riesgos sin evidencia
   - Punto 8: No agregar números nuevos
   - Nuevas reglas de no cambio de schemaVersion, mode, datos numéricos

### 3. `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`

#### Tests añadidos (13 nuevos tests):

1. `getValidationIssues devuelve issues con paths para schema invalido`
2. `getValidationIssues devuelve path para fuente inexistente`
3. `getValidationIssues devuelve rejectedValues para numero no respaldado`
4. `buildProviderPayload no incluye repairInstructions en primer intento`
5. `ask pasa previousRejectedOutput en segundo intento con issues estructurados`
6. `summary.currencies.ARS sigue siendo fuente inexistente`
7. `proveedor se invoca exactamente dos veces en recuperacion`
8. `nunca existe tercer intento`
9. `se persisten salida original y reparacion`
10. `version del prompt corresponde al archivo final`

#### Import añadido:
```typescript
import {
  AI_ADVISOR_PROMPT_VERSION,
  getValidationIssues,
  // ...existing imports
} from "../../src/modules/ai-advisor/ai-advisor.service.js";
```

## Archivos No Modificados (Congelados)

- app-shell.tsx
- sidebar.tsx
- sidebar-data-quality.spec.ts
- categories.spec.ts
- chart-parity.spec.ts
- debit-csv-import.spec.ts
- card-statement-import.spec.ts
- future.spec.ts
- global-search.spec.ts

##验证

- Backend tests: 148/148 PASS
- Frontend typecheck: PASS
- Frontend lint: 0 errors, 3 warnings
- Frontend build: PASS
