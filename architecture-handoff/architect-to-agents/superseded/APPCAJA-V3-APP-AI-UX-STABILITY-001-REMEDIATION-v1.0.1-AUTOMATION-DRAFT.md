# APP-AI-UX-STABILITY-001 — REMEDIACIÓN v1.0.1

Estado: ACTIVA.
Vertical único activo: `APP-AI-UX-STABILITY-001`.
No abrir `APP-FINAL-CLOSURE` ni ningún otro vertical.

## 1. Objetivo

Cerrar únicamente las tres causas no resueltas de la campaña v1.0.0:

1. demostrar Ollama Cloud real;
2. capturar y corregir la respuesta no exitosa de `/api/ai-advisor/ask`;
3. garantizar que la UI termine siempre en success o error visible, sin spinner huérfano.

No aplicar cambios preventivos ni ampliar alcance.

## 2. Baseline obligatorio

Conservar:

- Node `I:\Tools\node-v24.18.0-win-x64\node.exe` v24.18.0;
- package.json SHA-256 `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`;
- package-lock.json SHA-256 `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`;
- SQLite inicial restaurada y respaldada;
- puertos 11436 y 11437 libres antes y después.

La evidencia v1.0.0 está rechazada en:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.0/`

## 3. Alcance modificable

Únicamente, y sólo si el diagnóstico lo exige:

- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`;
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`;
- `workspace/frontend/tests/ai-advisor.spec.ts`;
- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`;
- `workspace/backend/src/modules/ai-advisor/ai-advisor.controller.ts`;
- `workspace/backend/src/modules/ai/ollama.client.ts`;
- `workspace/backend/src/modules/ai/ollama-native.client.ts`.

Prohibido modificar `.env`, secretos, Prisma, migraciones, package files, prompts o schemas.

## 4. Gate cero: identidad real de Ollama Cloud

Antes de ejecutar Playwright:

- comprobar el endpoint remoto configurado y el modo efectivo;
- demostrar que no es `localhost`, loopback ni `local-proxy`;
- demostrar presencia de credencial configurada sin imprimirla;
- registrar host sanitizado, modo, modelo solicitado, modelo reportado y request id;
- ejecutar una consulta directa y registrar HTTP, duración y respuesta sanitizada.

Si falta credencial o el endpoint es local: `BLOCKED`. No simular Cloud y no continuar con PASS.

## 5. Diagnóstico correlacionado obligatorio

Agregar sólo instrumentación temporal de evidencia, sin dejar logs permanentes.

Cada envío debe tener un `correlationId` visible en:

- inicio frontend;
- request HTTP;
- entrada controller;
- armado de contexto;
- llamada al proveedor;
- persistencia de interacción;
- respuesta backend;
- render success/error frontend.

Para toda respuesta no 2xx registrar:

- status HTTP;
- body sanitizado;
- clase y código de error;
- operación Prisma exacta si aplica;
- timestamps y duración de cada etapa.

No atribuir el fallo a SQLite, Prisma o proveedor sin evidencia directa.

## 6. Corrección mínima

Aplicar sólo la corrección demostrada por logs.

La solución debe asegurar:

- una única solicitud lógica por submit;
- loading siempre finaliza en success o error;
- timeout backend/proveedor produce error recuperable visible antes de 180 s;
- una respuesta tardía no pisa una consulta posterior;
- retry y segunda consulta funcionan en la misma sesión;
- fingerprint, claims y citas pertenecen a la misma interacción;
- cleanup de datos de test no compite con una solicitud todavía activa.

No aumentar timeouts para ocultar el defecto.

## 7. Test focal

Actualizar `tests/ai-advisor.spec.ts` sin reducir cobertura.

Debe:

- capturar status y body antes de afirmar `ok()`;
- validar API/fingerprint/fuentes;
- validar desktop con dos consultas consecutivas;
- validar mobile y nueva consulta posterior;
- comprobar loading terminado y ausencia de spinner;
- comprobar error visible si el backend falla;
- borrar datos sólo después de que todas las solicitudes correlacionadas hayan terminado.

Comando obligatorio:

`npx playwright test tests/ai-advisor.spec.ts --project=chromium --workers=1 --retries=0`

Ejecutarlo dos veces consecutivas. Ambas ejecuciones deben ser 100% PASS.

Luego ejecutar el focal después de otro spec que use backend y SQLite para demostrar ausencia de contaminación por orden.

## 8. Proveedor real 5/5

Ejecutar cinco consultas distintas por API real.

Para cada una registrar:

- inicio/fin y duración;
- HTTP 201;
- schema válido;
- fingerprint enviado/devuelto;
- request id y correlation id;
- fuentes/citas válidas;
- cero referencias a fuentes inexistentes;
- número de intentos;
- ausencia de duplicados o solicitudes huérfanas.

Gate: 5/5 PASS y ninguna mayor a 180 s.

## 9. Gates finales

Backend:

- `npm ci`;
- Prisma generate;
- migrate status sin mutar schema;
- build;
- tests vigentes.

Frontend:

- `npm ci`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Después del focal PASS x2:

- Playwright completo Chromium, workers=1, retries=0;
- al menos 40/42;
- ningún fallo nuevo;
- sólo pueden permanecer los dos fallos conocidos de salary receipts, salvo mejora.

## 10. Evidencia requerida

Entregar en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.1/`

Incluir:

- `00-verdict.md`;
- identidad de proveedor sanitizada;
- logs backend/frontend correlacionados;
- cinco respuestas API sanitizadas;
- dos focales completos PASS;
- prueba de orden/contaminación;
- full suite;
- backend/frontend gates;
- hashes before/after;
- SQLite before/after;
- puertos y cleanup;
- manifests JSON exigidos por la campaña original.

Veredicto permitido: PASS, FAIL o BLOCKED.

## 11. Política de cierre

- PASS: conservar sólo la corrección mínima demostrada.
- FAIL: restaurar archivos autorizados a hashes iniciales y SQLite exacta.
- BLOCKED por credenciales/endpoint: no modificar código; entregar diagnóstico preciso.
