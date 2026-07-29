\# APPCAJA-V3-BE-011 — Implementación y validación del conector nativo de Ollama

\#\# Estado

IMPLEMENTACIÓN DE CÓDIGO PREPARADA. REQUIERE APLICACIÓN SOBRE LOS ARCHIVOS RAW DEL WORKSPACE Y VALIDACIÓN LOCAL POR EL AGENTE.

La revisión confirmó que el backend sí llega a Ollama, pero el cliente actual usa \`stream: false\` y espera una respuesta única. Con \`kimi-k2.7-code:cloud\`, varias ejecuciones fallan alrededor de 307–309 segundos por el timeout de headers del transporte HTTP.

\#\# Arquitectura implementada en el patch

\- \`OllamaNativeClient\` separado de \`OpenAICompatibleClient\`.  
\- Selección explícita mediante \`AI\_PROVIDER\`.  
\- Ollama usa \`POST /api/chat\` con \`stream: true\`.  
\- Lectura incremental del stream NDJSON.  
\- \`thinking\` se acumula por separado y nunca se mezcla con \`content\`.  
\- Preflight mediante \`GET /api/tags\` y \`POST /api/show\`.  
\- Manejo de modelos locales y \`:cloud\`.  
\- Structured output sólo para modelos locales cuando está habilitado.  
\- Heartbeat del draft durante el stream.  
\- Recuperación stale basada en \`CardStatementDraft.updatedAt\`, no sólo en la creación del run.  
\- Worker iniciado después de que Fastify toma correctamente el puerto.  
\- Detección inicial del documento por palabras clave; se elimina la segunda llamada pesada a IA dentro del POST de carga.  
\- Métricas nativas de Ollama: durations, prompt/eval counts, chunks, caracteres y done reason.

\#\# Archivos nuevos

\`\`\`text  
workspace/backend/src/modules/ai/ai-provider-context.ts  
workspace/backend/src/modules/ai/text-extraction-provider.factory.ts  
workspace/backend/src/modules/ai/ollama-native.client.ts  
\`\`\`

\#\# Archivos modificados

\`\`\`text  
workspace/backend/src/modules/ai/text-extraction-provider.ts  
workspace/backend/src/modules/ai/openai-compatible.client.ts  
workspace/backend/src/modules/ai/ai-extraction.service.ts  
workspace/backend/src/modules/ai/ai-processor-worker.ts  
workspace/backend/src/modules/imports/imports.service.ts  
workspace/backend/src/config/env.ts  
workspace/backend/src/main.ts  
workspace/backend/.env.example  
workspace/backend/.env  
\`\`\`

\#\# Configuración requerida

\`\`\`env  
AI\_PROVIDER=ollama  
OLLAMA\_BASE\_URL=http://localhost:11434  
OLLAMA\_MODEL=kimi-k2.7-code:cloud  
OLLAMA\_TIMEOUT\_MS=420000  
OLLAMA\_PREFLIGHT\_ENABLED=true  
OLLAMA\_PREFLIGHT\_TIMEOUT\_MS=15000  
OLLAMA\_HEARTBEAT\_INTERVAL\_MS=5000  
OLLAMA\_KEEP\_ALIVE=5m  
OLLAMA\_THINK=false  
OLLAMA\_STRUCTURED\_OUTPUT=none  
OLLAMA\_NUM\_CTX=0  
AI\_JOB\_TIMEOUT\_MS=480000  
AI\_PROCESSING\_STALE\_AFTER\_MS=600000  
AI\_WORKER\_POLL\_INTERVAL\_MS=2000  
\`\`\`

Preservar cualquier secreto existente. No imprimir API keys.

\#\# Validación que debe ejecutar el agente

No usar Playwright.

1\. Confirmar \`Node v24.18.0 (`node-v24.18.0-win-x64`)\` y la ruta \`I:\\cajaApp-V3\\workspace\\backend\`.  
2\. Ejecutar \`npm run build\`.  
3\. Ejecutar \`npx tsc \--noEmit\`.  
4\. Verificar \`GET http://localhost:11434/api/tags\`.  
5\. Verificar \`POST http://localhost:11434/api/show\` para \`kimi-k2.7-code:cloud\`.  
6\. Reiniciar únicamente mediante \`I:\\cajaApp-V3\\start-cajaapp.ps1\`.  
7\. Iniciar una única importación normal con \`I:\\cajaApp-V3\\docs\\08-artifacts\\visa-galicia-julio2026.pdf\`.  
8\. No ejecutar manualmente el worker.  
9\. Esperar \`preview\_ready\` o \`failed\`.  
10\. Registrar workerInstanceId, draftId, runId, provider, modelo, streamChunks, métricas Ollama, duraciones y estado final persistido.  
11\. Probar temporalmente un modelo inexistente y confirmar que draft/run terminan en \`failed\` sin quedar en \`processing\`.  
12\. Restaurar el modelo correcto y reiniciar una vez.

\#\# Criterio de PASS

La importación iniciada por el flujo normal debe completar:

\`\`\`text  
upload → draft/run → worker automático → pdfplumber → RAW → Ollama /api/chat streaming → JSON → schema → persistencia → preview\_ready  
\`\`\`

El entregable del agente será un único archivo:

\`\`\`text  
APPCAJA-V3-BE-011-delivery-v1.0.0.md  
\`\`\`

No crear ZIP.  
