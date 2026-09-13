# APPCAJA-V3-GITHUB-PUBLISH-001
## Publicación inicial controlada de CajaApp V3 en GitHub

**Versión de la instrucción:** 1.0.0  
**Fecha:** 2026-07-13  
**Estado:** ISSUED  
**Tipo de tarea:** higiene de repositorio + publicación inicial  
**Repositorio local obligatorio:** `I:\cajaApp-V3`  
**Cuenta GitHub objetivo:** `sebacorby`  
**Repositorio GitHub objetivo:** `sebacorby/cajaapp-v3`  
**URL remota esperada:** `https://github.com/sebacorby/cajaapp-v3.git`  
**Visibilidad requerida:** `private`  
**Rama principal requerida:** `main`

---

## 1. Objetivo

Preparar el proyecto local `I:\cajaApp-V3` como repositorio Git limpio y publicar su código fuente en un repositorio privado de GitHub.

La publicación debe incluir únicamente código fuente, configuración reproducible, contratos, migraciones, documentación útil y archivos de lock necesarios.

No deben publicarse dependencias instaladas, builds, cachés, reportes, evidencias de ejecución, bases de datos locales, archivos temporales, logs, secretos, credenciales, documentos personales ni artefactos generados.

El agente debe ejecutar la tarea completa. El usuario no debe correr comandos manualmente.

---

## 2. Reglas obligatorias

1. Trabajar exclusivamente dentro de:

   ```text
   I:\cajaApp-V3
   ```

2. No modificar lógica funcional del backend ni del frontend.

3. Los únicos archivos nuevos o modificados permitidos por esta tarea son:

   - `.gitignore`
   - `.gitattributes`
   - `README.md`, únicamente si no existe y sólo como README mínimo de arranque
   - metadatos internos de Git dentro de `.git`
   - evidencia local dentro de la carpeta indicada en esta instrucción

4. No crear scripts auxiliares, wrappers, instaladores ni automatizaciones nuevas.

5. Usar herramientas nativas:

   - `git`
   - `gh`
   - PowerShell
   - comandos existentes del proyecto

6. No usar `git push --force`, `--force-with-lease`, rebase destructivo ni reescritura de historia.

7. No almacenar ni imprimir tokens, contraseñas o credenciales.

8. No modificar `.env` para completar la tarea.

9. No subir ningún `.env`, base SQLite local, archivo de secretos, PDF de usuario, evidencia de prueba, ZIP de entrega ni carpeta generada.

10. Si aparece un conflicto, un remoto inesperado, secretos reales, un archivo requerido mayor a 50 MB o un repositorio remoto no vacío con historia incompatible, detenerse y entregar estado `BLOCKED`. No improvisar.

---

## 3. Contenido que sí debe quedar versionado

Versionar, cuando exista:

- `workspace/backend/src/`
- `workspace/backend/prisma/migrations/`
- `workspace/backend/test/` y pruebas fuente
- `workspace/frontend/src/`
- `workspace/frontend/tests/`
- configuración de TypeScript, ESLint, Vite, NestJS, Prisma y Playwright
- `package.json`
- lockfiles del gestor usado por el proyecto
- `docs/`
- `contracts/`
- documentación Markdown de arquitectura
- scripts oficiales existentes del proyecto que sean necesarios para ejecutar la aplicación
- `.env.example` o archivos de ejemplo sin secretos
- assets fuente razonables usados realmente por la aplicación
- archivos de configuración reproducible

No versionar bases de datos generadas, uploads locales, archivos personales ni resultados de ejecución.

---

## 4. `.gitignore` obligatorio

Crear o actualizar `I:\cajaApp-V3\.gitignore`.

Conservar reglas útiles preexistentes y garantizar, como mínimo, las siguientes:

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Production and development builds
dist/
**/dist/
build/
**/build/
out/
**/out/
.next/
**/.next/
.nuxt/
**/.nuxt/
.vite/
**/.vite/
.turbo/
**/.turbo/
.cache/
**/.cache/
.parcel-cache/
**/.parcel-cache/

# TypeScript incremental state
*.tsbuildinfo

