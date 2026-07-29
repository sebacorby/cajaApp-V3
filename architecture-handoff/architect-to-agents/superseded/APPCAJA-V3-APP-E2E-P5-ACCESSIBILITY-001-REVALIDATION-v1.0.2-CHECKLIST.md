# APP-E2E-P5-ACCESSIBILITY-001 v1.0.2 — Checklist

Entorno: root canónico, Windows x64, Node v24.18.0, puertos 11436/11437 libres, backup y SHA inicial de dev.db.

Hashes esperados:
- cierres-section.tsx: 20874 / BA9E51067D325B40FC662FFAEF0B3A10B2516C3417B2B608FDD80F4DE4431186
- respaldo-section.tsx: 21129 / D52A26DBC01C22AB2AFB50DE48C55CF22BEE820E2AFB623741EE2A0C3858F922
- backup-restore.spec.ts: 10656 / 2C60D3B5569241C4334C8851CA26E24BD910CAB451B2DAE5FE163F371134ADAB
- month-close.spec.ts: 8227 / 652276E0FE5B8BB6CA8BC0798CB91E40A8AB96767B40D78BC4ECFE2107281A8F
- quality-audit.spec.ts: 3627 / B7BB75E3590BE9B94CB0BC160AF93DE5192FF134989FF94A8BE050FFF2319D5B

Comparar los tres tests con sus copias v1.0.2 en inspección. Ejecutar npm ci, typecheck, lint, build, levantar servicios reales y correr el Playwright exacto de la instrucción.

Resultado exigido: 8/8 passed, cero failed/skipped/retries/strict-mode violations. Verificar que las alertas no colisionen con __next-route-announcer__ y que el test de teclado no dependa de nextjs-portal ni next-logo.

Guardar logs, JSON, capturas, trace y video. No modificar archivos. Detener procesos, liberar puertos y restaurar SQLite al SHA inicial. Entregar evidencia v1.0.2 con veredicto PASS o FAIL.