# SSOT — APP-AI-UX-STABILITY-001

Estado: ACTIVO.
Fecha de apertura: 19 de julio de 2026.
Vertical único activo: `APP-AI-UX-STABILITY-001`.
Repositorio canónico: Dropbox.
Root local canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.

## Dependencia previa cerrada

`APP-SEC-DEPS-001 v1.0.3-R1` fue aceptado:

- `npm audit` total 0;
- package files promovidos a hashes candidate;
- cero regresiones;
- evidencia movida a accepted.

Hashes package vigentes:

- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`;
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Objetivo

Demostrar y, si es necesario, corregir la estabilidad end-to-end del Asesor IA con Ollama Cloud real, especialmente el flujo UI que históricamente podía pasar aislado y fallar por timeout o contaminación dentro de la suite completa.

## Baseline funcional

La UI de estados asíncronos ya está aceptada para loading, error y retry mediante fixture controlada. Este vertical no reabre ese diseño; valida el proveedor remoto real y la integración UI completa.

Baseline Playwright posterior a Seguridad:

- 40/42 PASS;
- dos fallos preexistentes y separados en Recibos de sueldo;
- el Asesor IA no puede introducir fallos nuevos.

## Instrucción vigente

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-IMPLEMENTATION-AND-VALIDATION-v1.0.0.md`

No existe otra instrucción activa.

## Criterios de aceptación

- API remota 5/5 HTTP 201;
- schema y fingerprint válidos 5/5;
- fuentes/citas consistentes;
- ninguna consulta supera 180 segundos;
- cero requests duplicadas o huérfanas;
- focal Playwright del Asesor PASS dos veces consecutivas;
- desktop y mobile PASS;
- ausencia de contaminación por orden de suite;
- cero skips y retries;
- suite completa sin regresiones y con al menos 40/42;
- únicamente pueden permanecer los dos fallos conocidos de Recibos, salvo mejora;
- backend/frontend static gates PASS;
- package hashes intactos;
- SQLite restaurada y puertos libres.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.0/`

## Dependencia posterior

`APP-FINAL-CLOSURE` permanece bloqueado hasta aceptar físicamente esta evidencia en `accepted`.
