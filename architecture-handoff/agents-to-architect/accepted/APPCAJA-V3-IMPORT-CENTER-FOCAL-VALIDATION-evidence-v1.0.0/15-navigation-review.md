# Evidence File 15 — Navigation Review

## nav.ts — NAV_ITEMS
```
Line 52: id: "importaciones",
Line 53: label: "Importaciones",
Line 54: icon: Files,
Line 55: description: "Documentos, estados, errores y correcciones",
```

✅ NAV_ITEMS contains "importaciones" with label "Importaciones", icon Files
✅ id is "importaciones" — matches ui-store.ts SectionId union

## section-router.tsx — Route Mapping
```
Line 9:  import { ImportacionesSection } from "./importaciones-section";
Line 35: case "importaciones":
Line 36:       content = <ImportacionesSection />;
```

✅ "importaciones" case in switch renders ImportacionesSection component

## ui-store.ts — SectionId
```
Line 10: | "importaciones"
```

✅ "importaciones" is part of SectionId union type

## import-center-api.ts — API Base
```
Line 136: `${API_BASE_URL}/api/import-center?${params.toString()}`,
Line 146: `${API_BASE_URL}/api/import-center/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.entityId)}`,
```

✅ API calls go to /api/import-center (backend registered at this prefix)

## Conclusion
✅ Navigation chain complete: nav.ts → section-router.tsx → importaciones-section.tsx → import-center-api.ts → backend /api/import-center
