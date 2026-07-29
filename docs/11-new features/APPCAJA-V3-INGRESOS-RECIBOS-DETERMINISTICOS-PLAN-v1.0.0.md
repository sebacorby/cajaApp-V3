# APPCAJA V3 — Plan de sustitución de IA en recibos de sueldo por importación determinística

**ID:** `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-001`  
**Versión:** `1.0.0`  
**Fecha:** `2026-07-29`  
**Estado:** `PLANIFICADO — IMPLEMENTACIÓN NO INICIADA`  
**Repositorio:** `sebacorby/cajaApp-V3`  
**Rama de trabajo:** `feat/ingresos`  
**Commit base relevado:** `1bf854c8d9c198ea5615ce721ff0d144d561c0e8`  
**Responsable de diseño e implementación:** ChatGPT  
**Responsable de ejecución de pruebas:** agente externo  
**Aceptación funcional final:** usuario  

---

## 1. Objetivo

Eliminar del flujo de importación de recibos de sueldo la interpretación realizada por un modelo de IA y reemplazarla por un proceso determinístico equivalente, en principios y organización, al utilizado en la importación de resúmenes de tarjeta.

El flujo objetivo será:

```text
PDF
  -> extracción local de texto
  -> normalización conservadora
  -> detección explícita de layout
  -> parser específico por formato
  -> validación de completitud
  -> conciliación de totales
  -> vista previa editable
  -> aceptación y persistencia
```

La importación no deberá depender de Ollama, APIs compatibles con OpenAI, prompts, reparación de JSON ni disponibilidad de un modelo.

---

## 2. Resultado funcional esperado

Al finalizar el vertical:

1. Un recibo cuyo layout esté soportado podrá importarse sin ningún proveedor de IA disponible.
2. El mismo texto de entrada producirá siempre el mismo resultado.
3. Ningún campo obligatorio será inventado ni completado silenciosamente.
4. Toda línea monetaria relevante será interpretada o provocará un error de completitud.
5. Los totales calculados deberán coincidir exactamente, en centavos, con los totales impresos.
6. Un layout desconocido deberá devolver un error explícito y no una interpretación aproximada.
7. La vista previa seguirá siendo editable antes de aceptar.
8. La aceptación seguirá creando o actualizando los ingresos derivados del recibo.
9. Los registros históricos asociados a ejecuciones de IA seguirán siendo legibles.
10. Las demás funciones de IA de CajaApp V3 quedarán fuera de alcance.

---

## 3. Estado actual relevado

### 3.1. Recibos de sueldo

El módulo canónico se encuentra en:

```text
workspace/backend/src/modules/salary-receipts/
```

Archivos actuales principales:

```text
salary-receipt-extraction.service.ts
salary-receipts.controller.ts
salary-receipts.routes.ts
salary-receipts.schemas.ts
salary-receipts.service.ts
salary-receipts.types.ts
```

El flujo actual concentra la extracción semántica en `salary-receipt-extraction.service.ts` y utiliza componentes del módulo de IA para obtener y reparar una respuesta JSON.

El borrador de recibo puede relacionarse con `AiExtractionRun`. Esa relación es opcional en Prisma, por lo que las nuevas importaciones pueden dejar `aiRunId = null` sin eliminar inmediatamente la estructura histórica.

### 3.2. Importación determinística de tarjetas

El patrón de referencia se encuentra en:

```text
workspace/backend/src/modules/card-import/
```

Componentes de referencia:

```text
card-statement-parser.ts
card-statement-parser.types.ts
deterministic-imports.service.ts
galicia-mastercard.parser.base.ts
galicia-mastercard.parser.ts
galicia-visa.parser.base.ts
galicia-visa.parser.ts
__fixtures__/
```

El patrón que se reutilizará conceptualmente es:

- detector de layout;
- parser programático por formato;
- contrato común de salida;
- diagnósticos;
- validación de cobertura;
- fallo explícito cuando el formato no es soportado;
- separación entre parseo y persistencia.

No se copiarán ciegamente supuestos específicos de tarjetas.

