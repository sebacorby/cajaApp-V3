# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA. Gate externo de Ollama PASS. E2E continúa PAUSADO.

## Gobierno vigente

La única instrucción activa es:

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-CJS-BUILD-REVALIDATION.md`

El agente no puede iniciar backend, frontend, Vitest, Playwright ni E2E hasta que este gate sea revisado por el arquitecto.

## Gate externo de Ollama

Aceptado como PASS con evidencia completa en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/ollama-external-gate/`

Verificado:

- `127.0.0.1:11434` operativo;
- modelo exacto `gemma4:31b-cloud` presente;
- `/api/show` HTTP 200;
- tres chats independientes `OLLAMA_OK`;
- JSON directo válido;
- CajaApp no fue iniciada durante el gate.

## Causa raíz del fallo de build

La corrección anterior de carga determinística de `.env` introdujo `import.meta.url` en `src/config/env.ts`.

El proyecto vigente compila como CommonJS porque `package.json` no declara `type: module`. Con `module: NodeNext`, TypeScript trató el archivo como CommonJS y rechazó `import.meta` con TS1470.

La arquitectura CommonJS es válida y no debe migrarse dentro de esta campaña.

## Corrección aplicada por el arquitecto

Archivo modificado:

- `workspace/backend/src/config/env.ts`

Cambio:

- eliminado `fileURLToPath(import.meta.url)`;
- eliminado el import de `node:url`;
- agregado `const moduleDirectory = __dirname;`;
- preservada la resolución `path.resolve(moduleDirectory, "../../.env")`.

Esto resuelve correctamente:

- desde source: `workspace/backend/src/config` → `workspace/backend/.env`;
- desde emit: `workspace/backend/dist/config` → `workspace/backend/.env`.

No se modificaron:

- `package.json`;
- `package-lock.json`;
- `tsconfig.json`;
- dependencias;
- contratos funcionales.

## Configuración Ollama vigente

- `AI_PROVIDER=ollama`;
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`;
- `OLLAMA_MODEL=gemma4:31b-cloud`;
- `AI_BASE_URL=http://127.0.0.1:11434/v1`;
- `AI_MODEL=gemma4:31b-cloud`;
- `OLLAMA_PREFLIGHT_ENABLED=true`.

## Backups

- `workspace/backend/src/config/env.ts.bak-20260722-cjs-fix` contiene la versión con `import.meta.url`;
- `workspace/backend/src/config/env.ts.bak-20260722-ollama-stability` contiene la versión previa al ajuste de Ollama.

No restaurar salvo decisión expresa del arquitecto.

## Gate actual

Revalidar únicamente:

- build TypeScript exit code 0;
- emit CommonJS válido;
- `dist/config/env.js` sin `import.meta`;
- `__dirname` presente;
- packages y tsconfig intactos;
- backend/frontend no iniciados.

Evidencia esperada:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/cjs-build-revalidation/`

Con PASS o FAIL, el agente debe detenerse. El siguiente gate de estabilidad runtime será emitido únicamente después de revisión del arquitecto.

Canonical sin promoción final. No abrir otro vertical.
