# APPCAJA V3 — SSOT DE EJECUCIÓN

Estado: VIGENTE — ÚNICA FUENTE DE VERDAD  
Última actualización: 12 de septiembre de 2026  
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
\- **Protocolo de continuidad obligatorio:** antes de iniciar cualquier tarea relevante de implementación, remediación, migración, validación o cambio de arquitectura, el arquitecto/asistente agrega al Registro de decisiones una entrada `INICIO` con fecha, bloque/feature, rama, alcance, estado de partida y artefactos autoritativos. Al finalizar la tarea agrega una entrada `CIERRE` con resultado, archivos/commit relevantes, gates ejecutados, pendientes y siguiente estado. El objetivo es que una caída de sesión nunca deje ambiguo dónde retomar. Las tareas triviales de consulta que no modifican el repo quedan fuera de esta regla.

# 2\. Estado ejecutivo actual

Vertical activo único: **APP-AGENT-CHAT-001 — Agente IA conversacional de CajaApp**, iniciado el 12/09/2026 sobre la rama `feat/agent-chat`. Fuente funcional y de diseño vigente: `specs/001-chat-con-ia/PRD.md` v1.1.0. El acceso principal será un launcher circular flotante persistente abajo a la derecha del `AppShell`; el chat se abrirá como panel flotante en desktop y como full-screen/Sheet en mobile, sin `SectionId` propio. El agente será independiente de `Asesor IA`, tendrá conversación persistente y podrá usar tools explícitas sobre services reales de CajaApp, con risk classes R0–R4, Approval Cards para acciones críticas e imposibilidad de acceso directo a Prisma/SQL/filesystem/shell. APP-P5-MATERIALIZATION-001, APP-P5-FOCAL-VALIDATION-001 y APP-UX-PRIVACY-002 permanecen CERRADOS / PASS. Deuda separada y no bloqueante: el subconjunto de specs que invoca IA real en vivo (Asesor IA, importación real con extracción por IA) continúa BLOCKED por falta de suscripción/créditos en la cuenta de Ollama para el modelo cloud configurado — ver Registro de decisiones y sección 6. APP-RECONCILIATION-001 permanece implementado y congelado.  
Backlog funcional original: COMPLETO EN DRIVE.  
Backlog original y paridad útil P1–P4: BASELINE FUNCIONAL IMPLEMENTADO. La auditoría post-prototipo v1.2.0 confirma que la aplicación supera al prototipo; APP-UX-PRIVACY-002 ya está cerrada / PASS. Las demás brechas detectadas continúan como mejoras P1/P2 no bloqueantes y quedan en cola mientras APP-AGENT-CHAT-001 sea el bloque activo único.  
Últimos bloques cerrados: APP-SALARY-RECEIPT-001 CERRADO / PASS, APP-IMPORT-CENTER-001 CERRADO / PASS, y APP-MONTH-CLOSE-001 \+ APP-BACKUP-RESTORE-001 \+ APP-P5-FOCAL-VALIDATION-001 CERRADOS / PASS v1.3.1, los cuatro con evidencia en accepted. APP-RECONCILIATION-001 queda implementado directamente en Drive como detector y gestor reversible de duplicados y relaciones entre fuentes.  
Estado de código: P1–P4 se conservan como baseline funcional. P5 tiene recibos de sueldo, Centro de importaciones, Conciliación, Cierre mensual y Backup/Restore ya implementados, materializados y aceptados en el workspace canónico. `hideAmounts` está conectado de punta a punta y APP-UX-PRIVACY-002 permanece cerrada / PASS. APP-AGENT-CHAT-001 completó SDD, Phase 1 T001–T005 y Phase 2 Foundation T006–T015: persistencia Agent* + migración, fake provider, adapters Ollama/OpenAI-compatible, factory inyectable y event buffer SSE con secuencia/replay/heartbeat. Próximo bloque técnico: User Story 1 / MVP conversacional T016–T029.  
Estado de validación: APP-SALARY-RECEIPT-001 finalizó PASS en v1.0.7. APP-IMPORT-CENTER-001 finalizó PASS en v1.0.0 con 28/28 gates, backend focal 5/5, API 14/14, Playwright 1/1, SQLite restaurada e integridad final; su evidencia fue movida a accepted. APP-RECONCILIATION-001 tiene revisión TypeScript backend/frontend, pruebas focales y migración validada sobre copia de dev.db, pero su validación Windows queda pendiente. APP-MONTH-CLOSE-001, APP-BACKUP-RESTORE-001 y APP-P5-FOCAL-VALIDATION-001 finalizaron PASS en la campaña v1.3.1 (smoke API 6/6 \+ 10/10 \+ 9/10 justificado, gate frontend focal PASS tras corregir 2 incidentes de proceso, PRAGMA limpio, dev.db restaurado exactamente al hash pre-campaña); evidencia movida a accepted.  
Responsable de código y gobierno: arquitecto/asistente.  
Responsable de la operación activa: el arquitecto/asistente define contratos, frontera y aceptación; el agente materializa localmente únicamente los archivos autorizados en I:\\cajaApp-V3 y se detiene para auditoría antes de cualquier gate.  
Instrucción vigente: APP-AGENT-CHAT-001 está ACTIVADO / EN IMPLEMENTACIÓN bajo `feat/agent-chat`. PRD v1.1.0 + `spec.md` + `plan.md` + `tasks.md` son los artefactos autoritativos del ciclo SDD; T001–T015 están completas. APPCAJA-V3-P5-FOCAL-VALIDATION-v1.3.1.md y APP-UX-PRIVACY-002 permanecen históricos / PASS.  
Próximo paso obligatorio: ejecutar User Story 1 / MVP conversacional T016–T029 en orden TDD, comenzando por tests CRUD/runner/Playwright antes de services, rutas y UI. La migración `20260912230000_add_agent_chat` permanece pendiente en `dev.db` real por decisión deliberada del checkpoint Foundation y deberá aplicarse mediante el flujo de migración autorizado antes de ejecutar runtime persistente de US1. Ningún otro vertical funcional se abre mientras APP-AGENT-CHAT-001 permanezca activo.

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
\- Deuda conocida no bloqueante: causa raíz confirmada el 10/09/2026 del bloqueo del Asesor IA y de la extracción real por IA en importaciones (Tarjetas, Recibos): el modelo cloud configurado `OLLAMA_MODEL=kimi-k2.7-code:cloud` devuelve `OLLAMA_HTTP_ERROR` porque la cuenta de Ollama no tiene suscripción ni créditos de uso para ese modelo; no es un timeout de UI ni un defecto de código. Bloquea `tests/ai-advisor.spec.ts`, el sub-test de preview real de `tests/e2e/card-statement-import.spec.ts` y `tests/salary-receipts.real.spec.ts`. Se resuelve agregando créditos/suscripción en ollama.com o reconfigurando `OLLAMA_MODEL`/`AI_MODEL` a un modelo disponible sin costo.  
\- Tres warnings de lint preexistentes y evidencia incompleta de campañas anteriores, ya documentados.  
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
\- configuración local y tema persistentes; privacidad visual de importes (APP-UX-PRIVACY-002) con hideAmounts conectado en backend, contrato, toggle de Settings y componente `Amount`, brecha de cobertura de Ingresos y Tarjetas cerrada, y campaña de cierre formal PASS el 10/09/2026;  
\- Objetivos con resumen agregado autoritativo y síntesis de metas activas en Dashboard;  
\- Presupuestos con resumen agregado autoritativo y síntesis en Dashboard;  
\- calidad transversal;  
\- Salud Financiera determinística fh-v1.0.0, separada por ARS/USD, con evidencia, confianza, historial y comparación;  
\- Asesor IA sobre contexto estructurado, proveedor configurado, fuentes citadas, guardrails, simulaciones aisladas e historial local.

