# APPCAJA-V3-AI-FINGERPRINT-CONSISTENCY-AND-FINAL-VALIDATION-v1.0.13


**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Fecha:** 2026-07-15  
**Root canónico, operativo y único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`


---


## 1. Objetivo único


Corregir el defecto confirmado de consistencia del `sourceFingerprint` del Asesor IA y completar la validación final consolidada.


Esta campaña debe:


1. normalizar el período utilizado para construir el contexto;
2. garantizar que `/api/ai-advisor/context` y `/api/ai-advisor/ask` produzcan el mismo fingerprint cuando usan el mismo período y los mismos datos;
3. preservar la diferencia intencional de fingerprint cuando se agrega una simulación;
4. mantener intactos los guardrails y la reparación con `previousRejectedOutput`;
5. validar nuevamente backend, frontend, cinco consultas reales, Playwright focal y Playwright completo;
6. dejar la SQLite migrada, limpia y restaurada;
7. eliminar `node_modules` al cierre.


No abrir ningún otro vertical.


---


## 2. Estado heredado


`APPCAJA-V3-MIGRATION-AND-FINAL-VALIDATION-v1.0.12` queda cerrada como `FAIL`.


Se aceptan provisionalmente estos resultados:


- las tres migraciones Prisma fueron aplicadas;
- `npx prisma migrate status` quedó actualizado;
- backend build PASS;
- backend tests 148/148 PASS;
- frontend typecheck PASS;
- frontend lint con 0 errores;
- frontend build PASS;
- health HTTP 200;
- contexto del Asesor IA HTTP 200;
- cinco consultas reales consecutivas: 5/5 HTTP 201;
- prompt `advisor-prompt-v1.2.0`;
- reparación con `previousRejectedOutput`;
- issues estructurados;
- máximo de dos intentos al proveedor;
- lockfiles sin cambios.


No se acepta todavía el vertical completo porque:


- Playwright focal falló dos veces;
- Playwright completo no quedó aprobado;
- la evidencia sincronizada de `v1.0.12` quedó incompleta y con nombres duplicados;
- la SQLite informada al cierre seguía modificada por datos de prueba.


---


## 3. Diagnóstico técnico vinculante del arquitecto


La hipótesis informada por el agente en `v1.0.12` no explica el fallo focal.


### 3.1 Causas descartadas


El fallo ocurrió con:


```json
{
  "mode": "analysis",
  "currency": "ARS",
  "scenario": null
}
```


Por lo tanto:


- `addSimulationSource()` no se ejecuta;
- su recomputación no puede ser la causa del mismatch focal;
- `health.formula.version` y `context.financialHealthFormulaVersion` representan el mismo valor en el contexto base.


No implementar un cambio limitado a sustituir una de esas dos expresiones.


### 3.2 Causa confirmada


`buildAiAdvisorContext()` recibe un parámetro tipado como `AiAdvisorContextQueryInput`, pero el método `ask()` le entrega el objeto completo `AiAdvisorQuestionInput`.


En runtime:


- `/context` entrega un objeto equivalente a:


```json
{
  "from": "2026-07-01",
  "to": "2026-07-31"
}
```


- `/ask` entrega un objeto equivalente a:


```json
{
  "from": "2026-07-01",
  "to": "2026-07-31",
  "mode": "analysis",
  "currency": "ARS",
  "question": "...",
  "scenario": null
}
```


Dentro de `buildAiAdvisorContext()` el objeto `query` se reutiliza directamente como:


- `context.period`;
- `source.period`;
- entrada de `movementAction()`;
- campo `period` del payload del fingerprint.


TypeScript no elimina propiedades adicionales en runtime. Como consecuencia, el fingerprint de `/ask` incorpora campos no financieros de la pregunta, mientras `/context` incorpora sólo `from` y `to`.


El fingerprint debe representar exclusivamente:


- versión del contexto;
- período normalizado;
- versión de la fórmula;
- fuentes financieras normalizadas.


Nunca debe depender de:


- pregunta;
- modo;
- moneda solicitada;
- metadatos de UI;
- campos ajenos al contexto financiero;
- orden incidental de propiedades.


---


## 4. Alcance autorizado


### Archivos modificables


```text
workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts
workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts
```


### Archivo modificable sólo si hace falta una corrección técnica mínima de tipado


```text
workspace/backend/src/modules/ai-advisor/ai-advisor.schemas.ts
```


No modificarlo si el fix puede resolverse correctamente en el servicio.


### Archivos congelados


No modificar:


- `workspace/frontend/tests/ai-advisor.spec.ts`;
- ningún otro spec Playwright;
- frontend productivo;
- prompt del Asesor IA;
- schemas JSON de respuesta;
- Prisma schema;
- migraciones;
- package files;
- lockfiles;
- servicios financieros;
- cálculos;
- endpoints;
- puertos;
- configuración Ollama.


El test focal es correcto y no debe debilitarse.


---


## 5. Implementación obligatoria


### 5.1 Normalización explícita del período


Crear una función pura o valor equivalente que construya siempre un objeto nuevo y exacto:


```ts
type AiAdvisorPeriod = {
  from: string;
  to: string;
};


