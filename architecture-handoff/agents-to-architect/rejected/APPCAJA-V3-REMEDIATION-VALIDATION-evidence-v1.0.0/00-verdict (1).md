# APPCAJA-V3-REMEDIATION-VALIDATION — Veredicto Preliminar

## Estado: BLOCKED (arranque del ecosistema)

## Fecha / Hora
2025-07-13

## Entorno
- Windows x64
- Root: `I:\cajaApp-V3`
- Node.js: `v24.18.0` (confirmado vía ejecución directa de `I:\Tools\node-v24.18.0-win-x64\node.exe`)

## Problema: Script de arranque falla

El script autorizado `cajaapp-headless-up.ps1` falla en el paso **"Validando entorno"** con el error:

```
ERROR: No se puede llamar a un método en una expresión con valor NULL.
```

### Root cause identificado
En `Assert-RequiredNodeVersion` (línea ~131 del script), el operador:

```powershell
$version = (& $preferredNode --version 2>&1).Trim()
```

devuelve `$null` en este entorno headless cuando PowerShell se ejecuta desde Git Bash / Bash tool. El ejecutable `node.exe` funciona correctamente (Python y Git Bash lo ejecutan y devuelven `v24.18.0`), pero PowerShell no captura su stdout en este contexto, por lo que `.Trim()` dispara la excepción.

### Pruebas realizadas
| Método | Resultado |
|--------|-----------|
| `& 'I:\Tools\node-v24.18.0-win-x64\node.exe' --version` desde PowerShell via Bash | `$null` (falla `.Trim()`) |
| `subprocess.run([node.exe, '--version'])` desde Python | `v24.18.0` ✅ |
| `I:/Tools/node-v24.18.0-win-x64/node.exe --version` desde Git Bash | `v24.18.0` ✅ |
| `cmd /c node.exe --version` | No captura salida ❌ |
| `powershell.exe -File cajaapp-headless-up.ps1 -JsonOnly` | Mismo error NULL ❌ |
| `powershell.exe -Command '& node.exe --version'` | `$null` ❌ |

### Resguardo SQLite
- Backup pre-campaña: `C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`
- Hash SHA-256: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`
- Tamaño: 5.357.568 bytes
- `dev.db` hash actual: **mismo hash** (ya está en estado limpio)
- Copia de resguardo limpio creada: `I:\cajaApp-V3\workspace\backend\prisma\dev.db.clean-backup`

### Conclusión
El entorno cumple con todos los requisitos (Node v24.18.0, SQLite limpio, backup disponible), pero **el script autorizado de arranque no puede ejecutarse en este entorno headless** debido a una incompatibilidad de captura de stdout entre PowerShell y `node.exe` cuando se invoca desde el Bash tool.

Dado que el documento de validación prohíbe:
- Modificar código / scripts / configuración
- Crear wrappers, `.bat`, `.cmd`, `.ps1` auxiliares
- Iniciar backend o frontend mediante comandos manuales

**No hay camino autorizado para levantar el ecosistema.**

### Recomendación
Se requiere una de las siguientes acciones para desbloquear:
1. Corregir `cajaapp-headless-up.ps1` para que capture la versión de Node de forma robusta en entornos headless (ej. usando `Start-Process -RedirectStandardOutput` o leyendo el archivo de versión directamente).
2. Autorizar explícitamente un workaround de arranque temporal para esta sesión de validación.
3. Ejecutar la validación en un entorno donde PowerShell sí pueda capturar stdout de `node.exe`.
