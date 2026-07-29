# P5 v1.3.1 — Checklist técnico

La campaña cubre Conciliación, Cierre mensual y Respaldo.

El workspace actual contiene tres correcciones del arquitecto: los avisos de los dos E2E se buscan dentro de su sección y la navegación fue recreada sin cambio funcional.

La validación requiere entorno Windows x64, Node.js v24.18.0, instalación limpia, Prisma actualizado, compilación backend y frontend, pruebas focales backend y los tres E2E focales.

El resultado esperado de Playwright es 3 de 3, sin reintentos ni pruebas omitidas.

La revisión funcional comprende el ciclo completo de conciliación, los bloqueos y el versionado del cierre mensual, y el ciclo completo de creación, validación, descarga y restauración de un respaldo.

SQLite debe contar con una copia binaria tomada antes de la campaña. El hash de esa copia debe coincidir con el inicial y la misma copia debe restaurarse al finalizar.

Si lint informa un error en conciliacion-section.tsx, la evidencia debe incluir regla, línea y mensaje. La corrección queda limitada a ese archivo y no admite cambios en la configuración de ESLint.

La evidencia final incluye veredicto, preflight, hashes, logs, respuestas API, artefactos Playwright, controles de integridad, limpieza y estado de puertos.

El veredicto es PASS o FAIL. BLOCKED sólo corresponde a un impedimento externo comprobado.