P1–P4 quedan cerradas como baseline funcional; APP-UX-PRIVACY-002 quedó cerrada en PASS el 10/09/2026. P5 queda consolidada como baseline implementado/validado en sus bloques cerrados; APP-RECONCILIATION-001 permanece implementado con validación focal pendiente. El único vertical activo desde el 12/09/2026 es APP-AGENT-CHAT-001 sobre `feat/agent-chat`; Phase 1 T001–T005, Phase 2 T006–T015 y User Story 1 / MVP conversacional T016–T029 están cerradas. El siguiente bloque autorizado es T030–T040 — User Story 2 / read tools reales de CajaApp.

# 9\. Backlog operativo vigente

1\. APP-SALARY-RECEIPT-001 — CERRADO / PASS v1.0.7 / EVIDENCIA EN accepted.  
2\. APP-IMPORT-CENTER-001 — CERRADO / PASS v1.0.0 / 28 DE 28 GATES / EVIDENCIA EN accepted.  
3\. APP-RECONCILIATION-001 — IMPLEMENTADO EN DRIVE / VALIDACIÓN FOCAL PENDIENTE: duplicados, depósitos de sueldo, pagos de tarjeta, decisiones reversibles y exclusión autoritativa del ledger.  
4\. APP-MONTH-CLOSE-001 — CERRADO / PASS v1.3.1 / EVIDENCIA EN accepted.  
5\. APP-BACKUP-RESTORE-001 — CERRADO / PASS v1.3.1 / EVIDENCIA EN accepted.  
6\. APP-P5-FOCAL-VALIDATION-001 — CERRADO / PASS v1.3.1 (Conciliación \+ Cierre mensual \+ Backup/Restore) / EVIDENCIA EN accepted.  
7\. APP-UX-PRIVACY-002 — CERRADO / PASS 10/09/2026: hideAmounts de punta a punta (backend, contrato frontend, toggle de Settings, componente `Amount` transversal, pruebas backend y Playwright). Backend/contrato/toggle/componente ya estaban implementados; se cerró la brecha de cobertura en Ingresos y Tarjetas y un defecto de compilación en Settings, y se ejecutó la campaña de cierre formal completa (backend 176/176, frontend typecheck/lint/build limpio, smoke API, Playwright completo real, SQLite restaurado a hash exacto) — ver Registro de decisiones.  
8\. Mejoras P1/P2 y deuda técnica — EN COLA, no bloqueantes mientras APP-AGENT-CHAT-001 esté activo.  
9\. Deuda Ollama (créditos/suscripción del modelo cloud configurado) — bloquea validación en vivo del Asesor IA y de la extracción real por IA en importaciones; ver sección 6.  
10\. **APP-AGENT-CHAT-001 — ACTIVO / EN IMPLEMENTACIÓN**: nuevo Agente IA conversacional global, separado de `Asesor IA`. Rama de trabajo vigente al cierre US1: `feat/agent-chat`. PRD v1.1.0 y ciclo SDD completo (`spec.md`, `plan.md`, `tasks.md` + design artifacts). Phase 1 T001–T005, Phase 2 Foundation T006–T015 y User Story 1 / MVP conversacional T016–T029 completadas. MVP disponible mediante launcher circular flotante persistente, panel desktop / full-screen mobile, conversaciones persistentes, runs, SSE y cancelación. La migración Agent* `20260912230000_add_agent_chat` está aplicada y verificada en `dev.db`. Siguiente checkpoint autorizado: T030–T040 — User Story 2 / read tools reales de CajaApp. La arquitectura mantiene tools explícitas sobre services existentes y prohíbe acceso directo del modelo a Prisma/SQL/filesystem/shell.
Regla: un bloque activo por vez; APP-AGENT-CHAT-001 es el único bloque activo desde el 12/09/2026.

