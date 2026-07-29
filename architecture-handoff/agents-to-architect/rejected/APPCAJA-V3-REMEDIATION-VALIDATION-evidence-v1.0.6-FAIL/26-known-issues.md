# 26-known-issues.md

Defectos principales encontrados

## 1. Hashes de archivos canónicos de Fase 6A no coinciden

- `global-search-api.ts`: hash real `BEAD4CFE...` vs esperado `233FEA46...`
- `category-donut.tsx`: hash real `50F785CC...` vs esperado `39074CA6...`
- Impacto: **FAIL** en preflight de integridad.
- Los archivos de recuperación tenían BOM inicial (`0xEF 0xBB 0xBF`); después de retirarlo, el hash no coincide con el documento. El contenido destino final coincide byte a byte con el origen sin BOM.

## 2. Archivos con sufijos ambiguos en fuentes activas

- `workspace\backend\src\modules\reports\TEMP-CajaAppV3_reports_service_currency_fix_v1.ts`
- `workspace\frontend\src\lib\finance\global-search-api (1).ts`
- Impacto: **FAIL** en criterio de cero archivos con sufijos.

## 3. Artefactos de build no limpios al inicio del preflight

- `backend/dist`, `frontend/.next`, `frontend/test-results` contenían archivos al inicio.
- Impacto: **FAIL** en preflight; fueron limpiados al final.

## 4. Entorno npm no alineado con Node v24.18.0

- El `npm` global (`C:\Users\javie\AppData\Roaming\npm\npm.cmd`) está atado a Node v22.14.0.
- Para cumplir el requisito se usó `I:\Tools\node-v24.18.0-win-x64\npm.cmd` en todos los gates.
- Impacto: **FAIL** de entorno si se usara npm global; corregido mediante ruta explícita.

## 5. Discrepancia de ruta en smoke API

- El documento indica `GET /api/future`; la ruta real es `/api/future-commitments`.
- `/api/future-commitments` responde HTTP 200 correctamente.
- Impacto: **FAIL** en el endpoint documentado; el endpoint real funciona.

## 6. Dependencia externa Ollama no disponible

- Ollama instalado pero sin modelos descargados; `kimi-k2.7-code:cloud` no existe localmente.
- Además, `OLLAMA_MODELS` apuntaba a `H:\IA-models` (Google Drive), no creable.
- Se inició Ollama temporalmente con `OLLAMA_MODELS=C:\Users\javie\AppData\Local\Temp\ollama-models` para permitir el arranque del backend.
- Impacto: **BLOCKED** en el gate de Asesor IA y contribuyó a la falla de `ai-advisor.spec.ts` en Playwright.

## 7. Playwright no completó

- Suite interrumpida por timeout a los 15 min.
- Fallas iniciales confirmadas: ai-advisor (modelo), alert-center (elemento no encontrado), budgets (timeout), categories (timeout).
- Impacto: **FAIL** en gate de Playwright.

## 8. Responsive y accesibilidad

- No pudieron verificarse completamente porque dependen de la suite de Playwright.
- Impacto: **NOT RUN**.
