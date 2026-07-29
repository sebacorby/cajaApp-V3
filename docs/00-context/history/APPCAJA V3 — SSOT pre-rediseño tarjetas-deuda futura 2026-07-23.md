# APPCAJA V3 — SSOT DE EJECUCIÓN

Estado: VIGENTE — ÚNICA FUENTE DE VERDAD  
Última actualización: 17 de julio de 2026  
Repo canónico administrado por el arquitecto: Google Drive, sincronizado localmente en I:\\cajaApp-V3  
Root canónico y operativo único: I:\\cajaApp-V3  
Autoridad: arquitecto/asistente con gobernanza total confirmada por el usuario.  
Entorno obligatorio: Windows x64 \+ Node.js exacto v24.18.0.

# 1\. Gobierno

Este documento es la única autoridad para el estado, el alcance activo, las prioridades, los gates y la aceptación técnica de CajaApp V3.

Reemplaza como autoridad operativa a:  
\- APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md anterior, conservado como histórico.  
\- APPCAJA-V3-FRONTEND-FUNCTIONAL-BACKLOG-v1.0.0.md, conservado como auditoría inicial y marcado superseded.  
\- APPCAJA V3 — Backlog residual post-auditoría del prototipo v1.2.0, incorporado como backlog operativo derivado; este SSOT prevalece ante cualquier diferencia.

Reglas permanentes:  
\- El arquitecto/asistente es el único autorizado a modificar el SSOT, implementar o remediar código, decidir prioridades y aceptar o rechazar evidencia.  
\- Los agentes validan y producen evidencia. También pueden implementar, materializar o remediar localmente cuando una instrucción vigente enumera de forma exacta los archivos, contratos, límites y entregables autorizados; fuera de esa excepción no modifican código, tests, migraciones, dependencias, configuración, SQLite ni este SSOT.  
\- Las evidencias aceptadas se mueven físicamente a accepted; las rechazadas, a rejected.  
\- No se abre otro vertical mientras exista un bloque activo.  
\- La IA documental sólo extrae documentos a JSON normalizado. El Asesor IA de P4 explica contexto financiero estructurado y cálculos autoritativos, con citas y guardrails; nunca gobierna cálculos, usa documentos originales cuando existen datos normalizados, modifica registros, ejecuta operaciones ni decide por el usuario.

# 2\. Estado ejecutivo actual

Fase activa: P5 — INGESTA FINANCIERA REAL. Bloque activo único: APP-P5-MATERIALIZATION-001, materialización controlada y auditoría de los 23 archivos de APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001. APP-RECONCILIATION-001 permanece implementado y congelado. Después de aceptar la materialización se ejecutará APP-P5-FOCAL-VALIDATION-001 sobre Conciliación \+ Cierre mensual \+ Backup/Restore.  
Backlog funcional original: COMPLETO EN DRIVE.  
Backlog original y paridad útil P1–P4: BASELINE FUNCIONAL IMPLEMENTADO. La auditoría post-prototipo v1.2.0 confirma que la aplicación supera al prototipo y reabre únicamente la regresión APP-UX-PRIVACY-002; las demás brechas detectadas son mejoras P1/P2 no bloqueantes.  
Últimos bloques cerrados: APP-SALARY-RECEIPT-001 CERRADO / PASS y APP-IMPORT-CENTER-001 CERRADO / PASS, ambos con evidencia en accepted. APP-RECONCILIATION-001 queda implementado directamente en Drive como detector y gestor reversible de duplicados y relaciones entre fuentes.  
Estado de código: P1–P4 se conservan como baseline funcional. P5 incluye recibos de sueldo, Centro de importaciones y Conciliación ya implementados; Cierre mensual y Backup/Restore tienen fuente completa preparada, pero todavía no están aceptados en el workspace canónico. La auditoría del prototipo detectó además una regresión de privacidad: hideAmounts permanece en Prisma, pero no está conectado de punta a punta en Settings, preferencias y UI.  
Estado de validación: APP-SALARY-RECEIPT-001 finalizó PASS en v1.0.7. APP-IMPORT-CENTER-001 finalizó PASS en v1.0.0 con 28/28 gates, backend focal 5/5, API 14/14, Playwright 1/1, SQLite restaurada e integridad final; su evidencia fue movida a accepted. APP-RECONCILIATION-001 tiene revisión TypeScript backend/frontend, pruebas focales y migración validada sobre copia de dev.db, pero su validación Windows queda pendiente. APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001 permanecen NO PASS hasta completar materialización, auditoría y campaña focal consolidada.  
Responsable de código y gobierno: arquitecto/asistente.  
Responsable de la operación activa: el arquitecto/asistente define contratos, frontera y aceptación; el agente materializa localmente únicamente los 23 archivos autorizados en I:\\cajaApp-V3 y se detiene para auditoría antes de cualquier gate.  
Instrucción vigente: APPCAJA-V3-P5-FINAL-VERTICALS-LOCAL-MATERIALIZATION-v1.0.0.md — ISSUED / AUTORIZADA. Alcance exclusivo: materialización de Cierre mensual y Backup/Restore en 23 archivos, paquete fuente e inventario; sin builds, migraciones ni tests.  
Próximo paso obligatorio: auditar APP-P5-MATERIALIZATION-001 y verificar los 23 archivos. Si la materialización es aceptada, ejecutar APP-P5-FOCAL-VALIDATION-001 sobre Conciliación, Cierre mensual y Backup/Restore. Después del PASS focal se activa APP-UX-PRIVACY-002. No abrir mejoras P1/P2 mientras este bloque siga activo.