# Test and quality outputs
coverage/
**/coverage/
.nyc_output/
**/.nyc_output/
playwright-report/
**/playwright-report/
test-results/
**/test-results/
blob-report/
**/blob-report/
allure-results/
**/allure-results/
allure-report/
**/allure-report/
screenshots/
**/screenshots/

# Logs and runtime process files
logs/
**/logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
*.pid
*.pid.lock

# Environment files and secrets
.env
.env.*
**/.env
**/.env.*
!.env.example
!**/.env.example
!.env.template
!**/.env.template
!.env.sample
!**/.env.sample

# Local databases and database runtime files
*.db
*.db-journal
*.sqlite
*.sqlite3
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
**/prisma/dev.db
**/prisma/dev.db-journal

# Local uploads, exports, temporary files and backups
uploads/
**/uploads/
exports/
**/exports/
tmp/
**/tmp/
temp/
**/temp/
.backup/
**/.backup/
backups/
**/backups/
*.bak
*.tmp
*.temp

# Archives and generated deliveries
*.zip
*.7z
*.rar
*.tar
*.tar.gz
*.tgz
*.receipt.json
*.receipt.zip
*.sha256

# Agent/runtime working state and validation evidence
.agent/
architecture-handoff/agents-to-architect/
**/*-evidence-*/
**/*-evidence-*/**
evidence/
**/evidence/

# IDE and operating system noise
.vscode/
.idea/
*.iml
.DS_Store
Thumbs.db
desktop.ini
$RECYCLE.BIN/
*.swp
*.swo

# Local certificates and keys
*.pem
*.key
*.p12
*.pfx
*.crt
*.cer

# Miscellaneous generated files
.eslintcache
.stylelintcache
*.lcov
```

### Excepciones importantes

- No ignorar `workspace/backend/prisma/migrations/`.
- No ignorar archivos fuente de pruebas.
- No ignorar lockfiles.
- No ignorar `.env.example`, `.env.template` o `.env.sample`.
- No ignorar assets reales necesarios para ejecutar la interfaz.
- No borrar físicamente archivos ignorados sólo para publicar. Ignorarlos o retirarlos del índice Git es suficiente.
- Si un archivo ya estaba versionado y ahora debe ignorarse, usar `git rm --cached` sobre ese archivo o carpeta, sin borrarlo del disco.

---

## 5. `.gitattributes` obligatorio

Crear o actualizar `I:\cajaApp-V3\.gitattributes` con:

```gitattributes
* text=auto

*.sh text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.json text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.jsx text eol=lf
*.md text eol=lf

*.ps1 text eol=crlf
*.bat text eol=crlf
*.cmd text eol=crlf

*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.ico binary
*.pdf binary
```

No normalizar masivamente archivos existentes en esta tarea. El objetivo es fijar el comportamiento futuro, no generar un diff artificial enorme.

---

## 6. Preflight obligatorio

Ejecutar desde PowerShell:

```powershell
Set-Location 'I:\cajaApp-V3'
$ErrorActionPreference = 'Stop'

git --version
gh --version
gh auth status
```

Registrar las versiones y el resultado en evidencia.

Verificar:

```powershell
Get-Location
Test-Path 'I:\cajaApp-V3\workspace'
Test-Path 'I:\cajaApp-V3\workspace\backend'
Test-Path 'I:\cajaApp-V3\workspace\frontend'
```

Los tres `Test-Path` deben devolver `True`.

### Estado Git local

Ejecutar:

```powershell
git rev-parse --is-inside-work-tree
git remote -v
git status --short
git branch --show-current
```

Interpretación:

- Si todavía no existe `.git`, inicializar el repositorio.
- Si ya existe, preservar su historia.
- Si existe un remoto `origin` distinto de `https://github.com/sebacorby/cajaapp-v3.git` o su equivalente SSH, detenerse con `BLOCKED`.
- Si hay cambios locales preexistentes, documentarlos. No descartarlos ni resetearlos.
- No ejecutar `git clean`, `git reset --hard` ni comandos destructivos.

---

## 7. Auditoría previa de archivos

### 7.1 Archivos grandes

Listar archivos mayores a 20 MB:

