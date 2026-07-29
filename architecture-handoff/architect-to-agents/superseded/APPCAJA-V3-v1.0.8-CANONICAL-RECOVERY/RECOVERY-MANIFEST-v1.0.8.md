# RECOVERY-MANIFEST-v1.0.8


Proyecto: CajaApp V3


Estado: fuente canónica para materialización
Campaña: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8


## Reglas


La carpeta contiene las únicas copias autorizadas para la Fase 8A. El agente debe copiar cada archivo al destino indicado en `I:\cajaApp-V3-real` sin reinterpretar contenido. Cuando exista una marca UTF-8 inicial, se autoriza retirarla antes de calcular el SHA-256. El hash de la fuente normalizada debe coincidir con el destino final. Registrar cada operación en `00-remediation.md`.


No se publican hashes fijos: la validación se realiza durante la misma ejecución entre fuente y destino.


## Destinos


- `transactions-list.tsx` → `workspace\frontend\src\components\finance\movimientos\transactions-list.tsx`
- `tarjetas-section.tsx` → `workspace\frontend\src\components\finance\tarjetas\tarjetas-section.tsx`
- `ai-advisor.service.ts` → `workspace\backend\src\modules\ai-advisor\ai-advisor.service.ts`
- `ai-advisor.service.test.ts` → `workspace\backend\tests\ai-advisor\ai-advisor.service.test.ts`
- `alert-center.spec.ts` → `workspace\frontend\tests\alert-center.spec.ts`
- `chart-parity.spec.ts` → `workspace\frontend\tests\chart-parity.spec.ts`
- `debit-csv-import.spec.ts` → `workspace\frontend\tests\debit-csv-import.spec.ts`
- `card-statement-import.spec.ts` → `workspace\frontend\tests\e2e\card-statement-import.spec.ts`
- `dashboard.spec.ts` → `workspace\frontend\tests\e2e\dashboard.spec.ts`
- `dashboard-alerts.spec.ts` → `workspace\frontend\tests\e2e\deuda-futura\dashboard-alerts.spec.ts`
- `future.spec.ts` → `workspace\frontend\tests\e2e\deuda-futura\future.spec.ts`
- `financial-health.spec.ts` → `workspace\frontend\tests\financial-health.spec.ts`
- `global-search.spec.ts` → `workspace\frontend\tests\global-search.spec.ts`
- `movements.spec.ts` → `workspace\frontend\tests\movements.spec.ts`
- `sidebar-data-quality.spec.ts` → `workspace\frontend\tests\sidebar-data-quality.spec.ts`


Todos los destinos son relativos a `I:\cajaApp-V3-real`.


## Alcance funcional


El bloque corrige la representación de `Sin clasificar`, expone el historial de tarjetas sin resumen activo, corrige el grounding numérico de fechas ISO del Asesor IA y alinea la UAT con overlays, navegación, inputs, accordions, datos existentes y DOM responsive reales.


No incluye cambios de Prisma, migraciones, dependencias, fórmulas financieras, prompts, contratos ni SQLite.