# 3\. Veredicto del gate final v1.0.0

Resultado: RECHAZADO — FAIL.

La entrega real terminó compuesta por 26 piezas de evidencia debido a una sincronización tardía. Todas fueron reunidas físicamente bajo agents-to-architect/rejected. La carpeta original de pending-validation quedó vacía y marcada como trasladada.

Hallazgos confirmados:  
\- Suite backend: 114 tests PASS y 10 FAIL por un test de watchdog perteneciente a una arquitectura anterior.  
\- Frontend lint: 24 errores de reglas orientadas a React Compiler, aunque React Compiler está deshabilitado.  
\- Playwright: discovery limitado a tests/e2e y specs raíz omitidos.  
\- Playwright: selectores obsoletos o ambiguos en Deuda futura, Movimientos, Reportes y Tarjetas.  
\- Playwright: historial de Tarjetas se marcaba skipped cuando no había resúmenes.  
\- Playwright: timeout del flujo de Ingresos sin evidencia inmediata del response backend.  
\- Playwright: timeout de Alertas sin separación entre contrato API y renderizado UI.  
\- Happy path de importación reutilizaba siempre el mismo PDF contra una base que bloquea duplicados por SHA.  
\- Responsive, accesibilidad, controles decorativos y verificación post-cleanup no fueron ejecutados.  
\- El smoke API usó varias rutas o formatos incorrectos; esos 400/404 no se consideran automáticamente defectos del producto.  
\- La ubicación inicial de SQLite fue identificada incorrectamente y luego corregida a workspace/backend/prisma/dev.db.  
\- La shell del agente sufrió EPERM y se usaron wrappers temporales prohibidos.  
\- El backup inicial coincidió por hash, pero la campaña no demostró restauración final integral.  
\- El frontend reportó 9 vulnerabilidades moderadas preexistentes, registradas como deuda no bloqueante.

# 4\. Diagnóstico arquitectónico del watchdog

El test rechazado esperaba getWorkerHardTimeoutMs y un contrato providerTimeoutMs \+ shutdownGraceMs propio de un child process con kill tardío.

El runtime vigente no usa ese diseño. El procesador de IA es un worker interno y aplica AI\_JOB\_TIMEOUT\_MS mediante runWithTimeout. Agregar una función muerta sólo para satisfacer el test habría introducido una falsa arquitectura.

Decisión:  
\- retirar el test obsoleto watchdog-timeout.test.ts;  
\- validar el timeout vigente con getAiJobTimeoutMs;  
\- usar la misma función en el runtime real;  
\- preservar la terminación controlada del run y la protección contra completaciones tardías.

# 5\. Remediaciones implementadas

