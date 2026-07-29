# APPCAJA V3 — Backlog de funcionalidades restantes del frontend

**Versión:** 1.0.0  
**Fecha de auditoría:** 11 de julio de 2026  
**Tipo de documento:** backlog funcional y técnico para uso humano  
**Estado:** vigente  
**Proyecto:** CajaApp V3  
**Root de referencia:** `I:\cajaApp-V3`  

---

## 1. Objetivo

Este documento registra qué partes del frontend actual continúan siendo mocks, demostraciones visuales o acciones sin implementación real, y las convierte en un backlog priorizado para completar CajaApp V3.

La finalidad no es preservar todas las funciones heredadas del prototipo, sino decidir para cada una si debe:

1. conectarse a datos reales;
2. rediseñarse para responder al modelo funcional de CajaApp;
3. postergarse para una fase posterior; o
4. retirarse del MVP para evitar promesas visuales falsas.

### Norma permanente de implementación

- Todo cambio de código queda a cargo del arquitecto/asistente.
- El agente ejecuta únicamente instalación reproducible, migraciones, build, tests, smoke y UAT.
- El agente no crea, modifica ni remedia código.
- Los cálculos financieros pertenecen al backend.
- El frontend presenta datos, captura intención del usuario y consume contratos normalizados.
- La IA sólo extrae documentos a JSON normalizado; no calcula, categoriza discrecionalmente ni toma decisiones financieras.

---

## 2. Alcance auditado

Se revisó el frontend activo bajo:

```text
I:\cajaApp-V3\workspace\frontend\src
```

Áreas inspeccionadas:

- shell general y navegación;
- selector de período;
- Dashboard;
- Movimientos;
- Ingresos;
- Tarjetas;
- Presupuestos;
- Objetivos;
- Reportes;
- Configuración;
- componentes de gráficos, listas, alertas y progreso;
- servicios API frontend;
- datos mock y fixtures heredados;
- ruta API residual de Next.js;
- carpetas heredadas del prototipo.

No se consideraron como funcionalidad real los archivos compilados de `.next`, reportes Playwright, logs ni artifacts generados.

---

## 3. Resumen ejecutivo

### 3.1 Módulos conectados a backend real

| Módulo | Estado | Observación |
|---|---:|---|
| Ingresos | Real / funcional | CRUD de fuentes, aumentos, cambios permanentes, valores mensuales, bonos y extras. Proyección y totales calculados por backend. |
| Tarjetas | Real / funcional con deuda residual | Importación PDF, procesamiento IA, preview editable, aceptación, persistencia, historial, proyecciones y compras manuales. Mantiene conversión USD/ARS y cotización en frontend/localStorage. |

### 3.2 Módulos todavía alimentados por mocks

| Módulo | Estado actual | Fuente simulada principal |
|---|---:|---|
| Dashboard | Mock completo | `src/lib/finance/mock-data.ts` |
| Movimientos | Mock completo | `src/lib/finance/mock-data.ts` |
| Presupuestos | Mock completo | `src/lib/finance/mock-data.ts` |
| Objetivos | Mock completo | `src/lib/finance/mock-data.ts` |
| Reportes | Mock completo | `src/lib/finance/mock-data.ts` |
| Cabecera global | Parcialmente mock | usuario, saludo, salud financiera y períodos hardcodeados |
| Sidebar | Parcialmente mock | salud financiera fija en 78 |
| Configuración | Demostración visual | switches y botones sin persistencia ni backend |

### 3.3 Acciones visibles sin comportamiento real

- búsqueda global;
- centro de notificaciones;
- botón `Nuevo movimiento` de la cabecera;
- botón de filtros avanzados de Movimientos;
- exportación de Movimientos;
- creación de presupuesto;
- creación de objetivo;
- apertura/detalle de alertas inteligentes;
- cambio de moneda y región;
- cambio de contraseña;
- gestión de cuentas vinculadas;
- cierre de sesión;
- autenticación de dos pasos;
- notificaciones de gastos;
- modo oscuro persistente.

### 3.4 Elementos propios del prototipo que continúan visibles

- marca `Clarified` en lugar de CajaApp;
- metadata, favicon y OpenGraph asociados a `chat.z.ai`;
- usuario ficticio `Valentina`;
- períodos fijos `Marzo 2025`, `Q1 2025`, `H1 2025` y `2025`;
- control flotante para simular estados de UI;
- textos que declaran “prototipo demo” y “datos simulados”;
- afirmación de cifrado de extremo a extremo no respaldada por una implementación verificada;
- “2 cuentas bancarias conectadas”, aunque CajaApp no tiene integración bancaria directa;
- ruta `/api` de Next.js que sólo devuelve `Hello, world!`;
- archivos `mock-data.ts` y `mock-card-statement.ts` heredados;
- backups y temporales dentro del código activo;
- carpetas heredadas del prototipo que no forman parte de la aplicación activa.

