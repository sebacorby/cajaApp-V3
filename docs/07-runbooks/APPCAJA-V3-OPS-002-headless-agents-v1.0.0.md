# APPCAJA-V3 — Headless Console para Pruebas de Agente

**Versión:** 1.0.0
**Estado:** vigente
**Audiencia:** agentes LLM (o scripts automatizados) que necesiten levantar el
ecosistema CajaApp V3 para correr pruebas, smoke tests, validaciones o UAT
controlado, sin intervención humana.

---

## TL;DR

- **Herramienta única de inicialización:** `I:\cajaApp-V3\cajaapp-headless-up.ps1`.
- **NO usar** `start-cajaapp.ps1` desde un agente: abre un browser al final y
  bloquea con `Read-Host` esperando Enter. Es interactivo, no headless.
- **Patrón recomendado:** lanzar el script con `Start-Process` (fire-and-forget)
  y hacer polling del `state.json` hasta ver `"ok": true`. Después consumir los
  endpoints directamente.
- **Cleanup:** `cajaapp-headless-up.ps1 -Stop` mata los PIDs del run anterior
  leyendo el `state.json` o escaneando los puertos.

---

## 1. Ubicación y contrato

| Item | Valor |
|---|---|
| Script | `I:\cajaApp-V3\cajaapp-headless-up.ps1` |
| Puerto backend | `11436` (configurable con `-BackendPort`) |
| Puerto frontend | `3000` (configurable con `-FrontendPort`) |
| Health check backend | `http://127.0.0.1:11436/health` |
| URL frontend | `http://127.0.0.1:3000` |
| Log dir | `%TEMP%\cajaapp-headless\` |
| State file | `%TEMP%\cajaapp-headless\state.json` |
| Backend stdout | `%TEMP%\cajaapp-headless\backend.log` |
| Backend stderr | `%TEMP%\cajaapp-headless\backend.err.log` |
| Frontend stdout | `%TEMP%\cajaapp-headless\frontend.log` |
| Frontend stderr | `%TEMP%\cajaapp-headless\frontend.err.log` |
| Node requerido | exacto `v24.18.0` en `I:\Tools\node-v24.18.0-win-x64\node.exe` |
| Respaldo SQLite | `%TEMP%\cajaapp-sqlite-backups\<timestamp>-dev.db` |

---

## 2. Modos del script

El script tiene **4 modos**. Sin parámetros corre Up.

| Modo | Comando | Para qué sirve | Exit codes |
|---|---|---|---|
| `Up` (default) | `.\cajaapp-headless-up.ps1` | **Mata todo `node.exe` del sistema**, valida Node, corre Prisma, compila si hace falta, arranca backend+frontend, espera health, escribe `state.json` y emite JSON. | `0` ok, `1` error |
| `-Status` | `.\cajaapp-headless-up.ps1 -Status` | Lee `state.json` y lo emite como JSON. No toca procesos. | `0` hay state, `3` no hay state |
| `-Stop` | `.\cajaapp-headless-up.ps1 -Stop` | Mata los PIDs del run previo (lee state.json o escanea puertos). Borra `state.json`. | `0` siempre |
| `-Restart` | `.\cajaapp-headless-up.ps1 -Restart` | `-Stop` y luego Up. | igual que Up |

**Otros switches:**

| Switch | Efecto |
|---|---|
| `-Rebuild` | Fuerza `npm run build` en backend y frontend aunque los artifacts existan |
| `-SkipMigrate` | Omite `prisma generate` y `prisma migrate deploy` |
| `-JsonOnly` | Suprime todo el progreso en consola; solo emite el JSON final |
| `-BackendPort N` | Override del puerto backend (default 11436) |
| `-FrontendPort N` | Override del puerto frontend (default 3000) |
| `-StartupTimeoutSeconds N` | Timeout de health check (default 180) |
| `-LogDir PATH` | Directorio de logs/state (default `%TEMP%\cajaapp-headless`) |
| `-StateFile PATH` | Archivo de state (default `LogDir\state.json`) |
| `-NodeHome PATH` | Carpeta con node.exe (default `I:\Tools\node-v24.18.0-win-x64`) |

---

## 3. Contrato del `state.json`

Después de un `Up` exitoso, `%TEMP%\cajaapp-headless\state.json` contiene:

```json
{
  "ok": true,
  "startedAt": "2026-07-12T10:34:45.1283916-03:00",
  "durationSeconds": 6.07,
  "node": {
    "version": "v24.18.0",
    "path": "I:\\Tools\\node-v24.18.0-win-x64\\node.exe"
  },
  "backend": {
    "pid": 2052,
    "port": 11436,
    "healthUrl": "http://127.0.0.1:11436/health",
    "apiBaseUrl": "http://127.0.0.1:11436",
    "logPath": "C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\backend.log",
    "errLogPath": "C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\backend.err.log",
    "readyAfterChecks": 1
  },
  "frontend": {
    "pid": 39132,
    "port": 3000,
    "url": "http://127.0.0.1:3000",
    "logPath": "C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\frontend.log",
    "errLogPath": "C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\frontend.err.log",
    "readyAfterChecks": 1
  },
  "stopHint": "Run with -Stop, or: taskkill /PID 2052 /T /F && taskkill /PID 39132 /T /F"
}
```

Si el script falló antes de completarse, **NO** escribe `state.json`. Lo que sí
queda es el JSON de error en stdout (con `"ok": false` y `"error": "..."`).

---

## 4. Patrón recomendado: fire-and-forget

**No** invocar el script con `&` directo si vas a hacer cualquier otra cosa
después. El script espera el health check de ambos servicios y bloquea.

```powershell
# Lanzar detached
$proc = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @(
        "-NoLogo",
        "-File", "I:\cajaApp-V3\cajaapp-headless-up.ps1",
        "-JsonOnly"
    ) `
    -WindowStyle Hidden `
    -RedirectStandardOutput "C:\Users\javie\AppData\Local\Temp\cajaapp-headless\agent-stdout.log" `
    -RedirectStandardError  "C:\Users\javie\AppData\Local\Temp\cajaapp-headless\agent-stderr.log"
```