---

## 4. Principios de diseño obligatorios

### 4.1. Determinismo

Para una misma combinación de:

```text
rawText + pageCount + parserVersion
```

el resultado deberá ser idéntico.

No se permitirán:

- llamadas a modelos;
- temperatura o aleatoriedad;
- reparación heurística mediante IA;
- uso de la fecha actual como reemplazo de un período ausente;
- nombres genéricos para ocultar campos no detectados;
- aceptación silenciosa de líneas monetarias no explicadas.

### 4.2. Fallo cerrado

Ante duda estructural, el parser deberá fallar y aportar diagnósticos.

No deberá devolver una vista previa aparentemente válida cuando:

- no se reconoce el layout;
- falta el período;
- no se reconoce el empleado o el empleador;
- no se detectan conceptos;
- hay importes no asignados;
- los totales no cierran;
- el texto extraído está vacío o es insuficiente.

### 4.3. Exactitud monetaria

Todos los cálculos se realizarán con centavos enteros o con la abstracción decimal canónica existente.

No se utilizarán operaciones financieras con `number` de punto flotante sin normalización.

### 4.4. Trazabilidad

Cada concepto deberá conservar, cuando el layout lo permita:

- código;
- descripción;
- importe;
- clasificación;
- página de origen;
- número de línea;
- texto de origen;
- orden original;
- identificador del parser;
- versión del parser.

### 4.5. Privacidad

Los recibos contienen datos personales, laborales y tributarios.

Por defecto no deberán persistirse ni registrarse en logs:

- nombres completos;
- CUIL/CUIT completos;
- legajos;
- domicilio;
- texto bruto completo;
- importes completos fuera de la base funcional correspondiente.

Los artefactos de diagnóstico con texto completo sólo podrán habilitarse explícitamente en desarrollo.

---

## 5. Arquitectura objetivo

### 5.1. Contratos nuevos

Crear, como mínimo:

```text
workspace/backend/src/modules/salary-receipts/
  salary-receipt-parser.types.ts
  salary-receipt-parser.ts
  salary-receipt-parser.utils.ts
  salary-receipt-parser.errors.ts
  salary-receipt-parser.service.ts
  parsers/
    <layout>.salary-receipt.parser.ts
```

La organización exacta podrá ajustarse durante la implementación si el código canónico demuestra que otra distribución evita duplicación.

### 5.2. Contrato principal

Interfaz conceptual:

```ts
export interface SalaryReceiptParser {
  readonly id: string;
  readonly version: string;

  supports(input: SalaryReceiptParserInput): boolean;

  parse(input: SalaryReceiptParserInput): SalaryReceiptParseResult;
}
```

Entrada conceptual:

```ts
export interface SalaryReceiptParserInput {
  rawText: string;
  pageCount: number;
  sourceFileName?: string;
}
```

Salida conceptual:

```ts
export interface SalaryReceiptParseResult {
  preview: SalaryReceiptPreview;
  diagnostics: SalaryReceiptParseDiagnostics;
  parser: {
    id: string;
    version: string;
  };
}
```

La firma definitiva deberá reutilizar tipos existentes y evitar contratos duplicados.

### 5.3. Registro de parsers

`salary-receipt-parser.ts` actuará como orquestador:

1. normaliza el texto sin destruir columnas útiles;
2. ejecuta detectores;
3. exige un único parser compatible;
4. procesa el documento;
5. valida el resultado;
6. devuelve preview y diagnósticos.

Casos:

- cero coincidencias: `UnsupportedSalaryReceiptLayoutError`;
- más de una coincidencia: error de detección ambigua;
- una coincidencia: ejecutar ese parser.

### 5.4. Servicio de importación

`salary-receipt-parser.service.ts` será responsable de:

- validar el tipo de archivo;
- llamar al extractor PDF local;
- verificar que exista texto utilizable;
- invocar el parser determinístico;
- validar el preview con el schema canónico;
- medir duración;
- devolver datos listos para persistencia.

El servicio no deberá importar módulos de IA.

### 5.5. Persistencia