Backend:  
\- ai-processor-worker.ts valida AI\_JOB\_TIMEOUT\_MS mediante getAiJobTimeoutMs.  
\- watchdog-timeout.test.ts fue reemplazado por ai-job-timeout.test.ts.  
\- La prueba nueva valida timeout positivo, cero, valores negativos y no finitos.

Frontend y calidad:  
\- ESLint quedó alineado con la decisión vigente de React Compiler deshabilitado.  
\- Se deshabilitaron explícitamente react-hooks/set-state-in-effect y react-hooks/preserve-manual-memoization.  
\- Se excluyeron copias locales con sufijos (1) o copy.  
\- Se eliminó la copia duplicada de category-management-sheet.  
\- Playwright ahora descubre tests raíz y tests/e2e.  
\- Se ignoran specs duplicados con sufijos de copia.  
\- El spec redundante card-statement-failed.spec.ts fue eliminado; el escenario failed permanece cubierto en card-statement-import.spec.ts.  
\- La importación real genera una copia PDF byte-distinta por ejecución para respetar la deduplicación SHA.  
\- Deuda futura expande el panel que contiene el compromiso antes de exigir visibilidad.  
\- Movimientos y Reportes apuntan a la fila desktop autoritativa y evitan strict mode por la tarjeta mobile.  
\- Historial valida el estado vacío sin skip y valida trazabilidad cuando existen resúmenes.  
\- Ingresos espera cierre de sheets, captura el response POST y reporta el body si falla.  
\- Alertas valida primero el endpoint Dashboard, luego refresca la UI y finalmente prueba el drilldown.  
\- Objetivos y Presupuestos limpian en finally y verifican ausencia del dato UAT.  
\- quality-audit recorre las once secciones en desktop y mobile, incluidas Salud Financiera y Asesor IA, y controla aria-current, foco de teclado y controles/textos ficticios.

Gobierno del próximo gate:  
\- rutas API canónicas y formatos de fecha explícitos;  
\- restauración inicial y final de SQLite obligatoria;  
\- prohibición de wrappers;  
\- cero skipped y discovery completo;  
\- evidencia nueva, única y no reutilizada.

# 6\. Deuda no bloqueante

\- 9 vulnerabilidades moderadas preexistentes en el lockfile frontend. Requieren una tarea separada de dependencias y seguridad; no ejecutar npm audit fix dentro de un gate funcional.  
\- Deuda conocida no bloqueante: timeout del flujo UI del Asesor IA, tres warnings de lint y evidencia incompleta de campañas anteriores.  
\- El runtime Python ahora se crea fuera de Drive en %LOCALAPPDATA%\\CajaAppV3\\runtime\\python\\.venv y se valida por hash de requirements.  
\- Inestabilidad EPERM de la shell del agente: declarar BLOCKED sólo cuando impida un gate focal sin wrappers.

# 7\. Validación de remediación

Instrucciones de remediación:  
\- Rechazada: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0.md  
\- Fallida y superseded: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1.md  
\- Superseded/invalidada: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.2.md  
\- Fallida y superseded: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.3.md  
\- Fallida y superseded: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.4.md  
\- Fallida y superseded: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.5.md  
\- Fallida y superseded: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.6.md  
\- Fallida y superseded: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7.md  
\- Superseded: APPCAJA-V3-EVIDENCE-MATERIALIZATION-v1.0.7.md  
\- Vigente: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8.md

Estado: v1.0.0 y v1.0.1 FAIL / SUPERSEDED. v1.0.2 INVALIDADA. v1.0.3 y v1.0.4 FAIL. v1.0.5, v1.0.6 y v1.0.7 EJECUTADAS / FAIL VÁLIDO. APPCAJA-V3-EVIDENCE-MATERIALIZATION-v1.0.7 COMPLETADA / SUPERSEDED. v1.0.8 ISSUED / AUTORIZADA.

Debe validar:  
\- backend completo;  
\- frontend typecheck, lint y build;  
\- smoke con rutas correctas;  
\- Playwright completo en frontend 11437, incluido Asesor IA, sin filtros, skips ni retries;  
\- importación PDF real con archivo único;  
\- responsive, accesibilidad y controles honestos;  
\- cleanup y restauración final de SQLite.

