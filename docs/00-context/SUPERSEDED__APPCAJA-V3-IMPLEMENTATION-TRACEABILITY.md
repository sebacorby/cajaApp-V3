# APPCAJA V3 — Trazabilidad de implementación

**Estado del documento:** vigente / SSOT de ejecución  
**Última actualización:** 12 de julio de 2026  
**Root:** `I:\cajaApp-V3`  
**Backlog fuente:** `docs/03-specs/APPCAJA-V3-FRONTEND-FUNCTIONAL-BACKLOG-v1.0.0.md`

---

## 1. Gobierno del documento

Este archivo es la única fuente de verdad para saber:

- qué funcionalidad está en curso;
- qué código ya fue implementado;
- qué gate está pendiente;
- qué funcionalidad se toma a continuación;
- qué ítems fueron postergados o retirados del MVP.

### Autoridad de escritura

- **Único responsable autorizado a modificar este documento:** arquitecto/asistente responsable de implementar el código.
- **Agentes de ejecución:** acceso de lectura solamente.
- Los agentes no deben editar, regenerar, reemplazar, mover ni “actualizar el estado” de este archivo.
- Los agentes registran sus resultados únicamente en sus entregas bajo `architecture-handoff/agents-to-architect/pending-validation`.
- El arquitecto valida las evidencias y recién entonces actualiza este SSOT.
- Este archivo no forma parte del alcance de escritura de ninguna tarea enviada a agentes.

---

## 1.1. Entorno Node.js autoritativo

- Versión única obligatoria: `v24.18.0`.
- Distribución esperada en Windows x64: `node-v24.18.0-win-x64`.
- Ruta local de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`.
- Los gates deben comparar la versión exacta; no alcanza con aceptar cualquier `v24.x`.
- Toda regla normativa anterior sobre otra versión de Node.js queda reemplazada por esta decisión.
- Las evidencias históricas pueden conservar la versión realmente usada en su momento, pero no definen el entorno vigente.

---

## 2. Estado ejecutivo actual

| Campo | Estado |
|---|---|
| Fase activa | APP-MVP-FINAL-VALIDATION — Campaña local consolidada |
| Trabajo en curso | Desarrollo del backlog funcional finalizado; gate final emitido |
| Estado de código | Backlog funcional completo en Drive, incluidos Objetivos, Presupuestos y calidad transversal |
| Estado de gate | `READY_FOR_FINAL_GATE` — pendiente de ejecución local del agente |
| Responsable de código | Arquitecto/asistente |
| Responsable de ejecución de gates | Agente, validación solamente y sin permiso de modificar código |
| Próximo trabajo a tomar | Ejecutar `APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.0.md` y auditar la evidencia |

---

## 3. Trabajo actualmente en curso

### APP-DASH-ALERTS-VERTICAL-001 — Alertas determinísticas del Dashboard

**Estado:** `VALIDADO — PASS / CIERRE OPERATIVO AUTORIZADO POR EL USUARIO`  
**Prioridad:** P1

#### Backlog cubierto

- `APP-BE-DASH-004` — alertas determinísticas;
- `APP-FE-DASH-005` — indicador transparente en lugar de salud financiera arbitraria.

#### Reglas implementadas

- saldo realizado o esperado negativo, severidad crítica;
- movimientos sin categoría, severidad de atención;
- aumento de egresos realizados igual o superior al 20% contra el período anterior equivalente;
- ingresos pendientes o proyectados todavía no realizados;
- resúmenes activos con vencimiento entre hoy y los próximos 7 días;
- importaciones CSV del período con filas rechazadas;
- movimientos USD sin cotización `USD_ARS` activa.

#### Arquitectura y contrato

- las reglas se ejecutan en backend;
- la IA no clasifica la situación financiera ni decide severidades;
- cada alerta devuelve `rule`, `severity`, `message`, `evidence` y `action`;
- umbrales y condiciones quedan expuestos en la respuesta;
- saldo y variaciones se calculan con centavos `BigInt`;
- fuentes operativas adicionales consultadas: resúmenes activos, importaciones CSV y cotización persistida;
- alertas ordenadas de forma determinística por severidad e identificador;
- ausencia de alertas representada explícitamente, sin un número de salud arbitrario.

#### Frontend implementado

- panel `Alertas basadas en reglas` dentro del Dashboard;
- cantidad de alertas activas y estado sin alertas;
- severidad visual crítica, atención e información;
- evidencia y regla visibles para cada tarjeta;
- acciones hacia Movimientos, Tarjetas o Ingresos;
- drilldown real del ledger para saldo, categorías, gasto e ingresos esperados;
- sin recomendaciones financieras generadas ni textos de juicio subjetivo.

#### Pruebas y validaciones realizadas por el arquitecto

- transpile/sintaxis de service, contrato API, sección, test y Playwright: PASS;
- ejecución aislada del motor real de alertas: PASS;
- verificación del umbral +20%, orden de severidad, evidencia y destinos: PASS;
- test unitario agregado en `tests/dashboard/dashboard.alerts.test.ts`;
- spec Playwright agregado en `tests/dashboard-alerts.spec.ts`;
- gate backend exclusivo con Node `v24.18.0`, Prisma, migraciones, build, suite y siete reglas: `VALIDADO — PASS` por confirmación del usuario el 12 de julio de 2026;
- gate frontend cerrado operativamente por indicación del usuario al solicitar la apertura del siguiente bloque el 12 de julio de 2026; no se recibió una nueva carpeta de evidencia en `pending-validation`, por lo que esta condición queda registrada explícitamente y no se inventa evidencia técnica inexistente.

---

### APP-CONFIG-LOCAL-VERTICAL-001 — Configuración mínima local

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL CONSOLIDADA`  
**Prioridad:** P1

#### Alcance implementado

- nuevo modelo Prisma único `LocalAppSettings`;
- migración incremental `20260712153000_add_local_app_settings`;
- persistencia SQLite del nombre visible, tema y moneda principal informativa;
- locale fija `es-AR` y zona horaria `America/Argentina/Tucuman`;
- endpoint `GET /api/settings`;
- endpoint `PUT /api/settings`;
- endpoint `GET /api/settings/system`;
- creación idempotente de los defaults de la instalación local;
- validación estricta de valores soportados, sin preferencias decorativas;
- estado técnico real de backend, SQLite, Node, ambiente y carpeta de documentos;
- flags explícitos que informan ausencia de autenticación, conexiones bancarias y notificaciones;
- nuevo `AppPreferencesProvider` global;
- aplicación de tema `system`, `light` o `dark` sobre el documento completo;
- actualización inmediata del saludo del Header con el nombre local persistido;
- rediseño completo de `ConfiguracionSection`;
- formulario real de perfil, tema y moneda informativa;
- región, formato y monedas soportadas visibles;
- datos históricos preservados: cambiar moneda principal no convierte ni reescribe importes;
- retiro de cualquier expectativa de login, contraseña, 2FA, cuentas vinculadas o alertas inexistentes;
- no se agregó backup/exportación de base porque todavía no existe un flujo seguro y validado para esa operación.

