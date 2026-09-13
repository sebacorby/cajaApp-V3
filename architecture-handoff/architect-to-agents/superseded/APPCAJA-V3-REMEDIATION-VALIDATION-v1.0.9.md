# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.9

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Fecha:** 2026-07-15  
**Root operativo obligatorio del agente:** `I:\cajaApp-V3-real`  
**Repo canónico administrado por el arquitecto:** Google Drive, sincronizado en `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Remediar exclusivamente las causas raíz confirmadas por la auditoría de la campaña `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8` y ejecutar una validación consolidada completa.

La campaña `v1.0.8` terminó en `FAIL` técnico válido:

- backend: PASS, 129 tests;
- frontend: typecheck, lint y build PASS;
- SQLite, restauración y cleanup: PASS;
- Playwright: 17/25 PASS, 8 FAIL;
- Asesor IA real: HTTP 422.

La auditoría de trazas, capturas, snapshots, respuestas HTTP y fuentes activas determinó que los ocho fallos no son ocho defectos funcionales independientes. Se agrupan en:

1. **Asesor IA — defecto real de contrato y robustez frente a salida no determinística del modelo.**
2. **Sidebar — defecto real de layout e interacción en alturas de viewport reducidas.**
3. **Playwright/UAT — seis desalineaciones de selectores, sincronización u oráculos de prueba.**

El agente debe corregir únicamente estos puntos. No debe abrir nuevos verticales ni reinterpretar funcionalidades ya validadas.

---

## 2. Veredicto arquitectónico de los ocho fallos

| Falla v1.0.8 | Clasificación | Causa raíz confirmada | Acción |
|---|---|---|---|
| Asesor IA HTTP 422 | Producto | El modelo recibe un contexto que contiene `summary`, aunque sólo `sources` es citable; no recibe un catálogo explícito de IDs permitidos y produce salidas contractualmente inválidas de forma variable | Remediar servicio, prompt y regresiones |
| Categorías timeout | Test/UAT | Carrera de cierre y reapertura del `Sheet`; el overlay anterior intercepta la reapertura | Sincronizar cierre real antes de reabrir |
| Gráficos strict mode por `Actualizar` | Test/UAT | Selector global coincide con dos botones | Acotar al `dashboard-section` |
| CSV débito strict mode | Test/UAT | La misma descripción existe en tabla desktop y tarjeta responsive dentro del DOM | Acotar a representación visible |
| PDF muestra 112 filas | Test/UAT | El backend devuelve 118 filas; la UI omite intencionalmente 4 `legal_text` y 2 encabezados, por lo que 112 es correcto | Reemplazar umbral arbitrario por paridad semántica |
| Deuda futura strict mode por `Confirmado` | Test/UAT | Coinciden etiqueta de grupo y badge de estado | Acotar al grupo y badge correctos |
| Búsqueda global mobile | Test/UAT | Carrera de cierre y reapertura del `Dialog`; overlay en transición intercepta el click | Esperar desmontaje/cierre real antes de reabrir |
| Sidebar timeout | Producto | Sidebar desktop de altura fija no tiene scroll; sus indicadores quedan fuera del viewport | Hacer el contenedor verticalmente accesible |

---

## 3. Gobierno y restricciones

1. `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8` queda cerrada como `FAIL` y superseded.
2. Esta `v1.0.9` es la única campaña vigente.
3. El agente opera únicamente en `I:\cajaApp-V3-real`.
4. `I:\cajaApp-V3` se utiliza sólo para leer esta instrucción y las fuentes canónicas sincronizadas.
5. No copiar el workspace completo entre roots.
6. No crear scripts auxiliares, wrappers, runners alternativos ni automatizaciones ad hoc.
7. Usar Playwright CLI y las herramientas nativas existentes.
8. No cambiar dependencias, Prisma, migraciones, contratos financieros, fórmulas, APIs ajenas al alcance ni datos reales.
9. No debilitar guardrails para obtener HTTP 201.
10. No usar `force: true`, tiempos de espera inflados, retries o `.first()` globales como forma de ocultar selectores incorrectos.
11. Un fallo durante la campaña no autoriza cambios adicionales fuera del alcance.
12. Todo cambio debe quedar explicado y respaldado con evidencia.

---

## 4. Archivos autorizados

### 4.1 Asesor IA

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`
- `contracts/prompts/advisor/01-explain-financial-context.md`
- `workspace/frontend/tests/ai-advisor.spec.ts`, sólo si es necesario ajustar la evidencia del flujo real; no reducir sus validaciones.

