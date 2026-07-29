# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R1` cerrada como FAIL de cierre por gates E2E incompletos. `v1.0.3-R2` ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` bloqueado.

## R1 aceptado como avance

- contrato backend de máximo 3 llamadas totales implementado en candidate;
- retry sólo de `AI_ADVISOR_UNGROUNDED_NUMBER`;
- focal backend 32/32 PASS;
- suite backend 175/175 PASS;
- frontend typecheck/lint/build PASS;
- API real 5/5 reportada PASS;
- canonical sin promoción.

## Motivos de no aceptación R1

- Focal UI Run 2: 1/2;
- `month-close.spec.ts` + `ai-advisor.spec.ts`: 2/4;
- evidencia final no sincronizada en Dropbox;
- `PROMOTION.json` reportado sin promoción real.

Evidencia archivada:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R1-FAIL-E2E-AND-INCOMPLETE-SYNC/`

## Campaña activa R2

Instrucción única:
`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-E2E-ISOLATION-v1.0.3-R2.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2/`

Objetivo:
- conservar congelado el backend R1;
- igualar la configuración Ollama de API y Playwright usando `127.0.0.1`;
- corregir aislamiento, navegación, cleanup o duplicación real en la secuencia month-close/AI;
- obtener focal 2/2 dos veces consecutivas;
- obtener orden 4/4;
- ejecutar Playwright candidate completo sin proyecciones;
- promover backend R1 y ajustes frontend R2 sólo después de PASS total.

PASS exige:
- backend focal 32/32, suite 175/175 y build PASS;
- API real 5/5 verificable;
- Focal Run 1 2/2 y Run 2 2/2;
- month-close + focal 4/4;
- frontend gates PASS;
- Playwright completo con `workers=1`, `retries=0`;
- `candidateNewFailures=0` y `baselinePassedCandidateFailed=0`;
- hashes válidos, packages intactos, SQLite restaurada y puertos libres;
- promoción atómica comprobada sobre canonical.

No abrir otro vertical.