function normalizeAdvisorPeriod(
  input: Pick<AiAdvisorContextQueryInput, "from" | "to">,
): AiAdvisorPeriod {
  return {
    from: input.from,
    to: input.to,
  };
}
```


Los nombres pueden variar, pero la semántica es obligatoria.


### 5.2 Uso en `context()`


`context()` debe:


1. normalizar el período;
2. usar ese período para `collect()`;
3. usar ese mismo período para `buildAiAdvisorContext()`.


### 5.3 Uso en `ask()`


`ask()` debe:


1. extraer exclusivamente `{from,to}`;
2. crear un período nuevo y normalizado;
3. usarlo para `collect()`;
4. usarlo para `buildAiAdvisorContext()`;
5. mantener pregunta, modo, moneda y escenario fuera del contexto financiero base.


Está prohibido volver a pasar el objeto completo `input` a `buildAiAdvisorContext()`.


### 5.4 Construcción del contexto


Dentro de `buildAiAdvisorContext()`:


- `context.period` debe contener exactamente `from` y `to`;
- cada `source.period` debe contener exactamente `from` y `to`;
- cada drilldown debe derivar de ese período normalizado;
- el payload del fingerprint debe usar ese período normalizado.


No debe conservar referencias al objeto de entrada original.


### 5.5 Helper único de fingerprint


Centralizar la construcción del fingerprint en una función pura, por ejemplo:


Crear un helper puro para construir el fingerprint del contexto.


El helper debe recibir versión de esquema, período normalizado, versión de fórmula y fuentes. Debe reconstruir el período como `{from,to}`, excluir `action` del material hasheado, no mutar las fuentes, usar el canonicalizador existente y ser utilizado tanto por el contexto base como por `addSimulationSource()`.


### 5.6 Simulación y persistencia


Una simulación debe agregar una fuente `simulation.*` y producir un fingerprint distinto pero determinístico. Pregunta, modo, moneda y metadatos externos no deben afectar el hash. Mantener la persistencia actual, el prompt v1.2.0, los intentos, `previousRejectedOutput`, issues estructurados y todos los guardrails. No crear migraciones.


---


## 6. Tests backend obligatorios


Agregar cobertura que pruebe: igualdad de fingerprint entre `/context` y `/ask` con mismos datos; inmunidad ante propiedades extra, pregunta, modo y moneda; períodos con sólo `from` y `to`; drilldowns normalizados; simulaciones determinísticas y diferenciadas; ausencia de mutaciones; versión de fórmula conservada; reparación y guardrails sin regresión. No eliminar tests. El total final debe superar los 148 tests actuales.


---


## 7. Recuperación de SQLite


Antes de modificar código, detener CajaApp y restaurar el backup post-migración limpio cuyo SHA-256 es:


`E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208`


Restaurarlo como `I:\cajaApp-V3\workspace\backend\prisma\dev.db`, verificar hash y ejecutar `npx prisma migrate status`. Si el backup no existe, eliminar mediante APIs únicamente las interacciones cuyos IDs constan en la evidencia v1.0.12 y exigir que la base vuelva al hash anterior. Está prohibido resetear Prisma, truncar tablas, borrar datos del usuario o restaurar la base pre-migración.


---


## 8. Política de node_modules


Eliminar ambos `node_modules` al inicio, comprobar hashes de lockfiles y ejecutar `npm ci` por separado. No usar `npm install`, copiar dependencias ni modificar lockfiles. Al cierre, verificar nuevamente los lockfiles y eliminar ambos `node_modules`.


---


## 9. Gates


Backend, desde `I:\cajaApp-V3\workspace\backend`:


`npm ci`, `npx prisma generate`, `npx prisma migrate status`, `npm run build`, `npm test`.


Frontend, desde `I:\cajaApp-V3\workspace\frontend`:


`npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`.


Todos deben terminar PASS. No modificar frontend ni los tests Playwright.


---


## 10. Smoke y validación real


Con la app levantada mediante los scripts autoritativos, ejecutar tres ciclos GET `/api/ai-advisor/context` y POST `/api/ai-advisor/ask` usando mismo período, modo analysis, ARS y sin escenario.


Los fingerprints deben coincidir exactamente en 3/3 ciclos. Ningún `period` de contexto o cita puede contener modo, pregunta, moneda o escenario.


Luego ejecutar cinco consultas reales consecutivas con la pregunta: “Explicá el balance realizado y esperado usando sólo fuentes de CajaApp.” Gate: 5/5 HTTP 201, sin sustituir fallos con consultas adicionales.


---


## 11. Playwright


Ejecutar dos veces, con Chromium, un worker, cero retries y trace activo:


`playwright test tests/ai-advisor.spec.ts --project=chromium --workers=1 --retries=0 --trace=on`


Gate focal: 2/2 PASS. Luego ejecutar la suite completa con los mismos parámetros. Gate completo: todos PASS. No modificar el spec focal ni deshabilitar tests.


---


## 12. Cleanup


Eliminar por API todos los datos UAT creados, detener backend y frontend, liberar puertos y restaurar el baseline post-migración. Verificar el hash E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208, Prisma actualizado, cero procesos de CajaApp, lockfiles sin cambios y `node_modules` inexistente.


---


## 13. Evidencia


Crear `architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-AI-FINGERPRINT-CONSISTENCY-AND-FINAL-VALIDATION-evidence-v1.0.13`.


Debe incluir veredicto, entorno, preflight, diagnóstico v1.0.12, recuperación SQLite, resumen de cambios, diseño del fingerprint, inventarios inicial/final, comparación de lockfiles, logs de npm ci, Prisma, builds, tests, tres smokes, cinco consultas reales numeradas correctamente, dos ejecuciones focales, suite completa, ZIP de resultados, cleanup, SQLite final, known issues, inventario con tamaño y SHA-256 y `40-deliverable-to-architect.md`.


Ningún archivo puede faltar, estar vacío o ser placeholder. No reutilizar logs de v1.0.12, no incluir secretos ni `node_modules` y verificar la sincronización completa.


Mover la evidencia v1.0.12 desde `pending-validation` a `rejected` sin modificarla.


---


## 14. Criterio final


La campaña termina correctamente únicamente cuando todos los gates definidos quedan aprobados.


Deben aprobarse el alcance, la normalización del período, los tres ciclos de consistencia y las simulaciones determinísticas.


También deben aprobarse backend, frontend, las cinco consultas reales, las dos ejecuciones focales y la suite completa.


La base final debe coincidir con el baseline post-migración, los lockfiles deben permanecer intactos, `node_modules` debe quedar ausente y la evidencia debe estar completa y sincronizada.


Cualquier incumplimiento se registra como FAIL. La categoría BLOCKED queda reservada únicamente para una dependencia externa demostrable.


No iniciar otro vertical. Entregar `40-deliverable-to-architect.md` y esperar auditoría.


**Fin de la instrucción `APPCAJA-V3-AI-FINGERPRINT-CONSISTENCY-AND-FINAL-VALIDATION-v1.0.13`.**