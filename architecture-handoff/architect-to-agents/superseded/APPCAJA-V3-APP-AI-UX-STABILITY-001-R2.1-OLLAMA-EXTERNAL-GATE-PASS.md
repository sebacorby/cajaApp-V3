# APP-AI-UX-STABILITY-001 v1.0.3-R2.1 — OLLAMA EXTERNAL GATE

Estado: ACTIVA. Es la única instrucción vigente. La ejecución E2E está pausada.

## Objetivo único

Demostrar que Ollama responde correctamente por fuera de la API de CajaApp usando exactamente:

- base URL: `http://127.0.0.1:11434`;
- modelo: `gemma4:31b-cloud`.

No se autoriza ninguna otra tarea.

## Prohibiciones absolutas

Durante este gate no:

- iniciar el backend de CajaApp;
- iniciar el frontend;
- ejecutar Playwright ni ningún test E2E;
- ejecutar tests Vitest;
- modificar código, configuración, `.env`, packages, dependencias o bases de datos;
- crear scripts `.ps1`, `.cmd`, `.bat`, `.js`, `.ts` o Python;
- usar loops, `foreach`, pipelines generados, Task Scheduler, PM2 o Docker;
- usar `localhost`, el puerto `11435` o un modelo distinto;
- continuar automáticamente con los tests aunque el gate resulte PASS.

Cada operación debe ejecutarse manualmente mediante un comando independiente.

## 1. Preflight de aislamiento

Antes de consultar Ollama:

1. comprobar que no hay backend CajaApp escuchando en `127.0.0.1:11436`;
2. comprobar que no hay frontend de esta campaña en `11437` o `11438`;
3. no matar procesos ajenos;
4. comprobar que `127.0.0.1:11434` tiene listener;
5. registrar fecha, hora, PID propietario del puerto y comando cuando sea posible.

Si Ollama no está iniciado, iniciar únicamente el servicio o proceso Ollama instalado en el equipo. No iniciar CajaApp.

Guardar `OLLAMA-PORT-PREFLIGHT.json`.

## 2. Verificar inventario de modelos

Ejecutar manualmente:

`GET http://127.0.0.1:11434/api/tags`

PASS requiere:

- HTTP 200;
- JSON válido;
- presencia exacta de `gemma4:31b-cloud` en `name` o `model`;
- ausencia de errores de transporte.

Guardar respuesta completa sanitizada en:

`OLLAMA-TAGS.json`

Si el modelo no aparece, ejecutar una sola vez:

`ollama pull gemma4:31b-cloud`

Guardar stdout, stderr, exit code, hora de inicio, fin y duración. Después repetir manualmente `GET /api/tags`.

Si el pull falla o el modelo sigue ausente, declarar FAIL y detenerse. No levantar CajaApp ni ejecutar tests.

## 3. Verificar metadata del modelo

Ejecutar manualmente:

`POST http://127.0.0.1:11434/api/show`

Body exacto:

```json
{
  "model": "gemma4:31b-cloud"
}
```

PASS requiere:

- HTTP 200;
- JSON válido;
- sin campo `error`;
- metadata/capabilities no vacías;
- el modelo consultado es exactamente `gemma4:31b-cloud`.

Guardar en `OLLAMA-SHOW.json`.

## 4. Tres respuestas directas independientes

Ejecutar tres llamadas manuales y separadas. No usar loop ni script.

Endpoint:

`POST http://127.0.0.1:11434/api/chat`

Body exacto en cada llamada:

```json
{
  "model": "gemma4:31b-cloud",
  "messages": [
    {
      "role": "user",
      "content": "Respondé exactamente OLLAMA_OK y nada más."
    }
  ],
  "stream": false,
  "keep_alive": "5m",
  "options": {
    "temperature": 0,
    "num_predict": 32
  }
}
```

Cada llamada debe guardarse por separado:

- `OLLAMA-DIRECT-CHAT-1.json`;
- `OLLAMA-DIRECT-CHAT-2.json`;
- `OLLAMA-DIRECT-CHAT-3.json`.

PASS individual requiere:

- HTTP 200;
- JSON válido;
- `model` compatible con el nombre exacto solicitado;
- `message.content` no vacío;
- contenido normalizado exactamente `OLLAMA_OK`;
- ausencia de `error`;
- duración registrada;
- request y response asociadas inequívocamente.

No considerar PASS una respuesta parcial, vacía, en markdown, con explicaciones adicionales o de otro modelo.

## 5. Respuesta JSON directa

Ejecutar una cuarta llamada independiente a:

`POST http://127.0.0.1:11434/api/chat`

Body:

```json
{
  "model": "gemma4:31b-cloud",
  "messages": [
    {
      "role": "user",
      "content": "Respondé únicamente este JSON válido, sin markdown: {\"status\":\"OLLAMA_JSON_OK\",\"value\":31}"
    }
  ],
  "stream": false,
  "keep_alive": "5m",
  "options": {
    "temperature": 0,
    "num_predict": 64
  }
}
```

PASS requiere:

- HTTP 200;
- `message.content` no vacío;
- después de trim, el contenido puede parsearse como JSON sin reparaciones;
- `status` es exactamente `OLLAMA_JSON_OK`;
- `value` es exactamente `31`;
- no contiene fences Markdown ni texto adicional;
- sin campo `error`.

Guardar request, response, parse result y duración en `OLLAMA-DIRECT-JSON.json`.

## 6. Repetición ante fallo

No repetir indiscriminadamente.

Ante un fallo:

1. guardar el primer resultado completo;
2. comprobar listener y proceso Ollama;
3. registrar el error exacto;
4. se permite una única repetición manual del mismo paso si el fallo fue claramente de transporte y Ollama fue restaurado;
5. conservar ambos intentos.

No cambiar modelo, endpoint, prompt, timeout de la aplicación ni configuración del repo para obtener PASS.

## 7. Evidencia

Sincronizar directamente en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/ollama-external-gate/`

Archivos mínimos:

- `OLLAMA-PORT-PREFLIGHT.json`;
- `OLLAMA-TAGS.json`;
- `OLLAMA-SHOW.json`;
- `OLLAMA-DIRECT-CHAT-1.json`;
- `OLLAMA-DIRECT-CHAT-2.json`;
- `OLLAMA-DIRECT-CHAT-3.json`;
- `OLLAMA-DIRECT-JSON.json`;
- `OLLAMA-EXTERNAL-GATE.json`;
- stdout/stderr del pull, sólo si fue necesario;
- comandos exactos sanitizados;
- timestamps, duraciones, HTTP status y modelo efectivo.

`OLLAMA-EXTERNAL-GATE.json` debe incluir:

- `baseUrl` exactamente `http://127.0.0.1:11434`;
- `model` exactamente `gemma4:31b-cloud`;
- resultado de tags;
- resultado de show;
- resultados de los tres chats;
- resultado JSON;
- confirmación de que backend, frontend y E2E no fueron iniciados;
- veredicto final `PASS` o `FAIL`.

## PASS

Sólo es PASS cuando:

- listener Ollama válido;
- modelo exacto presente;
- show HTTP 200;
- chats 1, 2 y 3 PASS;
- JSON directo PASS;
- evidencia completa visible en Dropbox;
- CajaApp no fue iniciada.

## Cierre obligatorio

- Si FAIL: informar el punto exacto y detenerse.
- Si PASS: informar que el gate externo de Ollama está listo para revisión del arquitecto y detenerse.
- En ambos casos: no iniciar backend, frontend ni E2E.
- No reactivar por cuenta propia la instrucción serial archivada.
- No pedir confirmación intermedia.
