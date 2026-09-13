# 03 — Smoke API real: Backup/Restore (APP-BACKUP-RESTORE-001)

Entorno: mismo backend real, servicio en ejecución durante toda la prueba, sin detenerlo. Directorio de backups
confirmado fuera del árbol I:\cajaApp-V3 (fuera de Drive), en `%LOCALAPPDATA%\CajaAppV3\backups`. Ningún archivo
fuente fue modificado. Datos UAT creados sobre movimientos con descripción `UAT-BACKUP-MARKER-A` / `-B` en el mes
ficticio 2031-06.

Scripts fuente: `03-backup-restore.mjs`, `03-backup-restore-part2.mjs`, `03-backup-restore-part3.mjs`, todos en
`C:\Users\javie\AppData\Local\Temp\uat-evidence\`. Logs completos homónimos `.log` en el mismo directorio.
Artefactos binarios generados (paquetes .cajaapp-backup, buenos y manipulados) en
`C:\Users\javie\AppData\Local\Temp\uat-evidence\br-artifacts\`.

## Escenario 1 — Crear paquete real y verificar que queda fuera de Drive

```
POST /api/movements/manual {"occurredOn":"2031-06-01",...,"description":"UAT-BACKUP-MARKER-A",...,"amount":"111.00"}
→ 201, id manual:09afb5e1-8210-4d19-b9db-96bee27c8101

POST /api/backup-restore  {"label":"uat-restore-test"}
→ 201
{
  "id": "39bac785-3e01-45b7-962d-f1863e615da1",
  "fileName": "cajaapp-v3-2026-09-09T13-50-34-778Z-uat-restore-test.cajaapp-backup",
  "kind": "manual", "status": "created", "sizeBytes": 641826,
  "sha256": "13ec5ad2b62c85a75b4eb330770a685b106dff9f388a90e48b1cd877daa07e6a",
  "manifest": { "format":"cajaapp-backup-v1", "database": {"sha256":"0b1eee85...","integrityCheck":"ok","foreignKeyViolations":0,"tables":[...38 tablas...]}, "source": {"schemaSha256":"...","migrationsSha256":"...","nodeVersion":"v24.18.0"} }
}

GET /api/backup-restore (list)
→ 200, backupDirectory: "C:\\Users\\javie\\AppData\\Local\\CajaAppV3\\backups"
```

`C:\Users\javie\AppData\Local\CajaAppV3\backups` está fuera de `I:\cajaApp-V3` (fuera del árbol mapeado a Drive).
Confirmado también por listado físico del directorio (`ls`) antes de esta corrida, mostrando backups previos de
smokes anteriores (17/18-jul-2026) ajenos a esta evidencia, no tocados.

**Verdict: PASS**.

## Escenario 2 — Descargar y abrir ZIP: exactamente `database.sqlite` y `manifest.json`

```
GET /api/backup-restore/39bac785-3e01-45b7-962d-f1863e615da1/download
→ 200, Content-Disposition: attachment; filename="cajaapp-v3-2026-09-09T13-50-34-778Z-uat-restore-test.cajaapp-backup"
   Content-Type: application/octet-stream, 641826 bytes descargados
```

Inspección real del ZIP descargado con `zipfile` (Python 3.14.6):
```
NAMES: ['database.sqlite', 'manifest.json']
database.sqlite 5640192 bytes (comprimido 640635)
manifest.json 2465 bytes (comprimido 961)
```

**Verdict: PASS** — exactamente 2 entradas, sin archivos extra.

## Escenario 3 — Validar checksum, schema, migraciones, integrity_check y foreign_key_check

```
POST /api/backup-restore/39bac785-3e01-45b7-962d-f1863e615da1/validate
→ 200
{"valid": true, "packageSha256": "13ec5ad2b62c85a75b4eb330770a685b106dff9f388a90e48b1cd877daa07e6a",
 "manifest": {..."integrityCheck":"ok","foreignKeyViolations":0, "tables":[38 tablas],
              "source":{"schemaSha256":"10258292...","migrationsSha256":"a1a49b06...","nodeVersion":"v24.18.0"}}}
