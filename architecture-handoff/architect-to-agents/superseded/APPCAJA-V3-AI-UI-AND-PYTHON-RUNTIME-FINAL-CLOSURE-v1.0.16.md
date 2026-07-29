# CajaApp V3 — Cierre de interfaz IA y runtime Python — v1.0.16


## 1. Objetivo


Resolver la respuesta del Asesor IA desde la interfaz y preparar el entorno Python requerido por la importación real de tarjetas. Conservar la evidencia original antes del cierre.


## 2. Punto de partida


La campaña anterior corrigió los puertos y verificó el fingerprint, pero no conservó los resultados técnicos originales. Esta versión debe reproducir los dos fallos con trazas completas antes de aplicar cambios.




## 3. Alcance y materialización


Se pueden modificar start-cajaapp.ps1, cajaapp-headless-up.ps1 y ai-advisor.spec.ts. asesor-ia-section.tsx sólo puede tocarse después del diagnóstico. playwright.config.ts sólo si la URL de API observada es incorrecta.


Antes de instalar o ejecutar, copiar a evidencia las versiones actuales de scripts, spec, componente, configuración Playwright y requirements.txt, junto con tamaños, fechas y SHA-256. Registrar también lockfiles, SQLite, puertos y procesos.


Mantener congelados backend del Asesor IA, tests backend, schemas, prompt, Prisma, migraciones, extractor Python, requirements y package files.


## 4. Regla para el fix de interfaz


Si el envío no sale, corregir sólo formulario o botón. Si usa una URL incorrecta, corregir la configuración de compilación. Si retorna 201 y el historial bloquea, renderizar la interacción de inmediato y actualizar historial en segundo plano. Si existe un error de página, corregir sólo ese stack. Si el Card ya existe, ajustar únicamente la sincronización del test.


No modificar backend, fingerprint ni prompt.


## 5. Runtime y configuración


Crear un entorno Python local fuera de Drive en %LOCALAPPDATA%\CajaAppV3\runtime\python\.venv. Usar Python Windows x64 compatible, instalar únicamente requirements.txt y establecer PYTHON_EXECUTABLE con ruta absoluta antes de iniciar el backend.


Antes de compilar e iniciar el frontend, establecer NEXT_PUBLIC_API_BASE_URL con la URL real del backend. Registrar ambos valores en la evidencia.


## 6. Diagnóstico de interfaz


Antes de cambiar producto, registrar los eventos del navegador y las llamadas del Asesor IA. Confirmar que la página sea CajaApp y que el envío llegue al backend correcto.


## 7. Validaciones


Validar backend, frontend, el Asesor IA y la importación real de tarjeta. El cierre requiere todas las pruebas aprobadas y evidencia original preservada.


## 8. Preservación y estado final


Antes del cierre, copiar a evidencia la carpeta test-results completa, playwright-report, los logs de backend y frontend, las salidas originales de cada comando y las versiones finales de los archivos modificados. Crear playwright-results-v1.0.16.zip con traces, videos, screenshots, error-context.md, results.json, logs y diagnóstico de red. Verificar que el ZIP abre y guardar su inventario.


Restaurar la base SQLite al hash E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208, comprobar Prisma y lockfiles, confirmar puertos libres y dejar fuera del workspace los artefactos regenerables. El runtime Python externo debe conservarse porque no se sincroniza con Drive.


## 9. Evidencia obligatoria


Crear I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-AI-UI-AND-PYTHON-RUNTIME-FINAL-CLOSURE-evidence-v1.0.16.


Debe contener como mínimo: 00-verdict.md; 01-environment.md; 02-integrity-preflight.md; 03-v1015-audit.md; 04-sqlite-initial.md; 05-files-before.zip; 06-frozen-hashes-before.txt; 07-lockfiles-before.txt; 08-python-discovery.log; 09-python-runtime-setup.log; 10-python-runtime-state.json; 11-change-summary.md; 12-files-after.zip; logs completos de npm ci, Prisma, build y tests backend; logs completos de npm ci, typecheck, lint y build frontend; startup-raw.json; frontend-identity.json; ai-ui-diagnostic-run.log; ai-ui-network.json; ai-ui-console.log; ai-ui-page-errors.log; ai-ui-request-failures.log; ai-ui-fix-decision.md; dos logs del Test B; dos logs del spec IA; dos logs del import real; playwright-full.log; playwright-results-v1.0.16.zip; cleanup.json; sqlite-final.md; lockfile-comparison.md; known-issues.md; evidence-inventory.txt; 50-deliverable-to-architect.md.


Reglas: ningún archivo vacío; logs originales, no resúmenes manuales; inventario con nombre, tamaño y SHA-256; ZIP válido y abierto antes del cleanup; sin secretos, node_modules ni venv; verificar todos los archivos desde Drive; no declarar PARTIAL PASS.


## 10. Criterio final


PASS sólo si se cumplen todos los puntos: backend y frontend PASS; fingerprint preservado; el navegador recibe HTTP 201 y renderiza la misma interacción; Test B 2/2; spec completo del Asesor IA 2/2; runtime Python externo reproducible; import real Galicia Visa 2/2; suite Playwright completa PASS; SQLite restaurada al hash E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208; lockfiles iguales; node_modules eliminado; ZIP y evidencia completa visibles en Drive.


FAIL ante cualquier gate incumplido, timeout, ENOENT, evidencia perdida, cleanup prematuro o ZIP ausente.


BLOCKED sólo si no existe un Python Windows x64 compatible o hay una dependencia externa demostrable.


## 11. Cierre


No iniciar otro vertical. Mover la evidencia v1.0.15 a rejected y la instrucción v1.0.15 a superseded. Entregar 50-deliverable-to-architect.md y esperar auditoría.


Fin de APPCAJA-V3-AI-UI-AND-PYTHON-RUNTIME-FINAL-CLOSURE-v1.0.16.