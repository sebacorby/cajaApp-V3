# P5 focal validation v1.3.2

Estado: INSTRUCCIÓN ACTIVA.
Root único: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.
Entorno obligatorio: Windows x64 y Node.js v24.18.0 exacto.

La campaña valida Conciliación, Cierre mensual y Backup/Restore. No autoriza reimplementación ni cambios de alcance.

Son parte vinculante de esta instrucción:

- `APPCAJA-V3-P5-v1.3.2-ANNEX-A-EXECUTION.md`
- `APPCAJA-V3-P5-v1.3.2-ANNEX-B-EVIDENCE.md`

El agente debe detenerse con FAIL si cualquier proceso usa Node 22 u otra versión, si faltan hashes reales, si no existe backup binario nuevo de SQLite o si el inventario no coincide con los archivos entregados.

El resultado esperado es backend focal 11/11 PASS, Playwright focal 3/3 PASS, smokes API reales de los tres verticales y restauración final de SQLite al mismo hash inicial.

No se abre otro vertical hasta el veredicto arquitectónico.
