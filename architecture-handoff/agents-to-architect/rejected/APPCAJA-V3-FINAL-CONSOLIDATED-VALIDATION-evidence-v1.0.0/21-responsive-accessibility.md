# 21-responsive-accessibility

**Estado:** NO EJECUTADO en esta campana.

## Razon

La shell del agente tuvo caidas repetidas por `EPERM: operation not
permitted, uv_spawn powershell.exe` durante la primera mitad de la
campana. Ademas, la suite Playwright tiene bloqueantes que ya determinan
FAIL, por lo que continuar con UAT visual no aporta evidencia accionable
nueva. El arquitecto debera correr este gate en una pasada posterior con
shell estable y los defectos preexistentes resueltos.

## Cobertura que tendria que tener este gate (seccion 8.1 del instructivo)

- Navegacion de las nueve secciones activas (desktop y mobile viewport)
- `aria-current` correcto en el item de nav activo
- Estados de carga, vacio y error recuperable en cada seccion
- Boton "Reintentar" funcional en Objetivos y Presupuestos
- Formularios conservados ante errores recuperables
- Objetivos y Presupuestos visibles en desktop y mobile
- Header sin campana ficticia, login, sesion, cuentas, contrasena
- Ausencia de textos "prototipo demo", "datos simulados", "fase
  posterior", "fuera del MVP", "Hello, world!" y promesas no
  implementadas
- Foco visible y uso razonable por teclado en acciones principales
- Tablas, barras y progresos con alternativa textual
- Tema claro, oscuro y sistema
- Recarga preservando preferencias
- Ninguna conversion monetaria implicita

## Como ejecutarlo en una pasada futura

Recomendado: usar Playwright con multiples viewports:

```typescript
// playwright.config.ts (modificacion del arquitecto, no del agente)
projects: [
  { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
]
```

Y luego un spec que navegue por las 9 secciones y verifique los
items de la lista.
