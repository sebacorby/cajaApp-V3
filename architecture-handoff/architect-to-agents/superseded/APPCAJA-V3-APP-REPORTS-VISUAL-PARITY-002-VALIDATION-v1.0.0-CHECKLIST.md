# APP-REPORTS-VISUAL-PARITY-002 v1.0.0 — Checklist vinculante

1. Confirmar root canónico, Windows x64 y Node.js v24.18.0 exacto.
2. Confirmar puertos 11436/11437 libres; registrar PIDs al iniciar servicios.
3. Crear backup binario de `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Verificar tamaños y Dropbox content hashes:
   - `chart-contracts.ts`: 574 bytes / `3c84d3eb4d6c1f966410a3c67e25a78a085c761b70f807b2039588523f4d44de`.
   - `monthly-evolution-chart.tsx`: 18029 / `2389e954004e653c0b18fdf46f6b5aa7cc884095fda70812312243f13acd4b3c`.
   - `category-donut.tsx`: 14711 / `e57488ade9dbbdaad9af128afaf861b2e2f47e05287623b741a705286b698248`.
   - `reportes-section.tsx`: 29794 / `aefe0cf96886de9ab33e19fbea663382f53da87cb276a5f7c4f42d2d38948424`.
   - `reports.spec.ts`: 12109 / `d7dfe7d2061116aea3a1e04d35bcc523337a99046ac6a00fe06a24ca4cad7217`.
5. Calcular SHA-256 de los cinco archivos y demostrar que cada uno coincide con su copia `*.implemented.*.txt` en `superseded/APP-REPORTS-VISUAL-PARITY-002-inspection/`.
6. Demostrar por inventario/hash que no cambió ningún otro archivo durante la validación.
7. Desde frontend ejecutar `npm ci`, `npm run typecheck`, `npm run lint` y `npm run build`. Cero errores; warnings preexistentes documentados.
8. Levantar backend/frontend reales y comprobar health HTTP 200.
9. Ejecutar exactamente el Playwright focal indicado, Chromium, un worker, cero retries y cero skips.
10. Reportes real: crear datos UAT, cargar rango, mantener CSV habilitado, abrir drilldown y limpiar datos.
11. Paridad: gráfico mensual y tabla deben exponer exactamente los importes del payload en ARS y USD; no sumar ni convertir monedas.
12. Categorías: lista, donut y tabla equivalente deben reflejar exactamente amount/share del payload seleccionado.
13. Verificar cambio Barras/Área, Lista/Donut, selector ARS/USD, estados vacíos honestos y nombres accesibles.
14. Dashboard: comprobar que sus gráficos conservan test IDs, selector propio y representación ARS/USD previa.
15. Cero strict-mode violations, timeouts, retries, skips o cambios de test.
16. Guardar logs, JSON reporter, screenshots, trace y video.
17. Detener procesos, demostrar puertos libres y restaurar SQLite al SHA inicial.

Entregar evidencia completa y `00-verdict.md` en la carpeta v1.0.0. Veredicto permitido: PASS o FAIL. El agente no corrige archivos.