### 4.2 Sidebar

- `workspace/frontend/src/components/finance/layout/app-shell.tsx`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- `workspace/frontend/tests/sidebar-data-quality.spec.ts`

### 4.3 Corrección de UAT

- `workspace/frontend/tests/categories.spec.ts`
- `workspace/frontend/tests/chart-parity.spec.ts`
- `workspace/frontend/tests/debit-csv-import.spec.ts`
- `workspace/frontend/tests/e2e/card-statement-import.spec.ts`
- `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts`
- `workspace/frontend/tests/global-search.spec.ts`

No modificar otros archivos sin detener la tarea y declarar `BLOCKED` con evidencia de una dependencia técnica inevitable.

---

## 5. Remediación A — Asesor IA

### 5.1 Problema confirmado

La respuesta del modelo no es estable:

- una consulta real citó `summary.currencies.ARS`, que es una ruta JSON y no un `sourceId`;
- otra ejecución produjo un porcentaje no respaldado literalmente por las fuentes citadas;
- los guardrails rechazaron correctamente ambas respuestas.

El defecto no está en la decisión de rechazar. El defecto está en el contrato presentado al modelo y en la falta de recuperación controlada ante una salida inválida.

### 5.2 Resultado obligatorio

El proveedor debe recibir un contexto inequívoco donde:

1. sólo los elementos citables estén expuestos como evidencia factual;
2. exista un catálogo explícito de IDs permitidos;
3. quede prohibido citar rutas JSON, claves de resumen, labels inventados o IDs aproximados;
4. todo `sourceId` se copie exactamente, byte por byte, desde el catálogo permitido;
5. los números de claims y riesgos aparezcan literalmente en las fuentes citadas;
6. la validación estricta del backend continúe siendo la autoridad final.

### 5.3 Cambios requeridos en el servicio

Implementar un payload específico para el proveedor. No enviar ciegamente el `AiAdvisorContext` interno completo como si todo fuera citable.

El payload debe incluir, como mínimo:

- período y modo;
- pregunta no confiable;
- metadatos no factuales necesarios;
- `citationCatalog`, generado desde `context.sources`;
- `allowedSourceIds`, generado exactamente con `context.sources.map(source => source.id)`;
- cada fuente con su `id`, `kind`, `label`, `description`, `currency`, `value`, `rule` y período;
- simulación determinística únicamente cuando corresponda.

`summary` puede seguir existiendo en el contrato interno y en la respuesta de contexto de CajaApp, pero no debe presentarse al modelo como una fuente citable ambigua. Si se incluye por una razón técnica demostrable, debe quedar claramente marcado como `nonCitableSummary` y el prompt debe prohibir citarlo.

### 5.4 Recuperación controlada

Agregar como máximo **un único intento de reparación** cuando la primera salida del modelo sea sintácticamente válida pero falle por alguno de estos motivos recuperables:

- schema de salida inválido;
- `AI_ADVISOR_UNKNOWN_SOURCE`;
- `AI_ADVISOR_UNGROUNDED_NUMBER`.

El intento de reparación debe:

1. conservar la salida original para evidencia;
2. informar al modelo únicamente los errores concretos;
3. volver a enviar el catálogo exacto de IDs permitidos;
4. exigir JSON corregido sin texto adicional;
5. no cambiar datos, cálculos ni fuentes;
6. no ejecutar más de una vez;
7. volver a pasar por todos los validadores;
8. devolver el error final si la reparación también falla.

No se autoriza:

- traducir silenciosamente `summary.currencies.ARS` a una fuente;
- agregar rutas JSON a la lista de fuentes válidas;
- quitar validaciones numéricas;
- aceptar una respuesta parcial;
- inventar citas desde el backend;
- reconstruir claims autoritativos sin el modelo.

### 5.5 Prompt

Actualizar `contracts/prompts/advisor/01-explain-financial-context.md`.

Debe declarar expresamente:

- `citationCatalog` es el único conjunto factual citable;
- `allowedSourceIds` es la lista cerrada;
- cada `sourceId` debe coincidir exactamente con un valor de esa lista;
- rutas como `summary.*`, nombres de campos, labels y descripciones no son IDs;
- no debe escribirse ningún porcentaje, conteo, fecha o importe que no aparezca literalmente en las fuentes citadas;
- ante evidencia insuficiente debe reducir confianza y declarar la limitación, no completar el dato;
- en una reparación debe corregir sólo los errores informados y mantener el resto del contrato.

Incrementar las versiones de prompt/contexto/respuesta únicamente cuando sea técnicamente necesario y mantener compatibilidad explícita. Registrar el hash final del prompt.

### 5.6 Pruebas backend obligatorias

Agregar o ajustar regresiones que demuestren:

1. `summary.currencies.ARS` continúa siendo rechazado como fuente inexistente.
2. El payload del proveedor enumera todos y sólo los IDs válidos.
3. El payload no expone `summary` como fuente citable.
4. Una primera respuesta con fuente inválida dispara exactamente un intento de reparación.
5. Una reparación válida termina en respuesta exitosa y citas materializadas.
6. Dos respuestas inválidas terminan en 422, sin tercer intento.
7. Un número no respaldado continúa siendo rechazado.
8. Fechas ISO no vuelven a producir falsos negativos numéricos.
9. La interacción persistida identifica petición inicial y reparación sin guardar secretos.
10. No se modifican registros financieros.

---

## 6. Remediación B — Sidebar accesible en altura reducida

### 6.1 Problema confirmado

En viewport desktop de `1280x720`, el sidebar usa una envoltura `h-screen` sin overflow vertical. Los indicadores técnicos ubicados debajo del menú quedan fuera del viewport y Playwright no puede desplazarlos ni clickearlos.

### 6.2 Resultado obligatorio

El sidebar desktop debe permitir acceder mediante scroll a:

- movimientos sin clasificar;
- alertas activas;
- último dato actualizado;
- aviso de datos locales.

El cambio no debe alterar navegación, datos, textos ni comportamiento mobile.

### 6.3 Implementación esperada

Ajustar el contenedor desktop para que la columna lateral tenga scroll vertical propio, por ejemplo mediante una combinación equivalente a:

- `h-screen`;
- `overflow-y-auto`;
- `overscroll-contain`;
- estructura flex con `min-h-0` donde corresponda.

No aplicar alturas mágicas, ocultar tarjetas, reducir información ni mover los indicadores al contenido principal.

### 6.4 Regresión obligatoria

Mantener el test funcional existente e incorporar dentro del mismo escenario una validación desktop con altura reducida:

- viewport `1280x720`;
- panel visible o desplazable;
- click real, sin `force`;
- navegación correcta desde los tres indicadores;
- validación mobile existente conservada.

---

## 7. Remediación C — Seis correcciones de Playwright/UAT

### 7.1 Categorías

Después de cerrar `category-management-sheet`:

1. guardar un locator estable al sheet;
2. presionar Escape;
3. esperar que el sheet esté oculto o desmontado;
4. confirmar que el overlay anterior ya no intercepta;
5. recién entonces volver a abrir;
6. esperar visibilidad antes de buscar `Restaurar categoría`.

No modificar backend ni UI de categorías.

### 7.2 Gráficos

Reemplazar el selector global de `Actualizar` por uno acotado a `dashboard-section` o por el test id específico del control correcto.

No usar `.first()` sobre los dos botones coincidentes.

### 7.3 CSV débito