Veredicto permitido: PASS, FAIL o BLOCKED.  
El agente sólo puede materializar los 15 archivos exactos de Fase 8A de v1.0.8; después queda en modo de sólo validación.

## 7.1 Auditoría arquitectónica de la entrega v1.0.0

# Resultado arquitectónico: RECHAZADA — FAIL.

# 

# Aspectos validados:

# \- Node.js exacto v24.18.0.

# \- Backend: npm ci, Prisma generate/deploy, build y 117/117 tests PASS.

# \- Frontend: npm ci, typecheck, lint y build PASS.

# \- SQLite inicial coincide con el backup informado.

# 

# Defectos bloqueantes confirmados:

# \- falta el script npm prisma:migrate:status exigido por el gate;

# \- existe tests/movements/categories (1).rules.test.ts en backend;

# \- existe tests/categories (1).spec.ts en frontend;

# \- el arranque autorizado falla sucesivamente en captura de Node, taskkill y resolución de npm;

# \- no existen evidencias de smoke API, Playwright completo, importación PDF runtime, responsive/accesibilidad, controles honestos, cleanup final, hash final ni ausencia de procesos/puertos;

# \- 00-verdict.md quedó preliminar, usa la fecha incorrecta 2025-07-13 y no incorpora la evidencia generada posteriormente.

# 

# Decisión:

# \- el veredicto BLOCKED del agente no se acepta porque ya se reprodujeron defectos técnicos; la regla del gate exige FAIL ante cualquier defecto;

# \- la carpeta de evidencia fue movida físicamente a agents-to-architect/rejected;

# \- se abre APP-MVP-REMEDIATION-002;

# \- APP-UX-PRIVACY-001 permanece QUEUED / NO ACTIVE.

# 

# 8\. Estado funcional consolidado

Implementado:  
\- identidad CajaApp y retiro del modo prototipo;  
\- importación PDF mediante IA y preview editable;  
\- ingresos reales y proyectados;  
\- ledger unificado y movimientos manuales;  
\- importación CSV;  
\- categorías;  
\- Dashboard, ahorro realizado, tasa de ahorro y alertas determinísticas;  
\- deuda futura;  
\- cotización USD/ARS;  
\- historial seguro de resúmenes;  
\- Reportes y exportaciones;  
\- configuración local y tema persistentes; privacidad visual de importes reabierta como APP-UX-PRIVACY-002 porque hideAmounts permanece en Prisma pero no está conectado end-to-end;  
\- Objetivos con resumen agregado autoritativo y síntesis de metas activas en Dashboard;  
\- Presupuestos con resumen agregado autoritativo y síntesis en Dashboard;  
\- calidad transversal;  
\- Salud Financiera determinística fh-v1.0.0, separada por ARS/USD, con evidencia, confianza, historial y comparación;  
\- Asesor IA sobre contexto estructurado, proveedor configurado, fuentes citadas, guardrails, simulaciones aisladas e historial local.

P1–P4 quedan cerradas como baseline funcional, con APP-UX-PRIVACY-002 reabierta como regresión puntual. P5 está activa. APP-SALARY-RECEIPT-001 y APP-IMPORT-CENTER-001 están cerrados en PASS. APP-RECONCILIATION-001 está implementado; APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001 esperan materialización y aceptación antes de la validación focal conjunta.

# 9\. Backlog operativo vigente

1\. APP-SALARY-RECEIPT-001 — CERRADO / PASS v1.0.7 / EVIDENCIA EN accepted.  
2\. APP-IMPORT-CENTER-001 — CERRADO / PASS v1.0.0 / 28 DE 28 GATES / EVIDENCIA EN accepted.  
3\. APP-RECONCILIATION-001 — IMPLEMENTADO EN DRIVE / VALIDACIÓN FOCAL PENDIENTE: duplicados, depósitos de sueldo, pagos de tarjeta, decisiones reversibles y exclusión autoritativa del ledger.  
4\. APP-MONTH-CLOSE-001 — PENDIENTE DE MATERIALIZACIÓN Y ACEPTACIÓN dentro de APP-P5-MATERIALIZATION-001.  
5\. APP-BACKUP-RESTORE-001 — PENDIENTE DE MATERIALIZACIÓN.  
6\. APP-P5-FOCAL-VALIDATION-001 — EN COLA, depende de materialización aceptada.  
7\. APP-UX-PRIVACY-002 — SIGUIENTE BLOQUE FUNCIONAL después del PASS focal.  
8\. Mejoras P1/P2 y deuda técnica — EN COLA, no bloqueantes.  
Regla: un bloque activo por vez; materialización, validación focal y luego privacidad.

