<!-- Sync Impact Report (scratch, remove before commit):
- Version change: unversioned template → 1.0.0 (initial ratification)
- Principles: [PRINCIPLE_1..5] placeholders → I. Reconstrucción limpia brownfield;
  II. Contract-first e importación determinista; III. Local-first, privacidad y
  secretos; IV. Gates de calidad no negociables; V. Simplicidad operativa Windows
- Added sections: Restricciones técnicas y de stack; Flujo de desarrollo y
  gobierno de evidencia (replacing [SECTION_2/3] slots)
- Removed sections: none (all template slots replaced, no content deleted)
- TODOs: none deferred; RATIFICATION_DATE set to initial adoption 2026-09-11
-->

# CajaApp V3 Constitution

## Core Principles

### I. Reconstrucción limpia brownfield

No se copia código desde V2. Todo el código fuente vive en `workspace/`
(`backend/`, `frontend/`, `shared/`); `docs/` contiene documentación viva,
`contracts/` los artefactos contractuales y `architecture-handoff/` el
intercambio arquitecto-agentes. Los agentes MUST NOT modificar código, tests,
migraciones, dependencias, configuración ni SQLite fuera de una instrucción
vigente que enumere archivos exactos. Están prohibidos los wrappers de
arranque, los archivos con sufijos `(1)`/`copy` y los bundles en lint.

### II. Contract-first e importación determinista por borrador

`contracts/schemas/` y `contracts/prompts/` son la autoridad de la extracción
IA y MUST NOT cambiar sin el arquitecto. El PDF se convierte a RAW solo vía
`workspace/backend/python/pdf_to_raw.py` (pdfplumber). El flujo es
import → draft (`imported`/`preview_ready`) → edición → `accept`, que
materializa las entidades aceptadas. No hay fallbacks silenciosos entre
providers. Cada extracción AI MUST registrar `AiExtractionRun` trazable
(prompt hash + modelo). Los duplicados se bloquean por SHA del documento.
La IA documental solo extrae a JSON normalizado; el Asesor IA explica con
citas y guardrails, y MUST NOT calcular, gobernar, mutar ni decidir.

### III. Local-first, privacidad y secretos

La persistencia es SQLite local (`dev.db` por app) con storage local y
`PRAGMA integrity_check` limpio en cada gate. `hideAmounts` MUST estar
conectado de punta a punta (backend, contrato, Settings, componente `Amount`).
Los secretos (`.env*`, `*.pem/key/p12/pfx`, `.diagnostics/*.ollama-request.json`)
MUST NOT commitearse. El runtime Python vive en
`%LOCALAPPDATA%\CajaAppV3\runtime\python\.venv` y se valida por hash de
`requirements.txt`. Node.js exacto `v24.18.0` en backend y frontend.

### IV. Gates de calidad no negociables

Backend MUST pasar `build` + `tsc` + `vitest run` + `prisma
generate/deploy/status` con integridad SQLite verificada. Frontend MUST pasar
`typecheck` + `lint` + `build` standalone. E2E Playwright corre con
`workers:1`, `retries:0`, sin skips ni filtros, más smoke API en rutas
canónicas y restauración de `dev.db` al hash exacto pre-campaña. El veredicto
solo admite PASS / FAIL / BLOCKED, y cualquier defecto es FAIL. `npm audit
fix` MUST NOT ejecutarse dentro de un gate funcional.

### V. Simplicidad operativa Windows

Windows x64 es la única plataforma soportada. El arranque headless usa
PowerShell directo (`cajaapp-headless-up.ps1`, scripts
`.specify/scripts/powershell/`), sin wrappers. Puertos fijos: backend
`127.0.0.1:11436`, frontend `11437`, Ollama `11434`. Los timeouts MUST
respetar el orden provider (420s) < job (480s) < stale (600s), poll 2s.
`MAX_UPLOAD_BYTES` es 10MB. Solo un bloque activo por vez; la deuda de
infraestructura (p. ej. falta de créditos del modelo cloud) se declara
BLOCKED y MUST NOT disfrazarse de defecto de código.

## Restricciones técnicas y de stack

Backend: Fastify 5 + Prisma 6 + Zod + Pino + TypeScript 5.7 + Vitest 3 +
Python `pdfplumber==0.11.10`. Frontend: Next.js 16 (`output:standalone`,
`reactStrictMode:false`) + React 19 + Tailwind 4 + shadcn `new-york` +
Radix + TanStack Query/Table + Zustand + react-hook-form + Recharts.

Providers IA admitidos: `ollama` | `openai-compatible`
(`OLLAMA_MODE=local-proxy`, modelo `kimi-k2.7-code:cloud`,
`OLLAMA_BASE_URL=http://localhost:11434`). `AI_MAX_OUTPUT_TOKENS=32768`,
`AI_TEMPERATURE=0`. `DATABASE_URL=file:./dev.db`,
`STORAGE_DIR=./storage`. Los lockfiles (`package-lock.json`) MUST
permanecer intactos en cada campaña y todos los servicios MUST detenerse al
cierre, sin procesos ni puertos residuales.

## Flujo de desarrollo y gobierno de evidencia

El SSOT (`docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`) es la
única autoridad de estado, alcance, prioridades, gates y aceptación. Solo el
arquitecto modifica el SSOT, implementa o remedia código, decide prioridades
y acepta o rechaza evidencia. Los agentes validan y producen evidencia; la
aceptada se mueve físicamente a `accepted` y la rechazada a `rejected`.
Nunca se abre otro vertical con un bloque activo. Las campañas terminan con
veredicto explícito PASS / FAIL / BLOCKED y evidencia nueva, única y no
reutilizada.

## Governance

Esta constitución prevalece sobre cualquier otra práctica del proyecto. Las
enmiendas requieren documentación del cambio, aprobación del arquitecto y
plan de migración; se versionan con semver (MAJOR: redefinición o retiro
incompatible de principios; MINOR: principio o sección nueva o guía
materialmente ampliada; PATCH: clarificaciones y redacción). Cada PR y gate
MUST verificar el cumplimiento de los principios I–V y las restricciones de
stack. La guía operativa vigente es el SSOT citado arriba.

**Version**: 1.0.0 | **Ratified**: 2026-09-11 | **Last Amended**: 2026-09-11
