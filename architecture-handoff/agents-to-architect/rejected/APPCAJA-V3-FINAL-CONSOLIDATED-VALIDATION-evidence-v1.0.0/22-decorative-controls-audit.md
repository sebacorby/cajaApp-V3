# 22-decorative-controls-audit

**Estado:** NO EJECUTADO en esta campana (mismo motivo que
21-responsive-accessibility).

## Items que cubre (seccion 8.1 del instructivo)

- Header sin campana ficticia
- Header sin boton de login
- Header sin item de sesion / cuenta
- Header sin item de cuentas bancarias
- Header sin item de contrasena
- Ausencia de textos "prototipo demo", "datos simulados",
  "fase posterior", "fuera del MVP", "Hello, world!"
- Ausencia de promesas no implementadas (e.g., "Proximamente",
  "En desarrollo", "Coming soon" en CTAs que no hacen nada)

## Como auditarlo

1. Hacer un grep recursivo en `workspace/frontend/src/` por los terminos
   del listado.
2. Inspeccionar el componente `Header` y `Sidebar` para campana,
   login, sesion, cuentas, contrasena.
3. Listar los items del menu de navegacion y verificar que todos
   llevan a una seccion real (no son placeholders).

Pendiente para una pasada futura con shell estable.