# 10\. Registro de decisiones

12/07/2026 — El usuario confirma gobernanza total del arquitecto sobre el SSOT.  
12/07/2026 — Gate final v1.0.0 rechazado.  
12/07/2026 — 26 piezas de evidencia reunidas bajo rejected.  
12/07/2026 — Instrucción final v1.0.0 movida a superseded.  
12/07/2026 — Se corrige el diagnóstico del watchdog: el test pertenecía a una arquitectura anterior.  
12/07/2026 — Se implementan remediaciones backend, lint, Playwright, cleanup y calidad.  
12/07/2026 — Se emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0 como único gate vigente.  
12/07/2026 — Se audita el prototipo original y se registra un backlog de paridad útil, sin activar implementación durante el gate vigente.  
12/07/2026 — El backlog se actualiza a v1.1.0 e incorpora Salud Financiera determinística y Asesor Financiero con IA como fase P4 final.  
12/07/2026 — APP-UX-PRIVACY-001 queda marcada como próxima tarea QUEUED; no existe autorización para iniciar otro vertical mientras el gate siga activo.  
12/07/2026 — La validación de remediación v1.0.0 se rechaza como FAIL; la evidencia se mueve físicamente a rejected.  
12/07/2026 — Se abre APP-MVP-REMEDIATION-002 para corregir el arranque autorizado, el script prisma:migrate:status y los tests/specs duplicados con sufijo (1).  
12/07/2026 — Se restaura cajaapp-headless-up.ps1 como PowerShell real, con captura robusta de stdout/stderr y rutas absolutas para Node, npm, cmd y taskkill.  
12/07/2026 — Se agrega prisma:migrate:status al backend y se retira la copia duplicada de categories.rules.test.ts del conjunto ejecutable.  
12/07/2026 — Se trasladan a evidencia rechazada los wrappers y diagnósticos temporales creados durante la campaña fallida.  
12/07/2026 — Se emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1 como único gate vigente; v1.0.0 pasa a superseded.  
13/07/2026 — El usuario decide diferir temporalmente la validación de remediación y continuar el backlog de paridad útil.  
13/07/2026 — APP-UX-PRIVACY-001 queda implementada en Drive con persistencia local, control accesible, máscara visual transversal, migración y cobertura Playwright; validación local pendiente.  
13/07/2026 — Se activa APP-DASH-SAVINGS-001 como único vertical siguiente.  
13/07/2026 — APP-DASH-SAVINGS-001 queda implementada en Drive con valores autoritativos del backend, separación ARS/USD, estado sin base comparable, drilldown y cobertura de pruebas; validación local pendiente.  
13/07/2026 — APP-DASH-BUDGETS-001 \+ APP-BUDGETS-OVERVIEW-001 quedan implementadas en Drive con endpoint agregado, sumas bigint, rollover, vistas Dashboard/Presupuestos y pruebas; validación local pendiente.  
13/07/2026 — Se activa APP-DASH-GOALS-001 \+ APP-GOALS-OVERVIEW-001 como único vertical siguiente.  
13/07/2026 — APP-DASH-GOALS-001 \+ APP-GOALS-OVERVIEW-001 quedan implementadas en Drive con endpoint agregado, sumas bigint, reglas explícitas de estado, priorización determinística, Dashboard, sección Objetivos y pruebas; validación local pendiente.  
13/07/2026 — Se activa APP-GLOBAL-SEARCH-001 como único vertical siguiente.  
13/07/2026 — APP-GLOBAL-SEARCH-001 queda implementada en Drive con endpoint tipado, ranking y paginación determinísticos, navegación contextual, acceso global y pruebas; validación local pendiente.  
13/07/2026 — Se activa APP-ALERT-CENTER-001 como único vertical siguiente.  
13/07/2026 — APP-ALERT-CENTER-001 queda implementada directamente en el repo de Drive; validación final diferida.  
13/07/2026 — APP-DASH-TREND-VISUAL-001 queda implementada directamente en el repo de Drive con series ARS/USD derivadas de monthlyEvolution, alternativa textual accesible, navegación a Reportes y UAT; validación final diferida.  
13/07/2026 — APP-CHART-PARITY-001 queda implementada directamente en el repo de Drive reutilizando los componentes canónicos de gráficos, con barras/área para evolución, lista/donut para categorías, ARS/USD separados, fuente backend explícita, tabla equivalente accesible y UAT con cleanup; validación final diferida.  
13/07/2026 — APP-SIDEBAR-HEALTH-PRECURSOR-001 queda implementada directamente en el repo de Drive con panel compacto de calidad del dato, conteos autoritativos, lastUpdatedAt calculado en backend, navegación al origen, omisión sin información útil, prueba backend y UAT con cleanup; validación final diferida.  
14/07/2026 — APP-FINANCIAL-HEALTH-001 queda implementado directamente en el repo de Drive con fórmula fh-v1.0.0, factores cuantificados, confianza y bloqueos por evidencia, separación ARS/USD, snapshots deduplicados por huella, comparación histórica, navegación al origen, resumen en Dashboard, sección propia, migración, prueba backend y UAT con cleanup; validación final diferida.  
14/07/2026 — APP-AI-ADVISOR-001 queda implementado directamente en el repo de Drive con contexto advisor-context-v1.0.0, prompt advisor-prompt-v1.0.0, respuesta advisor-response-v1.0.0, proveedor real configurado, citas obligatorias, validación numérica por fuente, guardrails, simulaciones aisladas, historial local, navegación, migración, prueba backend y UAT con cleanup; validación final diferida.  
14/07/2026 — Se confirma que APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1 fue ejecutada con FAIL por copias (1); la instrucción pasa a SUPERSEDED y su evidencia se mueve físicamente a agents-to-architect/rejected.  
14/07/2026 — Se emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.2 como validación consolidada; luego queda invalidada al requerir reparación del script.  
14/07/2026 — v1.0.3 ejecuta el script obligatorio y termina FAIL por BOM UTF-8 en schema.prisma, residuos locales duplicados y \-Stop estricto frente a Docker/WSL; SQLite queda restaurado y sin procesos residuales.  
14/07/2026 — El arquitecto publica schema.prisma sin BOM, elimina duplicados visibles y artefactos generados, y repara cajaapp-headless-up.ps1 para que \-Stop ignore procesos externos sin matarlos mientras el arranque conserva política estricta.  
14/07/2026 — Se emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.4 con remediación local limitada a residuos exactos y validación consolidada completa.  
14/07/2026 — v1.0.4 finaliza FAIL por archivos canónicos ausentes localmente, migration.sql faltante y BOM extendido; el arquitecto republica los ocho archivos canónicos y emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.5.  
14/07/2026 — v1.0.5 finaliza FAIL por ausencia local de global-search-api.ts y error de lint por mutación durante render en category-donut.tsx; SQLite queda restaurado y los servicios detenidos.  
14/07/2026 — El arquitecto publica global-search-api.ts, corrige category-donut.tsx sin alterar comportamiento visual, crea recuperación canónica v1.0.6 y emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.6.  
14/07/2026 — La campaña v1.0.6 termina FAIL válido en el root operativo del agente I:\\cajaApp-V3-real. Confirma PASS de Prisma, backend, frontend y headless; los hashes y la ruta /api/future se corrigen como defectos de instrucción, y las fallas UI no se aceptan como defectos funcionales porque Playwright apuntaba al puerto 3000 de Docker/WSL.  
14/07/2026 — Se aclara la arquitectura operativa: el arquitecto modifica el repo canónico en Drive, sincronizado en I:\\cajaApp-V3; el agente materializa esos cambios y ejecuta validaciones en I:\\cajaApp-V3-real. Se elimina el duplicado global-search-api, se retira el archivo TEMP de Reportes, se actualiza playwright.config.ts para usar CAJAAPP\_FRONTEND\_BASE\_URL/PLAYWRIGHT\_BASE\_URL con fallback 11437 y se corrige APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7.  
15/07/2026 — APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7 finaliza FAIL válido en I:\\cajaApp-V3-real: Playwright core 11 PASS / 13 FAIL, Asesor IA HTTP 422, SQLite restaurado exactamente y servicios detenidos.  
15/07/2026 — Se detecta que la evidencia v1.0.7 quedó únicamente en el root operativo no sincronizado. Se emite APPCAJA-V3-EVIDENCE-MATERIALIZATION-v1.0.7 para copiarla sin reejecución ni cambios de código al pending-validation de I:\\cajaApp-V3, con comparación SHA-256.  
15/07/2026 — La evidencia v1.0.7 se materializa en Drive y se auditan sus 13 fallos Playwright y el HTTP 422 del Asesor IA.  
15/07/2026 — Se confirman tres defectos de producto: Categorías mostraba un selector vacío tras reasignar a Sin clasificar, Tarjetas ocultaba el historial sin resumen activo y el guardrail del Asesor IA trataba componentes de fechas ISO como números negativos. Los otros once ajustes corresponden a specs desalineados con navegación, DOM responsive, inputs, overlays, paneles colapsados o datos preexistentes.  
15/07/2026 — El arquitecto publica 15 archivos corregidos en el repo canónico y en APPCAJA-V3-v1.0.8-CANONICAL-RECOVERY, mueve la evidencia v1.0.7 a rejected y emite APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8.  
16/07/2026 — El usuario decide cerrar la etapa de validación global repetitiva y continuar construyendo sobre el baseline probado.  
16/07/2026 — Se activa P5 — Ingesta financiera real.  
16/07/2026 — APP-SALARY-RECEIPT-001 se implementa directamente en I:\\cajaApp-V3: contrato salary-receipt-v1, migración, backend, panel de Ingresos, pruebas focales y runtime Python externo a Drive.  
16/07/2026 — La migración nueva se ejecuta sobre una copia de dev.db y PRAGMA foreign\_key\_check no informa violaciones.  
16/07/2026 — APP-SALARY-RECEIPT-FOCAL-VALIDATION v1.0.0 termina FAIL válido: dos errores TypeScript y un error de quoting en el runtime Python; SQLite queda restaurada exactamente.  
16/07/2026 — El arquitecto corrige salary-receipts.schemas.ts, salary-receipts.controller.ts y cajaapp-headless-up.ps1 y emite la revalidación focal v1.0.1 sin suite completa.  
16/07/2026 — APP-SALARY-RECEIPT-FOCAL-REVALIDATION v1.0.1 termina FAIL válido: las tres remediaciones pasan, pero el build detecta TS2345 en listSalaryReceiptsQuerySchema; la evidencia se mueve a rejected y la instrucción a superseded.  
16/07/2026 — El arquitecto corrige integralmente el query HTTP de recibos: schema de strings opcionales sin default/transform/coerce y normalización explícita a number/boolean en el controller. Se emite v1.0.2 focal sin suite completa.  
16/07/2026 — v1.0.2 confirma backend build, tests focales y queries, pero termina FAIL por arranque manual y falta de PDF E2E.  
16/07/2026 — Se incorporan tres PDFs sanitizados, se corrige Invoke-CapturedProcess y se agrega salary-receipts.real.spec.ts sin mocks.  
16/07/2026 — v1.0.3 valida exitosamente todo el ciclo API real, incluyendo base futura true/false y reemplazo; termina FAIL porque el spec usa import.meta.url y porque el arranque autoritativo fue sustituido por inicio manual.  
16/07/2026 — El arquitecto reemplaza import.meta.url por path.resolve(\_\_dirname, ...), rechaza el diagnóstico incorrecto de que los imports node: sean ESM-only y emite APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.4 para corregir el descubrimiento Python y ejecutar únicamente arranque \+ E2E.  
16/07/2026 — v1.0.4 confirma arranque autoritativo, venv Python, pdfplumber, servicios e importación real; termina FAIL por una expectativa Playwright que buscaba el valor de un input mediante toContainText.  
16/07/2026 — El arquitecto corrige únicamente salary-receipts.real.spec.ts usando getByDisplayValue, mueve v1.0.4 a superseded/rejected y emite v1.0.5 como cierre mínimo sin repetir gates funcionales.  
16/07/2026 — v1.0.5 mantiene arranque, servicios, lint y discovery en PASS, pero termina FAIL por invocar getByDisplayValue sobre un Locator; la evidencia se mueve a rejected y la instrucción se preserva en superseded.  
16/07/2026 — v1.0.6 conserva arranque, servicios, lint, discovery y ZIP real en PASS, pero termina FAIL porque page.getByDisplayValue tampoco existe. El arquitecto verifica la API oficial, elimina completamente getByDisplayValue, publica una comprobación basada en expect.poll \+ Locator.evaluateAll \+ HTMLInputElement.value, mueve la evidencia v1.0.6 a rejected y emite v1.0.7.  
16/07/2026 — APP-SALARY-RECEIPT-FINAL-E2E-CLOSURE v1.0.7 termina PASS: 1 E2E real aprobado, 18 pasos completados, SQLite y lockfiles íntegros; evidencia movida a accepted e instrucción a superseded.  
16/07/2026 — APP-IMPORT-CENTER-001 se implementa directamente en I:\\cajaApp-V3 sin nueva migración: agregador backend sobre Tarjetas, Recibos y CSV débito; endpoints de listado/detalle; estados, errores y correcciones normalizados; sección Importaciones, filtros, trazabilidad, navegación y pruebas focales.  
16/07/2026 — APP-IMPORT-CENTER-001 finaliza PASS v1.0.0: 28/28 gates, backend 5/5, API 14/14, Playwright 1/1, SQLite e integridad exactas; evidencia movida a accepted.  
16/07/2026 — APP-RECONCILIATION-001 se implementa directamente en I:\\cajaApp-V3 con modelos ReconciliationCase/ReconciliationParticipant, migración SQLite, detección de duplicados/depósitos/pagos de tarjeta, resolución y reapertura, exclusión reversible en Movimientos, API, sección Conciliación y pruebas focales. La migración se valida sobre copia de dev.db y PRAGMA foreign\_key\_check queda vacío.  
Documento de backlog histórico: https://docs.google.com/document/d/12jZVsWXIZ\_k4LolWOKgWOkRSCycxpnKakYZ6LASu0yw/edit

