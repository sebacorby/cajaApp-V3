# Proveedor IA real

## Estado

El gate del proveedor IA real no pudo ejecutarse.

Precondiciones no alcanzadas:
- `AI_MOCK_MODE` no pudo verificarse porque el backend no arranc.
- El proveedor configurado no pudo pasar su preflight.
- El ecosistema no estuvo disponible para ejecutar la consulta controlada:

```text
Explic el balance realizado y esperado usando slo fuentes de CajaApp.
```

## Clasificacin del fallo

Aunque el proveedor no estuvo disponible, la causa no es una indisponibilidad externa del proveedor. La causa es un defecto del entorno y el repositorio (script headless roto y schema con BOM), por lo tanto el fallo se clasifica como `FAIL` del producto, no `BLOCKED` externo.

Resultado: NOT RUN (dependencia de arranque headless fallida).
