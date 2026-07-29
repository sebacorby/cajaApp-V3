# P5 v1.3.3 — Cierre de Backup/Restore

Estado: INSTRUCCIÓN ACTIVA.

Alcance único: runtime Python y validación real de Backup/Restore. No se modifican Conciliación, Cierre mensual ni los tests ya aprobados.

La campaña conserva como válidos los resultados de v1.3.2 para Node 24.18.0, backend 11/11, frontend, Playwright 3/3 y restauración SQLite.

## Requisitos

- Python real y disponible para el backend, con ruta absoluta y versión registradas.
- Uso exclusivo de biblioteca estándar; sin dependencias nuevas.
- Creación real de un paquete de respaldo mediante API.
- Paquete con exactamente `database.sqlite` y `manifest.json`.
- Validación real de checksums, integridad, claves foráneas, tablas y migraciones.
- Descarga real del paquete.
- Restauración real mediante API.
- Backup automático previo a restaurar.
- Dato centinela creado después del backup y ausente tras la restauración.
- Registro de actividades, limpieza de sidecars y puertos libres al finalizar.
- Copia binaria nueva de `dev.db` al inicio y restauración final al mismo SHA-256.

## Evidencia

Carpeta esperada:
`agents-to-architect/pending-validation/APPCAJA-V3-P5-BACKUP-RESTORE-RUNTIME-CLOSURE-evidence-v1.3.3`

Debe incluir preflight de Node y Python, hash y copia inicial de SQLite, log backend, respuestas reales de create/validate/download/restore, manifiesto e inventario del paquete, prueba del dato centinela, backup previo automático, controles SQLite, hash final, inventario y veredicto.

PASS requiere ciclo real completo exitoso y hash final idéntico al inicial. Un error de entorno determina FAIL.
