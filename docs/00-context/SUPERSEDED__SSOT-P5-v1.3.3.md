# SSOT — P5 v1.3.3

Estado: VIGENTE.
Fecha: 17 de julio de 2026.

La validación P5 v1.3.2 fue rechazada únicamente porque el ciclo real de Backup/Restore no pudo ejecutarse: el backend no encontró el ejecutable Python configurado y la creación por API terminó en HTTP 500.

Los gates ya acreditados se conservan: Node.js v24.18.0, backend focal 11/11, frontend typecheck/build, Playwright 3/3 y restauración SQLite al hash inicial.

La evidencia rechazada está en:
`agents-to-architect/rejected/APPCAJA-V3-P5-FINAL-VERTICALS-FOCAL-VALIDATION-evidence-v1.3.2-FAIL`

Las instrucciones v1.3.2 fueron trasladadas a `architect-to-agents/superseded`.

La única campaña activa es:
`APPCAJA-V3-P5-BACKUP-RESTORE-RUNTIME-CLOSURE-v1.3.3.md`

El alcance queda limitado al runtime Python y al ciclo real de creación, validación, descarga y restauración de Backup/Restore, incluyendo backup automático previo, dato centinela y restauración final de SQLite al mismo SHA-256 inicial.

No se abre otro vertical hasta cerrar P5 con veredicto arquitectónico.
