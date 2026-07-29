# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA, con E2E PAUSADO por gate externo de Ollama.

## Decisión de gobierno vigente

La ejecución E2E manual serial queda suspendida hasta demostrar que Ollama responde correctamente por fuera de la API de CajaApp.

La única instrucción activa es:

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-OLLAMA-EXTERNAL-GATE.md`

La instrucción E2E serial fue preservada en `superseded` y no puede reactivarse por decisión del agente.

## Causa raíz corregida en el repo

Se encontraron tres desalineaciones:

1. el backend abría `127.0.0.1:11436` antes de validar Ollama; si el modelo no existía, el preflight fallaba después del listen y apagaba el proceso mientras E2E ya lo consideraba disponible;
2. `.env` y `.env.candidate` apuntaban a `127.0.0.1:11435` y al modelo `kimi-k2.7-code:cloud`;
3. `dotenv.config()` dependía del working directory, por lo que un lanzamiento desde otra carpeta podía ignorar el `.env` del backend y usar defaults antiguos.

## Parche aplicado directamente

Archivos activos modificados:

- `workspace/backend/src/main.ts`;
- `workspace/backend/src/config/env.ts`;
- `workspace/backend/.env`;
- `workspace/backend/.env.candidate`.

Configuración efectiva requerida:

- `AI_PROVIDER=ollama`;
- `OLLAMA_MODE=local-proxy`;
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`;
- `OLLAMA_MODEL=gemma4:31b-cloud`;
- `AI_BASE_URL=http://127.0.0.1:11434/v1`;
- `AI_MODEL=gemma4:31b-cloud`;
- `OLLAMA_PREFLIGHT_ENABLED=true`.

Comportamiento nuevo:

- el preflight de Ollama se ejecuta antes de conectar DB y antes de abrir el puerto HTTP;
- un modelo inexistente ya no puede dejar un backend aparentemente sano que muere segundos después;
- la carga de `.env` se resuelve desde la ubicación del módulo y no desde el working directory;
- `CAJAAPP_ENV_FILE` permite elegir explícitamente `.env.candidate` sin depender del cwd;
- shutdown del backend es idempotente y registra fallos de cleanup sin duplicar cierres.

## Backups de rollback

- `workspace/backend/src/main.ts.bak-20260722-ollama-stability`;
- `workspace/backend/src/config/env.ts.bak-20260722-ollama-stability`;
- `workspace/backend/.env.bak-20260722-ollama-stability`;
- `workspace/backend/.env.candidate.bak-20260722-ollama-stability`.

No restaurar salvo decisión del arquitecto.

## Gate externo obligatorio

Antes de volver a iniciar CajaApp debe demostrarse directamente contra `http://127.0.0.1:11434`:

- `/api/tags` HTTP 200 y modelo exacto presente;
- `/api/show` HTTP 200;
- tres respuestas independientes con contenido exacto `OLLAMA_OK`;
- una respuesta JSON válida y exacta;
- evidencia completa sincronizada en Dropbox;
- confirmación de que backend, frontend y E2E no fueron iniciados durante el gate.

Evidencia esperada:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/ollama-external-gate/`

## Estado posterior al gate

- FAIL: mantener E2E pausado y reportar causa exacta.
- PASS: detenerse y entregar evidencia al arquitecto.
- El agente no puede iniciar backend, frontend o tests después del PASS hasta recibir una nueva instrucción emitida por el arquitecto.

## Gates previamente validados

- backend focal 32/32 PASS;
- backend completo 175/175 PASS;
- backend build PASS previo al parche;
- frontend typecheck, lint y build PASS;
- SQLite descartada como causa raíz mediante DBs aisladas y 5/5 updates.

Estos resultados no sustituyen la validación posterior del parche. La revalidación de build/backend y los E2E se ordenará únicamente después del PASS del gate externo.

Canonical de producto permanece sin promoción final. No abrir otro vertical.
