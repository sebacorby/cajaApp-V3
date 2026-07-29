# SSOT — APP-AI-UX-STABILITY-001

Estado: v1.0.0 RECHAZADA / FAIL; v1.0.1 ACTIVA.
Fecha: 19 de julio de 2026.
Vertical único activo: `APP-AI-UX-STABILITY-001`.
Repositorio canónico: Dropbox.
Root local: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.

## Baseline cerrado

`APP-SEC-DEPS-001 v1.0.3-R1` permanece aceptado.

Hashes package vigentes:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`;
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Resultado auditado v1.0.0

Confirmado:
- preflight y hashes baseline PASS;
- Run 1 focal 2/2 PASS;
- Run 2: `/ask` no exitoso;
- Run 3: ausencia de `ai-advisor-response` durante 180 segundos;
- focal consecutivo FAIL;
- API real 5/5 no ejecutada;
- suite completa no ejecutada;
- proveedor remoto real no demostrado;
- canonical, package files y SQLite intactos.

La evidencia no permite atribuir con rigor el Run 2 a SQLite: el log Playwright sólo contiene `askResponse.ok() = false`, sin status, body ni log backend correlacionado.

Tampoco permite clasificar el Run 3: no registra el estado de la request `/ask` ni si la UI terminó en error.

Evidencia rechazada:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.0-FAIL-UNPROVEN-PROVIDER-AND-FLAKINESS/`.

## Campaña activa v1.0.1

Instrucción única:
`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-REVALIDATION-v1.0.1.md`.

La campaña debe:
- demostrar identidad del proveedor remoto real;
- capturar status/body/log backend correlacionados;
- clasificar el fallo antes de modificar producto;
- corregir únicamente la causa demostrada;
- ejecutar API real 5/5;
- obtener focal PASS dos veces consecutivas y después de otro spec con escritura SQLite;
- ejecutar suite completa con al menos 40/42 y cero regresiones;
- preservar package hashes;
- restaurar SQLite y liberar puertos.

## Regla sobre proveedor

Un proxy local es aceptable sólo si existe evidencia de relay al upstream remoto. El nombre del modelo o el sufijo `:cloud` no son prueba suficiente.

Si el upstream remoto no puede demostrarse, el resultado correcto es BLOCKED y no se permiten cambios de producto.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.1/`.

## Dependencia posterior

`APP-FINAL-CLOSURE` continúa bloqueado hasta PASS aceptado y evidencia movida físicamente a `accepted`.
