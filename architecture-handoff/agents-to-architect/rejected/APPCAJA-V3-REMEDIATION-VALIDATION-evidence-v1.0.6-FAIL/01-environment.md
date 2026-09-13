# 01-environment.md

Entorno y script obligatorio — registro inicial

Timestamp: 2026-07-14T19:11:58

- Raíz del proyecto: `I:\cajaApp-V3-real`
- Directorio de trabajo actual: `I:\cajaApp-V3-real`
- Sistema operativo: Microsoft Windows 11 Pro
- Versión Windows: 10.0.26200
- Edición Windows: Pro
- Arquitectura: 64 bits

## Node.js / npm

- Ruta de `node.exe`: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- `node --version` (PowerShell): `v24.18.0` ✅ exacto
- `npm` global (`C:\Users\javie\AppData\Roaming\npm\npm.cmd`): versión `10.9.2`, ejecuta Node desde `C:\Users\javie\nodejs\node.exe` (v22.14.0)
- `npm` correcto para Node v24.18.0: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`, versión `11.16.0`, ejecuta Node v24.18.0
- `npx` correcto para Node v24.18.0: `I:\Tools\node-v24.18.0-win-x64\npx.cmd`, versión `11.16.0`

Nota: el `npm` global está atado a una instalación Node v22.14.0. Para cumplir el requisito de Node.js exacto v24.18.0 se usará `I:\Tools\node-v24.18.0-win-x64\npm.cmd` en todos los gates de backend/frontend.

## Puertos

| Puerto | En uso | Procesos |
|--------|--------|----------|
| 11436 | NO | — |
| 11437 | NO | — |
| 3000 | SÍ | wslrelay (33160), com.docker.backend (28204) |

Puerto 3000 ocupado por Docker/WSL, como es esperado.

## Hashes de lockfiles y script

| Archivo | SHA-256 |
|---------|---------|
| backend\package.json | 5411DBA21C46E756E9A3274FF9A81FC1A0D214B7BAE175AFC698070F50B55A64 |
| backend\package-lock.json | 825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87 |
| frontend\package.json | 7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B |
| frontend\package-lock.json | DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED |
| cajaapp-headless-up.ps1 | EB78655898F09C5E5AF1C2D4D2E8B419C9DBF9DAD396ADCD0FEB4DC7EA418DEF |

## Script de detención inicial

Comando ejecutado:

```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

Resultado JSON:

```json
{ "ok": true, "stopped": [], "stateFile": "C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\state.json" }
```

- `ok`: true ✅
- No finalizó procesos externos (Docker/WSL en puerto 3000 intactos) ✅

Resultado: **PASS**
