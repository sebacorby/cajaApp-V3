# APPCAJA-V3-DASH-ALERTS-001 — Validación exclusiva de Alertas determinísticas

## 1. Regla de trabajo

El código ya fue implementado. El agente sólo valida. No puede modificar código, reglas, umbrales, migraciones, dependencias, tests, documentación ni el SSOT.

Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`.

## 2. Reglas a validar

1. saldo realizado o esperado negativo;
2. movimientos `Sin clasificar`;
3. egresos realizados con aumento `>= 20%` contra período anterior equivalente;
4. ingresos pendientes o proyectados;
5. resumen activo con vencimiento entre hoy y hoy + 7 días;
6. importaciones CSV del período con `rejectedCount > 0`;
7. datos USD sin cotización activa `USD_ARS`.

Cada alerta debe incluir identificador estable, severidad, regla, mensaje, evidencia y acción. El orden debe ser crítica, atención e información.

## 3. Prohibiciones

- no cambiar el umbral del 20%;
- no agregar scoring o salud financiera arbitraria;
- no pedirle a IA que evalúe o recomiende decisiones financieras;
- no crear scripts/wrappers de UAT;
- no dejar movimientos, imports o cambios de cotización creados para la prueba;
- no declarar PASS con reglas omitidas.

## 4. Gate backend

Desde `I:\cajaApp-V3\workspace\backend`:

1. verificar Node exacto;
2. `npm ci`;
3. `npm run prisma:generate`;
4. `npm run prisma:migrate:deploy`;
5. `npm run build`;
6. `npm run test`;
7. confirmar `tests/dashboard/dashboard.alerts.test.ts` con `3/3 PASS`;
8. consultar `GET /api/dashboard` y verificar el contrato `alerts`;
9. crear por API un gasto controlado sin categoría, verificar alerta y luego anularlo;
10. validar saldo negativo y navegación con datos controlados;
11. usar tests unitarios para reglas que dependan de vencimiento, CSV rechazado y cotización, evitando alterar datos financieros reales.

## 5. Gate frontend

Desde `I:\cajaApp-V3\workspace\frontend`:

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. ejecutar por CLI nativa:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = "never"
npx playwright test tests/dashboard-alerts.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

Confirmar:

- panel `Alertas basadas en reglas`;
- estado explícito cuando no hay alertas;
- severidad, evidencia y texto de regla visibles;
- acción de `Movimientos sin clasificar` abre el ledger con banner/filtro;
- las acciones de Tarjetas e Ingresos usan la sección correcta;
- no aparece un porcentaje de salud financiera ni una recomendación de IA;
- Dashboard sigue mostrando métricas, categorías, evolución y compromisos.

## 6. Evidencia requerida

- logs completos;
- respuesta JSON sanitizada del Dashboard;
- resultado del test unitario nuevo;
- trace/capturas Playwright;
- IDs de datos UAT creados y evidencia de limpieza;
- veredicto `PASS`, `FAIL` o `BLOCKED` con causa precisa.