#### Pruebas y validaciones realizadas por el arquitecto

- transpile/sintaxis de backend, frontend, test y Playwright: PASS;
- migración SQL aplicada sobre SQLite temporal: PASS;
- persistencia y actualización local de nombre, tema y moneda: PASS en SQLite temporal;
- prueba unitaria agregada en `tests/settings/settings.test.ts`;
- spec Playwright agregado en `tests/settings.spec.ts`;
- backend y frontend implementados;
- el gate individual fue retirado porque el usuario definió una única campaña local al finalizar todo el backlog restante;
- la validación final deberá cubrir Node exacto, respaldo SQLite, Prisma, migración, build, suite, endpoints, persistencia tras reinicio, Playwright y restauración final.

---

### APP-MOV-EXPORT-VERTICAL-001 — Exportación CSV del filtro actual de Movimientos

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL`  
**Prioridad:** P1

#### Alcance implementado

- endpoint `GET /api/movements/export.csv`;
- reutilización exacta de `movementQuerySchema` y de todos sus filtros;
- exportación completa sin depender de la página visible;
- rango, búsqueda, tipo, fuente, categoría, estado, moneda, mínimos, máximos y proyecciones preservados;
- CSV UTF-8 con BOM y delimitador `;` compatible con Excel;
- nombre determinístico por rango;
- cabecera `X-Exported-Records` para auditoría;
- columnas de fecha, mes de impacto, tipo, fuente, origen, descripción, categoría, moneda, importe, estado, notas e IDs de trazabilidad;
- ARS y USD preservados sin conversión;
- helper único de parámetros en `movements-api.ts` para consulta y exportación;
- botón `Exportar filtro CSV` conectado al estado real de Movimientos;
- exportación compatible con drilldowns provenientes de Reportes;
- corrección del filtro `projected` para activar automáticamente `includeProjected`.

#### Pruebas y validaciones realizadas por el arquitecto

- transpile/sintaxis backend, frontend, test y Playwright: PASS;
- ejecución pura de BOM, escaping, separadores y trazabilidad: PASS;
- test unitario agregado en `tests/movements/movements-export.test.ts`;
- spec Playwright agregado en `tests/movements-export.spec.ts`;
- gate real con Node `v24.18.0`, build completo, suite, descarga y UAT: pendiente del agente.

---

### APP-REPORTS-VERTICAL-001 — Reportes reales derivados del ledger

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL`  
**Prioridad:** P1

#### Backlog cubierto

- `APP-BE-REP-001` — agregaciones reales de reportes;
- `APP-FE-REP-002` — conexión de `ReportesSection` a datos reales.

#### Backend implementado

- nuevo módulo `src/modules/reports`;
- endpoint `GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`;
- endpoint `GET /api/reports/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`;
- reutilización de `movementsService.getAllMovements` como única fuente del ledger;
- resumen real, pendiente, proyectado y esperado por ARS y USD;
- ingresos, egresos, resultado y tasa de ahorro sin conversión implícita entre monedas;
- promedio mensual calculado con centavos `BigInt` y redondeo determinístico;
- comparación contra un período anterior equivalente;
- evolución mensual con escalas visuales calculadas por backend;
- gasto real por categoría y por fuente;
- deuda de tarjeta real, pendiente y proyectada por mes;
- evolución de ingresos recurrentes por fuente y mes;
- indicadores de calidad del dato;
- exportación CSV UTF-8 con secciones de evolución, categorías, fuentes y deuda.

#### Frontend implementado

- reemplazo completo del placeholder de Reportes;
- rango temporal real, editable y sincronizado con el selector global;
- estados reales de carga, error y vacío;
- tarjetas de ingresos, egresos, resultado y promedio mensual;
- comparación visible contra el período anterior;
- evolución mensual con barras y tabla accesible;
- tablas equivalentes para categorías, fuentes, deuda e ingresos recurrentes;
- descarga CSV desde el backend;
- navegación desde meses, categorías, fuentes y deuda al ledger filtrado;
- estado de drilldown compartido en `ui-store`;
- banner en Movimientos para identificar y limpiar el filtro abierto desde Reportes;
- frontend limitado a formato y representación; porcentajes, promedios y escalas llegan calculados por API.

#### Pruebas y validaciones realizadas por el arquitecto

- transpile/sintaxis de backend, frontend, tests y Playwright: PASS;
- typecheck estricto aislado del módulo backend: PASS;
- typecheck estricto aislado del contrato y sección frontend: PASS;
- ejecución pura aislada de totales, comparación y CSV: PASS;
- prueba unitaria agregada en `tests/reports/reports.service.test.ts`;
- spec Playwright agregado en `tests/reports.spec.ts`;
- gate real con Node `v24.18.0`, build completo, suite, endpoints, CSV y UAT: pendiente del agente.

---

