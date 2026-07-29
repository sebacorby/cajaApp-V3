# 00-sqlite-state.md

Ejecutado: 2026-07-13 00:37:52 -03:00 (America/Buenos_Aires, UTC-3)

## §7.2 Verificación del backup preexistente

- Ruta: `C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`
- Existe: TRUE
- Tamaño (bytes): 5357568
- SHA-256: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`

## §7.4 Estado inicial de `prisma\dev.db` (pre-restauración)

- Ruta: `I:\cajaApp-V3\workspace\backend\prisma\dev.db`
- Existe: TRUE
- Tamaño (bytes): 6742016
- SHA-256: `4449C350ECD49798332006DA47F14534536C9C3269A87D4326CA94B84AD643AC`

Diferencia: el `dev.db` actual era ~1.3 MB más grande que el backup limpio `FINAL-20260712-180706.db`. Indicaba residual previo al inicio de la validación.

## §7.5 Restauración del backup sobre `dev.db` (procedimiento autorizado por §7 y §14)

Comando ejecutado (PowerShell nativo, sin wrappers):

```powershell
Copy-Item -LiteralPath `
  "C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db" `
  -Destination "I:\cajaApp-V3\workspace\backend\prisma\dev.db" -Force
```

Resultado: `RESTORE: OK`

## §7.6 Hash post-restauración

| Archivo                                                       | SHA-256                                                            | Tamaño   |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `cajaapp-FINAL-20260712-180706.db` (backup limpio)            | `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552` | 5357568  |
| `workspace\backend\prisma\dev.db` (post-restauración)         | `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552` | 5357568  |

**HASHES_MATCH: TRUE**
**SIZES_MATCH: TRUE**

## §7.7 Copia de resguardo del estado limpio

La copia canónica de resguardo preexistente es el propio backup en `%TEMP%\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`. Se conserva como origen único de restauración final.

## §14.4 Hash final post-validación

Como el gate nunca se ejecutó (§8-§13 omitidos por FAIL de preflight §6.2/§6.3), el `dev.db` no sufrió mutaciones durante esta validación más allá de la restauración inicial.

- Hash final de `dev.db`: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`
- Coincide con el backup limpio: **TRUE**
