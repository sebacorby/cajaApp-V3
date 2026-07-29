# APPCAJA-V3 — APP-AI-UX-STABILITY-001 v1.0.3-R2.1

## Gate activo: CJS BUILD REVALIDATION

La única tarea autorizada es revalidar el build CommonJS después de la corrección de `src/config/env.ts`.

## Contexto

El error TS1470 fue introducido por `import.meta.url` en un proyecto que, por diseño vigente, compila como CommonJS porque `package.json` no declara `type: module`.

El arquitecto corrigió `env.ts` para usar:

```ts
const moduleDirectory = __dirname;
```

No se modificaron `package.json`, `package-lock.json` ni `tsconfig.json`.

## Prohibido

- modificar archivos;
- agregar `type: module`;
- cambiar `tsconfig.json`;
- instalar dependencias;
- iniciar backend o frontend;
- ejecutar Vitest, Playwright o E2E;
- usar npm/npx si puede invocarse la herramienta local directamente;
- continuar después del gate, incluso con PASS.

## Entorno

Backend:

`C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\workspace\backend`

Node:

`I:\Tools\node-v24.18.0-win-x64\node.exe`

## Paso 1 — Preflight

Confirmar:

- `src/config/env.ts` no contiene `import.meta` ni `fileURLToPath`;
- contiene `const moduleDirectory = __dirname;`;
- `package.json` no contiene `type: module`;
- hashes de `package.json`, `package-lock.json` y `tsconfig.json` antes del build.

## Paso 2 — Build

Desde `workspace/backend` ejecutar exactamente:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\node.exe" `
  ".\node_modules\typescript\bin\tsc" `
  -p ".\tsconfig.json"
```

PASS requiere exit code 0 y cero errores TypeScript.

## Paso 3 — Inspección del emit

Verificar `dist/config/env.js`:

- existe y fue actualizado;
- es CommonJS;
- puede contener `"use strict"`, `exports` y `require`;
- contiene `__dirname`;
- no contiene `import.meta` ni `fileURLToPath`;
- resuelve `../../.env` desde `dist/config`, cuyo resultado debe ser `workspace/backend/.env`.

Verificar también `dist/main.js` actualizado y compatible con CommonJS.

No ejecutar `dist/main.js` todavía.

## Paso 4 — Invariantes

Confirmar después del build:

- `package.json` sin cambios;
- `package-lock.json` sin cambios;
- `tsconfig.json` sin cambios;
- ningún proceso backend/frontend iniciado;
- puertos 11436 y 11437 libres.

## Evidencia

Sincronizar en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/cjs-build-revalidation/`

Archivos mínimos:

- `CJS-BUILD-PREFLIGHT.json`
- `CJS-BUILD-RESULT.json`
- `CJS-EMIT-INSPECTION.json`
- `CJS-BUILD-INVARIANTS.json`
- `tsc.stdout.log`
- `tsc.stderr.log`

## Veredicto

PASS sólo si el build termina en 0, el emit es CommonJS válido, no existe `import.meta` y los archivos de configuración/packages permanecen intactos.

Con PASS o FAIL, detenerse y devolver evidencia. No iniciar CajaApp ni retomar E2E.
