# 01-root-environment.md

Root operativo y toolchain

Timestamp: 2026-07-15T00:05:00

## Root operativo

- `Resolve-Path 'I:\cajaApp-V3-real'` → `I:\cajaApp-V3-real` ✅
- `Resolve-Path 'I:\cajaApp-V3'` → `I:\cajaApp-V3` ✅
- Uso: `I:\cajaApp-V3` sólo como fuente canónica; ejecución en `I:\cajaApp-V3-real` ✅

## Toolchain Node.js

- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- Versión: `v24.18.0` ✅
- npm/npx: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`, `I:\Tools\node-v24.18.0-win-x64\npx.cmd`

Resultado: **PASS**
