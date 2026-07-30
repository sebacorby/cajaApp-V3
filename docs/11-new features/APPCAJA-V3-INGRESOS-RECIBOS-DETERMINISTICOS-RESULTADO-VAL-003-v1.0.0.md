# APPCAJA V3 — Resultado técnico VAL-003 de recibos determinísticos

**ID:** `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-VAL-003`  
**Fecha:** `2026-07-29`  
**Rama:** `feat/ingresos`  
**Commit probado:** `d3457dade0d1f8879905c607323e89a4591b7a4d`  
**Commit de evidencia:** `7d0ef76e4fbdb22a81d09b17d8cf3e35cc108f56`  
**Veredicto:** `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`

## Gates verificados

- backend build: PASS;
- parser de importes: PASS, 12 tests;
- integración histórica de recibos: PASS, 5 tests;
- suite focalizada combinada: PASS, 28 tests;
- frontend typecheck: PASS;
- frontend build: PASS;
- inspección estática del corte IA: PASS;
- Playwright, Cypress y otras suites E2E: no ejecutadas.

## Compatibilidad monetaria confirmada

Se verificaron formatos argentinos e internacionales, positivos y negativos:

- `1.234,56`;
- `$ 1.234,50`;
- `1234.56`;
- `1,234.56`;
- `USD 1,234.56`;
- `-250,10`;
- `-1,234.56`.

También se confirmó el rechazo de separadores malformados.

## Corte determinístico confirmado

La inspección estática confirmó:

- ausencia de imports del módulo IA en el servicio activo de extracción;
- ausencia de creación de `AiExtractionRun` en nuevas importaciones;
- persistencia de nuevos borradores con `aiRunId: null`.

## Evidencia aceptada

La evidencia completa queda archivada en:

`architecture-handoff/agents-to-architect/accepted/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-VAL-003-evidence-PASS/`

## Limitaciones pendientes

Este PASS es exclusivamente técnico. Todavía no se realizó:

- aceptación funcional del usuario;
- validación contra un recibo real anonimizado;
- gate E2E final.

No declarar el vertical funcionalmente cerrado hasta completar esas tres condiciones o hasta que el usuario modifique explícitamente el criterio de cierre.