Nota de auditoría retroactiva: entre la emisión de este SSOT y su próxima actualización se ejecutó y quedó materializado en Drive un plan de mejoras UX/UI de bajo riesgo, fuera del orden estricto de bloque único (Fases A, B, C y D: código muerto, accesibilidad, contraste dark-mode, consolidación de tarjetas de resumen duplicadas, jerarquía visual del Dashboard y descomposición del god-component `tarjetas-section.tsx`). Ninguna de las cuatro fases tocó backend, Prisma, migraciones, contratos ni `data-testid` existentes; las cuatro están documentadas en `docs/06-reports/` con PASS de typecheck/lint/build. No se abrió ni se avanzó APP-UX-PRIVACY-002 ni ningún otro vertical funcional durante ese trabajo. Se documenta aquí para cerrar la brecha entre el código materializado y el registro del SSOT, sin reabrir ni repetir la implementación.

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
Entre 08/09/2026 y 09/09/2026 (sin actualización previa del SSOT) — Se ejecuta un plan de mejoras UX/UI de bajo riesgo en cuatro fases, documentado retroactivamente en esta actualización: Fase A `APPCAJA-V3-UX-A11Y-DEADCODE-001` (código muerto, duplicado de `global-search-api`, accesibilidad puntual, contraste dark-mode) PASS; Fase B+C `APPCAJA-V3-UX-COMPONENT-CONSOLIDATION-001` (consolidación de tarjetas de resumen duplicadas en `shared/summary-cards.tsx`, reorganización del Dashboard en zonas) PASS; Fase D `APPCAJA-V3-UX-GOD-COMPONENT-SPLIT-001` (descomposición de `tarjetas-section.tsx` de 2461 a 704 líneas en 11 módulos bajo `card-statements/`, con los 14 `data-testid` existentes verificados intactos) PASS. Ninguna fase modificó backend, Prisma, migraciones, contratos ni `data-testid`; ninguna abrió APP-UX-PRIVACY-002 ni otro vertical funcional. El bloque activo de gobierno sigue siendo APP-P5-MATERIALIZATION-001 / APP-P5-FOCAL-VALIDATION-001, sin avance en esta ventana.  
09/09/2026 — Se audita en disco la evidencia BLOCKED de `APPCAJA-V3-P5-FINAL-VERTICALS-evidence-v1.3.0`: los 23 archivos de APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001 están materializados en `I:\\cajaApp-V3` con los hashes finales exactos del manifiesto v1.3.0 (verificado hash por hash sobre disco). El bloqueo reportado es de evidencia/tests (dev.db no restaurado al hash inicial de campaña por falta de backup pre-materialización; 2 de 3 specs Playwright fallan por `getByRole('alert')` en conflicto con el anunciador de rutas de Next.js), no de código funcional roto (Vitest 11/11, API smoke, PRAGMA y build PASS según la propia evidencia BLOCKED). Pendiente: decidir si se corrige el selector de los specs y se reemite la campaña focal con backup real de dev.db antes de materializar, para obtener el PASS oficial de P5.  
09/09/2026 — Se corrigen los dos specs Playwright acotando `getByRole('alert')` al contenedor `data-testid` de cada sección (`month-close-section`, `backup-restore-section`), sin tocar `cierres-section.tsx` ni `respaldo-section.tsx`. Se copia `dev.db` a `PRE-v1.3.1-cajaapp.db` como backup pre-materialización real (hash `24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272`) y se emite `APPCAJA-V3-P5-FOCAL-VALIDATION-v1.3.1.md` como addendum de v1.3.0.  
09/09/2026 — Se ejecuta la campaña v1.3.1 de punta a punta: smoke API Conciliación 6/6 PASS, Cierre mensual 10/10 PASS, Backup/Restore 9/10 ejecutado con 9/9 PASS y 1 omisión justificada (rollback en ventana entre dos `rename`, no inducible sin tocar código gobernado), PRAGMA `integrity_check`/`foreign_key_check` limpios. Durante el gate frontend focal se detectan y corrigen dos incidentes de proceso — no de código — documentados íntegramente en la evidencia: `npm run build` con el servicio standalone vivo sobre el mismo puerto produce `EBUSY` al intentar regenerar `.next/standalone` (corregido deteniendo servicios antes del build); `npm run lint` recoge bundles minificados de `playwright-report/` generados por una corrida previa (corregido limpiando artefactos antes de lintear). Se corrige además un error real de lint preexistente fuera del inventario de 23 archivos en `conciliacion-section.tsx:212` (`react-hooks/use-memo`). Se investigan a fondo 5/23 hashes del inventario que no coincidían con el manifiesto v1.3.0 y se confirma que ninguno es defecto funcional (indentación de Markdown en `schema.prisma`, comentario traducido en `nav.ts`, clases `dark:` en `cierres-section.tsx`/`respaldo-section.tsx`, regex de saneo de ruta más robusto en `backup-restore.service.ts`), quedando documentado para una futura corrección v1.3.2 del manifiesto. Gate frontend focal re-ejecutado completo tras las correcciones: lint/typecheck/build/Playwright ×3 specs, todo PASS. Cleanup final: `dev.db` restaurado exactamente al hash pre-campaña, servicios detenidos, artefactos generados eliminados, lockfiles sin cambios.  
09/09/2026 — Veredicto de la campaña v1.3.1: PASS. Se cierran APP-MONTH-CLOSE-001, APP-BACKUP-RESTORE-001 y APP-P5-FOCAL-VALIDATION-001; su evidencia se mueve físicamente a `accepted/APPCAJA-V3-P5-FINAL-VERTICALS-evidence-v1.3.1`. Queda liberado el bloque activo único: se activa APP-UX-PRIVACY-002 (conectar hideAmounts de punta a punta) como siguiente y único vertical en curso.  
10/09/2026 — Se audita el código de APP-UX-PRIVACY-002 antes de continuar y se descubre que el texto vigente del SSOT estaba desactualizado: `hideAmounts` en Prisma, el contrato `SettingsPayload`, el endpoint `/api/settings`, el toggle en `configuracion-section.tsx` (`settings-hide-amounts`), el proveedor de contexto `app-preferences-provider.tsx`, el componente transversal `Amount` (`shared/amount.tsx`) y las pruebas backend de settings ya estaban implementados de una ventana de trabajo previa al guardado de la versión anterior de este documento (mtimes de archivo posteriores al timestamp de guardado del SSOT). La brecha real no era "backend/contrato/toggle sin conectar" sino dos defectos puntuales:  
\- defecto de compilación real y preexistente: `configuracion-section.tsx` (`submit()`) llamaba `saveSettings({ ...form, displayName })` sin `hideAmounts`, campo requerido por `SettingsPayload = Omit<LocalAppSettings, "updatedAt">`; TS2345 rompía `npm run typecheck` y `npm run build` del frontend. Corregido agregando `hideAmounts: settings.hideAmounts` a esa llamada.  
\- brecha de cobertura de enmascarado: los totales superiores de Ingresos (`SummaryCard` de `ingresos-section.tsx`: `income-total-summary`, `income-recurring-summary`, `income-one-off-summary`) y toda la sección Tarjetas (`statement-overview.tsx`, `exchange-rate-card.tsx`, `statement-history-panel.tsx`, `accepted-state.tsx`, y la celda de solo lectura de `statement-document.tsx`) usaban `formatMoney`/`formatFinancialAmount` en texto plano en vez del componente `Amount`, por lo que quedaban visibles con `hideAmounts` activo. Se convirtieron los ocho puntos de visualización a `<Amount>` (cambiando `SummaryCard.value`/`detail` y `MetricBox.value` de `string` a `ReactNode`), sin tocar el input editable de importes durante la edición de un resumen de tarjeta (deliberado: es un campo de entrada de datos, no de sólo lectura, igual que los inputs de Ingresos).  
\- se extendió `tests/e2e/deuda-futura/privacy.spec.ts` para además verificar el enmascarado/desenmascarado de `income-total-summary` en cada uno de los tres checkpoints (además del ya existente `dashboard-savings-ars-amount`).  
10/09/2026 — Verificación ejecutada: `npx tsc --noEmit` limpio, `npx eslint .` sin errores nuevos (sólo los 3 warnings preexistentes ya documentados como deuda), `npx next build` exitoso. Con `OLLAMA_PREFLIGHT_ENABLED=false` como override de proceso únicamente (sin editar `.env`) para poder levantar el backend sin Ollama local disponible en este entorno, se corrió `tests/e2e/deuda-futura/privacy.spec.ts` contra frontend real en 11437 y backend real en 11436: 1/1 PASS. Se verificó por SQL directo sobre `dev.db` que la fila de `LocalAppSettings` quedó restaurada (`hideAmounts=0`) tras el `finally` del spec. No se declara PASS/FAIL formal del bloque porque esta verificación fue puntual (un solo spec, sin suite backend, sin PDF E2E, sin responsive/accesibilidad, sin comparación de hash exacto de SQLite contra el baseline de v1.3.1); queda pendiente emitir la instrucción de campaña de cierre completa exigida por la sección 7 para poder cerrar APP-UX-PRIVACY-002 formalmente. Ambos servicios de desarrollo se detuvieron al finalizar.  
10/09/2026 — El usuario confirma que Ollama local ya está disponible y ordena ejecutar la campaña de cierre completa de punta a punta. Se copia `dev.db` a `PRE-privacy-campaign-20260910-074106.db` como backup pre-campaña real (hash `108ece3d80c2ecd12f49e851cf5e0c2a221dc947b79e67b7b2426a80af0a1d1f`, idéntico al hash observado al cierre de la verificación puntual anterior, confirmando ausencia de deriva entre sesiones). Se ejecuta la suite backend completa sin overrides: 176/176 tests PASS en 30 archivos, incluido el smoke API automatizado con rutas correctas. Se ejecuta el gate frontend completo: typecheck, lint y build PASS (0 errores nuevos, 3 warnings preexistentes ya documentados). Se levantan ambos servicios reales (backend 11436 con Ollama local real, sin ningún override de preflight; frontend 11437) y se corre Playwright completo sin filtros, skips ni retries (`workers:1`, `retries:0`, discovery de 29 specs): resultado inicial 28 passed / 5 failed (13.0m).  
Se investigan a fondo las 5 fallas antes de atribuir ninguna a un defecto del bloque activo:  
\- `tests/salary-receipts.spec.ts`: defecto de test preexistente y no relacionado con Ollama ni con `hideAmounts` — las aserciones usaban `toContainText()` sobre el contenedor `salary-receipt-preview`, cuyo texto relevante ("Empresa E2E SA", "Sueldo básico") en realidad vive en el atributo `value` de elementos `<Input>` editables (`salary-receipts-panel.tsx`), invisible para `textContent`. Corregido reescribiendo las aserciones con el patrón ya establecido en `salary-receipts.real.spec.ts` (`locator("input").toHaveValue(...)` y `expect.poll(() => locator.evaluateAll(...HTMLInputElement.value...))`). Reejecutado aislado: 1/1 PASS.  
\- Bloqueo de infraestructura real en `.env` del backend: `PYTHON_EXECUTABLE=.venv\\Scripts\\python.exe` (ruta relativa inexistente) tapaba el default correcto del esquema Zod de `env.ts` (`%LOCALAPPDATA%\\CajaAppV3\\runtime\\python\\.venv\\Scripts\\python.exe`, confirmado presente y completo en disco). Esto rompía con `ENOENT` la extracción cruda de PDF (`pdf_raw_extraction.spawn_error`) para cualquier importación real. Corregido eliminando esa línea de `.env`; verificado en logs que `pdf_raw_extraction.started`/`.completed` ya no fallan.  
\- `tests/ai-advisor.spec.ts` (2 sub-tests) y el sub-test de preview real de `tests/e2e/card-statement-import.spec.ts`: fallan porque el modelo configurado `OLLAMA_MODEL=kimi-k2.7-code:cloud` (modo `local-proxy`, `isCloud: true`) devuelve `OLLAMA_HTTP_ERROR: "this model requires a subscription or usage credits, upgrade for access at https://ollama.com/upgrade..."`, confirmado en logs del backend con referencia de error. Es una restricción de cuenta/facturación externa de Ollama —"Ollama está up" en el sentido de que el daemon/proxy local responde al preflight, pero el modelo cloud específico configurado no tiene suscripción ni créditos de uso—, no un defecto de código. `tests/salary-receipts.real.spec.ts` comparte la misma cadena de dependencia (extracción real vía IA) y su fallo (timeout esperando el response de importación) es consistente con el mismo bloqueo de cuenta, manifestado como timeout en vez de error inmediato porque ese flujo envía el PDF directamente al modelo sin pasar antes por la extracción de texto crudo vía Python.  
El spec propio del bloque activo, `tests/e2e/deuda-futura/privacy.spec.ts`, pasa PASS tanto aislado como dentro de la corrida completa (`ok 17 ... (4.9s)`), sin regresiones. Se reejecuta `card-statement-import.spec.ts` tras la corrección de `.env`: el sub-test no dependiente de IA en vivo pasa PASS; el sub-test de preview real vuelve a fallar, ahora únicamente por el `OLLAMA_HTTP_ERROR` de créditos (ya no por `ENOENT`), confirmando que el fix de Python es real y que el único bloqueo remanente es de cuenta Ollama. Cleanup final: ambos servicios detenidos (backend PID 42092, frontend PID 44872); `dev.db` restaurado físicamente desde `PRE-privacy-campaign-20260910-074106.db` y verificado con hash SHA-256 idéntico exacto al backup pre-campaña (`108ece3d80c2ecd12f49e851cf5e0c2a221dc947b79e67b7b2426a80af0a1d1f`), sin archivos WAL/SHM residuales.  
10/09/2026 — Veredicto de la campaña de cierre de APP-UX-PRIVACY-002: PASS para el alcance del bloque. Backend completo, frontend typecheck/lint/build, smoke API y la práctica totalidad de Playwright (28/29 specs iniciales, más 2 defectos preexistentes no relacionados encontrados y corregidos durante la campaña) están en verde, y el spec dedicado a privacidad (`privacy.spec.ts`) verifica el enmascarado/desenmascarado transversal de punta a punta sin hallazgos. Se declara BLOCKED, separado y no bloqueante para el cierre de este bloque, el subconjunto de specs que invocan IA real (`ai-advisor.spec.ts` ×2, `card-statement-import.spec.ts` preview real, `salary-receipts.real.spec.ts`): su causa raíz confirmada es la falta de suscripción/créditos de uso en la cuenta de Ollama para el modelo cloud configurado, una restricción externa de facturación ajena al código, consistente con la deuda ya documentada en la sección 6 ("timeout del flujo UI del Asesor IA"), que se corrige y precisa aquí con la causa raíz real. Se cierra APP-UX-PRIVACY-002 / PASS; su evidencia (logs de suites, hashes de SQLite, diffs de los dos defectos corregidos) queda documentada en este registro. Queda liberado el bloque activo único; no hay próximo vertical autorizado — corresponde a un nuevo turno de decisión del arquitecto/usuario activar el siguiente ítem de la sección 9 (mejoras P1/P2 en cola) o resolver primero la deuda de créditos de Ollama para poder validar el Asesor IA y las importaciones reales con IA en vivo.  
12/09/2026 — **INICIO / APP-AGENT-CHAT-001**: el usuario activa como nuevo vertical único el Agente IA conversacional de CajaApp. Rama de trabajo: `feat/agent-chat`, creada desde `main@e19fb05a201b004d94f7b541cf85d7f9fed7765f` y publicada en `origin/feat/agent-chat`. PRD vigente: `specs/001-chat-con-ia/PRD.md` v1.1.0. Alcance autorizado: chatbot global separado de `Asesor IA`, accesible mediante launcher circular flotante persistente abajo a la derecha; panel flotante en desktop y superficie full-screen/Sheet en mobile; conversación persistente; streaming; tool calling sobre services reales de CajaApp; mutaciones gobernadas por risk classes R0–R4 y Approval Cards; sin acceso directo del modelo a Prisma/SQL/filesystem/shell. Estado al iniciar: documentación/PRD definidos, rama creada, implementación aún no iniciada.  
12/09/2026 — **CIERRE / actualización SSOT de APP-AGENT-CHAT-001**: se actualiza este SSOT para declarar APP-AGENT-CHAT-001 como único bloque activo, registrar `feat/agent-chat`, fijar `specs/001-chat-con-ia/PRD.md` v1.1.0 como autoridad de producto, alinear estado ejecutivo/backlog y eliminar contradicciones con el estado anterior de “sin bloque activo”. Se agrega como regla permanente el protocolo `INICIO`/`CIERRE` para toda tarea relevante, de modo que cada sesión futura deje un checkpoint recuperable antes de modificar el repo y otro al terminar. No se modificó código de producto ni SQLite en esta tarea. Siguiente estado autorizado: generar `spec.md` → `plan.md` → `tasks.md` desde el PRD y luego iniciar implementación incremental sobre `feat/agent-chat`.  
12/09/2026 — **INICIO / ciclo SDD APP-AGENT-CHAT-001**: comienza el ciclo SDD de implementación sobre `feat/agent-chat`. Estado de partida: `PRD.md` v1.1.0 cerrado, sin `spec.md`/`plan.md`/`tasks.md` implementados para este vertical y sin código de producto del agente. Secuencia obligatoria de esta tarea: derivar y validar `spec.md` desde el PRD sin reabrir decisiones; derivar `plan.md` compatible con constitución/arquitectura vigente; derivar `tasks.md` con trazabilidad FR/AC; iniciar implementación incremental únicamente después de esos tres artefactos y cerrar con gates focales de la fase ejecutada. Runtime único: `I:\Tools\node-v24.18.0-win-x64` / Node.js `v24.18.0`.  
12/09/2026 — **CIERRE / ciclo SDD + Phase 1 APP-AGENT-CHAT-001**: ciclo SDD materializado y validado en `specs/001-chat-con-ia/`: `spec.md` sin clarificaciones, checklist 18/18, `plan.md`, `research.md`, `data-model.md`, contratos HTTP/SSE/tool-registry, `quickstart.md` y `tasks.md` con 85 tareas de formato válido. Checkpoint documental `3594046`. Se ejecutó Phase 1 Setup T001–T005 y quedó versionada en `5033400e990a1209c9f23f7df8c3e1ed91a289b7`: prompt `agent-prompt-v1.0.0`, variables `AGENT_*`, interfaz separada `AgentChatProvider`, tipos de run/event/riesgo y schemas Zod base. Gate focal: `node --version` = `v24.18.0` y `npm run build` backend PASS. No se modificó Prisma, migraciones, `dev.db`, frontend ni dependencias. Estado de recuperación: rama `feat/agent-chat`, T001–T005 `[X]`, próximo trabajo obligatorio T006–T015 Phase 2 Foundation en TDD antes de US1.  