Acotar la fila importada a la representación visible:

- tabla desktop visible; o
- tarjeta responsive visible.

La prueba debe admitir que ambas representaciones existan en el DOM. El cleanup debe verificar ausencia semántica sin asumir un único nodo global.

No modificar la UI responsive ni eliminar una representación.

### 7.4 PDF de tarjeta

Eliminar el umbral arbitrario `rowCount >= 125`.

La prueba debe comparar el preview estructurado con lo renderizable:

1. leer la respuesta autoritativa del draft;
2. conservar validación de banco, marca, totales y cuatro grupos;
3. calcular filas renderizables excluyendo únicamente los tipos que la UI omite por diseño:
   - `legal_text`;
   - `section_header`;
   - `group_header`;
4. exigir igualdad exacta entre filas renderizables y nodos `card-statement-row`;
5. validar conteos semánticos relevantes, especialmente transacciones, impuestos y total;
6. conservar la comprobación contra el valor monetario erróneo histórico.

No modificar extractor, mapper ni `tarjetas-section.tsx` a partir de este fallo.

### 7.5 Deuda futura

Acotar `Confirmado` al grupo que contiene el compromiso creado y al badge de estado correspondiente.

No buscar globalmente el texto porque también existe como etiqueta de agrupación.

### 7.6 Búsqueda global mobile

Después de seleccionar el resultado desktop:

1. conservar locator del dialog;
2. esperar cierre o desmontaje completo;
3. esperar desaparición del overlay;
4. cambiar viewport;
5. clickear el botón mobile;
6. esperar el nuevo dialog visible y su input.

No modificar `header.tsx` ni `global-search-dialog.tsx` a partir de este fallo.

---

## 8. Preflight e integridad

Antes de modificar:

1. confirmar `Resolve-Path 'I:\cajaApp-V3-real'`;
2. confirmar que no se opera en `I:\cajaApp-V3`;
3. registrar versión exacta de Node;
4. registrar hashes iniciales de todos los archivos autorizados;
5. limpiar artefactos generados: `dist`, `.next`, `coverage`, `playwright-report`, `test-results`;
6. confirmar ausencia de archivos técnicos activos con BOM o sufijos de copia;
7. confirmar estado inicial de lockfiles.

Al cierre:

1. registrar hashes finales;
2. demostrar que sólo cambiaron archivos autorizados;
3. demostrar lockfiles sin cambios;
4. demostrar ausencia de archivos auxiliares creados por el agente.

---

## 9. Protección de SQLite

Base real:

`I:\cajaApp-V3-real\workspace\backend\prisma\dev.db`

Antes de cualquier prueba:

1. registrar tamaño, fecha y SHA-256;
2. crear backup fuera de la ruta activa;
3. comprobar hash idéntico.

En `finally`, incluso ante FAIL:

1. detener CajaApp mediante el script autoritativo;
2. restaurar SQLite;
3. comprobar hash final idéntico al inicial;
4. confirmar ausencia de datos UAT;
5. confirmar puertos 11436 y 11437 libres;
6. confirmar cero procesos Node de CajaApp.

Una diferencia de hash es `FAIL crítico`.

---

## 10. Toolchain y comandos

Usar exclusivamente:

- `I:\Tools\node-v24.18.0-win-x64\node.exe`
- `I:\Tools\node-v24.18.0-win-x64\npm.cmd`
- `I:\Tools\node-v24.18.0-win-x64\npx.cmd`

No resolver `node`, `npm` o `npx` desde PATH.

No crear scripts para ejecutar pruebas.

---

## 11. Orden de trabajo obligatorio

### Fase 9A — implementación acotada

1. Remediar Asesor IA.
2. Ejecutar sus pruebas unitarias focalizadas.
3. Remediar sidebar.
4. Corregir los seis specs Playwright.
5. Ejecutar typecheck y lint.
6. Ejecutar únicamente los specs afectados.
7. Sólo cuando todos los focalizados pasen, iniciar la campaña completa.

