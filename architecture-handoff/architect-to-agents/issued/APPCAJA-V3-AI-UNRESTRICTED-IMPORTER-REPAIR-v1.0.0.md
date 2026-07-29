# APPCAJA-V3 — Remediación del importador IA sin restricciones artificiales

**Versión:** 1.0.0  
**Fecha:** 2026-07-27  
**Estado:** AUTORIZADO PARA IMPLEMENTACIÓN Y VALIDACIÓN  
**Root operativo:** `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`  
**Backend:** `workspace/backend`  
**Modelo activo esperado:** `gemma4:31b-cloud`  
**Endpoint Ollama esperado:** `http://127.0.0.1:11434`

---

## 1. Objetivo

Reparar el importador de resúmenes de tarjeta que se rompió luego de los últimos cambios de Pagos de tarjeta y dejar la invocación del modelo sin restricciones artificiales impuestas por CajaApp.

La aplicación no debe cancelar una respuesta por duración, contexto configurado o límite de salida definido por la app. Si Ollama o el modelo devuelven un error real, el backend debe capturarlo, persistir un estado terminal controlado y exponer un error gestionable por la UI, sin tumbar el proceso ni dejar el trabajo eternamente en `PROCESSING`.

---

## 2. Reglas obligatorias

1. No imponer timeout de solicitud al modelo.
2. No imponer timeout total del job de IA.
3. No enviar `num_ctx` ni equivalente cuando el valor configurado sea `0` o esté ausente.
4. No enviar `max_tokens`, `max_completion_tokens`, `num_predict` ni equivalente cuando el valor configurado sea `0` o esté ausente.
5. Mantener `stream: true` para Ollama nativo.
6. Mantener heartbeat del worker mientras la respuesta siga abierta.
7. Un error devuelto por Ollama/modelo/transporte debe ser capturado y convertido en fallo de importación controlado.
8. El backend debe seguir vivo después de un fallo del modelo.
9. El importador no debe modificar reglas financieras ni la lógica ya cerrada de Pagos de tarjeta.
10. No crear scripts auxiliares nuevos. Usar herramientas y comandos existentes del proyecto.

---

## 3. Archivos a revisar y modificar

```text
workspace/backend/src/config/env.ts
workspace/backend/src/modules/ai/ollama-native.client.ts
workspace/backend/src/modules/ai/openai-compatible.client.ts
workspace/backend/src/modules/ai/ai-extraction.service.ts
workspace/backend/src/modules/ai/ai-processor-worker.ts
workspace/backend/src/modules/imports/imports.service.ts
workspace/backend/.env
workspace/backend/.env.example
```

Modificar solamente los archivos realmente necesarios luego de trazar el flujo activo.

---

## 4. Contrato de configuración

### 4.1 Variables con `0 = deshabilitado`

El schema debe aceptar `0` explícitamente para estas variables:

```dotenv
OLLAMA_TIMEOUT_MS=0
AI_TIMEOUT_MS=0
AI_JOB_TIMEOUT_MS=0
OLLAMA_NUM_CTX=0
AI_MAX_OUTPUT_TOKENS=0
```

Semántica obligatoria:

```text
0 = CajaApp no impone ese límite y no envía el parámetro al proveedor.
```

### 4.2 `.env` operativo esperado

Conservar las demás variables existentes y dejar estas claves con los siguientes valores:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODE=local-proxy
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma4:31b-cloud
OLLAMA_TIMEOUT_MS=0
OLLAMA_MAX_RETRIES=0
OLLAMA_PREFLIGHT_ENABLED=true
OLLAMA_NUM_CTX=0
AI_TIMEOUT_MS=0
AI_MAX_OUTPUT_TOKENS=0
AI_JOB_TIMEOUT_MS=0
AI_MOCK_MODE=false
```

No agregar una variable de contexto máximo alternativa.

---

## 5. Cambios requeridos en `env.ts`

### 5.1 Permitir cero

Cambiar las validaciones que hoy exigen mínimos positivos:

```ts
OLLAMA_TIMEOUT_MS
AI_TIMEOUT_MS
AI_JOB_TIMEOUT_MS
AI_MAX_OUTPUT_TOKENS
```

para que acepten `0` y mantengan validación de enteros no negativos.

Patrón esperado:

```ts
z.coerce.number().int().min(0).default(0)
```

Los máximos pueden conservarse únicamente para valores positivos configurados, pero el valor `0` debe pasar siempre.

### 5.2 Eliminar relaciones inválidas cuando están deshabilitados

Las comprobaciones:

```text
Provider timeout must be lower than AI_JOB_TIMEOUT_MS.
AI_JOB_TIMEOUT_MS must be lower than AI_PROCESSING_STALE_AFTER_MS.
```

sólo deben ejecutarse cuando ambos valores comparados sean mayores que cero.

Ejemplo:

```ts
if (
  providerTimeout > 0 &&
  parsed.data.AI_JOB_TIMEOUT_MS > 0 &&
  providerTimeout >= parsed.data.AI_JOB_TIMEOUT_MS
) {
  // error
}
```

```ts
if (
  parsed.data.AI_JOB_TIMEOUT_MS > 0 &&
  parsed.data.AI_PROCESSING_STALE_AFTER_MS > 0 &&
  parsed.data.AI_JOB_TIMEOUT_MS >= parsed.data.AI_PROCESSING_STALE_AFTER_MS
) {
  // error
}
```

`AI_PROCESSING_STALE_AFTER_MS` no es un límite al modelo. Es recuperación de trabajos huérfanos. Debe conservarse, pero un worker activo debe renovar heartbeat y nunca ser marcado stale mientras procesa.

---

## 6. Cliente nativo de Ollama

### 6.1 No crear AbortController por tiempo cuando timeout = 0

Patrón obligatorio:

```ts
const timeoutMs = env.OLLAMA_TIMEOUT_MS;
const controller = timeoutMs > 0 ? new AbortController() : undefined;
const timeoutHandle = controller
  ? setTimeout(() => controller.abort(), timeoutMs)
  : undefined;
