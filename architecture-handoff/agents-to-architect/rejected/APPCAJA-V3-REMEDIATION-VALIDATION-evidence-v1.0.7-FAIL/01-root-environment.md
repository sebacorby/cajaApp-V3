# 01-root-environment.md

Root operativo y entorno

Timestamp: 2026-07-14T20:58:24

## Root operativo

- Raíz operativa: `I:\cajaApp-V3-real`
- `Resolve-Path`: `I:\cajaApp-V3-real`
- Directorio de trabajo actual: `I:\cajaApp-V3-real`
- Root validado: SÍ

## Repo canónico fuente

- Raíz canónica: `I:\cajaApp-V3`
- `Resolve-Path`: `I:\cajaApp-V3`
- Workspace existe: SÍ
- Uso: fuente de archivos publicados; ningún gate se ejecuta allí.

## Toolchain Node.js

- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- `node --version`: `v24.18.0` ✅ exacto
- npm: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`
- `npm --version`: `11.16.0`
- npx: `I:\Tools\node-v24.18.0-win-x64\npx.cmd`
- `npx --version`: `11.16.0`

## Entorno Windows

- Sistema operativo: Microsoft Windows 11 Pro
- Versión: 10.0.26200
- Arquitectura: 64 bits

## Puertos iniciales

| Puerto | En uso | Proceso |
|--------|--------|---------|
| 11436 | NO | — |
| 11437 | NO | — |
| 3000 | SÍ | com.docker.backend (28204) / wslrelay |

Puertos 11436/11437 libres; Docker/WSL activo en 3000.

Resultado: **PASS**