El flujo de persistencia conservará el ciclo de vida actual del borrador:

```text
processing
  -> preview_ready
  -> accepted
```

o los estados canónicos equivalentes ya definidos.

Para nuevas importaciones:

- crear `UploadedDocument`;
- crear `SalaryReceiptDraft`;
- ejecutar extracción y parser;
- persistir conceptos;
- persistir `previewJson`;
- persistir diagnósticos seguros;
- establecer `aiRunId = null`;
- exponer la vista previa.

No se creará `AiExtractionRun`.

---

## 6. Corpus y fixtures

### 6.1. Fuente de verdad del parser

Los parsers se desarrollarán contra texto real extraído por el extractor PDF canónico, no contra texto copiado manualmente desde una captura.

Directorio propuesto:

```text
workspace/backend/tests/fixtures/salary-receipts/
  <layout-id>/
    regular.raw.txt
    aguinaldo.raw.txt
    vacaciones.raw.txt
    expected.regular.json
    expected.aguinaldo.json
    expected.vacaciones.json
```

### 6.2. Anonimización

Los fixtures deberán estar anonimizados sin romper:

- posiciones;
- anchos;
- saltos de línea;
- cantidad de dígitos;
- separadores de miles y decimales;
- encabezados;
- orden de columnas;
- códigos de concepto.

### 6.3. Regla de soporte

Un layout sólo se declarará soportado cuando exista al menos:

- un fixture real anonimizado;
- resultado esperado;
- detector específico;
- parser específico;
- cobertura de encabezados;
- cobertura de conceptos;
- cobertura de totales;
- caso de fallo controlado.

---

## 7. Detección del layout

Cada parser deberá definir marcadores positivos y negativos.

Ejemplos de marcadores positivos:

- razón social o formato de encabezado;
- etiquetas de CUIT/CUIL;
- nombres exactos de columnas;
- leyendas de totales;
- posición relativa entre período, empleado y conceptos;
- combinación estable de términos.

Ejemplos de marcadores negativos:

- encabezados de otro empleador;
- columnas incompatibles;
- ausencia de etiquetas obligatorias;
- documentos que no sean recibos.

La detección no deberá depender únicamente del nombre del archivo.

---

## 8. Extracción del encabezado

Campos objetivo:

- empleador;
- CUIT del empleador;
- empleado;
- CUIL del empleado;
- legajo, si existe;
- período liquidado;
- fecha de pago, si existe;
- moneda;
- tipo de liquidación, si puede determinarse de forma inequívoca.

Reglas:

1. El período se normalizará a `YYYY-MM` sólo cuando el dato original sea inequívoco.
2. No se usará el mes actual como fallback.
3. No se crearán valores como “sin identificar”.
4. CUIL y CUIT deberán validar estructura y dígito verificador cuando el proyecto disponga de utilidad canónica.
5. Los campos opcionales podrán permanecer en `null`.
6. Los campos obligatorios ausentes detendrán la importación.

---

## 9. Extracción y clasificación de conceptos

Cada concepto deberá clasificarse usando principalmente la estructura del layout:

- columna de haberes remunerativos;
- columna de haberes no remunerativos;
- columna de descuentos;
- columna de aportes o información patronal;
- sección informativa.

Clasificación conceptual inicial:

```text
earning
non_remunerative_earning
deduction
employer_contribution
informational
```

La enumeración final deberá alinearse con los tipos actuales y evitar una migración innecesaria.

No se dependerá exclusivamente de palabras clave como “jubilación”, “obra social” o “sindicato”. Las palabras clave podrán complementar, pero no reemplazar, la interpretación de columnas y secciones.

---

## 10. Totales y conciliación

El parser calculará:

```text
totalHaberesRemunerativos
totalHaberesNoRemunerativos
totalDescuentos
totalBruto
totalNetoCalculado
```

Conciliación mínima:

```text
totalBruto
  = haberes remunerativos
  + haberes no remunerativos

totalNetoCalculado
  = totalBruto
  - totalDescuentos
```

Luego comparará con los totales impresos.