---

## 4. Decisiones de producto aplicadas al backlog

### 4.1 Funciones que forman parte del MVP

- ingresos reales y proyectados;
- resúmenes de tarjeta y cuotas futuras;
- movimientos unificados;
- consumos en efectivo cargados manualmente;
- consumos de débito importados desde CSV;
- asientos manuales para imprevistos y cobros;
- categorías y clasificación editable;
- dashboard central orientado a decisiones inmediatas;
- vista separada de deuda y compromisos futuros;
- reportes básicos derivados de datos reales;
- configuración mínima de la app local.

### 4.2 Funciones que no deben bloquear el MVP

- presupuestador completo por categorías;
- objetivos de ahorro;
- autenticación multiusuario;
- contraseña y segundo factor;
- cuentas bancarias conectadas mediante API;
- notificaciones push o correo;
- asesoramiento financiero generado por IA.

### 4.3 Tratamiento recomendado de Presupuestos

El alcance funcional acordado excluye por ahora el presupuestador. Por lo tanto, la pestaña actual no debe conectarse apresuradamente sólo porque existe en el prototipo.

Decisión recomendada para el MVP:

- retirar `Presupuestos` de la navegación visible;
- conservar sus componentes presentacionales fuera del flujo activo;
- mantener una épica post-MVP para reintroducir presupuestos cuando el ledger y las categorías estén estabilizados.

### 4.4 Tratamiento recomendado de Objetivos

Los objetivos son útiles pero no forman parte del núcleo necesario para la primera prueba real de CajaApp.

Decisión recomendada:

- postergar su CRUD hasta después de Dashboard, Movimientos y Reportes;
- ocultar la sección del menú o mostrarla explícitamente como “próximamente”, sin datos ficticios.

---

## 5. Matriz detallada de componentes mock

### 5.1 `DashboardSection`

**Archivo:** `src/components/finance/sections/dashboard-section.tsx`

**Estado actual:** mock completo.

Consume del fixture:

- balance;
- ingresos;
- gastos;
- ahorro;
- presupuestos;
- categorías;
- movimientos;
- objetivos;
- alertas;
- evolución histórica;
- usuario.

Además realiza operaciones financieras en frontend, como ahorro, disponible y porcentaje de presupuesto.

**Destino:** reemplazar por un endpoint agregado de dashboard calculado por backend.

---

### 5.2 `MovimientosSection`

**Archivo:** `src/components/finance/sections/movimientos-section.tsx`

**Estado actual:** mock completo.

Problemas:

- ingresos, gastos y balance provienen del fixture;
- el neto se calcula en frontend;
- el filtro sólo actúa sobre datos locales;
- el botón `Filtros` no ejecuta ninguna acción;
- el botón `Exportar` no ejecuta ninguna acción;
- no existe alta, edición ni eliminación de un movimiento;
- no existe paginación;
- no existe búsqueda;
- no existe integración con tarjetas, ingresos, efectivo o débito.

**Destino:** convertirse en el ledger unificado de CajaApp.

---

### 5.3 `PresupuestosSection`

**Archivo:** `src/components/finance/sections/presupuestos-section.tsx`

**Estado actual:** mock completo y fuera del MVP inmediato.

Problemas:

- límites y consumos provienen del fixture;
- los totales se calculan en frontend;
- el progreso se calcula en frontend;
- `Nuevo presupuesto` no tiene comportamiento;
- no existe persistencia;
- no existe relación real con categorías o movimientos.

**Destino recomendado:** retirar de navegación del MVP y conservar como épica post-MVP.

---

### 5.4 `ObjetivosSection`

**Archivo:** `src/components/finance/sections/objetivos-section.tsx`

**Estado actual:** mock completo.

Problemas:

- metas y aportes son ficticios;
- totales se calculan en frontend;
- `Nuevo objetivo` no tiene comportamiento;
- no existe CRUD;
- no existe registro de aportes ni trazabilidad.

**Destino recomendado:** post-MVP.

---

### 5.5 `ReportesSection`

**Archivo:** `src/components/finance/sections/reportes-section.tsx`

**Estado actual:** mock completo.

