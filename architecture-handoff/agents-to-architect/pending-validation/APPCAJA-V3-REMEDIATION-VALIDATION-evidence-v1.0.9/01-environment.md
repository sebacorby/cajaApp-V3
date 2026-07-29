# 01 — Environment

**Campaña:** APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.9
**Fecha:** 2026-07-15
**Root operativo:** `I:\cajaApp-V3-real`
**Repo canónico (sólo lectura de instrucciones y fuentes):** `I:\cajaApp-V3`

## Sistema

- Plataforma: `win32`
- Shell: PowerShell 5.1

## Toolchain autorizado

| Herramienta | Versión | Ruta |
|---|---|---|
| node | v24.18.0 | `I:\Tools\node-v24.18.0-win-x64\node.exe` |
| npm | 11.16.0 | `I:\Tools\node-v24.18.0-win-x64\npm.cmd` |
| npx | 11.16.0 | `I:\Tools\node-v24.18.0-win-x64\npx.cmd` |

Resolución exclusivamente desde `I:\Tools\node-v24.18.0-win-x64\`. No se usa `PATH`.

## Puertos reservados

| Puerto | Uso | Estado inicial |
|---|---|---|
| 11436 | Backend | libre |
| 11437 | Frontend | libre |

## Procesos CajaApp

Cero procesos `node.exe` vinculados a CajaApp al inicio de la campaña.

## Scripts autoritativos de arranque/parada

- `I:\cajaApp-V3-real\cajaapp-headless-up.ps1` (con `-Stop`, `-Rebuild`, `-JsonOnly`, `-BackendPort`, `-FrontendPort`)

No se autoriza ningún otro runner, wrapper, script o automatización ad hoc.