# APPCAJA V3 — SSOT DE EJECUCIÓN

Estado: VIGENTE — ÚNICA FUENTE DE VERDAD  
Última actualización: 12 de julio de 2026  
Root operativo: I:\\cajaApp-V3  
Autoridad: arquitecto/asistente con gobernanza total confirmada por el usuario.  
Entorno obligatorio: Windows x64 \+ Node.js exacto v24.18.0.

# 1\. Gobierno

Este documento es la única autoridad para el estado, el alcance activo, las prioridades, los gates y la aceptación técnica de CajaApp V3.

Reemplaza como autoridad operativa a:  
\- APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md anterior, conservado como histórico.  
\- APPCAJA-V3-FRONTEND-FUNCTIONAL-BACKLOG-v1.0.0.md, conservado como auditoría inicial y marcado superseded.

Reglas permanentes:  
\- El arquitecto/asistente es el único autorizado a modificar el SSOT, implementar o remediar código, decidir prioridades y aceptar o rechazar evidencia.  
\- Los agentes validan y producen evidencia. No modifican código, tests, migraciones, dependencias, configuración, SQLite ni este SSOT.  
\- Las evidencias aceptadas se mueven físicamente a accepted; las rechazadas, a rejected.  
\- No se abre otro vertical mientras exista un bloque activo.  
\- En las fases vigentes la IA sólo extrae documentos a JSON normalizado; no calcula, categoriza discrecionalmente ni toma decisiones financieras. La futura fase P4 podrá explicar datos estructurados, pero nunca gobernar cálculos autoritativos, modificar registros ni decidir por el usuario.

# 2\. Estado ejecutivo actual

Fase activa: APP-MVP-REMEDIATION-VALIDATION-002 — VALIDACIÓN LOCAL v1.0.1.  
Backlog funcional original: COMPLETO EN DRIVE.  
Backlog de paridad útil con el prototipo: VIGENTE v1.1.0 — NO ACTIVO HASTA OBTENER PASS DE APP-MVP-REMEDIATION-VALIDATION-002 Y CERRAR LA CAMPAÑA FINAL.  
Próxima tarea en cola: APP-UX-PRIVACY-001 — QUEUED / NO ACTIVE.  
Estado de código: APP-MVP-REMEDIATION-002 IMPLEMENTADA EN DRIVE — PENDIENTE DE VALIDACIÓN LOCAL.  
Estado de cierre: REMEDIATION\_v1.0.1\_ISSUED — PENDIENTE DE EJECUCIÓN LOCAL.  
Responsable de código y gobierno: arquitecto/asistente.  
Responsable de la próxima validación: agente en modo sólo validación; veredicto final reservado al arquitecto.  
Instrucción vigente: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1.md — ISSUED.  
Próximo paso activo: ejecutar desde cero APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1. Debe validar integridad, backend, frontend, arranque headless, smoke, Playwright, responsive, cleanup y restauración final. APP-UX-PRIVACY-001 permanece QUEUED y no puede activarse.

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
\- quality-audit recorre las nueve secciones en desktop y mobile, controla aria-current, foco de teclado y controles/textos ficticios.

Gobierno del próximo gate:  
\- rutas API canónicas y formatos de fecha explícitos;  
\- restauración inicial y final de SQLite obligatoria;  
\- prohibición de wrappers;  
\- cero skipped y discovery completo;  
\- evidencia nueva, única y no reutilizada.

# 6\. Deuda no bloqueante

\- 9 vulnerabilidades moderadas preexistentes en el lockfile frontend. Requieren una tarea separada de dependencias y seguridad; no ejecutar npm audit fix dentro de un gate funcional.  
\- Inestabilidad EPERM de la shell del agente. Es un problema operativo de plataforma y debe declararse BLOCKED si impide ejecutar la instrucción sin wrappers.

# 7\. Validación de remediación

Instrucciones de remediación:  
\- Rechazada: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0.md  
\- Vigente: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1.md

Estado: v1.0.0 AUDITADA / FAIL / SUPERSEDED. v1.0.1 ISSUED / PENDIENTE DE EJECUCIÓN LOCAL.

Debe validar:  
\- backend completo;  
\- frontend typecheck, lint y build;  
\- smoke con rutas correctas;  
\- Playwright completo sin filtros, retries, wrappers, skipped ni specs omitidos;  
\- importación PDF real con archivo único;  
\- responsive, accesibilidad y controles honestos;  
\- cleanup y restauración final de SQLite.

Veredicto permitido: PASS, FAIL o BLOCKED.  
El agente no puede modificar código.

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
\- Dashboard y alertas determinísticas;  
\- deuda futura;  
\- cotización USD/ARS;  
\- historial seguro de resúmenes;  
\- Reportes y exportaciones;  
\- configuración local y tema;  
\- Objetivos;  
\- Presupuestos;  
\- calidad transversal.

No quedan pendientes del backlog funcional original. El backlog de paridad útil v1.1.0 incorpora mejoras visuales y operativas, más una fase P4 final de Salud Financiera determinística y Asesor Financiero con IA. APP-UX-PRIVACY-001 queda en cola, bloqueada hasta cerrar el gate de remediación y la campaña final correspondiente.

# 9\. Próxima campaña final

Versión prevista: APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.1.md.  
Estado: NO EMITIDA.  
Precondición: APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1 con PASS aceptado por el arquitecto.  
Regla: ejecutar desde cero y no reutilizar evidencia rechazada.

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
Documento: https://docs.google.com/document/d/12jZVsWXIZ\_k4LolWOKgWOkRSCycxpnKakYZ6LASu0yw/edit  
