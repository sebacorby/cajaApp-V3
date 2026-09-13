# Proveedor IA

Status: **NOT RUN**

Razón: El arranque headless falló (`cajaapp-headless-up.ps1 -Rebuild` retornó `ok:false`) debido a errores de build/typecheck en el frontend. Sin backend levantado, no es posible verificar el proveedor/modelo de IA, AI_MOCK_MODE, ni el prompt/schema del asesor.

Validaciones planificadas (no ejecutadas):
- Verificar proveedor/modelo sin imprimir credenciales.
- Verificar AI_MOCK_MODE.
- Verificar prompt advisor-prompt-v1.0.0.
- Verificar schema advisor-response-v1.0.0.
