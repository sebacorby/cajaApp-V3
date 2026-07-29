# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2` archivada como BLOCKED por mezclar el gate del cambio con fallos generales no comparados. `v1.0.3-R2.1` ACTIVA. Único vertical activo.

## Backend aceptado como carry-forward

- focal AI Advisor 32/32 PASS;
- suite backend 175/175 PASS;
- build PASS;
- contrato de máximo 3 llamadas correcto;
- retry sólo para `AI_ADVISOR_UNGROUNDED_NUMBER`;
- canonical aún sin promoción.

## Causa móvil

El fallo no ocurre en cleanup. Después de navegar en viewport mobile y pulsar Asesor IA, `ai-advisor-section` no aparece.

Clasificación vigente:
`mobile navigation / active-section transition failure`

R2.1 debe anclar el test al drawer mobile visible mediante identificadores estables y corregir el layout sólo si el click visible no cambia la sección.

## Gobierno R2.1

Instrucción activa:
`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-CODE-UNBLOCK-v1.0.3-R2.1.md`

Anexo técnico activo:
`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-TECHNICAL-PATCH.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

## PASS

- backend focal 32/32, suite 175/175 y build;
- API real nueva 5/5;
- AI focal Run 1 y Run 2: 2/2 cada uno;
- month-close seguido de AI: 4/4;
- 422 visible, retry manual y una request por submit;
- frontend typecheck/lint/build;
- baseline y candidate completos con el mismo entorno;
- `candidateNewFailures=0`;
- `baselinePassedCandidateFailed=0`;
- cero skips y retries;
- promoción atómica con hashes;
- packages intactos, SQLite restaurada y puertos libres.

Fallos comunes y ajenos pueden registrarse como deuda sólo si baseline fresco demuestra igualdad exacta. No exigir 45/45 cuando existan fallos comunes demostrados.

`APP-FINAL-CLOSURE` sigue bloqueado hasta promoción comprobada.