```

**Verdict: PASS** — la validación real ejecutada por el propio backend (subprocess Python + PRAGMA) confirma
`integrityCheck: "ok"`, `foreignKeyViolations: 0`, y los checksums de schema/migraciones coinciden con lo instalado.

## Escenario 4/5 — Dato UAT A antes del backup, dato UAT B después; restaurar y demostrar A presente / B ausente

```
(A ya creado en escenario 1, antes del backup)

POST /api/movements/manual {"occurredOn":"2031-06-02",...,"description":"UAT-BACKUP-MARKER-B",...,"amount":"222.00"}
→ 201  (creado DESPUÉS del backup)

GET /api/movements?from=2031-06-01&to=2031-06-28  (antes de restaurar)
→ descriptions: ["UAT-BACKUP-MARKER-B","UAT-BACKUP-MARKER-A"]   (ambos presentes)

POST /api/backup-restore/restore   (multipart, archivo = backup descargado en escenario 2, que sólo contiene A)
→ 200
{"restored": true,
 "backup": {"id":"af913a94-73b2-440e-8221-08e40aadb6b4","kind":"restored_upload","status":"restored", ...},
 "preRestoreBackup": {"id":"cb29c9be-83cc-43e2-aaf0-4950a98d82fb","kind":"pre_restore","status":"created", ...}}

GET /api/movements?from=2031-06-01&to=2031-06-28  (después de restaurar)
→ descriptions: ["UAT-BACKUP-MARKER-A"]    (B ya no existe; A sigue presente)
```

**Verdict: PASS** — el restore real reemplazó la base y el estado post-restauración es exactamente el snapshot
tomado antes de crear B: A presente, B ausente.

## Escenario 6 — Backup automático `pre_restore`: existencia y descarga

```
GET /api/backup-restore (list) → item kind:"pre_restore", id: cb29c9be-83cc-43e2-aaf0-4950a98d82fb,
   fileName: "cajaapp-v3-2026-09-09T13-51-29-331Z-before-backup-a.cajaapp-backup", status:"created"

actividad registrada: {"action":"restore","status":"success",
   "detail":{"sourceFileName":"backup-A.cajaapp-backup","preRestoreBackupId":"cb29c9be-...","tables":38}}

GET /api/backup-restore/cb29c9be-83cc-43e2-aaf0-4950a98d82fb/download
→ 200, Content-Disposition con el fileName del pre_restore, 643277 bytes descargados
```

**Verdict: PASS** — el backup automático de seguridad se crea antes de restaurar y es descargable, tal como exige
la especificación.

## Escenario 7 — Corromper checksum y demostrar rechazo

Se tomó el paquete bueno de escenario 2, se modificó **únicamente el último carácter hex** del
`manifest.database.sha256` declarado (manteniendo `database.sqlite` intacto), y se re-empaquetó como
`corrupt-checksum.cajaapp-backup` (script Python ad hoc, sin tocar código fuente de la app).

```
POST /api/backup-restore/restore  (corrupt-checksum.cajaapp-backup)
→ 400
{"code":"VALIDATION_ERROR","message":"El checksum o tamaño de database.sqlite no coincide con el manifiesto."}
```

**Verdict: PASS** — rechazo correcto antes de tocar la base real (ver escenario 9 para confirmación de que el
estado no se alteró).

## Escenario 8 — Agregar entrada extra / path traversal y demostrar rechazo

Dos variantes construidas con `zipfile` directamente (sin pasar por el empaquetador de la app):

- `extra-entry.cajaapp-backup`: mismo `database.sqlite` + `manifest.json` + un tercer archivo `evil.txt`.
- `path-traversal.cajaapp-backup`: `database.sqlite` + una entrada con nombre `../../evil-manifest.json` en vez de
  `manifest.json` (vía `zipfile.ZipInfo` directo, evitando el saneo normal del nombre).

```
POST /api/backup-restore/restore  (extra-entry.cajaapp-backup)
→ 400
{"code":"VALIDATION_ERROR","message":"...RuntimeError: El paquete debe contener exactamente database.sqlite y manifest.json"}