16/07/2026 — El usuario autoriza construir APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001 completos, en ese orden, y validar luego Conciliación \+ Cierre mensual \+ Backup/Restore en una única campaña focal consolidada.  
16/07/2026 — La auditoría del paquete inicial detecta y corrige defectos antes de materializar: el materializador no descomprimía el ZIP, Backup/Restore no aseguraba snapshot WAL-consistente ni rollback del rename intermedio, import.meta no era compatible con el backend vigente y Cierre mensual devolvía snapshots completos en el listado. Se publica localmente APPCAJA-V3-P5-FINAL-VERTICALS-SOURCE-v1.0.1 con 23 archivos y materializador transaccional.  
16/07/2026 — El paquete v1.0.1 supera TypeScript focal backend/frontend, Vitest 10/10, Playwright discovery 2/2, migraciones sobre copia real, PRAGMA integrity\_check ok, foreign\_key\_check vacío y snapshot mediante la API de backup de SQLite. La carga raw continúa bloqueada por HTTP proxy 407, confirmado también por una carga de prueba; el probe fue eliminado. El repo canónico permanece limpio y sin materialización, por lo que no se declara PASS de los dos verticales ni se inicia la validación consolidada.  
17/07/2026 — Se demuestra que crear archivos raw vacíos no resuelve el bloqueo: cualquier reemplazo posterior de bytes vuelve a pasar por el proxy interno y falla con HTTP 407\. Se descarta formalmente esa modalidad.  
17/07/2026 — El usuario autoriza reconstruir desde cero APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001. Se emite APPCAJA-V3-P5-FINAL-VERTICALS-LOCAL-MATERIALIZATION-v1.0.0.md: el agente puede materializar exclusivamente 23 archivos sobre I:\\cajaApp-V3, crear paquete fuente e inventario y debe detenerse antes de validar.  
17/07/2026 — Backlog residual v1.2.0 incorporado al SSOT. Orden vigente: materialización P5, validación focal y privacidad.  
