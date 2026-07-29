# Veredicto APPCAJA-V3-REMEDIATION-VALIDATION v1.0.5

Veredicto: **FAIL**

Evidencia: `I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.5`

Defectos principales:
- Archivo canónico faltante: `src/lib/finance/global-search-api.ts` (importado por `global-search-dialog.tsx`).
- Error de lint en `src/components/finance/charts/category-donut.tsx` (reassignación de `cumulativeShare` en render).
- Frontend typecheck y build fallan; por tanto, headless no arranca.
- Smoke API, proveedor IA, asesor IA, Playwright y responsive/accesibilidad no se ejecutaron.

SQLite restaurado: **SI**
- Hash inicial: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`
- Hash final: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`

Servicios detenidos: **SI**
- Puertos 11436 y 11437 libres.
- Sin procesos Node de CajaApp activos.

## Matriz de gates

| Gate | Estado | Duración aprox. | Notas |
|------|--------|-----------------|-------|
| Fase 5A: archivos canónicos | PASS | - | 8/8 hashes canónicos coinciden; BOM=0; sin duplicados |
| Backend: npm ci | PASS | 14.98s | lockfile sin cambios |
| Backend: prisma:generate | PASS | 2.28s | - |
| Backend: prisma:migrate:deploy | PASS | 1.31s | - |
| Backend: prisma migrate status | PASS | 1.70s | - |
| Backend: npm run build | PASS | 4.29s | - |
| Backend: npm run test | PASS | 3.64s | - |
| Frontend: npm ci | PASS | 42.52s | lockfile sin cambios |
| Frontend: npm run typecheck | FAIL | 7.90s | Cannot find module `@/lib/finance/global-search-api` |
| Frontend: npm run lint | FAIL | 26.07s | 1 error en category-donut.tsx |
| Frontend: npm run build | FAIL | 7.60s | Falla por typecheck |
| Headless: start | FAIL | 23.26s | Frontend build falló |
| Smoke API | NOT RUN | - | Sin entorno levantado |
| Proveedor IA | NOT RUN | - | Sin entorno levantado |
| Asesor IA | NOT RUN | - | Sin entorno levantado |
| Playwright completo | NOT RUN | - | Sin entorno levantado |
| Responsive/Accesibilidad | NOT RUN | - | Sin entorno levantado |
| SQLite restore | PASS | - | Hash inicial y final coinciden |
| Cleanup | PASS | - | Puertos libres, procesos detenidos, SQLite restaurado |
