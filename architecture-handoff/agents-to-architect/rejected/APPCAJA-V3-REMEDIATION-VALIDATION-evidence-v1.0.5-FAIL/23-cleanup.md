# Cleanup Final

Acciones realizadas:
- Se ejecutó `cajaapp-headless-up.ps1 -Stop -JsonOnly`.
- Resultado: `{"ok":true,"stopped":[],"stateFile":"..."}`.
- Puertos 11436 y 11437: libres.
- Procesos Node de CajaApp: ninguno.
- Procesos Docker/WSL: activos (no se finalizaron, conforme a lo autorizado).
- Se restauró `dev.db` desde el backup PRE-v1.0.5.
- Hash inicial y final de SQLite coinciden: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`.
- Se eliminaron artefactos de build temporales: `backend\dist`.

Diferencias autorizadas verificadas:
- Eliminación de BOM en archivos técnicos del alcance autorizado.
- Renombrado de `categories (2).service.ts` a `categories.service.ts` (mismo contenido).
- Copia de archivos canónicos desde carpeta de recuperación.
- Eliminación de `backend\dist`.
