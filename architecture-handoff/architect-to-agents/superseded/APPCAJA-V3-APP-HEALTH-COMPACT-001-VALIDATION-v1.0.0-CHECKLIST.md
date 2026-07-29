# APP-HEALTH-COMPACT-001 v1.0.0 — Checklist vinculante

1. Confirmar root canónico, Windows x64 y Node.js v24.18.0 exacto.
2. Confirmar puertos 11436/11437 libres y registrar PIDs al iniciar servicios.
3. Crear backup binario de `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Verificar tamaño y SHA-256 local de los cuatro archivos:
   - `financial-health-compact-provider.tsx`: 9755 bytes / `169117B3D27534674ADAA73C1F9771DC972F8B3BA4E842CA7F176B5AD6CD051B`.
   - `app-shell.tsx`: 1956 bytes / `BC75D0DA84D8C553B38981BAAB9F3E5966904A288DB04F5860D0A69CA99ACE6F`.
   - `sidebar.tsx`: 2438 bytes / `46B899560B252F22D6A3659F75B38102AA8059E01E901EA154CF0F9708C11739`.
   - `financial-health-compact.spec.ts`: 8164 bytes / `A40CDA6BB709B03A8D7BD91C1100FB4B1A6B5A08C4484CAED04C2CB2988B7C14`.
5. Comparar cada archivo vigente contra su copia `implemented` en `superseded/APP-HEALTH-COMPACT-001-inspection` usando SHA-256 local. No usar Dropbox content hashes.
6. Demostrar que no cambió ningún otro archivo durante la validación.
7. Ejecutar `npm ci`, `npm run typecheck`, `npm run lint` y `npm run build` en frontend. Cero errores; warnings preexistentes documentados.
8. Levantar backend y frontend reales; ambos health HTTP 200.
9. Ejecutar exactamente el Playwright indicado en la instrucción, Chromium, un worker, cero retries y cero skips.
10. Confirmar que el compacto refleja exactamente score, banda, confianza, período y fórmula del payload por ARS/USD.
11. Confirmar cambio de período sin recálculo frontend y navegación al módulo Salud.
12. Confirmar estado explícito `Sin datos suficientes` cuando ninguna moneda es calculable.
13. Confirmar textos visibles además de colores y operación desktop/mobile por teclado.
14. Confirmar que AlertCenter y SidebarDataQuality permanecen independientes y sus pruebas siguen pasando.
15. Confirmar fórmula `fh-v1.0.0` y paridad con el módulo Salud real.
16. Cero strict-mode violations, timeouts, retries, skips o cambios de test.
17. Guardar logs, JSON reporter, screenshots, trace y video.
18. Detener procesos, demostrar puertos libres y restaurar SQLite al SHA inicial.

Entregar `00-verdict.md` y evidencia completa en la carpeta v1.0.0. Veredicto permitido: PASS o FAIL. El agente no corrige archivos.
