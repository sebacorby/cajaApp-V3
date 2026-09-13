# Evidence File 02 — Preflight Checks

## Node.js Version
```
node --version
v24.18.0
```
✅ Exact match required: v24.18.0

## Scope Files Exist

### Backend Module Files
- workspace/backend/src/modules/import-center/import-center.controller.ts ✅
- workspace/backend/src/modules/import-center/import-center.routes.ts ✅
- workspace/backend/src/modules/import-center/import-center.schemas.ts ✅
- workspace/backend/src/modules/import-center/import-center.service.ts ✅

### Backend Test
- workspace/backend/tests/import-center/import-center.test.ts ✅

### Frontend Files
- workspace/frontend/src/lib/finance/import-center-api.ts ✅
- workspace/frontend/src/components/finance/sections/importaciones-section.tsx ✅
- workspace/frontend/src/components/finance/sections/section-router.tsx ✅
- workspace/frontend/src/lib/finance/nav.ts ✅
- workspace/frontend/src/lib/finance/ui-store.ts ✅
- workspace/frontend/tests/import-center.spec.ts ✅

## Registration Checks

### app.ts — Backend Route Registration
```
Line 9:  import { importCenterRoutes } from "./modules/import-center/import-center.routes.js";
Line 82: await app.register(importCenterRoutes);
```
✅ importCenterRoutes registered at /api/import-center prefix

### nav.ts — NAV_ITEMS Entry
```
Line 52: id: "importaciones",
Line 53: label: "Importaciones",
```
✅ NAV_ITEMS contains "importaciones" item with label "Importaciones"

### section-router.tsx — Route Mapping
```
Line 9:  import { ImportacionesSection } from "./importaciones-section";
Line 35: case "importaciones":
Line 36: content = <ImportacionesSection />;
```
✅ "importaciones" routes to ImportacionesSection component

### ui-store.ts — SectionId Union
```
Line 10: | "importaciones"
```
✅ "importaciones" is a valid SectionId
