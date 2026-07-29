# Entorno obligatorio

- Node.js: `v24.18.0`
- npm: `11.16.0`
- OS: `Microsoft Windows NT 10.0.26200.0`
- Arquitectura: `X64`
- Zona horaria funcional: `Hora estndar de Argentina` (Argentina Standard Time, UTC-3)
- Fecha y hora de registro: `2026-07-14T09:05:31-03:00`
- Node de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- npm de referencia: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`

Resultado del comando de verificacin:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\node.exe" --version
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" --version
[System.Environment]::OSVersion.VersionString
[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
Get-TimeZone | Select-Object StandardName
```

```
v24.18.0
11.16.0
Microsoft Windows NT 10.0.26200.0
X64
2026-07-14T09:05:31-03:00
Hora estndar de Argentina
```

Resultado: PASS - Node.js exacto v24.18.0 disponible.
