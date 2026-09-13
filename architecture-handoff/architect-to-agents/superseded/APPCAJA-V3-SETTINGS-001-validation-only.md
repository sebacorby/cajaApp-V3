# APPCAJA-V3-SETTINGS-001 — Validación exclusiva de Configuración mínima local

## 1. Regla de trabajo

El código ya fue implementado. El agente sólo valida instalación, migración, build, tests, smoke y UAT. No está autorizado a modificar código, schemas, migraciones, configuración, dependencias, tests, documentación ni el SSOT.

Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`.

## 2. Alcance implementado

- modelo Prisma `LocalAppSettings`;
- migración `20260712153000_add_local_app_settings`;
- `GET /api/settings`;
- `PUT /api/settings`;
- `GET /api/settings/system`;
- perfil local y nombre visible;
- tema global `system | light | dark`;
- moneda principal informativa `ARS | USD`;
- locale `es-AR` y zona horaria de Tucumán;
- estado técnico honesto de backend, SQLite, Node y carpeta de documentos;
- ausencia explícita de autenticación, cuentas bancarias y notificaciones;
- `AppPreferencesProvider` y persistencia tras recarga;
- actualización del saludo del Header.

## 3. Prohibiciones

- no cambiar el entorno oficial;
- no editar la migración para hacerla pasar;
- no agregar login, contraseña, 2FA, bancos, notificaciones ni backup improvisado;
- no guardar preferencias en una segunda fuente local;
- no imprimir secretos ni el contenido de documentos financieros;
- no declarar PASS con pasos omitidos.

## 4. Gate backend

Ejecutar desde `I:\cajaApp-V3\workspace\backend`:

1. verificar Node `v24.18.0`;
2. `npm ci`;
3. `npm run prisma:generate`;
4. `npm run prisma:migrate:deploy`;
5. confirmar tabla `LocalAppSettings` y una sola fila `id=local`;
6. `npm run build`;
7. `npm run test`;
8. confirmar `tests/settings/settings.test.ts` con `3/3 PASS`.

Smoke obligatorio:

- `GET /api/settings` crea/devuelve defaults idempotentes;
- `PUT /api/settings` persiste nombre, tema y moneda;
- reiniciar backend y confirmar que los valores siguen vigentes;
- `GET /api/settings/system` devuelve modo local, SQLite, Node, ambiente y carpeta;
- locale/tema no soportados devuelven error de validación;
- restaurar al finalizar los valores originales usados antes de la UAT.

## 5. Gate frontend

Desde `I:\cajaApp-V3\workspace\frontend`:

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. ejecutar:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = "never"
npx playwright test tests/settings.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

Confirmar:

- pantalla Configuración sin controles ficticios;
- nombre persistido y visible en Header;
- tema oscuro aplica clase global y persiste tras recarga;
- tema claro elimina la clase global;
- tema sistema responde a preferencia del navegador;
- moneda principal es sólo informativa y no altera ARS/USD históricos;
- región y estado técnico coinciden con backend;
- regresión básica de Dashboard, Movimientos, Tarjetas, Deuda futura y Reportes.

## 6. Evidencia requerida

Entregar bajo `architecture-handoff/agents-to-architect/pending-validation`:

- versiones de SO, Node y npm;
- logs completos de instalación, Prisma, migración, build y tests;
- respuesta sanitizada de los tres endpoints;
- evidencia de persistencia después de reinicio;
- trace, capturas y resultado Playwright;
- lista honesta de pendientes/known issues;
- veredicto `PASS`, `FAIL` o `BLOCKED` con causa precisa.
