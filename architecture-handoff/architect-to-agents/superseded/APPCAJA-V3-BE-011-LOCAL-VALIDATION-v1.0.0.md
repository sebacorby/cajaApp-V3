# APPCAJA-V3-BE-011 — Validación local dirigida del conector nativo Ollama

## Estado del código

La implementación fue aplicada directamente en el workspace sincronizado. No reescribir ni rediseñar el conector antes de ejecutar esta validación.

## Entorno obligatorio

- Repositorio: `I:\cajaApp-V3`
- Backend: `I:\cajaApp-V3\workspace\backend`
- SO: Windows x64
- Shell: PowerShell 5.1
- Node.js: `v24.18.0` (`node-v24.18.0-win-x64`)
- Provider esperado: `ollama`
- Modo esperado: `local-proxy`
- Modelo esperado: el valor actual de `OLLAMA_MODEL`

## Reglas estrictas

1. Responder siempre en español.
2. Ejecutar un comando por vez y esperar su resultado.
3. No usar Playwright.
4. No crear scripts auxiliares, wrappers, `.bat`, `.cmd` ni archivos JavaScript de prueba.
5. No ejecutar manualmente `ai-processor-worker.ts`, `processRun()` ni servicios internos.
6. No matar todos los procesos `node.exe`.
7. No modificar el prompt, `pdfplumber`, schemas, normalización ni frontend.
8. No iniciar dos importaciones simultáneas.
9. No imprimir `.env`, claves, RAW, prompt ni respuestas financieras completas.
10. Si una prueba falla, recopilar la evidencia y detenerse. No empezar una refactorización nueva.

## 1. Verificación de entorno

Ejecutar:

```powershell
Set-Location -LiteralPath "I:\cajaApp-V3\workspace\backend"
```

Después:

```powershell
Get-Location
```

Después:

```powershell
node --version
```

Criterios:

- Ruta exacta: `I:\cajaApp-V3\workspace\backend`.
- Node debe ser exactamente `v24.18.0` y resolver primero a `I:\Tools\node-v24.18.0-win-x64\node.exe`.

## 2. Verificación de configuración sin exponer secretos

Ejecutar:

```powershell
$envLines = Get-Content -LiteralPath ".env"
$envLines | Where-Object {
  $_ -match '^(AI_PROVIDER|OLLAMA_MODE|OLLAMA_BASE_URL|OLLAMA_MODEL|OLLAMA_TIMEOUT_MS|OLLAMA_PREFLIGHT_ENABLED|OLLAMA_HEARTBEAT_INTERVAL_MS|AI_JOB_TIMEOUT_MS|AI_PROCESSING_STALE_AFTER_MS)='
}
```

Resultado esperado:

```text
AI_PROVIDER=ollama
OLLAMA_MODE=local-proxy
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT_MS=420000
OLLAMA_PREFLIGHT_ENABLED=true
OLLAMA_HEARTBEAT_INTERVAL_MS=10000
AI_JOB_TIMEOUT_MS=480000
AI_PROCESSING_STALE_AFTER_MS=600000
```

El modelo puede variar, pero no debe estar vacío.

## 3. Build y TypeScript

Ejecutar:

```powershell
npm run build
```

Esperar a que termine. Después ejecutar:

```powershell
npx tsc --noEmit
```

No iniciar servicios si alguno falla.

Ante error de compilación:

- informar archivo, línea, código y mensaje;
- corregir únicamente el error concreto;
- repetir `npm run build`;
- repetir `npx tsc --noEmit`;
- no cambiar arquitectura.

## 4. Inicio único de CajaApp

