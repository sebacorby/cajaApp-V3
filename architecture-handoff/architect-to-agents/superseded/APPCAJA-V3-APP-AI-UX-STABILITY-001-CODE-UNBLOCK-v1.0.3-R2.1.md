# APP-AI-UX-STABILITY-001 — CODE UNBLOCK v1.0.3-R2.1

Estado: ACTIVA. Única instrucción vigente. Mismo vertical.

Entorno:
- Canonical: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- Staging: `%LOCALAPPDATA%\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2.1\`
- Evidencia: `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

Objetivo: corregir la navegación mobile del Asesor IA, comparar baseline/candidate en el mismo entorno y promover el contrato backend validado.

Decisión de gobierno:
- backend focal 32/32, suite 175/175 y build son obligatorios;
- AI focal Run 1 y Run 2 deben ser 2/2;
- month-close seguido de AI debe ser 4/4;
- API real nueva debe ser 5/5;
- Playwright baseline y candidate deben usar el mismo entorno;
- PASS exige `candidateNewFailures=0` y `baselinePassedCandidateFailed=0`;
- fallos comunes y ajenos pueden documentarse como deuda;
- prohibido excluir tests, agregar skips, retries o aumentar timeouts.

La causa del fallo mobile no es cleanup: el item Asesor IA no deja visible `ai-advisor-section`. Aplicar el anexo técnico activo:
`APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-TECHNICAL-PATCH.md`

El backend R1 queda congelado. No cambiar su lógica.

Sólo promover después de todos los gates focales y de comparación. Registrar hashes, packages intactos, SQLite restaurada y puertos libres.

No pedir confirmación intermedia. Continuar hasta PASS, FAIL técnico real o BLOCKED demostrado.