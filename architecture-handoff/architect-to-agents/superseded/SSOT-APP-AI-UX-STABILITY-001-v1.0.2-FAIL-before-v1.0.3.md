# SSOT — APP-AI-UX-STABILITY-001

Estado: ACTIVO.
Versión activa: `v1.0.2`.
Fecha: 19 de julio de 2026.
Vertical único activo: `APP-AI-UX-STABILITY-001`.

## Dependencia cerrada

`APP-SEC-DEPS-001 v1.0.3-R1` permanece aceptado.

Hashes package vigentes:

- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`;
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Historial de IA

### v1.0.1 — FAIL

Gates demostrados y reutilizables:

- proveedor remoto mediante relay local: PASS;
- API real 5/5: PASS;
- focal consecutivo Run 1 y Run 2: PASS;
- package hashes, SQLite y cleanup: PASS.

Fallo pendiente:

- la UI puede quedar sin respuesta visible ni error recuperable hasta superar 180 segundos;
- ocurrió después de `month-close` y también en ejecución aislada;
- no está demostrada contaminación SQLite, Prisma ni `month-close`.

La evidencia v1.0.1 se archiva como FAIL y no debe volver a ejecutarse.

## Instrucción vigente

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-REMEDIATION-v1.0.2.md`

No existe otra instrucción activa.

## Objetivo v1.0.2

Diagnosticar y corregir el estado terminal de la consulta UI del Asesor IA:

- una sola request por submit;
- loading termina siempre en success o error;
- límite máximo cliente de 120 segundos;
- error recuperable y retry;
- respuesta tardía no pisa una consulta posterior;
- correlación completa desde navegador hasta render.

## Criterios de aceptación

- focal PASS dos veces consecutivas;
- `month-close` seguido del focal: PASS;
- focal posterior a pausa real de 60 s: PASS;
- smoke API y UI real: PASS antes de 120 s;
- backend/frontend gates: PASS;
- suite completa con al menos 40/42 y cero fallos nuevos;
- package hashes intactos;
- SQLite restaurada y puertos libres.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.2/`

## Dependencia posterior

`APP-FINAL-CLOSURE` continúa bloqueado hasta aceptación arquitectónica de v1.0.2.