Problemas:

- evolución de siete meses ficticia;
- categorías ficticias;
- resumen ficticio;
- promedios y tasa de ahorro calculados en frontend;
- período no controla la consulta;
- no existe exportación;
- no existe navegación por rango temporal.

**Destino:** conectar después de completar el ledger y el dashboard agregado.

---

### 5.6 `ConfiguracionSection`

**Archivo:** `src/components/finance/sections/configuracion-section.tsx`

**Estado actual:** demostración visual sin estado real.

Elementos no implementados:

- notificaciones de gastos;
- autenticación en dos pasos;
- modo oscuro;
- moneda y región;
- cambio de contraseña;
- cuentas vinculadas;
- cierre de sesión.

También muestra afirmaciones incorrectas para el producto actual:

- “2 cuentas bancarias conectadas”;
- “última actualización de contraseña hace 3 meses”;
- envío de alertas;
- existencia de login y sesión.

**Destino:** reemplazar por configuración local real y retirar opciones de autenticación hasta que exista ese alcance.

---

### 5.7 `Header`

**Archivo:** `src/components/finance/layout/header.tsx`

**Estado actual:** parcialmente mock.

Pendientes:

- usuario y saludo reales o neutros;
- selector temporal conectado a consultas;
- salud financiera calculada por backend o retirada;
- búsqueda global real;
- notificaciones reales o eliminación del botón;
- `Nuevo movimiento` conectado al formulario de alta;
- eliminación de períodos fijos de 2025.

---

### 5.8 `Sidebar`

**Archivo:** `src/components/finance/layout/sidebar.tsx`

**Estado actual:** navegación funcional con indicadores ficticios.

Pendientes:

- salud financiera hardcodeada en `78`;
- texto de prototipo;
- menú con funciones fuera de alcance;
- identidad `Clarified`.

---

### 5.9 `DemoStateControl` y modo global simulado

**Archivos:**

- `src/components/finance/layout/demo-state-control.tsx`;
- `src/lib/finance/ui-store.ts`;
- `src/components/finance/sections/section-router.tsx`.

**Estado actual:** herramienta de demostración montada en producción.

Permite reemplazar cualquier sección por estados artificiales `loading`, `empty` o `error`, independientemente del estado real de su API.

**Destino:**

- eliminar del build normal;
- opcionalmente conservar sólo en modo desarrollo mediante feature flag;
- manejar loading, empty y error dentro de cada módulo según la respuesta real.

---

### 5.10 `mock-data.ts`

**Archivo:** `src/lib/finance/mock-data.ts`

Contiene el perfil completo ficticio de “Valentina” y alimenta las principales áreas no conectadas.

**Destino:** eliminar cuando Dashboard, Movimientos y Reportes consuman APIs reales. Mientras tanto, no debe poder llegar a builds UAT mediante importaciones activas.

---

### 5.11 `mock-card-statement.ts`

**Archivo:** `src/lib/finance/mock-card-statement.ts`

Fue usado por la primera versión simulada de Tarjetas, pero la sección actual ya consume `card-statements-api.ts`.

**Destino:** eliminar después de confirmar que no existe ninguna importación activa. Los fixtures de tests deben residir bajo `tests/fixtures`, no en `src`.

---

### 5.12 Tarjetas: funcionalidad real con deuda residual

**Archivo:** `src/components/finance/sections/tarjetas-section.tsx`

No es un mock general. Sin embargo, mantiene dos responsabilidades que no deberían vivir en el frontend:

- cotización USD/ARS fija por defecto en `1500`;
- persistencia de la cotización en `localStorage`;
- conversión de dólares a pesos;
- suma combinada ARS + USD convertidos.

**Destino:** mover cotización y cálculos al backend. El frontend debe recibir:

- cotización efectiva;
- origen de cotización;
- fecha de vigencia;
- equivalentes en ARS;
- total combinado;
- advertencia si falta cotización.

---

## 6. Backlog priorizado

# Fase 0 — Retirar el modo prototipo del producto activo

## APP-FE-REM-001 — Identidad CajaApp y metadata real

**Prioridad:** P0  
**Valor:** evita que UAT muestre una marca ajena y referencias a un generador externo.

### Alcance

- cambiar `Clarified` por `CajaApp`;
- actualizar título, descripción, autores y metadata;
- eliminar URL `chat.z.ai`;
- reemplazar favicon remoto por asset local;
- revisar textos de marketing;
- evitar promesas no verificadas de cifrado.

### Criterios de aceptación

