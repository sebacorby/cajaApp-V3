# Procesos y puertos finales

Fecha: 2026-07-14T09:13:41.8001560-03:00

## Procesos `node.exe` activos gestionados por CajaApp

No se encontraron procesos `node.exe` activos atribuibles a CajaApp.

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue
# sin resultados
```

## Puertos relevantes

```powershell
Get-NetTCPConnection -LocalPort 11436,3000 -State Listen -ErrorAction SilentlyContinue
```

Resultado:

```
LocalPort OwningProcess  State
--------- -------------  -----
     3000         33160 Listen
     3000         28204 Listen
```

- Puerto 11436 (backend): LIBRE
- Puerto 3000 (frontend por defecto): ocupado por procesos ajenos a CajaApp:
  - PID 28204: `com.docker.backend` (Docker Desktop)
  - PID 33160: `wslrelay` (Windows Subsystem for Linux)

## Conclusin

No quedan procesos CajaApp activos. El puerto 11436 est libre. El puerto 3000 est ocupado por software externo, lo cual impide que el frontend arranque en el puerto por defecto.

Resultado: FAIL (el script headless no pudo detenerse correctamente, aunque no hay procesos CajaApp residuales; puerto 3000 ocupado externamente).