### APP-CARD-HISTORY-VERTICAL-001 — Historial seguro de resúmenes de tarjeta

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL`  
**Prioridad:** P1

#### Backlog cubierto

- `APP-BE-CARD-014` — gestión del historial de resúmenes;
- `APP-FE-CARD-015` — UX de historial.

#### Backend implementado

- nuevos campos de historia en `CardStatement`: `periodKey`, `historyKey`, `version`, `isActiveForPeriod`, `archivedAt` y `archivedReason`;
- migración incremental `20260712150000_add_card_statement_history`;
- backfill de períodos y versiones para resúmenes existentes;
- índice único por `historyKey + version`;
- índice parcial SQLite que impide más de una versión activa y aceptada para el mismo historial;
- identidad estable por banco, marca y período;
- bloqueo temprano de PDF idéntico mediante SHA-256 antes de ejecutar extracción IA;
- aceptación de un PDF distinto del mismo período como nueva versión auditable;
- desactivación automática de la versión anterior al aceptar una nueva;
- traslado transaccional de compras manuales y sus cuotas al nuevo resumen activo;
- endpoint de listado con búsqueda, estado e inclusión de archivados;
- endpoint de trazabilidad con documento, borrador, ejecución IA, hashes y cadena de versiones;
- activación explícita de una versión anterior o archivada;
- archivo no destructivo con motivo, conservando PDF, borrador, filas y ejecución IA;
- protección contra archivar el único resumen activo cuando aún contiene compras manuales sin versión de reemplazo;
- ledger, proyecciones y Deuda futura limitados a resúmenes `accepted` y activos;
- compras manuales permitidas únicamente sobre la versión activa.

#### Frontend implementado

- historial navegable dentro de Tarjetas;
- búsqueda por banco, marca, tarjeta, período, archivo o SHA;
- filtros por activo, versión anterior y archivado;
- identificación visible de versión y período;
- apertura de cualquier versión en modo consulta;
- acciones explícitas de activar y archivar;
- confirmaciones antes de alterar la versión vigente;
- captura de motivo de archivo para trazabilidad;
- panel expandible con documento fuente, borrador, ejecución IA, hashes y cadena de versiones;
- compras manuales deshabilitadas al consultar una versión no activa;
- actualización del historial y del resumen visible después de activar o archivar.

#### Decisiones de seguridad y consistencia

- no existe borrado destructivo de resúmenes;
- un PDF idéntico no vuelve a consumir extracción IA;
- un PDF corregido del mismo período crea una nueva versión en lugar de sobrescribir la anterior;
- archivar o reemplazar una versión retira sus cuotas automáticas del ledger y de Deuda futura al dejar de estar activa;
- las compras manuales se trasladan a la versión que pasa a ser vigente para no perder compromisos cargados por el usuario;
- el PDF y el historial de IA continúan disponibles para auditoría.

#### Pruebas y validaciones realizadas por el arquitecto

- transpile/sintaxis de backend y frontend modificados: PASS;
- typecheck aislado del frontend de Tarjetas y contrato API: PASS;
- typecheck aislado del servicio y mapper backend: PASS;
- prueba unitaria agregada en `tests/cards/history.test.ts`;
- migración ejecutada sobre SQLite temporal con backfill correcto: PASS;
- restricción de una sola versión activa probada sobre SQLite temporal: PASS;
- escritura y lectura posterior de archivos oficiales en Drive: PASS;
- gate real con Node `v24.18.0`, Prisma generado, migración sobre copia de `dev.db`, build, suite, smoke y UAT: pendiente del agente.

---

### APP-CARD-QUOTE-VERTICAL-001 — Cotización y equivalentes USD/ARS en backend

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL`  
**Prioridad:** P0

#### Backlog cubierto

- `APP-BE-CARD-012` — cotización y equivalentes calculados por backend;
- `APP-FE-CARD-013` — gestión visible de cotización.

#### Backend implementado

- nuevo modelo Prisma `CurrencyExchangeRate`;
- migración incremental `20260712141000_add_currency_exchange_rate`;
- persistencia única para el par `USD_ARS`;
- valor, fecha efectiva, origen, estado y fecha de actualización;
- endpoint `GET /api/card-statements/exchange-rate`;
- endpoint `PUT /api/card-statements/exchange-rate`;
- actualización manual validada e idempotente mediante `upsert`;
- estado explícito `missing` cuando no existe cotización, sin inventar un valor por defecto;
- cálculo de equivalentes USD→ARS y total combinado mediante centavos `BigInt`;
- redondeo determinístico a centavos;
- resúmenes aceptados, borradores y proyecciones mensuales enriquecidos con cotización y equivalentes;
- importes originales ARS y USD preservados sin reescritura.

#### Frontend implementado

- retiro de `DEFAULT_USD_ARS_RATE`;
- retiro de la persistencia de cotización en `localStorage`;
- retiro de multiplicaciones y sumas monetarias USD/ARS en el cliente;
- carga de la cotización real desde backend;
- edición visible de valor y fecha efectiva;
- visualización de estado, origen y fecha aplicada;
- equivalentes y total combinado recibidos del backend;
- actualización de resúmenes, borradores y proyecciones después de guardar la cotización;
- ARS y USD originales continúan visibles por separado.

#### Pruebas y validaciones realizadas por el arquitecto

- transpile/sintaxis de schema, tipos, service, controller y cliente API: PASS;
- transpile/sintaxis TSX de `tarjetas-section.tsx`: PASS;
- prueba unitaria agregada en `tests/cards/exchange-rate.test.ts`;
- transporte y lectura posterior de todos los archivos oficiales: PASS;
- búsqueda de `cajaapp.cards.usdArsRate` en Drive: sin coincidencias;
- gate real con Node `v24.18.0`, migración, Prisma generado, build, suite y UAT: pendiente del agente.

---

