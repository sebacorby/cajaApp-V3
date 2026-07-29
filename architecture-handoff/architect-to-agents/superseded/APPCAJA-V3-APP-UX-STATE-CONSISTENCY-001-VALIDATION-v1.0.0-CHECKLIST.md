# CHECKLIST — APP-UX-STATE-CONSISTENCY-001 v1.0.0

## 1. Preflight
- Root local exacto.
- Node `v24.18.0` y npm registrados.
- Puertos 11436/11437 libres.
- Inventario y estado previo registrados.

## 2. Alcance e integridad
No modificar archivos. Calcular SHA-256 local y comprobar vigente == `implemented` para estas 12 parejas:

1. `src/components/finance/states/async-state.tsx` ↔ `async-state.implemented.tsx.txt`
2. `sections/importaciones-section.tsx` ↔ `importaciones-section.implemented.tsx.txt`
3. `sections/importaciones-section.legacy.tsx` ↔ `importaciones-section.legacy.implemented.tsx.txt`
4. `sections/conciliacion-section.tsx` ↔ `conciliacion-section.implemented.tsx.txt`
5. `sections/conciliacion-section.legacy.tsx` ↔ `conciliacion-section.legacy.implemented.tsx.txt`
6. `sections/asesor-ia-section.tsx` ↔ `asesor-ia-section.implemented.tsx.txt`
7. `sections/asesor-ia-section.legacy.tsx` ↔ `asesor-ia-section.legacy.implemented.tsx.txt`
8. `sections/cierres-section.tsx` ↔ `cierres-section.implemented.tsx.txt`
9. `sections/cierres-section.legacy.tsx` ↔ `cierres-section.legacy.implemented.tsx.txt`
10. `sections/respaldo-section.tsx` ↔ `respaldo-section.implemented.tsx.txt`
11. `sections/respaldo-section.legacy.tsx` ↔ `respaldo-section.legacy.implemented.tsx.txt`
12. `tests/state-consistency.spec.ts` ↔ `state-consistency.spec.implemented.ts.txt`

Base de copias: `architecture-handoff/architect-to-agents/superseded/APP-UX-STATE-CONSISTENCY-001-inspection/`.
Nunca comparar Dropbox content hash con SHA-256.

Confirmar además que `section-router.tsx`, package files, lockfiles, `.env`, backend, Prisma y SQLite no cambiaron.

## 3. Gates frontend
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 4. Runtime
- Backup y SHA-256 inicial de `workspace/backend/prisma/dev.db`.
- Backend 11436 y frontend 11437 con health HTTP 200.

## 5. Playwright
Ejecutar exactamente:

`npx playwright test tests/state-consistency.spec.ts tests/month-close.spec.ts tests/backup-restore.spec.ts tests/import-center.spec.ts tests/reconciliation.spec.ts tests/quality-audit.spec.ts --project=chromium --workers=1 --retries=0`

Exigir:
- todos los tests PASS;
- cero skips, retries y strict-mode violations;
- screenshots, trace y video;
- reporter JSON completo.

## 6. Validación funcional
- Los cinco módulos exponen `data-state-contract="real-v1"`.
- Loading, empty, error, success y retry provienen de carga/contratos/acciones reales.
- No existe control demo.
- Importaciones recupera tras error usando Actualizar.
- Conciliación informa empty y éxito del escaneo.
- Asesor IA muestra error recuperable sin spinner indefinido.
- Cierres y Respaldo preservan sus controles desktop/mobile, confirmaciones y retry.
- Errores no exponen información sensible.
- Reduced motion y roles accesibles preservados.

## 7. Cleanup
- Restaurar SQLite al SHA-256 inicial.
- Detener procesos propios y dejar puertos libres.
- Emitir `00-verdict.md` PASS sólo si todos los gates pasan.