La tolerancia por defecto será de cero centavos. Una tolerancia distinta sólo podrá introducirse si un fixture real demuestra una regla de redondeo documentable.

---

## 11. Errores de dominio

Agregar errores distinguibles y traducibles a respuestas API estables:

```text
SALARY_RECEIPT_LAYOUT_UNSUPPORTED
SALARY_RECEIPT_LAYOUT_AMBIGUOUS
SALARY_RECEIPT_TEXT_EXTRACTION_EMPTY
SALARY_RECEIPT_HEADER_INCOMPLETE
SALARY_RECEIPT_PARSER_INCOMPLETE
SALARY_RECEIPT_TOTALS_MISMATCH
SALARY_RECEIPT_DUPLICATE
```

Cada error deberá incluir sólo diagnósticos seguros.

Ejemplo conceptual:

```json
{
  "code": "SALARY_RECEIPT_TOTALS_MISMATCH",
  "message": "Los totales del recibo no coinciden con los conceptos detectados.",
  "details": {
    "parserId": "empleador-x-v1",
    "differenceCents": 1250
  }
}
```

---

## 12. Diagnósticos

Diagnóstico propuesto:

```ts
export interface SalaryReceiptParseDiagnostics {
  parserId: string;
  parserVersion: string;
  pageCount: number;
  sourceLineCount: number;
  candidateConceptLineCount: number;
  parsedConceptCount: number;
  unexplainedMonetaryLineCount: number;
  requiredFieldsFound: string[];
  requiredFieldsMissing: string[];
  warnings: SalaryReceiptParseWarning[];
  totals: {
    printedGrossCents?: number;
    calculatedGrossCents: number;
    printedDeductionsCents?: number;
    calculatedDeductionsCents: number;
    printedNetCents?: number;
    calculatedNetCents: number;
  };
  durationMs: number;
}
```

En producción no se incluirá el texto sensible completo dentro de los diagnósticos.

---

## 13. Compatibilidad de API

### 13.1. Endpoint

Mantener inicialmente el endpoint canónico:

```text
POST /salary-receipts/import
```

Se conservará el flujo síncrono mientras la extracción local y el parseo sean rápidos.

No se copiará el polling de tarjetas salvo que una medición real demuestre que es necesario.

### 13.2. Respuesta

La respuesta continuará entregando el borrador y su preview.

Transición compatible:

- mantener temporalmente `aiRun: null` si el frontend lo espera;
- agregar `parser` y `diagnostics` sin romper consumidores;
- retirar metadata de IA en una limpieza posterior y explícita.

---

## 14. Cambios de frontend

El frontend conservará:

- selección del PDF;
- vista previa;
- edición de encabezado;
- edición de conceptos;
- recálculo;
- aceptación;
- reemplazo de un recibo del mismo período;
- generación o actualización del ingreso asociado.

Cambios de copy:

```text
Procesando el recibo con reglas programáticas…
Recibo procesado. Revisá los datos antes de aceptarlo.
El formato de este recibo todavía no está soportado.
Los totales del recibo no coinciden. Revisá el archivo o informá el formato.
```

Eliminar o esconder:

- proveedor de IA;
- modelo;
- prompt;
- estado de reparación JSON;
- respuesta cruda del modelo.

---

## 15. Migraciones y datos históricos

### 15.1. Primera etapa

No eliminar `AiExtractionRun` ni `SalaryReceiptDraft.aiRunId`.

Motivo:

- preservar recibos históricos;
- evitar una migración destructiva;
- desacoplar primero el flujo nuevo;
- permitir rollback.

### 15.2. Limpieza posterior

Sólo después de verificar que ningún consumidor depende de esa metadata se evaluará:

- retirar campos de DTO;
- retirar relaciones exclusivamente usadas por recibos;
- archivar prompts;
- eliminar configuración muerta.

Esta limpieza será un cambio separado.

---

## 16. Fases de implementación

### Fase 0 — Preparación y corpus

- identificar los formatos reales prioritarios;
- obtener salida del extractor PDF;
- anonimizar fixtures;
- definir resultados esperados;
- documentar limitaciones OCR.