Si un focalizado falla, corregir dentro del alcance antes de continuar. No iniciar Playwright completo con fallos focalizados conocidos.

### Fase 9B — backend completo

En `workspace/backend`:

1. `npm ci`
2. `npm run prisma:generate`
3. `npm run prisma:migrate:deploy`
4. `npx prisma migrate status`
5. `npm run build`
6. `npm run test`

Criterio: todos PASS; lockfile sin cambios.

### Fase 9C — frontend completo

En `workspace/frontend`:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

Criterio: todos PASS; lockfile sin cambios.

### Fase 9D — arranque autoritativo

Detener:

```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

Arrancar:

```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```

No usar otro mecanismo.

### Fase 9E — Asesor IA real

Ejecutar tres consultas reales independientes, modo `analysis`, sin simulación:

1. explicar balance realizado y esperado;
2. explicar riesgos ya detectados por CajaApp;
3. explicar qué datos faltantes reducen la confianza.

Para cada consulta exigir:

- HTTP 201;
- request ID real;
- contexto y prompt versionados;
- todos los `sourceIds` dentro de `allowedSourceIds`;
- citas materializadas;
- cero números no respaldados;
- cero rutas `summary.*` usadas como fuente;
- máximo un intento de reparación;
- evidencia de petición inicial, validación y eventual reparación, sin secretos;
- historial creado y posteriormente limpiado;
- cero modificaciones financieras.

Las tres deben terminar en 201. Un 422 de negocio es `FAIL`, no indisponibilidad externa.

### Fase 9F — Playwright completo

Variables:

```powershell
$env:CAJAAPP_API_BASE_URL = "http://127.0.0.1:11436"
$env:CAJAAPP_FRONTEND_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_HTML_OPEN = "never"
```

Ejecutar:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Criterios:

- discovery completo;
- todos PASS;
- cero failed;
- cero skipped;
- cero retries;
- `ai-advisor.spec.ts` incluido;
- evidencia preservada antes del cleanup;
- ningún test resuelto mediante `force`, timeout inflado o selector ambiguo.

---

## 12. Evidencia obligatoria

Crear únicamente:

`I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.9`

Contenido mínimo:

- `00-verdict.md`
- `01-environment.md`
- `02-integrity-preflight.md`
- `03-file-inventory.txt`
- `04-change-summary.md`
- logs de Prisma, build y tests backend;
- logs de typecheck, lint y build frontend;
- resultados focalizados;
- `20-playwright.log`
- `21-playwright-summary.md`
- `22-ai-advisor-real.md`
- Playwright HTML/JSON;
- traces, screenshots y videos de cualquier fallo;
- evidencia de las tres consultas IA;
- hashes iniciales y finales;
- estado de SQLite y cleanup;
- `27-known-issues.md`.

`04-change-summary.md` debe explicar por archivo:

- qué cambió;
- por qué;
- qué causa raíz corrige;
- qué prueba lo demuestra.

---

## 13. Criterio final

### PASS

Sólo si:

- backend completo PASS;
- frontend completo PASS;
- tres consultas reales del Asesor IA terminan en HTTP 201;
- Playwright completo PASS;
- sidebar accesible en altura reducida;
- PDF validado por paridad semántica;
- SQLite restaurado con hash idéntico;
- cleanup completo;
- sólo cambiaron archivos autorizados.

### FAIL

Ante cualquier defecto reproducible, 422 de negocio, prueba fallida, inconsistencia de citas, dato UAT residual, modificación fuera de alcance o diferencia de SQLite.

### BLOCKED

Únicamente ante una imposibilidad externa demostrable que impida ejecutar la campaña y no sea causada por el código, la configuración o el contrato del proyecto.

---

## 14. Entrega del agente

El agente debe responder con:

1. veredicto;
2. ruta exacta de evidencia;
3. lista de archivos modificados;
4. resumen de gates;
5. resultado individual de las tres consultas IA;
6. resultado Playwright;
7. hash inicial/final de SQLite;
8. known issues honestos.

No debe afirmar PASS parcial como PASS total.
