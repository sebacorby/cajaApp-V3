# 05 — Integridad SQLite (PRAGMA) y verificación de hash de dev.db

Base analizada: `I:\cajaApp-V3\workspace\backend\prisma\dev.db` (base real en uso por el backend en ejecución,
no detenido ni restaurado, conforme a las restricciones de esta tarea).

## PRAGMA integrity_check

```python
import sqlite3
con = sqlite3.connect('dev.db')
cur = con.cursor()
cur.execute('PRAGMA integrity_check;')
print(cur.fetchall())
```
Resultado real: `[('ok',)]`

**Verdict: PASS**.

## PRAGMA foreign_key_check

```python
cur.execute('PRAGMA foreign_key_check;')
print(cur.fetchall())
```
Resultado real: `[]` (lista vacía = 0 violaciones de clave foránea)

**Verdict: PASS**.

## Verificación de hash de dev.db contra el checkpoint del addendum v1.3.1 §2.3

El addendum v1.3.1 (sección 2.3) registra que el arquitecto copió `dev.db` a
`PRE-v1.3.1-cajaapp.db` el 09/09/2026 y confirmó ambos archivos con hash idéntico
`24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272`, e instruye a este agente a "re-verificar este
hash contra el dev.db actual antes de continuar".

```
sha256sum "I:/cajaApp-V3/architecture-handoff/.../PRE-v1.3.1-cajaapp.db"
→ 24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272   (coincide exactamente con el valor documentado)

sha256sum "I:/cajaApp-V3/workspace/backend/prisma/dev.db"   (estado ACTUAL, después del smoke API real)
→ c96f4bbb08edae9aefe952dffc7ff3e45d2c613843e7aee25bcb21d732c7354f   (NO coincide con el checkpoint)
```

**Esto es un resultado esperado y no un defecto.** El archivo `PRE-v1.3.1-cajaapp.db` sí coincide exactamente con
el hash documentado, confirmando que el checkpoint pre-campaña está intacto y disponible. La divergencia del
`dev.db` actual es consecuencia directa y deliberada de haber ejecutado el smoke API real de Conciliación, Cierre
Mensual y Backup/Restore (creación de movimientos UAT, casos de conciliación, cierres mensuales, y una operación
de restore real que reemplazó físicamente la base) exigido por esta misma tarea. Las restricciones explícitas de
esta tarea prohíben a este agente restaurar o sobrescribir `dev.db` por cuenta propia — esa restauración al hash
`24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272` (usando `PRE-v1.3.1-cajaapp.db` como fuente,
según addendum §6) es responsabilidad exclusiva del arquitecto durante el cleanup posterior, después de auditar
esta evidencia.

**Verdict de esta verificación puntual: informativo, no PASS/FAIL** — el checkpoint (`PRE-v1.3.1-cajaapp.db`) está
íntegro y verificado; el estado actual de `dev.db` difiere por diseño de esta misma tarea de smoke testing, no por
corrupción ni por acción no autorizada.

## Resumen

| Verificación | Resultado |
|---|---|
| PRAGMA integrity_check sobre dev.db actual | PASS (`ok`) |
| PRAGMA foreign_key_check sobre dev.db actual | PASS (0 violaciones) |
| Hash de PRE-v1.3.1-cajaapp.db vs checkpoint documentado | PASS (coincide exactamente) |
| Hash de dev.db actual vs checkpoint documentado | Divergente — esperado por el propio smoke API de esta tarea, no restaurado (restauración es tarea del arquitecto en cleanup) |