`-JsonOnly` garantiza que el JSON final del script va a parar limpio a
`agent-stdout.log`, sin progreso de colorines mezclado.

**Comportamiento al iniciar (Up):** antes de cualquier otra cosa, el script
ejecuta `taskkill /IM node.exe /F` y espera 2 segundos. Esto:

- Mata **todos** los procesos `node.exe` del sistema sin verificar.
- En esta máquina solo CajaApp V3 usa Node, asi que es seguro.
- Libera handles sobre DLLs (Prisma, nativos, etc.) que pueden bloquear el
  `prisma generate` o el build.
- Elimina nodos huérfanos o zombies de runs anteriores que podrian tener
  ocupado el puerto 11436 o 3000.

El paso siguiente (defensa adicional) escanea los puertos y mata lo que
haya quedado, pero en la practica el `taskkill` ya limpia todo.

---

## 5. Polling de readiness

`state.json` se escribe **al final** de un `Up` exitoso. Mientras el script
está corriendo, no existe.

```powershell
$stateFile = Join-Path $env:TEMP "cajaapp-headless\state.json"

# Esperar a que aparezca
$timeout = 240   # segundos, holgado
$deadline = (Get-Date).AddSeconds($timeout)
while (-not (Test-Path -LiteralPath $stateFile)) {
    if ((Get-Date) -gt $deadline) {
        throw "El script tardo mas de $timeout s en crear $stateFile"
    }
    Start-Sleep -Seconds 1
}

# Leer y verificar ok
$state = Get-Content -Raw -LiteralPath $stateFile | ConvertFrom-Json
if (-not $state.ok) {
    throw "Up fallo: $($state.error). Ver logs en $stateFile"
}

# A partir de aca, los servicios estan listos
$backendBase  = $state.backend.apiBaseUrl     # http://127.0.0.1:11436
$frontendBase = $state.frontend.url          # http://127.0.0.1:3000
$backendHealth = $state.backend.healthUrl    # http://127.0.0.1:11436/health
```

El `readyAfterChecks` indica cuántos intentos de health check hubo que hacer.
Si es mayor a 1, el servicio arrancó lento pero se levantó bien. Si el script
tira timeout (`readyAfterChecks` no aparece porque el JSON nunca se escribió),
revisar `backend.log` y `backend.err.log`.

---

## 6. Detener el ecosistema

```powershell
# Sincronico (bloquea ~1-2s)
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop
# Exit 0 siempre, emite JSON con la lista de PIDs matados

# O detached
Start-Process powershell.exe `
    -ArgumentList @(
        "-NoLogo",
        "-File", "I:\cajaApp-V3\cajaapp-headless-up.ps1",
        "-Stop"
    ) `
    -WindowStyle Hidden
```

`-Stop` lee `state.json` y mata esos PIDs primero (método `state.json`). Si el
state no existe, escanea los puertos 11436 y 3000 y mata cualquier proceso que
escuche allí. Después borra el `state.json`.

---

## 7. Reiniciar

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Restart
# o con rebuild forzado
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Restart -Rebuild
```

`-Restart` es `-Stop` + `Up`. Útil cuando cambiaste código y querés que el
backend levante con el binario nuevo.

---

## 8. Comprobación rápida de que el agente está conectado al ecosistema

Después del polling de readiness, el agente puede verificar con un `GET` plano:

```powershell
# Backend health
$code = (Invoke-WebRequest -Uri $state.backend.healthUrl -UseBasicParsing).StatusCode
if ($code -ne 200) { throw "Backend no respondio 200: $code" }