- ninguna pantalla activa muestra `Clarified`;
- no quedan referencias de producto a `chat.z.ai`;
- favicon y assets funcionan sin internet;
- el footer no declara capacidades inexistentes.

---

## APP-FE-REM-002 — Retirar controles de demostración

**Prioridad:** P0

### Alcance

- desmontar `DemoStateControl` del `page.tsx`;
- eliminar el `mode` global del flujo normal;
- conservar estados reales por sección;
- si se mantiene la herramienta, habilitarla sólo con una variable explícita de desarrollo.

### Criterios de aceptación

- UAT no puede cambiar artificialmente toda la app a loading/error/empty;
- un error en Tarjetas no reemplaza la pantalla de Ingresos;
- cada módulo maneja su propio estado.

---

## APP-FE-REM-003 — Limpiar mocks, temporales y artifacts heredados

**Prioridad:** P0

### Alcance

- eliminar imports activos de `mock-data.ts`;
- eliminar `mock-card-statement.ts` de `src`;
- mover fixtures necesarios a `tests/fixtures`;
- retirar `.bak-*` y `TEMP-*` de `workspace`;
- retirar la ruta `src/app/api/route.ts` que devuelve `Hello, world!`;
- revisar `prototype`, `mini-services`, `db`, `download`, `examples` y `.zscripts`;
- conservar sólo aquello que tenga una función documentada en CajaApp V3;
- asegurar que `.next`, logs y resultados de pruebas no formen parte de artifacts de código.

### Criterios de aceptación

- `src` no contiene mocks de negocio usados por la aplicación;
- no hay backups ni archivos temporales en el árbol activo;
- el build no compila código heredado innecesario;
- fixtures de test no están disponibles para runtime.

---

## APP-FE-REM-004 — Contexto temporal real

**Prioridad:** P0

### Alcance

- reemplazar períodos fijos de 2025;
- definir un contrato de rango global: `from`, `to`, `timezone`;
- usar `America/Argentina/Tucuman` como zona por defecto del usuario actual;
- permitir mes, trimestre, semestre, año y rango personalizado cuando corresponda;
- sincronizar el rango con Dashboard, Movimientos y Reportes;
- mantener Ingresos y Tarjetas con sus rangos específicos cuando el módulo lo requiera.

### Criterios de aceptación

- el selector muestra fechas actuales;
- cambiar el período produce nuevas consultas reales;
- el estado temporal sobrevive a navegación entre secciones;
- no se usa texto hardcodeado para el período.

---

## APP-FE-REM-005 — Perfil local y saludo honesto

**Prioridad:** P1

### Alcance

Para el MVP local de un solo usuario:

- eliminar el usuario ficticio `Valentina`;
- permitir un nombre local opcional o usar saludo neutro;
- no simular cuenta bancaria ni número de cuenta;
- no introducir autenticación sólo para sostener el diseño heredado.

### Criterios de aceptación

- ningún dato personal ficticio aparece en runtime;
- el usuario puede definir su nombre local o la app usa un saludo genérico;
- no se muestran cuentas inexistentes.

---

# Fase 1 — Ledger unificado y Movimientos reales

## APP-BE-MOV-001 — Modelo normalizado de movimientos

**Prioridad:** P0  
**Dependencia:** Ingresos y Tarjetas existentes.

### Objetivo

Crear una fuente única de verdad para todo ingreso o egreso que afecte el período.

### Fuentes mínimas

- ingresos recurrentes;
- bonos y extras;
- consumos aceptados de tarjeta;
- cuotas futuras, cuando se consulta proyección;
- compras manuales de tarjeta;
- movimientos de débito importados desde CSV;
- consumos en efectivo cargados manualmente;
- cobros e imprevistos manuales;
- ajustes o anulaciones.

### Campos mínimos

- `id`;
- `occurredOn`;
- `effectiveMonthKey`;
- `type` ingreso/egreso;
- `sourceType`;
- `sourceId`;
- `description`;
- `categoryId`;
- `currency`;
- `amount`;
- `status`;
- `notes`;
- `createdAt` y `updatedAt`;
- información de importación/dedupe cuando corresponda.

### Criterios de aceptación

- una consulta devuelve movimientos heterogéneos bajo un contrato común;
- no duplica una compra de tarjeta entre resumen y compra manual;
- la API entrega totales calculados por backend;
- ARS y USD permanecen separados salvo conversión explícita.

---

## APP-BE-MOV-002 — API de consulta paginada y filtrable

**Prioridad:** P0

