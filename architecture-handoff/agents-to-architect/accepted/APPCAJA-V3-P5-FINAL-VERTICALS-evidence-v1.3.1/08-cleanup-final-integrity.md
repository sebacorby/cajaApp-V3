# 08 — Cleanup final e integridad post-restauración

Ejecutado por el arquitecto tras auditar toda la evidencia (01-06, 04b, 06b, 07).

1. Servicios detenidos: `cajaapp-headless-up.ps1 -Stop` → `{"ok":true,"stopped":[166140,191092]}`. Puertos
   11436/11437 confirmados libres por `netstat` antes y después de la restauración de `dev.db`.
2. `dev.db` restaurado desde `PRE-v1.3.1-cajaapp.db` (`cp`, sobrescritura exacta). Hash resultante:
   `24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272` — coincide exactamente con el checkpoint
   registrado en el addendum v1.3.1 §2.3 y con el hash del propio `PRE-v1.3.1-cajaapp.db` (verificado de nuevo
   antes de copiar). Todos los datos UAT creados durante el smoke API (Conciliación, Cierre Mensual,
   Backup/Restore) quedan eliminados por esta restauración, ya que revierte la base completa al estado
   pre-materialización.
3. PRAGMA sobre el `dev.db` ya restaurado:
   - `integrity_check` → `[('ok',)]` — **PASS**.
   - `foreign_key_check` → `[]` (0 violaciones) — **PASS**.
4. Artefactos generados eliminados: `workspace/frontend/{node_modules,.next,test-results,playwright-report}`,
   `workspace/backend/{node_modules,dist}`. Confirmado por listado de directorio que no quedan.
5. Lockfiles: ver `07-lockfiles-hash.md` — sin cambios (garantizado por semántica de `npm ci`).
6. Inventario de 23 archivos: hashes finales recalculados tras todo el gate y coinciden exactamente con los de
   `06-hash-verification.md` (incluidos los 5 casos investigados y explicados en `06b-hash-mismatch-root-cause.md`)
   — es decir, ningún archivo del inventario cambió durante la ejecución de los gates.

**Cleanup e integridad: PASS.**
