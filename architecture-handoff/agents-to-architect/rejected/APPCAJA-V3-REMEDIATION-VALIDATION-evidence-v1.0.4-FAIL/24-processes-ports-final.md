# Procesos y puertos finales

Fecha: 2026-07-14T12:27:16.8191667-03:00

## Procesos `node.exe` activos gestionados por CajaApp

Se encontraron procesos `node.exe` activos en el sistema, pero ninguno pertenece a CajaApp. Se verificaron los command-line de cada proceso; ninguno contiene `I:\cajaApp-V3`, `dist/main.js` ni `.next/standalone/server.js`. Los procesos activos corresponden a servidores MCP, caches npm y otras herramientas ajenas a CajaApp.

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue
```

Resultado: 18 procesos node.exe activos, todos IsCajaApp=NO.

## Puertos relevantes

```powershell
Get-NetTCPConnection -LocalPort 11436,11437,3000 -State Listen -ErrorAction SilentlyContinue
```

Resultado:

```
LocalPort OwningProcess  State
--------- -------------  -----
     3000         33160 Listen
     3000         28204 Listen
```

- Puerto 11436 (backend candidato): LIBRE
- Puerto 11437 (frontend candidato): LIBRE
- Puerto 3000 (frontend por defecto): ocupado por procesos ajenos a CajaApp:
  - PID 28204: `com.docker.backend` (Docker Desktop)
  - PID 33160: `wslrelay` (Windows Subsystem for Linux)

## Conclusin

No quedan procesos CajaApp activos. Los puertos 11436 y 11437 estn libres. El script `-Stop` con puertos por defecto funciona correctamente ignorando procesos externos en el puerto 3000.

Resultado: PASS - no hay procesos ni puertos CajaApp residuales.