POST /api/backup-restore/restore  (path-traversal.cajaapp-backup)
→ 400
{"code":"VALIDATION_ERROR","message":"...RuntimeError: Entrada insegura en el paquete"}
```

**Verdict: PASS** — ambas variantes maliciosas son rechazadas con 400 antes de cualquier extracción a disco fuera
del directorio temporal, con el mensaje específico correspondiente (`El paquete debe contener exactamente...` para
entrada extra, `Entrada insegura en el paquete` para path traversal).

## Escenario 9 — Confirmación de que los rechazos (7 y 8) no alteraron el estado

```
GET /api/movements?from=2031-06-01&to=2031-06-28  (antes de los 3 intentos maliciosos)
→ descriptions: ["UAT-BACKUP-MARKER-A"]

... 3 intentos de restore maliciosos, los 3 rechazados con 400 ...

GET /api/movements?from=2031-06-01&to=2031-06-28  (después de los 3 intentos)
→ descriptions: ["UAT-BACKUP-MARKER-A"]   (sin cambios)

GET /health → 200 {"status":"ok","service":"cajaapp-v3-backend","node":"v24.18.0"}
```

**Verdict: PASS** — el estado de datos y la salud del servicio son idénticos antes y después de los 3 intentos de
restauración maliciosos/corruptos.

## Escenario 10 — Rollback ante fallo inducido ANTES del segundo rename — OMITIDO CON JUSTIFICACIÓN

**No se pudo inducir este escenario mediante llamadas API puras, y se documenta el motivo exacto en vez de
fabricar un resultado.**

El mecanismo de restauración (`workspace/backend/src/modules/backup-restore/backup-restore.service.ts`, método
`restore()`, líneas ~493-499) ejecuta:

```ts
await disconnectDatabase();
await fs.rm(`${dbPath}-wal`, { force: true });
await fs.rm(`${dbPath}-shm`, { force: true });
await fs.rename(dbPath, originalPath);       // (1) primer rename
originalMoved = true;
await fs.rename(candidatePath, dbPath);      // (2) segundo rename
candidateMoved = true;
```

El bloque `catch` sólo revierte el primer rename (`fs.rename(originalPath, dbPath)`) cuando `originalMoved === true`
y algo lanza una excepción **antes** de que `candidateMoved` se marque en `true` — es decir, exactamente en la
ventana entre las líneas (1) y (2). Esa ventana es una operación de E/S de archivo local (dos `await fs.rename`
consecutivos sobre el mismo volumen), sin ningún punto de extensión, hook, endpoint ni parámetro expuesto por la
API HTTP que permita inyectar un fallo ahí. Para inducirlo de forma determinística sería necesario:
(a) modificar el código fuente para agregar un punto de fallo controlable (prohibido — no se puede tocar el
inventario gobernado), o (b) intentar una condición de carrera a nivel de sistema de archivos desde un proceso
externo (por ejemplo, borrar o bloquear `candidatePath` justo entre ambos `rename`), lo cual no es "inducible
mediante llamadas API" sino un ataque de temporización externo al proceso, no reproducible de forma confiable y
fuera del alcance de un smoke test API.

Como evidencia indirecta de que el mecanismo de reversión SÍ existe y está bien formado: los escenarios 7 y 8
(checksum corrupto, entrada insegura) demuestran que cuando la validación falla **antes** de cualquier rename
(`originalMoved` y `candidateMoved` ambos en `false`), el `catch` no ejecuta ningún rename y el estado permanece
intacto (confirmado en escenario 9). Eso cubre el camino "fallo antes del primer rename". El camino "fallo entre
el primer y el segundo rename" queda **omitido, con esta justificación explícita**, no fabricado.

**Verdict: OMITIDO (no FAIL) — justificación documentada arriba.**

## Resumen del vertical

| Escenario | Resultado |
|---|---|
| Crear paquete real fuera de Drive | PASS |
| Descargar y verificar exactamente 2 entradas en el ZIP | PASS |
| Validar checksum/schema/migraciones/integrity/foreign_key | PASS |
| Dato A antes / B después del backup | PASS |
| Restaurar: A presente, B ausente | PASS |
| Backup automático pre_restore: existe y se descarga | PASS |
| Checksum corrupto → rechazo 400 | PASS |
| Entrada extra → rechazo 400 | PASS |
| Path traversal → rechazo 400 | PASS |
| Estado no alterado tras los 3 rechazos | PASS |
| Rollback ante fallo inducido entre los dos renames | **OMITIDO** (justificado, no inducible vía API) |

**9/10 escenarios ejecutados, 9/9 PASS. 0 FAIL. 1 omitido con justificación explícita.**
