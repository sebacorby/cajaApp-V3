# P5 v1.3.2 — Anexo A

## Entorno

Toda la campaña corresponde a Node.js v24.18.0. La evidencia incluye versión, ejecutable real, npm real, root, backend, frontend y puertos. Cualquier rastro de Node 22 determina FAIL.

## Integridad y SQLite

Los hashes deben ser SHA-256 reales y completos, con tamaños y rutas existentes. Antes de validar se crea una copia binaria nueva de `dev.db`; al final se restaura esa misma copia y el hash final debe coincidir exactamente con el inicial. También se documentan integridad, quick check y claves foráneas.

## Gates

Backend: instalación limpia, Prisma, build y únicamente los tres tests focales de Conciliación, Cierre mensual y Backup/Restore. Resultado requerido: 11/11.

Frontend: instalación limpia, typecheck, lint, build y los tres E2E focales. Resultado requerido: 3/3 sin retries ni skips.

## Funcionalidad

La validación real cubre el ciclo completo de Conciliación, bloqueos y versionado de Cierre mensual, y creación, validación, descarga y restauración de Backup/Restore. Conteos de tablas o PRAGMA aislados no sustituyen los endpoints reales.
