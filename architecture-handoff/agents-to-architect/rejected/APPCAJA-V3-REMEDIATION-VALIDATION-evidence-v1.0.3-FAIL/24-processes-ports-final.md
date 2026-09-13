# Procesos y puertos finales

Fecha: 2026-07-14T09:52:22.9331047-03:00

## Procesos `node.exe` activos gestionados por CajaApp

No se encontraron procesos `node.exe` activos atribuibles a CajaApp.

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue
# sin resultados
```

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

No quedan procesos CajaApp activos. Los puertos 11436 y 11437 estn libres. El puerto 3000 est ocupado por software externo, por lo que el arranque con puertos por defecto no es viable; se requiere usar `-FrontendPort` con un puerto libre.

Resultado: PASS/FAIL - No hay procesos residuales CajaApp, pero el script `-Stop` con puertos por defecto falla por procesos externos en el puerto 3000.