**Salida:** corpus mínimo confiable.

### Fase 1 — Contratos y utilidades

- crear tipos;
- crear errores;
- crear normalización monetaria;
- crear utilidades de líneas y columnas;
- crear registro de parsers;
- crear diagnósticos.

**Salida:** infraestructura sin parser productivo.

### Fase 2 — Primer layout

- implementar detector;
- implementar encabezado;
- implementar conceptos;
- implementar totales;
- implementar validación de completitud;
- producir preview canónico.

**Salida:** primer formato soportado.

### Fase 3 — Sustitución del servicio de IA

- introducir `salary-receipt-parser.service.ts`;
- reemplazar llamadas desde el flujo de importación;
- dejar de crear `AiExtractionRun`;
- mantener compatibilidad de respuesta;
- aislar o retirar dependencias de prompt y reparación JSON.

**Salida:** importación funcional sin IA.

### Fase 4 — Persistencia y ciclo de vida

- verificar creación del borrador;
- persistir conceptos;
- persistir preview;
- mantener duplicados y reemplazos;
- mantener aceptación;
- mantener creación/actualización del ingreso;
- mantener rollback/reversión.

**Salida:** ciclo completo de backend.

### Fase 5 — Frontend

- actualizar copy y estados;
- mostrar errores determinísticos;
- retirar metadata de IA del flujo visible;
- conservar edición y aceptación.

**Salida:** experiencia coherente con el nuevo backend.

### Fase 6 — Limpieza

- retirar imports muertos;
- retirar prompt de recibos si ya no tiene consumidores;
- retirar reparación JSON exclusiva del flujo;
- documentar configuración obsoleta;
- verificar que otras funciones de IA continúen intactas.

**Salida:** deuda técnica mínima.

### Fase 7 — Validación final

- ejecutar gate no E2E completo;
- corregir defectos encontrados;
- declarar implementación terminada;
- recién entonces ejecutar E2E focalizado;
- realizar aceptación funcional del usuario.

**Salida:** evidencia técnica y funcional.

---

## 17. Forma de trabajo vinculante

Esta iniciativa adopta la siguiente separación de responsabilidades:

### 17.1. ChatGPT

ChatGPT:

- diseña la solución;
- inspecciona el código canónico;
- escribe todo el código de implementación;
- escribe o actualiza los tests automatizados necesarios;
- corrige los defectos reportados;
- mantiene el plan y la trazabilidad;
- no delega programación al agente de pruebas;
- no declara PASS sin evidencia ejecutada.

### 17.2. Agente externo

El agente externo:

- no programa ni redefine la solución;
- ejecuta los comandos de validación indicados;
- informa comando, salida, error y entorno;
- puede aislar una reproducción;
- no modifica código salvo autorización explícita del usuario.

### 17.3. Momento de las pruebas

Durante la implementación activa:

1. ChatGPT completa un bloque coherente de código.
2. El agente externo ejecuta únicamente validaciones no E2E.
3. El agente devuelve evidencia.
4. ChatGPT corrige el código.
5. El ciclo se repite hasta completar todo el vertical.
6. Los tests E2E quedan prohibidos durante las fases intermedias.
7. Los E2E se ejecutan únicamente cuando la implementación completa y los gates no E2E estén verdes.

### 17.4. Pruebas permitidas antes del gate final

Permitidas:

- build;
- typecheck;
- lint focalizado;
- tests unitarios;
- tests de parser;
- tests de servicios;
- tests de integración backend;
- validaciones de schema;
- pruebas de migración no destructivas;
- inspecciones estáticas.

No permitidas antes del final:

- Playwright;
- Cypress;
- suites end-to-end;
- recorridos automatizados punta a punta;
- aceptación funcional final del usuario.

### 17.5. Gate E2E final

El gate E2E sólo se habilita cuando:

- la implementación está declarada completa;
- no quedan tareas de código previstas dentro del alcance;
- build y typecheck están verdes;
- unitarias e integración están verdes;
- las migraciones aplican limpiamente;
- la documentación está actualizada;
- ChatGPT entrega una lista focalizada de escenarios E2E.