# Frontend carga
$code = (Invoke-WebRequest -Uri $state.frontend.url -UseBasicParsing).StatusCode
if ($code -ne 200) { throw "Frontend no respondio 200: $code" }
```

A partir de ahí, el agente puede hacer requests HTTP a `$backendBase/api/...` o
navegar a `$frontendBase` con Playwright (si tiene esa capacidad).

---

## 9. Errores comunes y qué hacer

| Síntoma | Causa probable | Acción |
|---|---|---|
| Script aborta con "CajaApp V3 requiere Node.js v24.18.0..." | El `node.exe` que encuentra en PATH no es v24.18.0 | Verificar `where.exe node`; ajustar `-NodeHome` o el PATH del proceso padre |
| `state.json` nunca aparece | El script crasheó o se quedó sin timeout | Leer `agent-stderr.log` y los `*.err.log` de cada servicio |
| `readyAfterChecks` muy alto (>=30) | Servicio arrancó lento pero levantó | No es error. El log puede ayudar a entender por qué |
| Backend up pero endpoint X devuelve 500 | Bug en el código o falta migración | Mirar `backend.err.log` |
| `-Stop` dice "no habia procesos previos" | state.json borrado, puertos libres | OK, nada que limpiar |
| `-Stop` mata pero state.json queda | El kill no se completo a tiempo | Esperar y volver a correr, o `taskkill /F /IM node.exe` como salida de emergencia |
| Los 4 PIDs sumados no aparecen en `Get-Process node` | El ecosistema esta realmente caido | Re-correr `-Up` |

---

## 10. Lo que el agente **NO** debe hacer

- **NO** invocar `start-cajaapp.ps1`. Abre un browser con `Start-Process` al
  final, lo cual es bloqueante y deja una ventana de Explorer abierta.
- **NO** invocar `cajaapp-headless-up.ps1` con `&` si después vas a seguir
  trabajando. Usá `Start-Process` con `-WindowStyle Hidden` y polling.
- **NO** modificar `dev.db` ni correr `prisma db push`. El script usa
  `prisma:migrate:deploy`, que es no destructivo. Para datos de prueba,
  usar la API (`POST /api/movements/manual`, etc.) o el flag `-SkipMigrate`
  si ya sabés que el schema está al día.
- **NO** matar procesos de node indiscriminadamente con `taskkill /F /IM
  node.exe`. El usuario puede tener otros procesos node legítimos corriendo
  (sus propios dev servers). Usá solo los PIDs del `state.json`.
- **NO** parsear el log a mano para detectar readiness. Usá `state.json` y
  los URLs de health. El script ya hizo el polling.
- **NO** dejar el ecosistema levantado al terminar el agente. Siempre correr
  `-Stop` (sync o detached) en el cleanup.
- **NO** modificar el script sin avisar. Es la tool de inicialización
  compartida; un cambio afecta a todos los agentes.

---

## 11. Ejemplo end-to-end (PowerShell)

```powershell
$ErrorActionPreference = "Stop"
$Script = "I:\cajaApp-V3\cajaapp-headless-up.ps1"
$LogDir = Join-Path $env:TEMP "cajaapp-headless"
$StateFile = Join-Path $LogDir "state.json"
$AgentOut = Join-Path $LogDir "agent-stdout.log"
$AgentErr = Join-Path $LogDir "agent-stderr.log"

# 1) Asegurar piso limpio
if (Test-Path $StateFile) {
    & $Script -Stop | Out-Null
}

# 2) Lanzar detached
$null = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoLogo", "-File", $Script, "-JsonOnly") `
    -WindowStyle Hidden `
    -RedirectStandardOutput $AgentOut `
    -RedirectStandardError $AgentErr

# 3) Esperar state.json (timeout 240s)
$deadline = (Get-Date).AddSeconds(240)
while (-not (Test-Path -LiteralPath $StateFile)) {
    if ((Get-Date) -gt $deadline) {
        throw "Timeout esperando $StateFile. Ver $AgentErr"
    }
    Start-Sleep -Seconds 1
}

# 4) Verificar
$state = Get-Content -Raw -LiteralPath $StateFile | ConvertFrom-Json
if (-not $state.ok) { throw "Up fallo: $($state.error)" }
"Backend PID: $($state.backend.pid) -> $($state.backend.apiBaseUrl)"
"Frontend PID: $($state.frontend.pid) -> $($state.frontend.url)"

# 5) Hacer lo que tengas que hacer (Playwright, HTTP calls, etc.)
# ... tu logica de prueba aqui ...

# 6) Cleanup
& $Script -Stop | Out-Null
```

---

## 12. Mantenimiento

- Si cambian los puertos, la ruta de Node, o el nombre del script, este doc
  se desactualiza. Cualquier modificación al `cajaapp-headless-up.ps1` debe
  venir acompañada de un bump de versión en este doc.
- El script se versiona dentro de su propio header (no tiene `package.json`
  propio). Para drásticos cambios de contrato, bumpear este doc a `v2.x.x`
  y dejar el `v1.x.x` para toolchains que dependan del shape actual del JSON.