```

En el `fetch`:

```ts
signal: controller?.signal,
```

En `finally`:

```ts
if (timeoutHandle) {
  clearTimeout(timeoutHandle);
}
```

No usar `AbortSignal.timeout(0)`, porque aborta inmediatamente.

### 6.2 No enviar límite de contexto

Construir `options` dinámicamente.

```ts
const options: Record<string, unknown> = {};

if (env.OLLAMA_NUM_CTX > 0) {
  options.num_ctx = env.OLLAMA_NUM_CTX;
}
```

No debe aparecer `num_ctx: 0` en el JSON enviado.

### 6.3 No enviar límite de salida

Si el cliente actualmente traduce `AI_MAX_OUTPUT_TOKENS` a `num_predict`, aplicar:

```ts
if (env.AI_MAX_OUTPUT_TOKENS > 0) {
  options.num_predict = env.AI_MAX_OUTPUT_TOKENS;
}
```

No debe aparecer `num_predict: 0` ni un valor predeterminado impuesto por CajaApp.

### 6.4 `options` opcional

Si el objeto queda vacío, omitirlo por completo del body:

```ts
const body = {
  model: env.OLLAMA_MODEL,
  messages,
  stream: true,
  ...(Object.keys(options).length > 0 ? { options } : {}),
};
```

### 6.5 Captura de errores

Capturar por separado:

```text
HTTP no 2xx
respuesta stream inválida
JSON de chunk inválido
campo error enviado por Ollama
stream cerrado sin contenido final
error de red/transporte
aborto sólo cuando existe timeout positivo
```

Lanzar una excepción tipada o normalizada que preserve:

```text
provider
model
statusCode si existe
errorCode estable
mensaje técnico sanitizado
requestId/correlationId
```

Nunca incluir API keys ni el PDF completo en logs.

---

## 7. Cliente OpenAI compatible

Aunque el proveedor activo sea Ollama, mantener semántica coherente:

1. Si `AI_TIMEOUT_MS=0`, no crear señal de aborto temporal.
2. Si `AI_MAX_OUTPUT_TOKENS=0`, no enviar `max_tokens` ni `max_completion_tokens`.
3. Capturar error HTTP, payload de error y error de transporte con la misma normalización usada por el worker.

---

## 8. Worker y timeout total del job

### 8.1 Deshabilitar carrera de timeout cuando `AI_JOB_TIMEOUT_MS=0`

Si actualmente existe algo equivalente a:

```ts
await Promise.race([
  extractionPromise,
  timeoutPromise,
]);
```

cambiar a:

```ts
const result = env.AI_JOB_TIMEOUT_MS > 0
  ? await Promise.race([
      extractionPromise,
      createJobTimeout(env.AI_JOB_TIMEOUT_MS),
    ])
  : await extractionPromise;
