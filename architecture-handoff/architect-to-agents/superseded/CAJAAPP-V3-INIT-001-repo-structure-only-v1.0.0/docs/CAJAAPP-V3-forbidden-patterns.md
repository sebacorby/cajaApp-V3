# CAJAAPP-V3 — Forbidden Patterns

Este documento existe para evitar repetir la contaminación de CajaApp V2.

## Prohibido en root

```text
.agents/
.mavis/
.agent/
.sandbox/
pending-validation/
node_modules/
dist/
build/
coverage/
package.json
package-lock.json
cycle2-decision.json
launch-backend.ps1
run-backend.bat
tree_script.py
backend-out.log
backend-err.log
*.zip sueltos
*.log sueltos
*.tmp
*.bak
```

## Prohibido dentro de `workspace/` en INIT-001

```text
workspace/backend/node_modules
workspace/backend/dist
workspace/frontend/node_modules
workspace/frontend/dist
workspace/**/*.zip
workspace/**/*.log
workspace/**/debug_*.py
workspace/**/debug_*.js
workspace/**/test_*.py
```

## Prohibido en `architecture-handoff/`

```text
architecture-handoff/architecture-handoff/
architecture-handoff/**/*.extract/
architecture-handoff/**/*.tmp
architecture-handoff/**/*.bak
```

## Prohibido copiar desde V2

No copiar nada desde:

```text
I:\cajaApp-V2
```

La V3 se crea limpia. La información técnica de V2 se usará más adelante como referencia de arquitectura, no como copia física.

## Regla de fallo

Si cualquiera de estos patrones aparece en la entrega INIT-001, el gate debe marcar FAIL.
