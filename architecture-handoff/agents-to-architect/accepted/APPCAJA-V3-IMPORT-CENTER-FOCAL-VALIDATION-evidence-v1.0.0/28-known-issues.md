# 28-known-issues.md

# Known Issues — APP-IMPORT-CENTER-001

## En el Vertical (APP-IMPORT-CENTER-001)
**Ninguno.** El vertical está operativo sin defectos conocidos.

## Problemas Preexistentes (fuera del alcance)

### Frontend — ESLint Warnings
3 advertencias en archivos fuera del alcance del vertical:

| Archivo | Línea | Advertencia |
|---------|-------|-------------|
| alert-center.tsx | 82 | Expected an assignment or function call... (@typescript-eslint/no-unused-expressions) |
| sidebar-data-quality.tsx | 56 | Expected an assignment or function call... (@typescript-eslint/no-unused-expressions) |
| salud-financiera-section.tsx | 276 | Expected an assignment or function call... (@typescript-eslint/no-unused-expressions) |

Estas advertencias existen en el codebase antes de este vertical. No fueron introducidas por APP-IMPORT-CENTER-001. El lint focal del vertical (archivos en el alcance) devuelve 0 errores y 0 advertencias.

### Frontend — npm audit
```
To address all issues (including breaking changes), run:
  npm audit fix --force
Run `npm audit` to review issues.
```
Estas advertencias son preexistentes y no fueron introducidas por este vertical. `npm ci` exit code 0, no blocking.

## Notas de Runtime
- Backend.log contiene muchas líneas prisma:query (consultas de stale import recovery de AiExtractionRun). Esto es comportamiento normal del servicio y no afecta la funcionalidad del vertical.
- Backend.err.log está vacío (0 bytes) — startup limpio sin errores.
- No hay errores de integración entre el vertical y los módulos existentes.

## issues.md Retrocompatibilidad
La tabla `issues` en el response está diseñada para recibir mensajes de advertencia. El sistema la llena con contenido funcional. No hay issues conocidos con el formato.

## Contrato API
El contrato API no expone ninguna propiedad prohibida (storagePath, rawResponsePath, modelBaseUrl, previewJson, jsonOutput, promptFilePath). Verificado en sección 20.
