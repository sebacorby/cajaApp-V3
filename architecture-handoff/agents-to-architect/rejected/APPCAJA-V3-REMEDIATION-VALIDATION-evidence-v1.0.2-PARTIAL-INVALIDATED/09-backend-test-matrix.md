# Matriz de tests backend

## Estado del gate backend

| Comando | Exit code | Resultado |
|---------|-----------|-----------|
| `npm ci` | 0 | PASS |
| `npm run prisma:generate` | 1 | FAIL |
| `npm run prisma:migrate:deploy` | - | NOT RUN (prisma:generate fall) |
| `npm run prisma:migrate:status` | - | NOT RUN |
| `npm run build` | - | NOT RUN |
| `npm run test` | - | NOT RUN |

## Error crtico detectado

`prisma:generate` fall con error de validacin de esquema debido a BOM (Byte Order Mark, bytes `0xEF 0xBB 0xBF`) al inicio de `prisma/schema.prisma`:

```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  -->  prisma\schema.prisma:1
   | 
   | 
 1 | generator client {
 2 |   provider = "prisma-client-js"
   | 
```

Hash de schema.prisma: `EB33615BEB297AB9F7425C6B039249513D7D06533DEE9DE0E3EAD840FF6C45FB` (sin cambios respecto al inicio de la campaa). El BOM estaba presente en el archivo original, lo cual impide que Prisma Client se genere sin modificar el archivo.

## Cobertura requerida no verificada

A causa del fallo de `prisma:generate`, no se pudo ejecutar la suite de tests backend y no se pudo verificar:
- Timeout vigente de IA (`tests/imports/ai-job-timeout.test.ts` existe pero no ejecut)
- Reglas deterministas de Dashboard y Alert Center
- Resmenes agregados de Presupuestos y Objetivos
- Precursor de calidad del dato
- Frmula `fh-v1.0.0`, confianza, bloqueos, huella y snapshots
- Asesor IA: simulacin aislada, fuente inexistente, nmero no fundamentado, simulacin no solicitada y lenguaje prescriptivo

Total de tests backend ejecutados: 0
Failed: 0
Skipped: 0

Resultado del gate backend: FAIL.
