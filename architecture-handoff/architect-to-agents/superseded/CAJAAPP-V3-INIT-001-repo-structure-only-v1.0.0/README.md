# CAJAAPP-V3-INIT-001 — Repo structure only

Artifact para crear **solo la estructura inicial** de `I:\cajaApp-V3`.

## Objetivo

Crear un repo V3 limpio, ordenado y auditable, sin arrastrar basura de V2.

## Alcance permitido

- Crear carpetas base.
- Crear archivos mínimos de documentación/evidencia necesarios para validar la estructura.
- Crear `.gitkeep` donde haga falta para conservar carpetas vacías.
- Crear `.gitignore` básico para bloquear basura técnica desde el día cero.

## Alcance prohibido

- No crear backend.
- No crear frontend.
- No instalar dependencias.
- No ejecutar `npm install`, `npm create`, `nest`, `vite`, `prisma`, ni similares.
- No copiar código, carpetas ni artifacts desde V2.
- No crear `node_modules`, `dist`, `.agents`, `.mavis`, `pending-validation` en root ni `architecture-handoff/architecture-handoff`.

## Archivos incluidos

```text
README.md
CHECKSUMS.sha256
docs/
  CAJAAPP-V3-INIT-001-agent-instruction.md
  CAJAAPP-V3-repo-structure-standard.md
  CAJAAPP-V3-forbidden-patterns.md
  CAJAAPP-V3-minimal-traceability.md
gates/
  CAJAAPP-V3-INIT-001-technical-gate.md
```

## Resultado esperado

El agente debe entregar un ZIP liviano con evidencia mínima de la estructura creada.