```powershell
Get-ChildItem 'I:\cajaApp-V3' -Recurse -File -Force |
  Where-Object {
    $_.FullName -notmatch '\\.git\\' -and
    $_.Length -gt 20MB
  } |
  Sort-Object Length -Descending |
  Select-Object FullName, Length
```

Reglas:

- Ningún archivo generado, ZIP, PDF de usuario, base local, build o dependencia debe entrar al commit.
- Todo archivo mayor a 50 MB requiere revisión explícita.
- No configurar Git LFS sin autorización.
- Si un archivo mayor a 50 MB es indispensable para ejecutar el producto, detenerse con `BLOCKED` e informar.

### 7.2 Secretos y datos sensibles

Antes de agregar archivos, revisar al menos:

```powershell
Get-ChildItem 'I:\cajaApp-V3' -Recurse -File -Force |
  Where-Object {
    $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\.git\\|\\coverage\\'
  } |
  Select-String -Pattern `
    'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY',
    'ghp_[A-Za-z0-9]+',
    'github_pat_[A-Za-z0-9_]+',
    'sk-[A-Za-z0-9_-]{20,}',
    'OLLAMA_API_KEY\s*=\s*.+',
    'DATABASE_URL\s*=\s*.+',
    'JWT_SECRET\s*=\s*.+',
    'API_KEY\s*=\s*.+' `
  -CaseSensitive:$false
```

No copiar el valor de un secreto a la evidencia.

Clasificar cada coincidencia:

- ejemplo ficticio y seguro;
- referencia documental;
- secreto real.

Si existe un secreto real en un archivo que sería versionado:

1. no agregar el archivo;
2. no publicar;
3. entregar `BLOCKED`;
4. informar únicamente la ruta y el tipo de secreto, nunca el valor.

---

## 8. Inicialización y preparación Git

### 8.1 Inicializar sólo cuando sea necesario

```powershell
Set-Location 'I:\cajaApp-V3'

if (-not (Test-Path '.git')) {
  git init
}

git branch -M main
```

Configurar identidad sólo si Git no tiene una identidad válida:

```powershell
git config user.name
git config user.email
```

Si faltan ambos valores, usar:

```powershell
git config user.name 'Javier Corbella'
git config user.email 'javier.s.corbella@gmail.com'
```

Aplicar la configuración únicamente al repositorio local, no globalmente.

### 8.2 Preparar el índice

Después de crear o actualizar `.gitignore` y `.gitattributes`:

```powershell
git add .gitignore .gitattributes
git add -A
git status --short
```

No hacer commit todavía.

---

## 9. Gate de limpieza del índice

El agente debe demostrar que el índice no contiene basura.

### 9.1 Ver archivos staged

```powershell
git diff --cached --name-status
git diff --cached --stat
```

### 9.2 Buscar rutas prohibidas

```powershell
$tracked = git diff --cached --name-only

$forbiddenPatterns = @(
  '(^|/)node_modules/',
  '(^|/)dist/',
  '(^|/)build/',
  '(^|/)coverage/',
  '(^|/)playwright-report/',
  '(^|/)test-results/',
  '(^|/)blob-report/',
  '(^|/)\.next/',
  '(^|/)\.vite/',
  '(^|/)\.turbo/',
  '(^|/)\.cache/',
  '(^|/)uploads/',
  '(^|/)tmp/',
  '(^|/)temp/',
  '(^|/)logs/',
  '(^|/)\.agent/',
  '(^|/)architecture-handoff/agents-to-architect/',
  '(^|/)\.env($|\.)',
  '\.(db|sqlite|sqlite3|log|zip|7z|rar|tgz|bak|tmp)$'
)

$forbidden = foreach ($path in $tracked) {
  foreach ($pattern in $forbiddenPatterns) {
    if ($path -match $pattern) {
      $path
      break
    }
  }
}

$forbidden | Sort-Object -Unique
```

El resultado debe estar vacío.

Si no está vacío:

- retirar las rutas del índice con `git rm --cached`;
- mejorar `.gitignore`;
- volver a ejecutar el gate;
- no borrar los archivos locales.

### 9.3 Comprobar archivos de entorno

```powershell
git diff --cached --name-only |
  Where-Object {
    $_ -match '(^|/)\.env($|\.)' -and
    $_ -notmatch '\.env\.(example|template|sample)$'
  }
```

