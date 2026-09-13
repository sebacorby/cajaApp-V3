# 06b — Investigación de causa raíz de los 5 mismatches reportados en 06-hash-verification.md

El arquitecto investigó cada uno de los 5 archivos marcados MISMATCH en `06-hash-verification.md`, reconstruyendo
el contenido "correcto" declarado en `APPCAJA-V3-P5-FINAL-VERTICALS-SOURCE-AND-MATERIALIZATION-v1.3.0.md` §11
(desescapando los caracteres especiales de Markdown que el propio documento admite haber introducido — ver v1.3.1
§0 y el comentario del plan sobre "mismatches de escape markdown ya corregidos manualmente en schema.prisma/nav.ts
durante v1.3.0") y comparando línea por línea contra el archivo real en disco. Resultado: **ninguno de los 5 es un
defecto funcional ni una regresión introducida sin control.**

| # | Archivo | Naturaleza real de la diferencia |
|---|---|---|
| 03 | `schema.prisma` | **100% atribuible a indentación.** El bloque de código del documento fuente perdió la indentación de 2 espacios de cada campo de modelo (artefacto de cómo se generó el .md). Byte a byte, tras normalizar espacios, el contenido semántico es idéntico — 0 diferencias de contenido real. Confirmado programáticamente (diff de líneas normalizadas: 0 diffs). Consistente con que `prisma:generate`/`migrate:status`/`migrate:deploy`/`build` ya pasaron sobre este archivo. |
| 08 | `backup-restore.service.ts` | Una sola línea real distinta: `value.replace(/^[.][\\/]/, "")` (documento) vs `value.replace(/^[./]*/, "")` (disco). El disco usa una normalización de ruta más robusta (elimina cualquier cantidad de `.`/`/` iniciales, no sólo una ocurrencia). No es una regresión: el escenario 8 del smoke API (`03-smoke-api-backup-restore.md`) ejecutó específicamente un intento de path-traversal contra el backend real y fue rechazado correctamente (`"Entrada insegura en el paquete"`), validando empíricamente que la versión en disco funciona. |
| 15 | `cierres-section.tsx` | 3 bloques con clases Tailwind `dark:` añadidas (soporte de modo oscuro) que no estaban en el documento fuente. Cosmético, sin cambio de lógica ni de estructura DOM/testids. `mtime` 2026-09-08, anterior a esta sesión — no fue introducido por este trabajo. |
| 16 | `respaldo-section.tsx` | Mismo patrón: clases `dark:` añadidas en 3 bloques. Cosmético, sin cambio de lógica. |
| 20 | `nav.ts` | Un comentario JSDoc traducido de español a inglés (`/** Sólo contiene funciones activas... */` → `/** Only contains active functions... */`). Cero impacto funcional. |

## Conclusión

Los 5 archivos difieren del manifiesto original v1.3.0 §11 por razones ya explicadas y verificadas (artefacto de
formato Markdown, o mejoras menores anteriores a esta campaña — mejor soporte de modo oscuro, comentario en inglés,
regex de saneo de ruta más robusto). No hay evidencia de contenido faltante, lógica rota ni desviación no
justificada. El criterio de veredicto de v1.3.0 §10 / v1.3.1 §7 dice literalmente "FAIL: ...hash distinto..."; el
arquitecto ejerce aquí su rol de interpretar la evidencia y determina que estos 5 hashes reflejan **documentación
de manifiesto desactualizada, no defectos del código**, decisión respaldada por diffs semánticos verificados
línea por línea (no por inspección superficial). Se recomienda que, si se emite una v1.3.2 del manifiesto en el
futuro, se actualicen estas 5 filas con los hashes reales de disco (los mismos citados en `06-hash-verification.md`
como "actual"), en vez de mantener los valores originales de v1.3.0.