### APP-DEBT-VERTICAL-001 — Deuda y compromisos futuros

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL`  
**Prioridad:** P0

#### Backlog cubierto

- `APP-BE-FUT-001` — proyección consolidada mensual;
- `APP-FE-FUT-002` — pantalla de deuda futura.

#### Backend implementado

- nuevo módulo `src/modules/future`;
- endpoint `GET /api/future-commitments?from=YYYY-MM&months=N`;
- horizonte configurable entre 1 y 36 meses;
- reutilización del ledger normalizado como fuente única de importes;
- cuotas y consumos de resúmenes aceptados clasificados como deuda de tarjeta confirmada;
- movimientos pendientes y asientos manuales fechados a futuro clasificados como otros compromisos confirmados;
- ingresos recurrentes, aumentos, cambios permanentes y extras conservando su estado real o proyectado;
- deuda confirmada, compromisos proyectados e ingresos esperados separados por mes;
- ARS y USD procesados por separado con centavos `BigInt`;
- resultado confirmado y resultado esperado calculados por backend;
- agrupación trazable por tarjeta, fuente de ingreso o movimiento;
- referencia de origen para navegar a Tarjetas, Ingresos o Movimientos;
- indicador de fechas de vencimiento estimadas y componentes sin categoría;
- nota explícita sobre la ausencia actual de seguimiento de pagos de resúmenes.

#### Frontend implementado

- nueva navegación `Deuda futura` dentro del MVP activo;
- horizonte seleccionable de 6, 12, 18 y 24 meses;
- resumen del resultado esperado del horizonte;
- deuda de tarjeta confirmada, otros compromisos, compromisos proyectados e ingresos esperados;
- timeline mensual accesible y expandible;
- separación visual `Confirmado` / `Proyectado`;
- expansión por tarjeta o fuente con componentes individuales;
- navegación a la sección responsable del dato;
- estados reales de carga, error y vacío;
- advertencias de calidad de datos;
- frontend limitado a representación y formato, sin recalcular totales financieros.

#### Decisión de modelado

No se creó una segunda persistencia de deuda. La vista se deriva de las fuentes existentes:

- resúmenes y cuotas aceptadas;
- compras manuales de tarjeta;
- ingresos y eventos proyectados;
- movimientos manuales pendientes o fechados a futuro.

La edición continúa en la fuente responsable para evitar duplicados y divergencias.

#### Validaciones realizadas por el arquitecto

- typecheck aislado del servicio y contrato backend: PASS;
- typecheck aislado del frontend, navegación y router: PASS;
- typecheck del spec Playwright: PASS;
- tests puros de consolidación: `4/4 PASS`;
- gate real con Node `v24.18.0`, build completo, suite, Playwright y UAT: pendiente del agente.

---

### APP-DASH-VERTICAL-001 — Dashboard real conectado al ledger

**Estado:** `VALIDADO — PASS`  
**Prioridad:** P0

#### Backend implementado

- endpoint `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`;
- reutilización del ledger normalizado como única fuente de movimientos;
- balances realizados, pendientes, proyectados y esperados;
- ARS y USD procesados y devueltos por separado;
- comparación contra el período calendario inmediatamente anterior;
- tasa de ahorro calculada en backend;
- gasto realizado agrupado por categoría con color, ícono y participación;
- evolución mensual de ingresos, egresos y compromisos;
- últimos movimientos reales y pendientes;
- compromisos pendientes/proyectados separados del balance realizado;
- indicadores de calidad de datos, incluyendo movimientos sin clasificar;
- montos calculados con centavos `BigInt`, sin floats para totales financieros.

#### Frontend implementado

- reemplazo completo del Dashboard provisional;
- estados reales de carga, error, vacío y actualización;
- hero de balance realizado y balance esperado;
- tarjetas de ingresos, egresos, compromisos y movimientos sin clasificar;
- comparación contra el período anterior;
- evolución mensual con representación visual basada en datos del backend;
- gasto por categoría real;
- últimos movimientos y compromisos del período;
- navegación directa a Movimientos;
- frontend sin sumas de totales financieros: sólo formatea y representa respuestas del backend.

#### Validaciones realizadas por el arquitecto

- transpile/sintaxis de backend y frontend: PASS;
- typecheck aislado de Dashboard frontend: PASS;
- typecheck aislado del contrato/backend Dashboard: PASS;
- typecheck aislado de la ampliación del ledger: PASS;
- tests puros de agregación Dashboard: `3/3 PASS`;
- spec Playwright: sintaxis PASS;
- gate real declarado validado por el usuario el 12 de julio de 2026; luz verde otorgada para continuar el backlog.

---

### APP-CAT-VERTICAL-001 — Administración de categorías

**Estado:** `IMPLEMENTADO — PENDIENTE DE VALIDACIÓN LOCAL`  
**Prioridad:** P0/P1

#### Backend implementado

- nuevo modelo Prisma `MovementCategoryRule` con migración incremental `20260711234500_add_category_rules`;
- CRUD completo de categorías;
- listado activo o incluyendo archivadas;
- color, ícono, conteos de uso y palabras clave;
- protección de nombre y baja para categorías del sistema;
- archivo lógico de categorías de usuario;
- reasignación transaccional de movimientos manuales y filas CSV a `Sin clasificar` al archivar;
- restauración de categorías archivadas;
- asignación rápida de categoría para movimientos manuales y filas CSV aceptadas;
- sugerencias determinísticas sin IA, insensibles a mayúsculas, tildes y puntuación;
- prioridad estable y desempate por palabra clave más específica;
- aplicación automática de reglas al crear previews CSV nuevos.

#### Frontend implementado

- panel lateral de administración desde Movimientos;
- alta y edición de nombre, color, ícono y palabras clave;
- categorías del sistema identificadas y protegidas;
- visualización de conteos manuales, CSV y totales;
- archivo con advertencia de reasignación;
- restauración de archivadas;
- selector rápido de categoría directamente en el ledger para movimientos manuales y CSV;
- actualización automática del ledger después de recategorizar o archivar.

#### Corrección de calidad de build

- retirado `typescript.ignoreBuildErrors` de `next.config.ts`;
- agregado script `npm run typecheck` con `tsc --noEmit`;
- `npm run build` ejecutará primero el typecheck explícito, evitando builds que oculten errores TypeScript.

#### Validaciones realizadas por el arquitecto

- transpile/sintaxis TypeScript de archivos modificados: PASS;
- reglas determinísticas: `4/4 PASS`;
- migración SQL aplicada sobre SQLite temporal: PASS;
- gate real con Prisma generado, build completo, lint, Playwright y UAT: pendiente del agente.

---

### APP-CSV-VERTICAL-001 — Importación de débitos desde CSV

**Estado:** `IMPLEMENTADO — BUILD PASS — PENDIENTE DE MIGRACIÓN/TEST/UAT`  
**Prioridad:** P0

#### Backlog cubierto

- `APP-BE-CSV-001` — persistencia de importaciones y filas;
- `APP-BE-CSV-002` — parser heterogéneo y detección de columnas;
- `APP-BE-CSV-003` — deduplicación de archivos y movimientos;
- `APP-BE-CSV-004` — preview editable y aceptación transaccional;
- `APP-FE-CSV-001` — carga y preview desde Movimientos;
- `APP-FE-CSV-002` — corrección de filas, selección y aceptación;
- `APP-FE-CSV-003` — historial, borradores y reversión;
- integración al ledger unificado.

#### Diseño aplicado

La importación CSV se divide en dos etapas:

1. **Preview:** el archivo se analiza, pero no afecta el ledger.
2. **Aceptación:** únicamente las filas seleccionadas y válidas pasan a integrar Movimientos.

La IA no interviene en este flujo. El parser es determinístico y el usuario puede corregir fecha, descripción, tipo, moneda, importe y categoría antes de aceptar.

#### Backend implementado

- modelos Prisma `DebitCsvImport` y `DebitCsvRow`;
- migración incremental `20260711221500_add_debit_csv_imports`;
- módulo `src/modules/debit-imports`;
- endpoint `POST /api/debit-imports/preview`;
- endpoint `GET /api/debit-imports`;
- endpoint `GET /api/debit-imports/:importId`;
- endpoint `PUT /api/debit-imports/:importId/rows/:rowId`;
- endpoint `POST /api/debit-imports/:importId/accept`;
- endpoint `DELETE /api/debit-imports/:importId` para borrar borradores;
- endpoint `POST /api/debit-imports/:importId/reverse`;
- detección de separador coma, punto y coma o tabulación;
- soporte UTF-8 y fallback Latin-1;
- búsqueda automática de la fila de encabezados;
- mapeo heurístico de fecha, descripción, importe, débito, crédito, moneda y referencia;
- fechas normalizadas a `YYYY-MM-DD`;
- ARS y USD sin conversión entre monedas;
- importes procesados en centavos con `BigInt`;
- filas inválidas conservadas como rechazadas, sin inventar información;
- hash SHA-256 del archivo para idempotencia;
- fingerprint normalizado por movimiento y ordinal para deduplicar exportaciones superpuestas;
- aceptación transaccional con conteos aceptados, omitidos y rechazados;
- reversión no destructiva de una importación aceptada.

#### Integración al ledger

Las filas aceptadas aparecen como:

- `sourceType = debit_csv`;
- estado `actual`;
- trazabilidad al archivo/importación de origen;
- categoría persistente;
- registros de solo lectura desde Movimientos.

Una importación revertida deja de participar del ledger sin borrar el historial de auditoría.

#### Frontend implementado

- botón `Importar CSV débito` en Movimientos;
- selector real de archivo;
- preview paginado de hasta 5000 filas;
- edición de fecha, descripción, tipo, moneda, importe y categoría;
- inclusión/exclusión por fila;
- visualización de duplicados y errores;
- guardado explícito de filas y guardado automático de cambios pendientes al aceptar;
- aceptación de filas válidas;
- historial de importaciones;
- reapertura de borradores;
- detección de archivo ya procesado;
- eliminación de borradores;
- reversión de importaciones aceptadas;
- actualización automática del ledger después de aceptar o revertir.

#### Validaciones realizadas por el arquitecto

- Validación aislada previa: ejecutada fuera del entorno oficial; no constituye gate;
- typecheck dirigido del backend: PASS;
- tests de parser CSV: `4/4 PASS`;
- tests monetarios del ledger: `4/4 PASS`;
- total ejecutado: `8/8 PASS`;
- typecheck estricto del frontend: PASS;
- typecheck del spec Playwright: PASS;
- build de producción Next.js: PASS;
- migración SQL aplicada correctamente sobre SQLite temporal: PASS.

#### Corrección adicional de build

Se retiró `next/font/google` del layout. El frontend ya no depende de descargar Geist desde Google Fonts durante el build y utiliza la tipografía del sistema.

También se agregó `@types/node` a las dependencias de desarrollo para que Next.js pueda completar su etapa TypeScript de forma reproducible.

#### Limitación del entorno de análisis

`prisma generate` y `prisma format` no pudieron descargar el binario de Prisma por falta de acceso a `binaries.prisma.sh`.

Por eso:

- la migración fue validada directamente con SQLite;
- el backend fue compilado usando el cliente Prisma previamente generado y acceso tipado defensivamente para los modelos nuevos;
- el gate real de `prisma generate` y `prisma migrate deploy` debe ejecutarse en Windows.

Esto no se declara como PASS de runtime.

---

## 4. Trabajo anterior pendiente de gate

### APP-MOV-VERTICAL-001 — Ledger unificado y movimientos manuales

**Estado:** `IMPLEMENTADO — BUILD PASS — PENDIENTE DE TEST/UAT`  
**Prioridad:** P0

Incluye:

- modelos `MovementCategory` y `ManualMovement`;
- API paginada y filtrable;
- integración de Ingresos y Tarjetas;
- CRUD manual;
- totales ARS/USD calculados en backend;
- búsqueda, filtros, paginación y formulario real;
- E2E de alta, edición y anulación.

Con APP-CSV-VERTICAL-001 el ledger incorpora una nueva fuente real sin duplicar persistencia.

---

## 5. Fase 0 — Retiro del modo prototipo

### APP-FE-REM-001 — Identidad CajaApp

**Estado:** implementado / pendiente de build visual.

- `Clarified` reemplazado por `CajaApp`;
- metadata y OpenGraph actualizados;
- favicon local;
- eliminadas promesas no verificadas.

### APP-FE-REM-002 — Controles de demostración

**Estado:** implementado.

- `DemoStateControl` retirado;
- estados artificiales retirados del store;
- `SectionRouter` usa estados reales.

### APP-FE-REM-003 — Mocks y temporales

**Estado:** implementado en runtime.

- mocks financieros eliminados;
- ruta `Hello, world!` eliminada;
- backups y temporales conocidos retirados;
- módulos post-MVP ya no muestran cifras ficticias.

### APP-FE-REM-004 — Contexto temporal real

**Estado:** implementado / pendiente de UAT.

- rangos dinámicos;
- zona horaria `America/Argentina/Tucuman`;
- el período controla las consultas reales.

---

## 6. Gates

### Gate de build aceptado — 11 de julio de 2026

- Node.js exacto `v24.18.0`: PASS;
- ruta `I:\Tools\node-v24.18.0-win-x64\node.exe`: PASS;
- backend `npm ci`: PASS;
- backend `prisma generate`: PASS;
- backend build: PASS;
- frontend `npm ci`: PASS;
- frontend build: PASS;
- integridad de archivos gobernados: PASS.

El reporte y sus logs fueron movidos físicamente a `agents-to-architect/accepted`. El resultado anterior basado en Node 22 fue movido a `rejected`.

### Deuda no bloqueante registrada

- el build aceptado de Next.js omitía el typecheck por `ignoreBuildErrors`; la configuración ya fue corregida y el próximo gate debe ejecutar `npm run typecheck`;
- el lockfile frontend reportó 9 vulnerabilidades moderadas preexistentes;
- no ejecutar `npm audit fix --force` ni actualizar dependencias indiscriminadamente dentro de un gate funcional.

### Gate pendiente para APP-CAT-VERTICAL-001

El agente debe ejecutar sin modificar código ni este SSOT.

#### Backend

1. confirmar Node exacto `v24.18.0`;
2. respaldar SQLite;
3. `npm ci`;
4. `npm run prisma:generate`;
5. `npm run prisma:migrate:deploy`;
6. `npm run build`;
7. `npm run test` y confirmar el descubrimiento de `tests/movements/categories.rules.test.ts`;
8. smoke de CRUD, archivo/restauración, asignación y sugerencia de categorías;
9. smoke de preview CSV con categoría sugerida.

#### Frontend

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. `npx playwright test tests/categories.spec.ts`;
6. smoke de Ingresos, Tarjetas, Movimientos e importación CSV.

#### UAT de categorías

- crear una categoría con color, ícono y palabras clave;
- editarla;
- asignarla desde el ledger a un movimiento manual;
- asignarla a una fila CSV aceptada;
- importar un CSV nuevo cuya descripción coincida con una regla y verificar la sugerencia;
- archivar la categoría y confirmar la reasignación a `Sin clasificar`;
- restaurarla;
- confirmar que una categoría del sistema no puede renombrarse ni archivarse.

---

### Gate pendiente para APP-DEBT-VERTICAL-001

El agente debe ejecutar sin modificar código ni este SSOT.

#### Backend

1. confirmar Node exacto `v24.18.0`;
2. `npm ci`;
3. `npm run prisma:generate`;
4. `npm run prisma:migrate:deploy`;
5. `npm run build`;
6. `npm run test` y confirmar `tests/future/future.service.test.ts` con `4/4 PASS`;
7. smoke de `GET /api/future-commitments` con horizontes 6, 12 y 24 meses;
8. confirmar validación de límites 1–36 meses;
9. confirmar separación ARS/USD y confirmado/proyectado.

#### Frontend

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. `npx playwright test tests/future.spec.ts --project=chromium --workers=1 --retries=0 --trace=on`;
6. smoke visual responsive de `Deuda futura`.

#### UAT Deuda futura

- comprobar una cuota de tarjeta proveniente de resumen aceptado;
- comprobar un movimiento pendiente futuro;
- comprobar un ingreso proyectado;
- confirmar etiquetas `Confirmado` y `Proyectado`;
- confirmar ARS y USD sin conversión implícita;
- cambiar entre 6, 12, 18 y 24 meses;
- expandir por tarjeta/fuente y navegar al origen;
- recargar y confirmar persistencia derivada de las fuentes reales.

---

### Gate pendiente para APP-CARD-HISTORY-VERTICAL-001

El agente debe ejecutar sin modificar código ni este SSOT.

#### Backend

1. confirmar Node exacto `v24.18.0`;
2. respaldar `prisma/dev.db`;
3. `npm ci`;
4. `npm run prisma:generate`;
5. `npm run prisma:migrate:deploy` y confirmar la migración `20260712150000_add_card_statement_history`;
6. verificar el backfill de resúmenes existentes: período, versión y una sola versión activa por historial;
7. `npm run build`;
8. `npm run test` y confirmar `tests/cards/history.test.ts`;
9. importar el mismo PDF dos veces y confirmar `409 CARD_STATEMENT_DUPLICATE` sin nueva ejecución IA;
10. importar un PDF distinto del mismo período y confirmar creación de versión incremental;
11. confirmar que sólo una versión queda `accepted + isActiveForPeriod=true`;
12. smoke de listado, búsqueda, trazabilidad, activación y archivo;
13. confirmar que una versión inactiva no aporta filas ni cuotas al ledger o Deuda futura;
14. confirmar que compras manuales y cuotas manuales se trasladan al activar otra versión;
15. confirmar que no se elimina `UploadedDocument`, `CardStatementDraft` ni `AiExtractionRun` al archivar.

#### Frontend

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. `npx playwright test tests/card-history.spec.ts --project=chromium --workers=1 --retries=0 --trace=on`;
6. smoke visual del historial con búsqueda y filtros;
7. abrir una versión anterior y confirmar modo de consulta sin alta de compra manual;
8. abrir la trazabilidad y verificar PDF, SHA, borrador, modelo, prompt y versiones;
9. activar una versión anterior y confirmar actualización visual;
10. archivar una versión con motivo y confirmar que permanece visible bajo el filtro Archivados;
11. smoke de Dashboard, Movimientos y Deuda futura después de cambiar la versión activa.

#### UAT Historial de Tarjetas

- cargar un primer resumen y verificar versión 1 activa;
- intentar cargar el mismo PDF y verificar bloqueo claro por duplicado;
- cargar una variante distinta del mismo período y verificar versión 2 activa y versión 1 anterior;
- navegar entre ambas versiones;
- revisar la trazabilidad completa de las dos;
- agregar una compra manual a la versión activa;
- reactivar la versión anterior y confirmar que la compra y sus cuotas continúan en la versión vigente;
- comprobar que Dashboard, Movimientos y Deuda futura no duplican consumos ni cuotas;
- archivar una versión y confirmar conservación de documento e IA;
- recargar la aplicación y confirmar persistencia de estado, versiones y filtros.

---

### Gate pendiente para APP-CARD-QUOTE-VERTICAL-001

El agente debe ejecutar sin modificar código ni este SSOT.

#### Backend

1. confirmar Node exacto `v24.18.0`;
2. respaldar `prisma/dev.db`;
3. `npm ci`;
4. `npm run prisma:generate`;
5. `npm run prisma:migrate:deploy`;
6. `npm run build`;
7. `npm run test` y confirmar `tests/cards/exchange-rate.test.ts`;
8. smoke de `GET /api/card-statements/exchange-rate` sin cotización configurada;
9. smoke de `PUT /api/card-statements/exchange-rate` con valor y fecha válidos;
10. smoke posterior de GET y de un resumen aceptado con equivalentes recalculados;
11. confirmar que ARS y USD originales no fueron reemplazados.

#### Frontend

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. smoke visual de Tarjetas sin cotización;
6. guardar una cotización y confirmar valor, origen y fecha;
7. recargar la aplicación y confirmar persistencia desde backend;
8. verificar equivalentes del resumen y de las cuotas mensuales;
9. confirmar que no se escribe `cajaapp.cards.usdArsRate` en `localStorage`.

#### UAT cotización

- abrir Tarjetas con ARS y USD originales visibles;
- confirmar que sin cotización los equivalentes muestran ausencia de dato;
- guardar una cotización manual con fecha;
- comprobar el equivalente USD en ARS y el total combinado;
- comprobar las proyecciones mensuales recalculadas;
- cambiar la cotización y confirmar que se actualizan los equivalentes sin modificar los importes originales;
- recargar y confirmar persistencia.

---

### Gate pendiente para APP-REPORTS-VERTICAL-001

El agente debe ejecutar sin modificar código ni este SSOT.

#### Backend

1. confirmar Node.js exacto `v24.18.0`;
2. `npm ci`;
3. `npm run prisma:generate`;
4. `npm run prisma:migrate:deploy`;
5. `npm run build`;
6. `npm run test` y confirmar `tests/reports/reports.service.test.ts` con `3/3 PASS`;
7. smoke de `GET /api/reports` para mes, trimestre y año;
8. comprobar separación ARS/USD, promedio, comparación, categorías, fuentes, deuda e ingresos recurrentes;
9. descargar `GET /api/reports/export.csv` y validar BOM UTF-8, cabecera y filas;
10. confirmar validación de rango inválido y límite máximo de cinco años.

#### Frontend

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. `npx playwright test tests/reports.spec.ts --project=chromium --workers=1 --retries=0 --trace=on`;
6. validar estados loading, error, vacío y datos;
7. validar rango editable, comparación, tablas y descarga CSV;
8. confirmar drilldown desde mes, categoría, fuente y deuda hacia Movimientos;
9. confirmar banner y limpieza del filtro abierto desde Reportes;
10. smoke responsive de Reportes y regresión de Dashboard, Movimientos, Tarjetas y Deuda futura.

#### Evidencia

- versiones de SO, Node y npm;
- outputs de instalación, Prisma, build y tests;
- respuestas JSON de reportes;
- CSV exportado;
- trace y capturas Playwright;
- resultado UAT y lista honesta de pendientes.

---

### Gate pendiente para APP-MOV-EXPORT-VERTICAL-001

El agente debe validar sin modificar código ni este SSOT.

#### Backend

1. Node.js exacto `v24.18.0`;
2. `npm ci`;
3. `npm run prisma:generate`;
4. `npm run prisma:migrate:deploy`;
5. `npm run build`;
6. `npm run test` y confirmar `tests/movements/movements-export.test.ts` con `2/2 PASS`;
7. smoke de `/api/movements/export.csv` sin filtros y con cada filtro individual;
8. smoke combinado de búsqueda + tipo + categoría + moneda + estado;
9. confirmar que `page` y `pageSize` no recortan la exportación;
10. validar BOM, delimitador, escaping, nombre y `X-Exported-Records`.

#### Frontend

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. `npx playwright test tests/movements-export.spec.ts --project=chromium --workers=1 --retries=0 --trace=on`;
6. confirmar botón y estado de descarga;
7. confirmar que búsqueda y filtros activos se reflejan exactamente en el CSV;
8. confirmar exportación desde un drilldown de Reportes;
9. validar filtro Proyectados y regresión del ledger/importación CSV/categorías.

#### Evidencia

- comandos y outputs;
- CSVs de smoke con filtros distintos;
- conteos de API y `X-Exported-Records`;
- trace/capturas Playwright;
- resultado UAT y pendientes honestos.

---

### Validación de APP-CONFIG-LOCAL-VERTICAL-001 — DIFERIDA AL GATE FINAL

El desarrollo continúa sin gates intermedios. La instrucción `APPCAJA-V3-SETTINGS-BE-001` deja de estar vigente y se conserva en `superseded` únicamente como referencia histórica.

La campaña final del agente deberá validar backend y frontend de Configuración junto con el resto del sistema, sobre la base real respaldada, usando Node.js exacto `v24.18.0`.

---

### Gate de APP-DASH-ALERTS-VERTICAL-001 — CERRADO

#### Backend — VALIDADO PASS

El bloque `APPCAJA-V3-DASH-ALERTS-BE-001` quedó validado el 12 de julio de 2026. No debe repetirse salvo regresión técnica demostrada.

#### Frontend — CIERRE OPERATIVO AUTORIZADO

El usuario autorizó abrir el bloque siguiente el 12 de julio de 2026. Se retira la instrucción frontend de `issued` y se registra el cierre operativo. No se recibió una carpeta adicional de evidencia frontend en Drive; esta ausencia queda documentada y no se declara evidencia inexistente.

---

## 6.1. APP-GOALS-VERTICAL-001 — Objetivos reales

**Estado:** `IMPLEMENTADO EN DRIVE — PENDIENTE DE VALIDACIÓN LOCAL FINAL`  
**Prioridad:** post-MVP incorporada por decisión del usuario

#### Backlog cubierto

- `APP-BE-GOAL-001` — CRUD de objetivos;
- `APP-FE-GOAL-002` — conexión real de `ObjetivosSection`.

#### Backend implementado

- modelos Prisma `SavingsGoal`, `GoalContribution` y `GoalActivity`;
- migración incremental `20260712180000_add_savings_goals`;
- endpoint `GET /api/goals` con filtro opcional por estado;
- endpoint `GET /api/goals/:goalId`;
- creación, edición, cambio de estado y eliminación de objetivos;
- registro y eliminación de aportes manuales;
- historial auditable de creación, edición, cambios de estado y aportes;
- vínculo opcional a un movimiento como referencia de trazabilidad, sin alterar el ledger;
- ARS y USD separados, sin conversión implícita;
- importes y progreso calculados en backend con centavos `BigInt`;
- finalización automática al alcanzar la meta y reapertura determinística si se elimina un aporte;
- bloqueo de cambios incompatibles de moneda y de mutaciones sobre objetivos cerrados.

#### Frontend implementado

- reemplazo completo del placeholder de Objetivos;
- alta y edición de objetivos;
- acciones de pausar, reanudar, cerrar y eliminar;
- registro de aportes con referencia opcional a movimientos;
- progreso, importe restante, fecha objetivo y estado provenientes del backend;
- detalle de aportes e historial;
- filtros por estado y resumen de activos, pausados y alcanzados;
- aviso explícito: los aportes no descuentan saldo ni crean fondos reservados automáticamente.

#### Pruebas preparadas

- `tests/goals/goals.test.ts` para contrato monetario, progreso y trazabilidad;
- `tests/goals.spec.ts` para creación y aporte desde UI;
- transpile/sintaxis aislados de backend, frontend y tests: PASS;
- build, Prisma, suite y Playwright reales: diferidos a la campaña local final.

---

## 6.2. APP-BUDGETS-VERTICAL-001 — Presupuestos reales por categoría

**Estado:** `IMPLEMENTADO EN DRIVE — PENDIENTE DE VALIDACIÓN LOCAL FINAL`  
**Prioridad:** P1 del backlog restante

#### Backlog cubierto

- `APP-BE-BUD-001` — contratos y cálculo de presupuestos por categoría;
- `APP-FE-BUD-002` — conexión real de `PresupuestosSection`.

#### Backend implementado

- modelo Prisma `CategoryBudget` relacionado con `MovementCategory`;
- migración incremental `20260712183000_add_category_budgets`;
- endpoints de listado, creación, edición, cambio de estado y eliminación;
- validación de solapamientos por categoría, moneda y período;
- límites ARS y USD separados, sin conversión implícita;
- gasto calculado desde el ledger unificado usando únicamente egresos `actual`;
- pendientes y proyectados excluidos del consumo;
- alertas determinísticas: atención desde 80% y crítica desde 100%;
- rollover opcional sólo desde un período anterior contiguo y por saldo positivo;
- cálculo de rollover sobre el historial completo antes de aplicar filtros de presentación;
- importes y porcentajes calculados con centavos `BigInt` y basis points.

#### Frontend implementado

- reemplazo completo del placeholder de Presupuestos;
- creación y edición por categoría, moneda y período;
- pausa, reanudación, cierre y eliminación;
- límite base, rollover, límite efectivo, gasto, disponible y porcentaje provenientes del backend;
- alertas con umbral y evidencia visibles;
- filtros por estado;
- estados de carga, vacío, error y reintento;
- explicación explícita de que pendientes y proyecciones no consumen presupuesto.

#### Pruebas preparadas

- `tests/budgets/budgets.test.ts` para umbrales, períodos y defaults;
- `tests/budgets.spec.ts` para creación real y limpieza automática de UAT;
- transpile/sintaxis aislados de backend, frontend y tests: PASS;
- build, Prisma, suite y Playwright reales: diferidos a la campaña local final.

---

## 6.3. APP-QA-FINAL-001 — Calidad transversal y cierre de runtime

**Estado:** `IMPLEMENTADO EN DRIVE — PENDIENTE DE VALIDACIÓN LOCAL FINAL`

#### Cambios aplicados

- Objetivos y Presupuestos incorporados nuevamente a navegación sólo después de contar con backend real;
- navegación final con nueve secciones funcionales;
- reintento explícito en errores recuperables de Objetivos y Presupuestos;
- formularios preservados ante errores de carga o mutación;
- auditoría estática contra placeholders, datos simulados y acciones ficticias;
- prueba de navegación desktop y móvil;
- prueba de ausencia de contraseña, sesión, cuentas bancarias conectadas y otros controles inexistentes;
- prueba de contrato monetario para impedir `parseFloat` y conversiones implícitas en Objetivos y Presupuestos;
- limpieza automática de datos UAT en los E2E nuevos;
- eliminación de una copia antigua duplicada de `categories.spec.ts`, conservando una sola versión autoritativa más completa;
- validación estricta de fechas calendario en Objetivos.

#### Pruebas agregadas o reforzadas

- `tests/quality/frontend-runtime-contract.test.ts`;
- `tests/quality-audit.spec.ts`;
- `tests/goals.spec.ts` con cleanup por API;
- `tests/budgets.spec.ts` con cleanup por API;
- `tests/goals/goals.test.ts` ampliado con fecha calendario inválida.

#### Límite de la validación del arquitecto

- se realizó revisión y transpile/sintaxis aislados de los archivos agregados y modificados;
- no se declara Prisma, build, typecheck, lint, suite completa ni Playwright PASS sin ejecución local real;
- esas verificaciones quedan exclusivamente en el gate final del agente.

---

## 7. Gate final consolidado

### APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.0

**Estado:** `ISSUED — PENDIENTE DE EJECUCIÓN LOCAL`  
**Ubicación:** `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.0.md`

La instrucción final reemplaza todos los gates individuales anteriores y exige:

- Windows x64 y Node exacto `v24.18.0`;
- respaldo, hash y restauración de la SQLite real;
- instalación reproducible, Prisma generate y migraciones acumuladas;
- backend build y suite completa;
- frontend typecheck, lint y build;
- Playwright completo sin filtros, retries ni wrappers;
- smoke integral de todos los verticales;
- UAT específico de Objetivos y Presupuestos;
- auditoría de navegación, responsive, accesibilidad y controles decorativos;
- limpieza de datos, procesos y puertos;
- evidencia única bajo `pending-validation`;
- veredicto `PASS`, `FAIL` o `BLOCKED`, sin permiso de modificar código.

No queda otro bloque funcional pendiente de implementación en el backlog vigente. Cualquier defecto que aparezca en el gate final se tratará como remediación técnica posterior y trazable, no como funcionalidad omitida.

---

## 8. Registro de cambios

| Fecha | Cambio | Responsable | Estado |
|---|---|---|---|
| 2026-07-11 | Creación del SSOT | Arquitecto/asistente | Vigente |
| 2026-07-11 | Retiro de identidad y controles del prototipo | Arquitecto/asistente | Implementado |
| 2026-07-11 | Implementación del ledger y CRUD manual | Arquitecto/asistente | Pendiente de gate |
| 2026-07-11 | Implementación de importación CSV de débito | Arquitecto/asistente | Pendiente de gate |
| 2026-07-11 | Integración de CSV al ledger | Arquitecto/asistente | Pendiente de gate |
| 2026-07-11 | Eliminación de dependencia de Google Fonts en build | Arquitecto/asistente | Implementado |
| 2026-07-11 | Selección de administración de categorías como próximo vertical | Arquitecto/asistente | Next |
| 2026-07-11 | Cambio de entorno oficial a Node.js v24.18.0 (`node-v24.18.0-win-x64`) | Arquitecto/asistente | Vigente |
| 2026-07-11 | Implementación de administración de categorías y typecheck obligatorio | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación del Dashboard real conectado al ledger | Arquitecto/asistente | Validado PASS |
| 2026-07-12 | Implementación de Deuda y compromisos futuros | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación de cotización persistente y equivalentes USD/ARS en backend | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación de historial seguro, versionado y trazabilidad de resúmenes | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación de Reportes reales, drilldown y exportación CSV | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación de exportación CSV exacta del filtro de Movimientos | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación de configuración local persistente, tema global y estado técnico | Arquitecto/asistente | Pendiente de gate |
| 2026-07-12 | Implementación de alertas determinísticas, evidencia y navegación al origen | Arquitecto/asistente | Cerrado por validación backend y autorización operativa del usuario |
| 2026-07-12 | Inicio de APP-MVP-CLOSURE-001 y selección del gate frontend de Alertas | Arquitecto/asistente | Cerrado operativamente |
| 2026-07-12 | Apertura de APPCAJA-V3-SETTINGS-BE-001 y separación del gate backend/frontend | Arquitecto/asistente | Superseded por decisión de gate final consolidado |
| 2026-07-12 | Cambio de estrategia: desarrollo completo antes de pruebas locales | Usuario / arquitecto-asistente | Vigente |
| 2026-07-12 | Implementación de Objetivos reales, aportes manuales e historial | Arquitecto/asistente | Implementado en Drive / pendiente de gate final |
| 2026-07-12 | Selección de Presupuestos como próximo bloque | Arquitecto/asistente | Completado |
| 2026-07-12 | Implementación de Presupuestos por categoría, rollover y alertas determinísticas | Arquitecto/asistente | Implementado en Drive / pendiente de gate final |
| 2026-07-12 | Incorporación de Objetivos y Presupuestos a la navegación funcional | Arquitecto/asistente | Implementado |
| 2026-07-12 | Cierre de calidad transversal, reintentos, cleanup UAT y auditoría de controles ficticios | Arquitecto/asistente | Implementado / pendiente de gate final |
| 2026-07-12 | Emisión de APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.0 | Arquitecto/asistente | Issued |