### Filtros mínimos

- período;
- tipo;
- fuente;
- categoría;
- estado;
- moneda;
- texto libre;
- monto mínimo/máximo.

### Respuesta

- lista paginada;
- total de registros;
- totales ARS/USD;
- ingresos, egresos y balance del filtro;
- metadatos de paginación.

### Criterios de aceptación

- el frontend no filtra el universo completo en memoria;
- el backend calcula el resumen del mismo conjunto filtrado;
- se preserva orden estable por fecha e ID.

---

## APP-FE-MOV-003 — Conectar `MovimientosSection`

**Prioridad:** P0

### Alcance

- reemplazar `financeSnapshot.transactions` por API real;
- mostrar loading, empty y error reales;
- paginar;
- buscar;
- filtrar;
- abrir detalle;
- editar sólo movimientos que sean editables según su origen;
- eliminar/anular con confirmación;
- mostrar fuente y trazabilidad;
- manejar ARS y USD sin sumarlos implícitamente.

### Criterios de aceptación

- al crear un movimiento se refleja sin recargar toda la app;
- un consumo de tarjeta identifica el resumen de origen;
- un ingreso identifica su fuente o evento;
- la lista funciona con más de 1.000 registros mediante paginación.

---

## APP-BE-MOV-004 — CRUD de movimientos manuales

**Prioridad:** P0

### Tipos mínimos

- gasto en efectivo;
- cobro manual;
- imprevisto;
- transferencia informativa;
- ajuste.

### Criterios de aceptación

- alta, edición y eliminación/anulación persistentes;
- validación de fecha, moneda y monto;
- auditoría de origen manual;
- actualización inmediata de agregados.

---

## APP-FE-MOV-005 — Formulario `Nuevo movimiento`

**Prioridad:** P0

### Alcance

- conectar el botón de la cabecera;
- formulario lateral o modal;
- tipo, fecha, descripción, categoría, moneda, monto y notas;
- validación inline;
- feedback de guardado;
- soporte mobile.

### Criterios de aceptación

- el botón deja de ser decorativo;
- el movimiento aparece en lista y dashboard;
- los errores del backend se presentan sin perder el formulario.

---

## APP-BE-CSV-001 — Importación de débitos desde CSV

**Prioridad:** P0

### Alcance

- carga de CSV;
- detección o selección de formato;
- preview normalizado;
- validación;
- deduplicación;
- confirmación antes de persistir;
- registro del archivo fuente y hash;
- reporte de filas aceptadas, omitidas y rechazadas.

### Criterios de aceptación

- reimportar el mismo CSV no duplica movimientos;
- el usuario puede corregir categoría/descripcion antes de aceptar;
- ninguna decisión financiera queda en manos de IA.

---

## APP-FE-CSV-002 — Flujo visual de importación CSV

**Prioridad:** P0

### Alcance

- selector de archivo real;
- mapeo de columnas cuando sea necesario;
- preview;
- errores por fila;
- aceptación;
- historial de importaciones.

---

## APP-BE-CAT-001 — Categorías persistentes

**Prioridad:** P0

### Alcance

- catálogo inicial configurable;
- CRUD;
- categoría “Sin clasificar” obligatoria;
- color e icono como metadatos visuales, no lógica de negocio;
- asignación manual a movimientos;
- posibilidad futura de reglas determinísticas.

### Criterios de aceptación

- no se usan categorías inventadas por un fixture;
- el usuario puede reclasificar un movimiento;
- cambiar una categoría recalcula reportes desde backend.

---

## APP-FE-MOV-006 — Exportación real

**Prioridad:** P1

### Alcance

- exportar el filtro actual a CSV;
- incluir fecha, descripción, categoría, fuente, moneda, monto y estado;
- evitar exportaciones calculadas sólo desde la página visible.

---

# Fase 2 — Dashboard real orientado a decisiones

## APP-BE-DASH-001 — Endpoint agregado de Dashboard

**Prioridad:** P0  
**Dependencia:** ledger unificado.

### Respuesta mínima

- período efectivo;
- ingresos ARS/USD;
- egresos ARS/USD;
- saldo operativo del período;
- gasto actual por categoría;
- movimientos recientes;
- compromisos de tarjeta del mes;
- caja mensual disponible/configurada;
- datos de evolución;
- alertas determinísticas;
- calidad/completitud de datos.

### Reglas

- todas las sumas se realizan en backend;
- no convertir USD sin cotización explícita;
- distinguir actual de proyectado;
- distinguir fecha de compra, mes de impacto y vencimiento.

