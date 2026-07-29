# APPCAJA-V3 — VALIDACIÓN DE BUILD SOLAMENTE

**Versión:** 1.0.1  
**Estado:** vigente  
**Reemplaza:** cualquier instrucción de build que exija una versión distinta de Node.js  
**Proyecto:** CajaApp V3  
**Root:** `I:\cajaApp-V3`

---

## 1. Objetivo único

Validar exclusivamente que el backend y el frontend actuales de CajaApp V3 pueden instalar sus dependencias reproducibles y completar sus builds en el entorno local real.

Esta tarea no incluye migraciones, tests, lint, Playwright, smoke, UAT ni ejecución de servidores.

El agente no está autorizado a corregir errores ni modificar archivos del proyecto.

---

## 2. Entorno obligatorio exacto

- Sistema operativo: Windows x64.
- Shell: PowerShell.
- Distribución obligatoria: `node-v24.18.0-win-x64`.
- Versión exacta requerida por `node --version`: `v24.18.0`.
- Ruta esperada del binario:

```text
I:\Tools\node-v24.18.0-win-x64\node.exe
```

No alcanza con usar cualquier versión `v24.x`. El gate exige exactamente `v24.18.0`.

No utilizar ninguna versión distinta de `v24.18.0`, ni Bun, WSL, Linux o Docker.

---

## 3. Regla absoluta de no modificación

El agente puede únicamente:

1. seleccionar la instalación exacta de Node para el proceso actual de PowerShell;
2. consultar versiones y rutas;
3. ejecutar `npm ci`;
4. ejecutar `npm run prisma:generate` en backend;
5. ejecutar los dos builds;
6. capturar la salida;
7. crear el reporte final en `pending-validation`.

El agente no puede:

- editar código, configuración, schemas, migraciones, tests o documentación;
- cambiar `package.json` o `package-lock.json`;
- ejecutar `npm install`;
- actualizar dependencias;
- aplicar migraciones o ejecutar `prisma db push`;
- ejecutar tests, lint o Playwright;
- iniciar backend o frontend;
- crear wrappers, scripts auxiliares, `.bat`, `.cmd` o JavaScript de prueba;
- modificar `APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`;
- intentar remediar un error.

Si un comando falla, registrar el error completo y continuar solamente cuando el paso siguiente no dependa del que falló. Nunca corregir el proyecto.

---

## 4. Selección y verificación de Node.js

Abrir una nueva consola PowerShell y ejecutar exactamente:

```powershell
$NodeHome = "I:\Tools\node-v24.18.0-win-x64"

if (-not (Test-Path -LiteralPath "$NodeHome\node.exe" -PathType Leaf)) {
    throw "No se encontró el binario obligatorio: $NodeHome\node.exe"
}

$env:Path = "$NodeHome;$env:Path"

Set-Location -LiteralPath "I:\cajaApp-V3"

where.exe node
where.exe npm
node --version
npm --version
node -p "process.platform + ' ' + process.arch + ' node-v' + process.versions.node"
```

### Gate obligatorio

La salida de:

```powershell
node --version
```

debe ser exactamente:

```text
v24.18.0
```

Además, la primera ruta devuelta por `where.exe node` debe ser:

```text
I:\Tools\node-v24.18.0-win-x64\node.exe
```

Si cualquiera de estas condiciones falla:

- resultado global: `BLOCKED`;
- no ejecutar `npm ci` ni builds;
- registrar versión y rutas encontradas;
- finalizar sin modificar nada.

---

## 5. Build del backend

Ubicación:

```text
I:\cajaApp-V3\workspace\backend
```

Ejecutar:

```powershell
Set-Location -LiteralPath "I:\cajaApp-V3\workspace\backend"

npm ci
if ($LASTEXITCODE -ne 0) { throw "BACKEND npm ci falló con código $LASTEXITCODE" }

npm run prisma:generate
if ($LASTEXITCODE -ne 0) { throw "BACKEND prisma:generate falló con código $LASTEXITCODE" }

npm run build
$BackendBuildExitCode = $LASTEXITCODE
```