12/09/2026 — **INICIO / Phase 2 Foundation APP-AGENT-CHAT-001 (T006–T015)**: se inicia la fase Foundation sobre `feat/agent-chat` desde `685919dd0a41503797314c8f71ea883628c25bc5`, con working tree limpio y Node.js exacto `v24.18.0`. Alcance autorizado: T006–T015 únicamente. Orden TDD obligatorio: tests de persistencia/cascade/idempotencia antes de Prisma; tests de provider/cancelación/tool calls antes de adapters; tests de eventos/replay/heartbeat antes del servicio SSE. La migración Agent* debe validarse sobre una copia de `workspace/backend/prisma/dev.db`; no se permite alterar datos financieros ni avanzar a US1 hasta cerrar Foundation. Checkpoint esperado: schema/migración Agent*, fake provider, adapters Ollama/OpenAI-compatible, factory y event service compilables y con tests focales PASS.

12/09/2026 — **CIERRE / Phase 2 Foundation APP-AGENT-CHAT-001 (T006–T015)**: Foundation completada en TDD sobre `feat/agent-chat`. T006–T015 quedan `[X]`. Se agregaron los seis modelos Prisma Agent* y la migración `20260912230000_add_agent_chat`, validada exclusivamente sobre copia de `dev.db`: `PRAGMA integrity_check=ok`, `foreign_key_check=[]` y presencia de `AgentConversation`, `AgentMessage`, `AgentAttachment`, `AgentRun`, `AgentToolCall`, `AgentApproval`. Al generar el diff se detectó deuda histórica ajena al feat: dos migraciones antiguas aparecen modificadas después de aplicadas y el `dev.db` físico contiene `UploadedDocument_sha256_idx` no declarado por el schema; el DROP propuesto para ese índice fue retirado deliberadamente para que esta migración sólo agregue Agent*. Se implementaron `FakeAgentChatProvider`, adapter Ollama `/api/chat` streaming/tool calls, adapter OpenAI-compatible condicionado a soporte explícito de tools, factory con inyección fake para tests y `AgentEventsService` con secuencia monótona, replay y heartbeat. Gates: `prisma validate` PASS; `prisma migrate status` informa únicamente la nueva migración Agent* pendiente en la base real, por decisión de no mutar `dev.db` en Foundation; backend build PASS; tests focales Foundation 12/12 PASS; suite backend completa 188/188 PASS en 33 archivos, incluido smoke API y tests existentes de `ai-advisor`. `dev.db` original terminó con `integrity_check=ok`, `foreign_key_check=[]` y SHA-256 exacto sin cambios `40e26f3fbd574ea74788e130fecb252c1be8ded55155b2e36adbf6d642fe8904`; copias temporales eliminadas. Próximo estado autorizado: User Story 1 / MVP conversacional T016–T029, aplicando la migración Agent* mediante el flujo autorizado antes del primer runtime persistente del agente.

