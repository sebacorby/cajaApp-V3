# 02 — Integrity Preflight

**Campaña:** APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.9
**Fecha:** 2026-07-15

## 8.1 Resolve-Path I:\cajaApp-V3-real

```
Path               ProviderPath
----               ------------
I:\cajaApp-V3-real I:\cajaApp-V3-real
```

✅ Root operativo confirmado.

## 8.2 I:\cajaApp-V3 (NO operativo)

Ruta existe (espejo Google Drive con código canónico sincronizado), pero el agente sólo la usa para **leer** instrucciones y referencias. Toda modificación se realiza exclusivamente en `I:\cajaApp-V3-real`.

## 8.3 Versión Node

```
node  v24.18.0
npm   11.16.0
npx   11.16.0
```

Coincide con el toolchain autorizado. No se usa PATH.

## 8.4 Hashes iniciales de archivos autorizados

| SHA-256 | Tamaño | MTime | Ruta |
|---|---|---|---|
| `4F504310A3CE4B34A40473769285968F38394F2E2E6D43551718FC1697D18FD0` | 36,5 KB | 2026-07-15 00:52:29 | `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts` |
| `55164749AA4D35CF44C2692A8A94D4EB3830FAEF0E4C10CF74D6F241F4A95699` | 4,7 KB | 2026-07-15 00:54:45 | `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts` |
| `F4B630432E1576ECBF09D80FEC47F1A24361692E328AA2BA5B7945D13AC71B1C` | 3,3 KB | 2026-07-14 06:50:50 | `contracts/prompts/advisor/01-explain-financial-context.md` |
| `DB253B37808EE888924DA4D8823B5ECB2A281AF2F5DDC4015AB0E50B7F1B5CD6` | 4,7 KB | 2026-07-14 15:17:59 | `workspace/frontend/tests/ai-advisor.spec.ts` |
| `AD9333EA9D3BBF4B0F928DE6E485E1E2AD07283A0C1F74AE66F5DE9FE5D9B069` | 1,6 KB | 2026-07-13 00:49:20 | `workspace/frontend/src/components/finance/layout/app-shell.tsx` |
| `020595604DD66B73B5B5914BA3622FD6A8FF6BB84657904AF859E792321043F6` | 2,2 KB | 2026-07-14 15:17:59 | `workspace/frontend/src/components/finance/layout/sidebar.tsx` |
| `7E719BE69C92BF51C481B502221F25264BD1F5BC8C50C705490BC1D9A7850237` | 4,8 KB | 2026-07-15 01:15:55 | `workspace/frontend/tests/sidebar-data-quality.spec.ts` |
| `2FA1D08C754E822D9452BF1A6136912FF8EC900C0C1B315997C0EBA84A43D536` | 5,7 KB | 2026-07-15 00:54:33 | `workspace/frontend/tests/categories.spec.ts` |
| `136DE2601465497633972F0EB4271FD62EE4B14C16704080DFB9D6A25869A740` | 4,9 KB | 2026-07-15 00:58:56 | `workspace/frontend/tests/chart-parity.spec.ts` |
| `89C991D244AA70369E813CFF2B5E52824F8FB001A29B004F2B66D24C40763420` | 2,7 KB | 2026-07-15 01:01:02 | `workspace/frontend/tests/debit-csv-import.spec.ts` |
| `F08E524B9429DB89FBBBBC48C25DFE5385CC4334AF1F09391BE1EB3F80293D01` | 8,2 KB | 2026-07-15 01:03:09 | `workspace/frontend/tests/e2e/card-statement-import.spec.ts` |
| `07829B2E747785A3917A33ED117EBC5ECA10CF15B36DFA09DBE6D57C14AC9599` | 2,4 KB | 2026-07-15 01:08:03 | `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts` |
| `474740C198915A277138B087D0CDFC3C4A4C17588576E8793B0176973297BF51` | 2,7 KB | 2026-07-15 01:11:47 | `workspace/frontend/tests/global-search.spec.ts` |

## 8.5 Limpieza de artefactos

`dist`, `.next`, `coverage`, `playwright-report`, `test-results` no existían al inicio en `workspace/backend` ni `workspace/frontend`. No fue necesario eliminar nada.

## 8.6 BOM / sufijos de copia

**Pre-existente (no introducido por la campaña, fuera de alcance v1.0.9):** 9 de los 13 archivos autorizados tienen BOM UTF-8 al inicio. Se documenta en `27-known-issues.md`. No se modifica.

**Otros archivos:** sólo se encontró un `.bak` archivado en `architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.0/PRE_REMEDIATION__package.json.bak`, que pertenece a evidencia histórica rechazada y no se toca.

## 8.7 Lockfiles iniciales

| SHA-256 | Tamaño | MTime | Ruta |
|---|---|---|---|
| `825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87` | 135,7 KB | 2026-07-11 20:02:44 | `workspace/backend/package-lock.json` |
| `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED` | 493,7 KB | 2026-07-11 20:03:07 | `workspace/frontend/package-lock.json` |

No existe `package-lock.json` en la raíz. Estado inicial registrado para verificación al cierre.

## 9 Protección SQLite

- Origen: `I:\cajaApp-V3-real\workspace\backend\prisma\dev.db`
- SHA-256 inicial: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`
- Tamaño inicial: 5.357.568 bytes (5.232 KB)
- MTime: 2026-07-12 17:51:49
- Backup fuera de ruta activa: `C:\Users\javie\AppData\Local\Temp\opencode\cajaapp-sqlite-backups\dev.db.v109.20260715-084749.bak`
- SHA-256 del backup: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552` (idéntico al origen)

Hash idéntico confirmado. Restauración será exigida al cierre con misma verificación.