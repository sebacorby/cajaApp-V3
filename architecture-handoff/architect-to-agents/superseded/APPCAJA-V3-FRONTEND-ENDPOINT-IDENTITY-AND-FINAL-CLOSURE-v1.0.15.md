# APPCAJA-V3-FRONTEND-ENDPOINT-IDENTITY-AND-FINAL-CLOSURE-v1.0.15


Estado: instrucción vigente.
Proyecto: CajaApp V3.
Root único: I:\cajaApp-V3.
Entorno: Windows x64 y Node.js v24.18.0.


## Objetivo


Completar la validación final corrigiendo la diferencia entre el puerto real del frontend y la URL usada por Playwright.






## Hallazgo confirmado


La captura anterior mostró otra aplicación en lugar de CajaApp.


Playwright usa 11437. Los scripts de CajaApp usan actualmente 3000 como puerto frontend por defecto.






El producto, la IA y el fingerprint no causaron este incidente.


## Alcance autorizado


Modificar únicamente los dos scripts de arranque y el spec del Asesor IA.


- cajaapp-headless-up.ps1
- start-cajaapp.ps1
- workspace/frontend/tests/ai-advisor.spec.ts


- workspace/frontend/playwright.config.ts sólo para una validación mínima de URL


Mantener sin cambios el backend, los prompts, Prisma, el frontend productivo, package.json y lockfiles.


## Corrección


En ambos scripts cambiar el puerto frontend por defecto de 3000 a 11437. Mantener el backend en 11436. El parámetro FrontendPort debe seguir funcionando y el estado JSON debe informar el puerto usado.


Si 11437 no está libre, usar otro puerto y reflejarlo en las variables del frontend y Playwright.






## Verificación de identidad


Antes de las pruebas comprobar que backend y frontend responden 200.
El HTML debe contener CajaApp y Finanzas personales, y no debe contener Mundial 2026. Playwright debe encontrar el botón Asesor IA en menos de 15 segundos.






## Test del Asesor IA


Conservar los dos tests existentes.


Validar la identidad de CajaApp después de cada navegación.


En el test de interfaz comprobar la respuesta HTTP 201 del Asesor IA y luego la respuesta visible, el identificador, un claim, una cita y el acceso mobile.




- comprobar interaction ID
- comprobar al menos un claim y una cita
- comprobar acceso mobile
- conservar la limpieza de datos en finally


No aumentar el límite de 240 segundos, no agregar reintentos, no usar mocks y no quitar aserciones.


## Ejecución


Regenerar node_modules con npm ci en backend y frontend.


Backend:
- prisma generate
- prisma migrate status
- build
- suite completa de tests, incluyendo los 154 tests existentes


Frontend:
- typecheck
- lint sin errores
- build


Iniciar CajaApp con backend 11436 y frontend 11437. Establecer CAJAAPP_API_BASE_URL, CAJAAPP_FRONTEND_BASE_URL y PLAYWRIGHT_BASE_URL con esos mismos valores.


Luego ejecutar tres consultas IA, el test de interfaz aislado, dos corridas focales y la suite completa.


Guardar la salida de los comandos y los artefactos de Playwright.


y results.json.


## Estado final


Restaurar la base SQLite al hash:
E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208


Verificar Prisma, lockfiles y eliminar ambos node_modules.


## Evidencia


Crear la carpeta:
architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-FRONTEND-ENDPOINT-IDENTITY-AND-FINAL-CLOSURE-evidence-v1.0.15


Incluir entorno, causa raíz, puertos, cambios, hashes, gates, startup JSON e identidad HTTP.
Agregar el preflight Playwright, tres consultas IA y el test de interfaz aislado.
Agregar dos corridas focales, la suite completa, el ZIP de resultados, la revisión de red y la limpieza final.


Limpieza, SQLite final, inventario con tamaños y SHA-256 y el informe final al arquitecto.


Verificar que todos los archivos sean visibles en Drive y que el ZIP pueda abrirse.


Fin de la instrucción APPCAJA-V3-FRONTEND-ENDPOINT-IDENTITY-AND-FINAL-CLOSURE-v1.0.15.