---

## APP-FE-DASH-002 — Conectar métricas principales

**Prioridad:** P0

### Alcance

- reemplazar balance, ingreso, gasto y ahorro mock;
- eliminar cálculos locales;
- mostrar ARS y USD por separado;
- indicar si el dato es actual, proyectado o incompleto;
- navegar desde cada métrica al detalle filtrado.

### Criterios de aceptación

- todas las cifras pueden rastrearse a movimientos reales;
- la UI no muestra porcentajes comparativos si el período anterior carece de datos;
- no se presenta un saldo engañoso por mezclar monedas.

---

## APP-FE-DASH-003 — Gasto por categoría real

**Prioridad:** P0

### Alcance

- reutilizar `CategoryDonut` con datos del backend;
- agregar leyenda accesible;
- permitir navegar a Movimientos filtrados por categoría;
- incluir “Sin clasificar”.

---

## APP-BE-DASH-004 — Alertas determinísticas

**Prioridad:** P1

### Alertas iniciales sugeridas

- movimientos sin categoría;
- vencimiento próximo de tarjeta;
- aumento significativo de gasto contra período anterior;
- saldo operativo negativo;
- ingreso esperado no marcado como actual;
- importación CSV con filas rechazadas;
- cotización USD faltante para una vista que la requiere.

### Regla de arquitectura

Las alertas se derivan de reglas del backend. La IA no decide si el usuario está “bien” o “mal” financieramente.

---

## APP-FE-DASH-005 — Reemplazar salud financiera ficticia

**Prioridad:** P1

### Opciones válidas

1. retirar el indicador hasta definir una métrica aprobada; o
2. crear un indicador transparente basado en reglas explícitas y auditables.

### Criterio

No mantener un número arbitrario como `78` ni etiquetas como “Saludable” sin explicar su cálculo.

---

## APP-FE-DASH-006 — Movimientos recientes reales

**Prioridad:** P0

- reutilizar `TransactionsList` con contrato real adaptado;
- mostrar origen;
- abrir detalle;
- navegar a la vista completa;
- soportar estados reales de carga y error.

---

# Fase 3 — Deuda y compromisos futuros

## APP-BE-FUT-001 — Proyección consolidada mensual

**Prioridad:** P0

### Objetivo

Crear la vista separada de deuda/compromisos futuros acordada para CajaApp.

### Debe combinar

- cuotas de tarjetas aceptadas;
- compras manuales en cuotas;
- cargos recurrentes conocidos;
- ingresos proyectados;
- cambios permanentes y aumentos de ingresos;
- extras proyectados cuando estén marcados como tales.

### Salida mínima por mes

- ingresos ARS/USD;
- deuda de tarjeta ARS/USD;
- otros compromisos;
- resultado proyectado;
- componentes trazables;
- indicador de datos faltantes.

---

## APP-FE-FUT-002 — Pantalla de deuda futura

**Prioridad:** P0

### Alcance

- separar de la decisión inmediata del Dashboard;
- timeline o tabla mensual;
- expandir por tarjeta/fuente;
- distinguir deuda confirmada de proyección;
- permitir navegar al resumen o movimiento de origen;
- evitar gráfico sin tabla accesible.

---

# Fase 4 — Completar Tarjetas sin cálculos locales

## APP-BE-CARD-012 — Cotización y equivalentes calculados por backend

**Prioridad:** P0

### Alcance

- entidad/configuración de cotización USD/ARS;
- valor, fecha, origen y estado;
- endpoint para actualizar manualmente;
- cálculo backend de equivalentes;
- respuesta con total ARS, total USD y total convertido cuando corresponda.

### Criterios de aceptación

- Tarjetas no usa `DEFAULT_USD_ARS_RATE`;
- Tarjetas no guarda cotización en `localStorage`;
- Tarjetas no multiplica importes en frontend;
- la UI muestra cuándo y con qué cotización se calculó el equivalente.

---

## APP-FE-CARD-013 — Gestión visible de cotización

**Prioridad:** P0

- consultar cotización del backend;
- actualizarla manualmente;
- validar;
- mostrar fecha de vigencia;
- refrescar equivalentes desde una nueva respuesta del backend.

---

## APP-BE-CARD-014 — Gestión del historial de resúmenes

**Prioridad:** P1

### Funciones

- archivar/eliminar un resumen con reglas seguras;
- marcar un resumen como activo para su período;
- prevenir duplicados por documento/hash/período;
- reabrir trazabilidad de importación;
- conservar historial de procesamiento IA.