Ejecutar una sola vez:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "I:\cajaApp-V3\start-cajaapp.ps1"
```

No volver a ejecutarlo durante una importación activa.

Confirmar en logs, en este orden:

1. Base conectada.
2. Fastify escucha en `127.0.0.1:11436`.
3. Preflight de Ollama completado.
4. Worker iniciado.

El evento `ai.worker.started` debe aparecer después de que el servidor haya tomado el puerto.

## 5. Preflight Ollama

Confirmar en el log del backend:

- `ollama.preflight.completed`;
- host `localhost:11434`;
- modelo configurado;
- modo `local-proxy`;
- duración;
- capacidades informadas;
- ausencia de API keys y contenido financiero.

El preflight debe ejecutar realmente:

- `GET /api/tags`;
- `POST /api/show`.

Si el modelo no existe o Ollama no responde, la aplicación debe fallar temprano y no iniciar el worker.

## 6. Prueba de puerto ocupado

Con CajaApp ya ejecutándose, abrir una segunda consola y ejecutar únicamente:

```powershell
Set-Location -LiteralPath "I:\cajaApp-V3\workspace\backend"
```

Después:

```powershell
npm run dev
```

Resultado esperado:

- el segundo backend falla por `EADDRINUSE`;
- ese segundo proceso no registra `ai.worker.started`;
- el backend original continúa funcionando;
- cerrar únicamente la segunda consola/proceso.

## 7. Importación real por el endpoint normal

No ejecutar el worker manualmente.

Ejecutar desde PowerShell:

```powershell
curl.exe -X POST -F "file=@I:\cajaApp-V3\docs\08-artifacts\visa-galicia-julio2026.pdf;type=application/pdf" "http://localhost:11436/api/card-statements/import"
```

Guardar el `draftId` devuelto.

No iniciar otra importación.

## 8. Polling controlado

Reemplazar `<DRAFT_ID>` por el valor real y ejecutar manualmente una consulta cada 10 segundos:

```powershell
curl.exe "http://localhost:11436/api/card-statements/import/<DRAFT_ID>/status"
```

No crear un loop ni un script auxiliar.

Finalizar cuando el estado sea:

- `preview_ready`; o
- `failed`.

Tiempo máximo: 540 segundos.

Las etapas esperadas son:

```text
queued
loading_document
extracting_raw_text
sending_raw_text_to_ai
receiving_ai_stream
validating_ai_response
persisting_preview
preview_ready
```

No exigir observar todas en el polling, porque algunas duran muy poco. Sí debe observarse progreso durante la generación y no quedar varios minutos en `extracting_raw_text`.

## 9. Evidencia del streaming

En logs deben aparecer, para el mismo `draftId` y `runId`:

- `ai.run.claimed`;
- `ai.raw.started`;
- `ai_extraction.raw_extraction.completed`;
- `ollama.chat.started` con `stream=true` implícito en el conector;
- `ollama.chat.response_received`;
- actualizaciones de heartbeat/progreso;
- `ollama.chat.completed`;
- `ai.run.preview_ready`.

Registrar sin contenido financiero:

- `workerInstanceId`;
- `draftId`;
- `runId`;
- modelo;
- HTTP status;
- `firstChunkLatencyMs`;
- `streamDurationMs`;
- `streamChunks`;
- `responseCharacters`;
- `thinkingCharacters`;
- `totalDurationNs`;
- `promptEvalCount`;
- `promptEvalDurationNs`;
- `evalCount`;
- `evalDurationNs`;
- duración total;
- cantidad de filas, grupos y secciones.

Criterio central: el stream debe abrir antes del antiguo corte cercano a 300 segundos y finalizar con `done=true`.

## 10. Verificación de heartbeat y doble claim

Durante la importación:

- el mismo `runId` debe ser reclamado una sola vez;
- no debe aparecer un segundo `ai.run.claimed` para ese run;
- `CardStatementDraft.updatedAt` debe actualizarse durante el stream;
- el run no debe cambiar a `recovering` mientras recibe chunks;
- no debe existir otro workerInstanceId procesando el mismo run.

Consultar la base usando únicamente las herramientas ya existentes del proyecto. No crear nuevos scripts de consulta.

## 11. Prueba de error controlado

Después de finalizar la prueba exitosa:

1. Guardar el valor real de `OLLAMA_MODEL` sin publicarlo.
2. Cambiar temporalmente sólo esa variable a:

```text
OLLAMA_MODEL=modelo-inexistente-cajaapp
```

3. Reiniciar usando una sola vez `start-cajaapp.ps1`.

Resultado esperado:

- `/api/show` o el preflight falla claramente;
- el worker no inicia;
- no queda ningún draft nuevo en `processing`.

Restaurar el modelo original y reiniciar una única vez.

No realizar una segunda importación negativa si el preflight ya demostró correctamente el error.

## 12. No corregir en esta tarea

Dejar como known issues, sin modificar ahora:

- asociaciones visuales de secciones y grupos en `normalizeModelResponse()`;
- importes mostrados por el frontend;
- calidad funcional de filas extraídas;
- diseño de pantalla;
- velocidad intrínseca del modelo cloud.

Esta validación evalúa exclusivamente estabilidad, streaming, provider nativo y supervisión del worker.

## 13. Entrega

Crear un único archivo:

```text
APPCAJA-V3-BE-011-delivery-v1.0.0.md
```

No crear ZIP.

Debe incluir:

- estado: `PASS`, `FAIL` o `BLOCKED`;
- rama y commit HEAD;
- Node;
- build;
- TypeScript;
- orden de arranque observado;
- resultado del preflight;
- evidencia de que un segundo backend no inicia worker;
- `workerInstanceId`, `draftId`, `runId`;
- estado final persistido;
- métricas del stream;
- duraciones;
- filas, grupos y secciones;
- resultado de modelo inexistente;
- known issues honestos.

No incluir:

- `.env` completo;
- API keys;
- prompt;
- RAW;
- respuesta íntegra del modelo;
- datos financieros personales.

## Criterio de PASS

Sólo declarar `PASS` si:

1. Build y TypeScript pasan con Node.js exacto `v24.18.0`.
2. El servidor toma el puerto antes de iniciar el worker.
3. El preflight valida Ollama y el modelo.
4. La importación nace por el endpoint normal.
5. El worker la reclama automáticamente una sola vez.
6. `/api/chat` entrega streaming NDJSON.
7. Existe first chunk y heartbeat durante la generación.
8. El stream finaliza con `done=true`.
9. El draft termina en `preview_ready` y el run en `completed`.
10. El modelo inexistente falla de forma controlada.
11. No se ejecutó manualmente el worker.
