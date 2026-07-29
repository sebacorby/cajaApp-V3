# Rechazo arquitectónico — APP-UX-PRIVACY-002 v1.0.1

Estado: FAIL FOCAL.
Fecha: 18 de julio de 2026.

La evidencia acredita PASS en entorno, SQLite, backend 3/3, frontend, API y restauración final. El único bloqueo es Playwright.

Causa raíz confirmada: al persistir `hideAmounts`, `AppPreferencesProvider` cambiaba la `key` del árbol completo mientras Configuración seguía abierta. Esto desmontaba `ConfiguracionSection` y eliminaba su estado local antes de que Playwright pudiera observar el mensaje `Preferencias guardadas en CajaApp.`.

El reset API no falló. El smoke GET/PUT/GET demostró persistencia booleana correcta y rechazo HTTP 400 para strings. El checkbox marcado en la captura corresponde al paso posterior `privacyControl.check()` del propio test.

Corrección arquitectónica aplicada: Configuración mantiene una key estable durante el guardado. El remount global ocurre recién al navegar nuevamente hacia una sección financiera, donde se requiere recalcular todos los formateadores con la preferencia persistida.

No se modifica backend, API, Prisma, migraciones, contratos ni datos. La siguiente campaña es v1.0.2 y sólo revalida el frontend y el flujo Playwright completo.
