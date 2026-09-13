# APPCAJA-V3 v1.0.8 — Canonical recovery manifest

Fuente sincronizada: `I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.8-CANONICAL-RECOVERY`

Destino operativo: `I:\cajaApp-V3-real`

Copiar cada archivo sin reformatear ni reinterpretar. El SHA-256 del destino debe coincidir con el listado.

| Archivo de recuperación | Destino relativo en `I:\cajaApp-V3-real` | Bytes | SHA-256 |
|---|---|---:|---|
| `ai-advisor.service.ts` | `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts` | 35735 | `58AE3E56B800A65687FCF5CF9C793A9789D68771D14EFA0463F9494FA0965FAF` |
| `ai-advisor.service.test.ts` | `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts` | 4650 | `7DCE3754596CB36D60EC774152EA44963A00069745902A092D1081041D69F7A8` |
| `tarjetas-section.tsx` | `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx` | 89965 | `338FCDA143BC448603BE6C0A2FBE2298C07752DD60E43C2C66A94085F492649F` |
| `alert-center.spec.ts` | `workspace/frontend/tests/alert-center.spec.ts` | 2370 | `40F9D6B1CB1CF9A58585DB555AC9ABF9AA9AD2DD16442CDFFF38CD5072BF99C2` |
| `categories.spec.ts` | `workspace/frontend/tests/categories.spec.ts` | 5852 | `2FA1D08C754E822D9452BF1A6136912FF8EC900C0C1B315997C0EBA84A43D536` |
| `chart-parity.spec.ts` | `workspace/frontend/tests/chart-parity.spec.ts` | 4614 | `B1397CE3F784AD418EB16C4124AF49554CA76F2F6559B43CFD37DAF618CA5230` |
| `debit-csv-import.spec.ts` | `workspace/frontend/tests/debit-csv-import.spec.ts` | 2503 | `D770B13BC0A609AE9D1353E7F1065AA557E020A894D1FCFCEFF888D18550212C` |
| `card-statement-import.spec.ts` | `workspace/frontend/tests/e2e/card-statement-import.spec.ts` | 8020 | `87B6A7CC723DF09690F6BAC1CF5A179FAB01A114DFC8062001BE860C72C2E4BF` |
| `dashboard.spec.ts` | `workspace/frontend/tests/e2e/dashboard.spec.ts` | 5312 | `FF55128F833CD9F382DC9B1DEB3737709FF82F92031731FC1B79BFEA328E7CD6` |
| `dashboard-alerts.spec.ts` | `workspace/frontend/tests/e2e/deuda-futura/dashboard-alerts.spec.ts` | 2817 | `E82902618306754FEA67ACE6789D3BD05AB61C75FCDFA1E5F4AA2D85E58921BA` |
| `future.spec.ts` | `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts` | 2340 | `E28FEC3B1EB25160F20DA543E39E774CAAD9658044ABF37EC1965605AA9FED88` |
| `financial-health.spec.ts` | `workspace/frontend/tests/financial-health.spec.ts` | 7318 | `0751484CF159740B592288CD221D983C4DEFF50A71F74AEE76B97D13826BECC7` |
| `global-search.spec.ts` | `workspace/frontend/tests/global-search.spec.ts` | 2656 | `A8CDCB4B992E88C8A51A09DEA3CA44EE124BBA3FDC5B6F47952D469E23F05939` |
| `movements.spec.ts` | `workspace/frontend/tests/movements.spec.ts` | 2135 | `0E7C86E93C41BB808B794204674188FB4AC1F13D039647CF06A7315665F02AD3` |
| `sidebar-data-quality.spec.ts` | `workspace/frontend/tests/sidebar-data-quality.spec.ts` | 4526 | `FB1F87A0493C78BC60E94C984A052A3FB25F02A653DA12700D7A02EE92280767` |

Reglas:

- No copiar el manifiesto dentro de `workspace`.
- No modificar ningún otro archivo durante Fase 8A.
- Si un hash no coincide después de la copia, detener la materialización y declarar `BLOCKED`.
