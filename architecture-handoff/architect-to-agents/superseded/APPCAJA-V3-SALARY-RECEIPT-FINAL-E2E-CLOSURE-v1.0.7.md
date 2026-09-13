# APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.7


**Estado:** ISSUED / AUTORIZADA
**Proyecto:** CajaApp V3
**Vertical:** APP-SALARY-RECEIPT-001
**Root único:** I:\cajaApp-V3
**Entorno:** Windows x64 + Node.js exacto v24.18.0


## Objetivo


Ejecutar exclusivamente workspace/frontend/tests/salary-receipts.real.spec.ts y obtener 1 passed, 0 failed. No ejecutar suite completa ni repetir Prisma, backend build, tests backend, smoke API, reemplazo o base futura.


## Diagnóstico definitivo


getByDisplayValue no pertenece a la API Playwright utilizada por CajaApp. Quedan prohibidas las variantes sobre preview y page. La prueba debe leer la propiedad value real de los inputs mediante expect.poll y Locator.evaluateAll.


## Corrección publicada


```ts
await expect.poll(
  async () =>
    preview.locator("input").evaluateAll((inputs) =>
      inputs.some((input) =>
        /Sueldo b[aá]sico/i.test((input as HTMLInputElement).value),
      ),
    ),
  {
    message: "El preview debe renderizar el concepto Sueldo básico en un campo editable",
    timeout: 15_000,
  },
).toBe(true);
```


No se modificó producción, backend, Prisma, contratos, scripts, dependencias ni lockfiles.


## Estado aceptado


Se conservan como PASS: backend build, test focal 5/5, queries, lint focal, arranque autoritativo, Python administrado, pdfplumber 0.11.10, servicios HTTP 200, importación PDF real 201, preview, recálculo, aceptación, anulación, base futura true/false, reemplazo, SQLite restaurada, lockfiles sin cambios y ZIP real en Drive. v1.0.6 queda FAIL sólo por el spec.


## Regla de trabajo


El agente sólo valida. No modificar ningún archivo. Ante un defecto, preservar evidencia y emitir FAIL.


## Cierre


Ejecutar solamente el test real corregido. Resultado requerido: 1 passed y 0 failed.