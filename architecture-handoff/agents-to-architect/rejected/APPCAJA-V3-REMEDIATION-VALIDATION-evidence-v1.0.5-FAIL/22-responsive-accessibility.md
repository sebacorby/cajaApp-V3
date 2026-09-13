# Responsive y Accesibilidad

Status: **NOT RUN**

Razón: El arranque headless falló (`cajaapp-headless-up.ps1 -Rebuild` retornó `ok:false`) debido a errores de build/typecheck en el frontend. Sin entorno levantado, no es posible ejecutar las validaciones de responsive y accesibilidad a través de Playwright.

Validaciones planificadas (no ejecutadas):
- Verificar layouts en viewports desktop y mobile.
- Verificar navegación responsive.
- Verificar contraste y accesibilidad básica (donde aplique).