---

## APP-FE-CARD-015 — UX de historial

**Prioridad:** P1

- búsqueda por banco/período/tarjeta;
- estado del resumen;
- acciones permitidas;
- confirmaciones claras;
- indicadores de duplicado y versión.

---

# Fase 5 — Reportes reales

## APP-BE-REP-001 — Series temporales y comparativas

**Prioridad:** P1  
**Dependencia:** ledger y categorías.

### Métricas mínimas

- ingresos por mes;
- egresos por mes;
- resultado mensual;
- gasto por categoría;
- gasto por fuente;
- deuda de tarjeta;
- evolución de ingresos recurrentes;
- comparación período contra período.

### Regla

Promedios, porcentajes y comparativas se calculan en backend.

---

## APP-FE-REP-002 — Conectar `ReportesSection`

**Prioridad:** P1

- rango real;
- gráficos alimentados por API;
- tabla equivalente;
- estados sin datos;
- exportación CSV;
- navegación desde puntos del gráfico al detalle.

---

# Fase 6 — Configuración real mínima

## APP-BE-SET-001 — Configuración local de la aplicación

**Prioridad:** P1

### Configuraciones iniciales

- nombre local del usuario;
- zona horaria;
- moneda principal;
- cotización USD/ARS;
- caja mensual por defecto;
- preferencias visuales;
- directorio de importaciones, si se decide exponerlo;
- retención de documentos y backups.

### Fuera de alcance inmediato

- contraseña;
- 2FA;
- cuentas bancarias conectadas;
- sesiones multiusuario;
- notificaciones remotas.

---

## APP-FE-SET-002 — Rediseñar `ConfiguracionSection`

**Prioridad:** P1

### Alcance

- eliminar opciones falsas;
- mostrar sólo configuración soportada;
- persistencia real;
- validación;
- botón de guardar o guardado automático explícito;
- feedback;
- restauración de valores por defecto.

---

## APP-FE-SET-003 — Modo oscuro persistente

**Prioridad:** P2

Puede implementarse enteramente en frontend si no afecta reglas financieras.

Criterios:

- persistencia local;
- respeto por preferencia del sistema;
- contraste accesible;
- gráficos legibles en ambos temas.

---

# Fase 7 — Objetivos post-MVP

## APP-BE-GOAL-001 — CRUD de objetivos

**Prioridad:** P2

- nombre;
- monto objetivo;
- moneda;
- fecha objetivo;
- estado;
- notas;
- aportes manuales;
- historial.

---

## APP-FE-GOAL-002 — Conectar `ObjetivosSection`

**Prioridad:** P2

- alta, edición, pausa y cierre;
- registro de aporte;
- progreso desde backend;
- detalle de movimientos asociados;
- no asumir que el saldo general equivale al dinero reservado.

---

# Fase 8 — Presupuestos post-MVP

## APP-BE-BUD-001 — Presupuestos por categoría

**Prioridad:** P3

No iniciar hasta que categorías y movimientos estén estabilizados.

### Alcance futuro

- límite por categoría y período;
- vigencia;
- rollover opcional;
- alertas determinísticas;
- cálculo backend de gastado y disponible.

---

## APP-FE-BUD-002 — Reintroducir `PresupuestosSection`

**Prioridad:** P3

Sólo cuando exista backend real. Hasta entonces debe estar oculta del menú del MVP.

---

# Fase 9 — Calidad transversal

## APP-QA-FE-001 — Estados reales por módulo

**Prioridad:** P0

Cada sección debe contar con:

- loading;
- empty;
- error recuperable;
- error bloqueante;
- reintento;
- preservación de formulario;
- mensajes sin datos ficticios.

---

## APP-QA-FE-002 — E2E por flujo de usuario

**Prioridad:** P0

Cobertura mínima:

- alta y edición de ingreso;
- importación/aceptación de tarjeta;
- compra manual;
- alta de movimiento manual;
- importación CSV;
- categorización;
- filtro de movimientos;
- dashboard actualizado;
- proyección futura;
- cotización USD;
- persistencia tras recarga.

El agente ejecutará estas pruebas, pero no modificará su implementación.

---

## APP-QA-FE-003 — Auditoría de acciones decorativas

**Prioridad:** P0

Crear un gate que falle si queda un botón visible sin comportamiento intencional.

Revisar especialmente:

- Buscar;
- Notificaciones;
- Nuevo movimiento;
- Filtros;
- Exportar;
- Nuevo presupuesto;
- Nuevo objetivo;
- Cambiar moneda;
- Actualizar contraseña;
- Gestionar cuentas;
- Cerrar sesión;
- filas de alertas con chevron.

Una acción fuera de alcance debe ocultarse o mostrarse deshabilitada con explicación; nunca aparentar que funciona.

---

## APP-QA-FE-004 — Accesibilidad y navegación

**Prioridad:** P1

- foco de teclado;
- labels de formularios;
- tablas accesibles;
- alternativas textuales para gráficos;
- anuncios de error/éxito;
- contraste;
- navegación mobile;
- modales y sheets con cierre y retorno de foco.

---

## APP-QA-FE-005 — Contratos monetarios

**Prioridad:** P0

- evitar `number` para cálculo financiero;
- usar strings decimales normalizados en API;
- separar ARS y USD;
- incluir moneda en cada importe;
- frontend sólo formatea;
- cualquier equivalente debe venir calculado por backend.

---

## 7. Orden recomendado de implementación

1. **Fase 0:** retirar identidad y comportamiento de prototipo.
2. **Fase 1:** construir ledger, movimientos manuales, CSV y categorías.
3. **Fase 2:** conectar Dashboard real.
4. **Fase 3:** construir deuda y compromisos futuros.
5. **Fase 4:** cerrar deuda residual de Tarjetas y cotización.
6. **Fase 5:** conectar Reportes.
7. **Fase 6:** configuración local real.
8. **Fase 7:** objetivos, sólo después del núcleo.
9. **Fase 8:** presupuestos, fuera del MVP actual.
10. **Fase 9:** gates y E2E acompañan cada fase, no se dejan para el final.

---

## 8. Corte sugerido para la próxima implementación

La siguiente iteración de código debería enfocarse en un vertical completo y demostrable:

### Vertical recomendado: Movimientos manuales + ledger inicial

Incluye:

1. modelo normalizado de movimiento;
2. endpoint de consulta;
3. endpoint CRUD manual;
4. pantalla Movimientos conectada;
5. botón `Nuevo movimiento` conectado;
6. totales reales ARS/USD;
7. filtros básicos reales;
8. E2E de alta, persistencia, edición y eliminación;
9. eliminación de los datos mock de Movimientos;
10. exposición del agregado para que Dashboard pueda conectarse en la iteración siguiente.

### Por qué este corte

- convierte una sección central del prototipo en funcionalidad real;
- crea la base que necesitan Dashboard, categorías, CSV y reportes;
- permite registrar efectivo e imprevistos, requerimiento ya definido;
- reduce la dependencia de fixtures;
- evita construir gráficos sobre datos que todavía no tienen una fuente única.

---

## 9. Definición de terminado para reemplazar un mock

Una sección no se considera “conectada” sólo porque realiza un `fetch`.

Debe cumplir simultáneamente:

- contrato backend estable;
- persistencia real;
- cálculos financieros en backend;
- loading/empty/error reales;
- acciones principales funcionales;
- sin datos fallback ficticios en runtime;
- sin botones decorativos;
- trazabilidad de origen;
- ARS y USD tratados correctamente;
- E2E exitoso en Windows x64 + Node.js v24.18.0 (`node-v24.18.0-win-x64`);
- build backend y frontend exitosos;
- smoke runtime;
- documentación de pendientes honesta.

---

## 10. Estado final de la auditoría

### Real y conectado

- Ingresos.
- Tarjetas, salvo cotización/conversión local y mejoras de historial.

### Mock activo prioritario

- Dashboard.
- Movimientos.
- Reportes.
- cabecera/período/usuario/salud financiera.

### Mock activo que debe retirarse del MVP por ahora

- Presupuestos.
- Objetivos.
- autenticación/seguridad/cuentas vinculadas de Configuración.

### Deuda de higiene

- identidad Clarified;
- metadata externa;
- DemoStateControl;
- mock-data;
- mock-card-statement;
- backups/temporales;
- ruta Hello World;
- carpetas heredadas del prototipo;
- textos y claims no respaldados.

---

## 11. Regla para futuras actualizaciones de este backlog

Este archivo debe mantenerse como backlog único de funcionalidades restantes del frontend.

Al completar una tarea:

1. cambiar su estado a `DONE`;
2. registrar la versión o commit que la implementó;
3. enlazar la evidencia de build/test/UAT;
4. retirar el mock o la acción decorativa reemplazada;
5. actualizar las dependencias de las tareas siguientes;
6. no crear un backlog paralelo que compita con este documento.
