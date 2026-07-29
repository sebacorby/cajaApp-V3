# APP-NAV-IA-001 v1.0.0 — Checklist

1. Confirmar workspace local, Windows x64 y Node.js v24.18.0.
2. Confirmar puertos 11436 y 11437 libres; registrar PIDs al iniciar.
3. Crear backup binario de `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Verificar SHA-256 local de los archivos:
   - `nav.ts`: `9E2323B7DD84286A7653808FD1D75F31A872917F4BA7BE21AA7F7B83C17FA2E4` / 4141 bytes.
   - `sidebar.tsx`: `567630BE36AE94468FEC83A5DAF69D70687DE342F30124B7E18C8E1E83344C08` / 3750 bytes.
   - `navigation-information-architecture.spec.ts`: `ACF0749AD9EF0DB9C5F3CE3E0545A1E3C4A5731D744E956596E9CBCADE710F18` / 3662 bytes.
5. Comparar cada archivo con su copia `implemented` en `superseded/APP-NAV-IA-001-inspection/` usando SHA-256 local.
6. No calcular ni comparar Dropbox content hashes.
7. Demostrar que no cambió ningún otro archivo durante la validación.
8. Desde frontend ejecutar `npm ci`, `npm run typecheck`, `npm run lint` y `npm run build`.
9. Levantar backend y frontend reales; comprobar HTTP 200.
10. Ejecutar exactamente:

`npx playwright test tests/navigation-information-architecture.spec.ts tests/quality-audit.spec.ts tests/global-search.spec.ts tests/financial-health-compact.spec.ts tests/sidebar-data-quality.spec.ts --project=chromium --workers=1 --retries=0`

11. Confirmar cinco grupos en este orden: Operación, Ingesta y calidad, Planificación, Análisis, Sistema.
12. Confirmar las quince secciones una sola vez, con los mismos `SectionId` y destinos.
13. Confirmar que todos los grupos están expandidos y cada destino continúa a un clic.
14. Confirmar `aria-current`, foco visible, recorrido con Tab y nombres accesibles.
15. Confirmar equivalencia desktop/mobile y cierre del Sheet al navegar.
16. Confirmar que Salud compacta, Calidad del dato y Búsqueda global siguen funcionando.
17. Cero strict-mode violations, timeouts, retries, skips o cambios de tests.
18. Guardar logs, resultado JSON, capturas, traces y videos.
19. Detener procesos, demostrar puertos libres y restaurar SQLite al SHA-256 inicial.

Entregar evidencia y `00-verdict.md` en:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-NAV-IA-001-evidence-v1.0.0/`

El agente no corrige archivos. Veredicto permitido: PASS o FAIL.