---

## 18. Estrategia de pruebas

ChatGPT escribirá los tests; el agente externo los ejecutará.

### 18.1. Unitarias del parser

- detección correcta del layout;
- rechazo de layouts desconocidos;
- rechazo de detección ambigua;
- normalización de importes argentinos;
- extracción de período;
- extracción de CUIT/CUIL;
- conservación del orden de conceptos;
- clasificación de haberes y descuentos;
- totalización exacta;
- fallo por línea monetaria no explicada;
- fallo por differencia de totales;
- determinismo de salida;
- no uso de fecha actual como fallback.

### 18.2. Integración de backend

- importación sin Ollama;
- importación sin proveedor OpenAI-compatible;
- ausencia de nuevos `AiExtractionRun`;
- persistencia del borrador;
- persistencia de conceptos;
- edición y recálculo;
- aceptación;
- reemplazo por mismo período;
- duplicados;
- creación o actualización de `IncomeEvent`;
- lectura de recibos históricos con `aiRunId`;
- rollback ante error del parser.

### 18.3. Frontend no E2E

- typecheck;
- tests de componentes existentes, si la base ya dispone de infraestructura;
- tests de mapeo de errores;
- tests de formateo y recálculo;
- build de producción.

### 18.4. E2E final

Escenarios mínimos:

1. importar un recibo soportado;
2. revisar preview;
3. editar un concepto;
4. confirmar recálculo;
5. aceptar;
6. verificar ingreso generado;
7. reemplazar un recibo del mismo período;
8. importar layout desconocido y ver error correcto;
9. ejecutar el flujo con IA apagada;
10. verificar que otras funciones de IA no se rompieron.

---

## 19. Comandos de validación previstos

Los comandos definitivos se ajustarán a los scripts canónicos disponibles.

Ejemplo de gate backend no E2E:

```bat
cd workspace\backend
npm run build
npx vitest run --no-file-parallelism <tests-focalizados>
```

Ejemplo de gate frontend no E2E:

```bat
cd workspace\frontend
npm run typecheck
npm run build
```

Gate E2E final:

```bat
cd workspace\frontend
npx playwright test <specs-focalizadas-de-ingresos>
```

No se ejecutará el comando E2E hasta que el vertical esté completo.

---

## 20. Limitación OCR

El extractor actual utiliza extracción de texto desde PDF.

Un recibo escaneado como imagen puede no contener texto utilizable.

Comportamiento requerido:

- devolver `SALARY_RECEIPT_TEXT_EXTRACTION_EMPTY`;
- no intentar interpretar una imagen como texto inexistente;
- no reintroducir IA como fallback;
- dejar OCR como iniciativa futura separada.

---

## 21. Riesgos y mitigaciones

### R1. Variabilidad de layouts

**Riesgo:** cada empleador o sistema liquidador puede generar un formato distinto.  
**Mitigación:** registro de parsers independientes y soporte explícito por fixture.

### R2. Pérdida de columnas durante extracción

**Riesgo:** `pdfplumber` puede alterar espaciado.  
**Mitigación:** fixtures obtenidos por el extractor real y parsers tolerantes sólo a variaciones demostradas.

### R3. Totales visuales ambiguos

**Riesgo:** bruto, descuentos y neto pueden repetirse en distintas secciones.  
**Mitigación:** detección por contexto y conciliación matemática obligatoria.

### R4. Exposición de datos sensibles

**Riesgo:** guardar texto crudo en diagnósticos o fixtures.  
**Mitigación:** anonimización, redacción y artefactos completos deshabilitados por defecto.

### R5. Ruptura de recibos históricos

**Riesgo:** eliminar prematuramente relaciones con IA.  
**Mitigación:** conservar schema histórico en la primera etapa.

### R6. Falsa confianza por build verde

**Riesgo:** el código compila pero interpreta mal un recibo.  
**Mitigación:** fixtures reales, totales exactos, pruebas focalizadas y aceptación final del usuario.