Registrar por separado:

- salida de `npm ci`;
- salida de `npm run prisma:generate`;
- salida completa de `npm run build`;
- código de salida del build;
- warnings;
- errores TypeScript o de resolución de módulos.

Resultado:

```text
BACKEND BUILD: PASS
```

solamente si `npm run build` termina con código `0`.

En cualquier otro caso:

```text
BACKEND BUILD: FAIL
```

No corregir el error.

---

## 6. Build del frontend

Ubicación:

```text
I:\cajaApp-V3\workspace\frontend
```

Ejecutar:

```powershell
Set-Location -LiteralPath "I:\cajaApp-V3\workspace\frontend"

npm ci
if ($LASTEXITCODE -ne 0) { throw "FRONTEND npm ci falló con código $LASTEXITCODE" }

npm run build
$FrontendBuildExitCode = $LASTEXITCODE
```

Registrar:

- salida de `npm ci`;
- salida completa de `npm run build`;
- código de salida;
- warnings;
- errores de Next.js;
- errores TypeScript;
- errores de resolución de módulos o assets.

Resultado:

```text
FRONTEND BUILD: PASS
```

solamente si `npm run build` termina con código `0`.

En cualquier otro caso:

```text
FRONTEND BUILD: FAIL
```

No corregir el error.

---

## 7. Control de integridad

No modificar intencionalmente ninguno de estos archivos:

```text
workspace/backend/src/**
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/**
workspace/backend/package.json
workspace/backend/package-lock.json

workspace/frontend/src/**
workspace/frontend/tests/**
workspace/frontend/package.json
workspace/frontend/package-lock.json

docs/**
architecture-handoff/architect-to-agents/**
start-cajaapp.ps1
```

Son aceptables únicamente artifacts producidos naturalmente por instalación o build:

```text
node_modules/
dist/
.next/
tsconfig.tsbuildinfo
```

No limpiar ni borrar artifacts durante esta tarea.

---

## 8. Resultado global

### PASS

Solamente cuando se cumpla todo:

```text
Node.js exacto v24.18.0: PASS
Ruta exacta del node.exe: PASS
Backend npm ci: PASS
Backend prisma:generate: PASS
Backend build: PASS
Frontend npm ci: PASS
Frontend build: PASS
Archivos gobernados sin modificaciones intencionales: PASS
```

### FAIL

Cuando el entorno exacto es correcto, pero al menos uno de los builds falla.

### BLOCKED

Cuando:

- Node no es exactamente `v24.18.0`;
- la primera ruta de Node no corresponde a `node-v24.18.0-win-x64`;
- falta acceso al proyecto;
- faltan permisos;
- `npm ci` o `prisma:generate` no pueden ejecutarse por un problema ambiental que impide llegar al build.

No convertir un `FAIL` o `BLOCKED` en `PASS` mediante cambios locales.

---

## 9. Entregable único

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-BUILD-VALIDATION-ONLY-result-v1.0.1.md
```

No crear ZIP.

El reporte debe usar esta estructura:

```markdown
# APPCAJA-V3 — Resultado de validación de build v1.0.1

## Resultado global

PASS | FAIL | BLOCKED

## Entorno

- Sistema operativo:
- Arquitectura:
- Node.js:
- Ruta efectiva de node.exe:
- npm:
- Root:
- Fecha y hora:

## Backend

- npm ci:
- prisma:generate:
- npm run build:
- código de salida:
- warnings:
- errores:

## Frontend

- npm ci:
- npm run build:
- código de salida:
- warnings:
- errores:

## Integridad

- archivos gobernados modificados intencionalmente: sí/no
- artifacts generados:
- observaciones:

## Conclusión

Indicar claramente si ambos builds son válidos.

## Evidencia completa

Incluir la salida relevante de todos los comandos, sin ocultar errores.
```

---

## 10. Cierre

La versión `v1.0.0` del resultado quedó basada en un gate obsoleto y no debe utilizarse para evaluar el proyecto.

Esta versión `v1.0.1` es la única instrucción vigente para validar el build.