El resultado debe estar vacío.

### 9.4 Comprobar bases locales

```powershell
git diff --cached --name-only |
  Where-Object {
    $_ -match '\.(db|sqlite|sqlite3)$'
  }
```

El resultado debe estar vacío.

### 9.5 Comprobar archivos mayores a 50 MB en staged

```powershell
$stagedFiles = git diff --cached --name-only --diff-filter=ACMR

foreach ($relativePath in $stagedFiles) {
  $absolutePath = Join-Path 'I:\cajaApp-V3' $relativePath
  if (Test-Path $absolutePath) {
    $item = Get-Item $absolutePath
    if ($item.Length -gt 50MB) {
      [PSCustomObject]@{
        Path = $relativePath
        SizeBytes = $item.Length
      }
    }
  }
}
```

El resultado debe estar vacío.

---

## 10. Validaciones mínimas antes del commit

No instalar dependencias nuevas para esta tarea.

Ejecutar los comandos usando los scripts existentes de cada proyecto.

### Backend

```powershell
Set-Location 'I:\cajaApp-V3\workspace\backend'
npm run build
npm test
```

### Frontend

```powershell
Set-Location 'I:\cajaApp-V3\workspace\frontend'
npm run typecheck
npm run lint
npm run build
```

Si un script no existe, registrar el hecho y utilizar el equivalente ya definido en el `package.json`. No inventar wrappers.

Si una validación falla:

- no ocultar el error;
- no modificar lógica funcional;
- entregar `FAIL`;
- no publicar un commit que se presente como validado.

---

## 11. Commit inicial

Volver al root:

```powershell
Set-Location 'I:\cajaApp-V3'
git status --short
```

Crear el commit sólo después de que todos los gates anteriores estén correctos:

```powershell
git commit -m "chore: initialize CajaApp V3 repository"
```

Si el repositorio ya posee historia y el commit representa sólo la preparación para GitHub, usar:

```powershell
git commit -m "chore: prepare repository for GitHub"
```

No hacer commits vacíos.

Registrar:

```powershell
git log -1 --oneline
git status --short
```

Después del commit, `git status --short` debe quedar vacío, salvo archivos locales correctamente ignorados.

---

## 12. Crear o validar el repositorio remoto

Consultar:

```powershell
gh repo view sebacorby/cajaapp-v3
```

### Caso A: el repositorio no existe

Crear un repositorio privado:

```powershell
gh repo create sebacorby/cajaapp-v3 `
  --private `
  --description 'CajaApp V3 - gestión personal de finanzas con extracción documental asistida por IA'
```

No usar `--add-readme`, porque el código y la historia local son la fuente inicial.

### Caso B: el repositorio existe y está vacío

Continuar.

### Caso C: el repositorio existe y tiene commits

Ejecutar:

```powershell
gh repo view sebacorby/cajaapp-v3 --json nameWithOwner,isPrivate,defaultBranchRef,url
git ls-remote https://github.com/sebacorby/cajaapp-v3.git
```

Si hay historia remota:

- no sobrescribir;
- no hacer force push;
- no crear merge de historias no relacionadas;
- entregar `BLOCKED` con el estado exacto.

El repositorio debe ser privado. Si aparece público, detenerse con `BLOCKED`.

---

## 13. Configurar el remoto

Verificar remotos:

```powershell
Set-Location 'I:\cajaApp-V3'
git remote -v
```

Si `origin` no existe:

```powershell
git remote add origin https://github.com/sebacorby/cajaapp-v3.git
```

Si `origin` existe y apunta al repositorio esperado, conservarlo.

Si `origin` apunta a otro repositorio, detenerse con `BLOCKED`.

Verificar:

```powershell
git remote get-url origin
```

El resultado debe ser uno de estos equivalentes:

```text
https://github.com/sebacorby/cajaapp-v3.git
git@github.com:sebacorby/cajaapp-v3.git
```

---

## 14. Publicación

Publicar sin forzar:

```powershell
git push -u origin main
```

No usar:

```text
git push --force
git push --force-with-lease
```

---

## 15. Verificación remota obligatoria

Después del push:

