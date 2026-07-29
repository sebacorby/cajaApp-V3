# APP-UX-PRIVACY-002 — Privacidad global de importes

Estado: INSTRUCCIÓN ACTIVA / IMPLEMENTACIÓN Y VALIDACIÓN COMPLETA.
Fecha: 17 de julio de 2026.
Root local único: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.
Entorno obligatorio: Windows x64 y Node.js v24.18.0 exacto.

## 1. Objetivo

Conectar de punta a punta la preferencia persistente `hideAmounts` que ya existe en `LocalAppSettings`. El usuario debe poder ocultar y volver a mostrar importes monetarios desde Configuración. La preferencia debe persistir en SQLite, aplicarse globalmente y sobrevivir recargas, sin modificar datos financieros ni respuestas de API.

La carga es fail-closed: mientras Settings no haya sido leído correctamente, la aplicación no puede mostrar importes reales ni producir un flash momentáneo de valores sensibles.

## 2. Archivos autorizados

Backend:
- `workspace/backend/src/modules/settings/settings.schemas.ts`
- `workspace/backend/src/modules/settings/settings.service.ts`
- `workspace/backend/tests/settings/settings.test.ts`

Frontend:
- `workspace/frontend/src/lib/finance/settings-api.ts`
- `workspace/frontend/src/components/finance/preferences/app-preferences-provider.tsx`
- `workspace/frontend/src/components/finance/sections/configuracion-section.tsx`
- `workspace/frontend/src/lib/finance/financial-amount.ts`
- `workspace/frontend/src/lib/finance/money.ts`
- `workspace/frontend/src/lib/finance/format.ts`
- nuevo `workspace/frontend/src/lib/finance/amount-privacy.ts`
- nuevo `workspace/frontend/tests/privacy-mode.spec.ts`

Archivos condicionales, sólo cuando `amount-render-audit.txt` demuestre que imprimen importes crudos sin pasar por los formateadores centrales:
- `dashboard-section.tsx`
- `movimientos-section.tsx`
- `ingresos-section.tsx`
- `tarjetas-section.tsx`
- `importaciones-section.tsx`
- `conciliacion-section.tsx`
- `cierres-section.tsx`
- `deuda-futura-section.tsx`
- `presupuestos-section.tsx`
- `objetivos-section.tsx`
- `reportes-section.tsx`
- `salud-financiera-section.tsx`
- `asesor-ia-section.tsx`

No modificar Prisma schema ni migraciones: `hideAmounts Boolean @default(false)` ya pertenece al baseline. No agregar dependencias. Cualquier archivo fuera de esta lista determina STOP y consulta al arquitecto.

## 3. Contrato funcional

- `GET /api/settings` incluye `hideAmounts`.
- `PUT /api/settings` acepta y persiste `hideAmounts` como booleano estricto.
- Default: `false`.
- Configuración muestra un control real con texto claro: `Ocultar importes sensibles`.
- Guardar actualiza backend, contexto frontend y presentación global.
- Al recargar, la preferencia persiste.
- Cuando está activa, ningún importe monetario real puede quedar visible en texto o atributos accesibles del DOM.
- La máscara es consistente: conservar la moneda cuando se conoce (`$ ••••`, `US$ ••••`) y usar `••••` cuando no exista moneda explícita.
- No ocultar fechas, porcentajes, cantidades, versiones, IDs, últimos cuatro dígitos de tarjeta ni estados.
- Exportaciones, backups, base de datos y contratos API conservan los valores reales.

## 4. Diseño requerido

Crear `amount-privacy.ts` como única autoridad de presentación privada. Debe exponer estado runtime, setter y funciones puras de enmascarado. Los tres formateadores monetarios existentes deben delegar allí.

`AppPreferencesProvider` debe:
- incorporar `hideAmounts` al default y al contexto;
- sincronizar el estado runtime central;
- impedir render financiero antes de resolver Settings;
- ante error de carga, mantener los importes ocultos y mostrar estado de error honesto.

Antes de modificar componentes condicionales, producir una auditoría con búsquedas de `amountRaw`, `amountPesosRaw`, `amountDollarsRaw`, `totalPesosRaw`, `totalDollarsRaw`, interpolaciones monetarias e `Intl.NumberFormat`. Registrar archivo, línea, expresión y corrección. No tocar componentes sin evidencia.

## 5. Pruebas obligatorias

Backend focal:
- default contiene `hideAmounts: false`;
- schema acepta booleanos y rechaza tipos inválidos;
- serialización incluye el valor;
- actualización conserva el resto de preferencias.

Playwright:
1. habilitar privacidad desde Configuración, guardar, recargar y verificar persistencia;
2. comprobar máscara y ausencia del importe real en Dashboard, Movimientos, Ingresos, Tarjetas y Cierres;
3. deshabilitar privacidad, guardar y comprobar que el importe real reaparece;
4. restaurar la preferencia original en `finally`.

Usar un dato centinela monetario inequívoco creado mediante API y eliminado al finalizar. El test no puede depender de datos personales preexistentes.

## 6. Gates

- preflight con `node -v`, rutas reales de Node/npm y puertos;
- copia binaria nueva de `workspace/backend/prisma/dev.db` y SHA-256 inicial;
- backend `npm ci`, Prisma generate/status/deploy, build y test focal;
- frontend `npm ci`, typecheck, lint y build;
- smoke GET/PUT/GET de Settings;
- Playwright focal sin retries, skips ni mocks de Settings;
- auditoría de importes crudos;
- cleanup del centinela y procesos;
- restauración de SQLite desde la copia inicial y SHA-256 final idéntico.

## 7. Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.0/`

Debe incluir: preflight, inventario y hashes de archivos, backup SQLite, auditoría de renderizado, logs backend/frontend, resultados API, Playwright, capturas con modo visible/oculto, cleanup, hash final y `VERDICT.md`.

PASS exige persistencia real, ausencia demostrada de fugas monetarias y SQLite restaurada. FAIL ante flash de importes, valor real presente en DOM, tipo no validado, dependencia nueva, archivo no autorizado, retry/skip o hash final diferente.