---

## 22. Rollback

El reemplazo deberá poder revertirse sin pérdida de datos.

Medidas:

- commits pequeños y temáticos;
- no eliminar inicialmente columnas históricas;
- mantener separada la implementación determinística;
- evitar migraciones destructivas;
- preservar el servicio anterior hasta que el nuevo flujo esté integrado y validado, pero sin mantener un fallback automático a IA;
- documentar el commit anterior al corte funcional.

Rollback funcional:

1. revertir los commits del nuevo flujo;
2. restaurar el servicio anterior;
3. no modificar borradores ya aceptados;
4. conservar `UploadedDocument` y relaciones históricas;
5. registrar la causa del rollback.

---

## 23. Fuera de alcance

No forma parte de esta iniciativa:

- OCR;
- asesor financiero;
- chat con IA;
- extracción IA de otros documentos;
- rediseño general de ingresos;
- migración completa del modelo `AiExtractionRun`;
- modificación de importación de tarjetas;
- soporte universal para cualquier recibo;
- ejecución continua de Playwright durante la implementación;
- cambios de runtime Node;
- cambios de launchers no requeridos por el vertical.

---

## 24. Secuencia prevista de commits

```text
docs(ingresos): document deterministic salary receipt plan
test(salary-receipts): add anonymized raw-text fixtures
feat(salary-receipts): add deterministic parser contracts
feat(salary-receipts): implement first supported layout
refactor(salary-receipts): replace AI extraction with parser
feat(salary-receipts): persist deterministic diagnostics
test(salary-receipts): cover deterministic import lifecycle
refactor(frontend): adapt salary receipt preview and errors
chore(salary-receipts): remove obsolete AI dependencies
docs(ingresos): record validation evidence and final status
```

Los commits podrán reagruparse si la implementación demuestra que una separación distinta mejora la atomicidad.

---

## 25. Criterios de aceptación técnia

La implementación estará técnicamente completa cuando:

- [ ] ningún archivo del flujo nuevo de recibos importe `modules/ai`;
- [ ] una importación nueva funcione con IA apagada;
- [ ] una importación nueva no cree `AiExtractionRun`;
- [ ] los recibos históricos continúen siendo legibles;
- [ ] no existan fallbacks silenciosos de empleador, empleado o período;
- [ ] cada línea monetaria quede interpretada o provoque error;
- [ ] los totales coincidan exactamente;
- [ ] un layout desconocido falle explícitamente;
- [ ] la edición del preview continúe funcionando;
- [ ] la aceptación continúe generando el ingreso;
- [ ] build y typecheck estén verdes;
- [ ] unitarias e integración estén verdes;
- [ ] los E2E focalizados finales estén verdes;
- [ ] el usuario complete la aceptación funcional.

---

## 26. Evidencia requerida

El agente externo deberá entregar:

- sistema operativo;
- versión de Node;
- versión de npm;
- commit probado;
- comandos exactos;
- código de salida;
- resumen de tests;
- stack traces completos de fallos;
- confirmación explícita de que no ejecutó E2E antes del gate final;
- evidencia E2E final separada.

La evidencia se asentará en un informe de validación dentro de la documentación del vertical.

---

## 27. Referencias internas

- SSOT de continuidad: `docs/00-context/APPCAJA-V3-SSOT-CONTINUACION-2026-07-27.md`
- SSOT de ejecución: `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`
- Módulo actual: `workspace/backend/src/modules/salary-receipts/`
- Patrón de referencia: `workspace/backend/src/modules/card-import/`
- Schema Prisma: `workspace/backend/prisma/schema.prisma`

---

## 28. Decisión de gobierno

Este documento gobierna el alcance técnico de `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-001`.

Ante contradicción:

1. manda el código canónico de `workspace/`;
2. para el alcance y metodología de este vertical, manda este plan;
3. para continuidad general, manda el SSOT vigente;
4. la aceptación funcional final corresponde al usuario.

No declarar `PASS`, `DONE` ni `ACEPTADO` únicamente por haber escrito el código o por obtener un build verde.