```powershell
gh repo view sebacorby/cajaapp-v3 `
  --json nameWithOwner,isPrivate,defaultBranchRef,url

git ls-remote --heads origin main
git rev-parse HEAD
git status --short
```

El SHA local de `HEAD` debe coincidir con el SHA remoto de `refs/heads/main`.

Comprobar además que GitHub no recibió rutas prohibidas:

```powershell
$forbiddenRemote = git ls-tree -r --name-only HEAD |
  Where-Object {
    $_ -match '(^|/)(node_modules|dist|build|coverage|playwright-report|test-results|blob-report|\.next|\.vite|\.turbo|\.cache|uploads|tmp|temp|logs|\.agent)/' -or
    $_ -match '(^|/)\.env($|\.)' -or
    $_ -match '\.(db|sqlite|sqlite3|log|zip|7z|rar|tgz|bak|tmp)$'
  }

$forbiddenRemote
```

El resultado debe estar vacío.

Verificar que sí estén presentes archivos esenciales:

```powershell
$requiredCandidates = @(
  'workspace/backend/package.json',
  'workspace/frontend/package.json',
  '.gitignore',
  '.gitattributes'
)

foreach ($path in $requiredCandidates) {
  [PSCustomObject]@{
    Path = $path
    Tracked = [bool](git ls-files --error-unmatch $path 2>$null)
  }
}
```

Los cuatro deben figurar como `Tracked = True`.

---

## 16. Evidencia obligatoria

Crear localmente:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-GITHUB-PUBLISH-evidence-v1.0.0
```

Esta carpeta debe permanecer ignorada por Git y no debe subirse al repositorio.

Guardar, como mínimo:

```text
00-executive-summary.md
01-environment.txt
02-git-status-before.txt
03-large-files-audit.txt
04-secret-scan-summary.md
05-staged-files.txt
06-forbidden-files-gate.txt
07-backend-validation.txt
08-frontend-validation.txt
09-commit.txt
10-remote-repository.txt
11-push.txt
12-remote-verification.txt
13-final-git-status.txt
```

### Reglas para la evidencia

- No copiar secretos.
- No copiar contenido completo de `.env`.
- No adjuntar `node_modules`, builds ni bases de datos.
- No crear ZIP salvo solicitud posterior expresa.
- Registrar comandos, código de salida y resultado.
- Incluir el SHA final del commit.
- Incluir la URL final del repositorio.
- Incluir la cantidad total de archivos versionados.
- Incluir confirmación de que el repositorio es privado.
- Incluir confirmación de que el gate de archivos prohibidos quedó vacío.

---

## 17. Resultado final

Entregar uno de estos estados:

### `PASS`

Sólo cuando:

- el repositorio privado `sebacorby/cajaapp-v3` existe;
- `main` fue publicada sin force push;
- el SHA local y remoto coinciden;
- no existen secretos detectados en archivos versionados;
- no se publicaron builds, dependencias, cachés, logs, bases locales, evidencias ni archivos temporales;
- backend y frontend completaron las validaciones mínimas;
- la evidencia quedó en la carpeta local indicada.

### `FAIL`

Cuando la preparación o alguna validación técnica falla por un problema reproducible del proyecto.

### `BLOCKED`

Cuando:

- `gh` no está autenticado;
- faltan permisos para crear o publicar el repositorio;
- el remoto existe con historia incompatible;
- el remoto es público;
- existe un secreto real en contenido versionable;
- existe un archivo imprescindible mayor a 50 MB;
- el remoto configurado no es el esperado;
- completar la tarea requeriría una decisión humana.

---

## 18. Resumen obligatorio del agente

El mensaje final debe indicar:

```text
Estado: PASS | FAIL | BLOCKED
Repositorio local: I:\cajaApp-V3
Repositorio remoto: https://github.com/sebacorby/cajaapp-v3
Visibilidad: private
Rama publicada: main
Commit SHA:
Cantidad de archivos versionados:
Validación backend:
Validación frontend:
Gate de secretos:
Gate de archivos prohibidos:
Ubicación de evidencia:
Pendientes reales:
```

No declarar `PASS` sin verificar el repositorio remoto y la coincidencia de SHA.
