# APP-REPORTS-VISUAL-PARITY-002 v1.0.1 — Checklist vinculante

1. Confirmar root canónico, Windows x64 y Node.js v24.18.0 exacto.
2. Confirmar puertos 11436/11437 libres; registrar PIDs al iniciar servicios.
3. Crear backup binario de `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Calcular exclusivamente SHA-256 local de los cinco archivos con `Get-FileHash -Algorithm SHA256` y verificar:
   - `chart-contracts.ts`: 574 bytes / `8F6B11289061F97567C220035C277B1F3E5E0C3F6A6A07EBFD168AFB47549FCC`.
   - `monthly-evolution-chart.tsx`: 18029 bytes / `DD6AF0182F8B2AEB9495CCEAE25B50EA76960D9FD6307A2A50F4E9FF73726BE3`.
   - `category-donut.tsx`: 14711 bytes / `6FDF499B9CE323C1831A0B574DFEF7791A509D0FA3AD53DBFE5A2A4C30F267F3`.
   - `reportes-section.tsx`: 29794 bytes / `69039F198AB84933B76626844A4048F6200B320E2A7F0A42F812C7E67099852C`.
   - `reports.spec.ts`: 12109 bytes / `0B999924D17CFA514D7FEC2127FA3CD36F595096D062FD340FC9161A00A3C8A1`.
5. Calcular SHA-256 de las cinco copias `implemented` en `superseded/APP-REPORTS-VISUAL-PARITY-002-inspection/` y demostrar igualdad uno a uno con los archivos vigentes.
6. No calcular ni comparar Dropbox content hashes. No mezclar algoritmos de integridad.
7. Demostrar por inventario/hash que no cambió ningún otro archivo durante la validación.
8. Desde frontend ejecutar `npm ci`, `npm run typecheck`, `npm run lint` y `npm run build`. Cero errores; warnings preexistentes documentados.
9. Levantar backend/frontend reales y comprobar health HTTP 200.
10. Ejecutar exactamente:
`npx playwright test tests/e2e/deuda-futura/reports.spec.ts tests/chart-parity.spec.ts tests/e2e/dashboard.spec.ts --project=chromium --workers=1 --retries=0`
11. Reportes real: datos UAT, rango, CSV habilitado, drilldown y cleanup.
12. Paridad mensual: gráfico y tabla exponen exactamente los importes del payload en ARS y USD, sin sumar ni convertir monedas.
13. Categorías: lista, donut y tabla reflejan exactamente amount/share del payload seleccionado.
14. Verificar Barras/Área, Lista/Donut, selector ARS/USD, estados vacíos y nombres accesibles.
15. Dashboard conserva test IDs, selector propio y representación ARS/USD previa.
16. Cero strict-mode violations, timeouts, retries, skips o cambios de test.
17. Guardar logs, JSON reporter, screenshots, trace y video.
18. Detener procesos, demostrar puertos libres y restaurar SQLite al SHA inicial.

Entregar evidencia en `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-evidence-v1.0.1/` con `00-verdict.md`. Veredicto permitido: PASS o FAIL. El agente no corrige archivos.