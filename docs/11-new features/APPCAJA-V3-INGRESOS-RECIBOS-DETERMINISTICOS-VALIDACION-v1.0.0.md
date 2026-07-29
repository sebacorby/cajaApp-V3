# APPCAJA V3 — Validación del vertical de recibos determinísticos

**ID:** `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-001`  
**Versión:** `1.0.0`  
**Fecha:** `2026-07-29`  
**Rama:** `feat/ingresos`  
**Estado:** `IMPLEMENTACIÓN MATERIALIZADA — VALIDACIÓN TÉCNICA EXTERNA PENDIENTE`

## Alcance implementado

- contratos y registro de parsers determinísticos;
- normalización conservadora del texto PDF;
- importes exactos en centavos;
- detección única de layout y fallo cerrado;
- primer parser argentino basado en secciones explícitas;
- escenarios anonimizados de sueldo regular, aguinaldo y vacaciones;
- conciliación exacta de bruto, descuentos y neto;
- extracción local con `pdfplumber`;
- borradores nuevos con `aiRunId = null`;
- preservación de edición, recálculo, aceptación, reemplazo por período, historial y reversión;
- preservación de servicios anteriores como archivos `.base.ts` para rollback;
- guardas automáticas contra reintroducción de dependencias IA en el flujo activo.

## Layout soportado inicialmente

El parser `argentina-sectioned-v1` acepta únicamente recibos que contengan:

- una señal explícita de recibo o liquidación de haberes;
- al menos dos secciones reconocibles;
- empleador y empleado identificables;
- período inequívoco;
- conceptos monetarios dentro de secciones explícitas;
- total de haberes/bruto;
- total de descuentos/retenciones;
- neto impreso;
- conciliación exacta en centavos.

No se inventan campos ni se acepta un layout por aproximación.

## Comandos de validación no E2E

Ejecutar desde `workspace/backend` con la instalación canónica de Node del proyecto:

```bat
npm run build
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts
```

Ejecutar desde `workspace/frontend`:

```bat
npm run typecheck
npm run build
```

Durante esta etapa no ejecutar Playwright, Cypress ni otras suites E2E.

## Evidencia requerida del agente externo

- sistema operativo;
- versión de Node y npm;
- commit probado;
- comandos exactos;
- código de salida;
- resumen de tests;
- stack traces completos ante fallos;
- confirmación explícita de que no se ejecutó E2E.

## Gate E2E final

Playwright se habilita únicamente después de que:

- backend build esté verde;
- frontend typecheck y build estén verdes;
- unitarias, parser e integración estén verdes;
- no existan tareas de código pendientes dentro del alcance;
- se disponga de al menos un recibo real anonimizado cuyo RAW de `pdfplumber` coincida con el layout soportado o motive un parser específico adicional.

La aceptación funcional final corresponde al usuario.