```

No crear timers cuando el límite está deshabilitado.

### 8.2 Mantener heartbeat

El heartbeat debe continuar mientras el stream está activo. Debe detenerse en `finally`, tanto en éxito como en error.

### 8.3 Persistencia terminal controlada

Ante error del modelo/proveedor:

```text
AiExtractionRun.status = FAILED
finishedAt = fecha actual
errorCode = código estable
errorMessage = mensaje gestionable
```

La transición a `FAILED` debe ser condicionada/transaccional para que un heartbeat tardío o una finalización concurrente no sobrescriban un estado terminal.

El error no debe propagarse fuera del ciclo principal del worker de forma que mate el proceso. Registrar el fallo y continuar con el siguiente trabajo.

---

## 9. Servicio de importación y respuesta para UI

El importador debe distinguir:

```text
error del proveedor/modelo
salida no parseable
salida que no cumple schema
PDF sin texto utilizable
error interno inesperado
```

La API no debe devolver una excepción cruda. Debe devolver o permitir consultar un estado gestionable con:

```json
{
  "status": "FAILED",
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "No se pudo interpretar el resumen. Podés reintentar la importación."
  }
}
```

Códigos mínimos sugeridos:

```text
AI_PROVIDER_ERROR
AI_INVALID_RESPONSE
AI_SCHEMA_VALIDATION_FAILED
PDF_EXTRACTION_FAILED
IMPORT_INTERNAL_ERROR
```

No inventar datos ni persistir un borrador parcial cuando la respuesta no pasa validación.

---

## 10. Reparación específica del importador

Trazar el flujo real completo:

```text
POST/importación
PDF raw extractor
creación AiExtractionRun
worker
cliente Ollama nativo
parseo/reparación JSON
validación schema
creación del draft
consulta de estado desde frontend
```

Comparar con el último commit/estado funcional anterior a los cambios de Pagos de tarjeta y localizar la regresión concreta.

Validar especialmente:

1. Que el worker siga consumiendo el job creado por `imports.service.ts`.
2. Que el tipo de documento y prompt seleccionado sigan siendo `card-statement`.
3. Que la extracción raw llegue completa al prompt y no se trunque por `AI_ADVISOR_MAX_CONTEXT_CHARACTERS` ni por configuraciones del asesor.
4. Que las variables del Asesor IA no se reutilicen en el importador.
5. Que el resultado validado siga creando exactamente un draft y no duplique filas.
6. Que los últimos cambios de Pagos de tarjeta no hayan cambiado rutas, estados o contratos compartidos del importador.

---

## 11. Pruebas obligatorias mínimas

No crear una suite extensa. Ejecutar sólo validación focalizada.

### 11.1 Build

Desde el backend:

```powershell
npm run build
```

Resultado requerido: exit code `0`.

### 11.2 Tests existentes relacionados

Ejecutar los tests ya existentes que cubran:

```text
env
ollama-native.client
ai-processor-worker
ai-extraction.service
imports.service
```

No crear wrappers.

### 11.3 Casos nuevos o ajustados mínimos

1. `OLLAMA_TIMEOUT_MS=0` no crea AbortController temporal.
2. `AI_JOB_TIMEOUT_MS=0` espera la promesa real sin `Promise.race` temporal.
3. `OLLAMA_NUM_CTX=0` omite `options.num_ctx`.
4. `AI_MAX_OUTPUT_TOKENS=0` omite el parámetro de tokens/salida.
5. Ollama HTTP 500 deja el run en `FAILED` y el worker sigue vivo.
6. Chunk con `{ "error": "..." }` deja el run en `FAILED`.
7. Respuesta inválida no crea draft parcial.
8. Una respuesta lenta simulada finaliza correctamente sin timeout de CajaApp.

### 11.4 Smoke real del importador

Con backend y frontend existentes:

1. Cargar un PDF real de resumen de tarjeta usado anteriormente.
2. Confirmar que el job pasa de `PENDING` a `PROCESSING`.
3. Esperar sin cancelar por tiempo.
4. Confirmar uno de estos dos estados terminales válidos:
   - `COMPLETED` con draft visible.
   - `FAILED` con error gestionado y backend vivo.
5. Confirmar que health sigue respondiendo `200` luego de un fallo del modelo.
6. Reintentar la importación sin reiniciar toda la aplicación.

---

## 12. Evidencia requerida

Guardar en:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-AI-UNRESTRICTED-IMPORTER-REPAIR-evidence-v1.0.0/
```

Contenido mínimo:

```text
00-environment.txt
01-diff-summary.md
02-build.txt
03-focused-tests.txt
04-import-smoke.txt
05-backend-health-after-model-error.txt
06-files-modified.txt
07-final-result.md
```

No incluir secretos, API keys ni PDFs financieros reales en la evidencia.

---

## 13. Gate de aceptación

### PASS

Sólo si se cumple todo:

1. Backend build exit `0`.
2. `.env` usa cero para deshabilitar límites artificiales.
3. Request real a Ollama no contiene `num_ctx` ni límite de salida cuando están en cero.
4. No existe timeout temporal de proveedor ni de job cuando están en cero.
5. Importación real completa o falla de manera controlada.
6. Backend continúa vivo después de error del modelo.
7. No se rompió Pagos de tarjeta.
8. No se modificaron reglas financieras ni contratos no relacionados.

### FAIL

Si ocurre cualquiera:

```text
el modelo es abortado por tiempo
se sigue enviando contexto máximo
se sigue enviando límite de salida
el job queda PROCESSING eternamente después de un error real
el backend cae
se crea un draft parcial o corrupto
se rompe Pagos de tarjeta
```

---

## 14. Resultado esperado del agente

El agente debe implementar únicamente esta remediación, ejecutar build y pruebas mínimas, realizar el smoke del importador y entregar un veredicto honesto `PASS` o `FAIL` con causa raíz y archivos modificados.