12/09/2026 — **INICIO / User Story 1 MVP conversacional APP-AGENT-CHAT-001 (T016–T029)**: se inicia US1 sobre `feat/agent-chat` desde `11748982247a3287e65704ac380f2a685ef04e27`, working tree limpio y Node.js exacto `v24.18.0`. Alcance autorizado: T016–T029. Antes del primer runtime persistente se validará `prisma migrate deploy` sobre copia de `dev.db`, se hará backup físico del `dev.db` real y sólo si la copia pasa se aplicará la migración `20260912230000_add_agent_chat` al real, con `integrity_check`/`foreign_key_check` posteriores. Orden TDD: tests CRUD/paginación/cascade, runner/persistencia/cancelación y Playwright launcher/panel/mobile primero; luego services, controller/routes/SSE, registro Fastify, cliente frontend, estado global, launcher/panel y cierre E2E. Ninguna tool financiera entra todavía: este checkpoint debe dejar chat general persistente y usable sin tool execution.

13/09/2026 — **CIERRE / User Story 1 MVP conversacional APP-AGENT-CHAT-001 (T016–T029)**: se cierra US1 con T016–T029 `[X]` y sin iniciar T030+. Runtime verificado: `I:\Tools\node-v24.18.0-win-x64` / Node.js `v24.18.0`. Gates finales: backend build PASS; TypeScript PASS; Vitest completo PASS 35/35 archivos y 193/193 tests después de retirar un placeholder `fase posterior` detectado por el contrato transversal; Prisma validate/generate/status PASS con 19 migraciones y schema up to date; `dev.db` con `integrity_check=ok`, `foreign_key_check=[]` y las seis tablas Agent* presentes; migración `20260912230000_add_agent_chat` confirmada como aplicada/finalizada, sin reaplicarla; frontend typecheck PASS, lint PASS con 0 errores y 3 warnings preexistentes fuera del Agente, production build PASS; Playwright focal US1 PASS 1/1 con `workers=1` y `retries=0` sobre production standalone; smoke HTTP real `/api/agent` PASS para create/list/get/update title/start run/cancel/get run/persistencia de mensaje/delete/404. El primer arranque del backend de prueba quedó bloqueado por preflight Ollama y se relanzó sólo para la validación con `OLLAMA_PREFLIGHT_ENABLED=false`, sin cambio persistente. Cleanup final: servicios de prueba detenidos, puertos 11436/11437 libres, `playwright-report`, `test-results` y copias SQLite temporales de validación eliminadas; backups PRE-* preservados. Estado del MVP: launcher global persistente, panel desktop/mobile, CRUD de conversaciones, mensajes, runs, SSE y cancelación verificados. Siguiente bloque autorizado: **T030–T040 — User Story 2 / read tools reales de CajaApp**.
