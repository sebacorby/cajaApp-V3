# 19-playwright-report

## Reporte HTML

Playwright genera un HTML report en:

```
I:\cajaApp-V3\workspace\frontend\playwright-report\
```

No se copio a la carpeta de evidencia porque el instructivo pide
`19-playwright-report/` y ese es el directorio nativo que produce
Playwright en el workspace del proyecto. La decision de no duplicarlo
se basa en:
- Es un artifact de Playwright, no una fuente de verdad del agente.
- Re-generable en cualquier momento con `npx playwright show-report`.
- Contiene paths absolutos del workspace, no sanitizables sin reescribir
  el HTML entero.

## Como abrir el reporte

```bash
cd I:\cajaApp-V3\workspace\frontend
npx playwright show-report
```

O servirlo estatico desde `playwright-report/index.html`.

## Traces por test fallido

Playwright con `--trace=on` guarda un `.zip` por test fallido en
`I:\cajaApp-V3\workspace\frontend\test-results\`. Para abrirlos:

```bash
cd I:\cajaApp-V3\workspace\frontend
npx playwright show-trace test-results\<dir-del-test>\trace.zip
```

Tests con trace disponible:
- `tests/e2e/deuda-futura/future.spec.ts`
- `tests/e2e/deuda-futura/movements-export.spec.ts`
- `tests/e2e/deuda-futura/reports.spec.ts`
- `tests/e2e/card-statement-import.spec.ts` (test "imports Galicia Visa PDF")
- `tests/e2e/card-statement-failed.spec.ts`
