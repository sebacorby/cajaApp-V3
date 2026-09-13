# Resguardo y restauración inicial de SQLite

Procedimiento ejecutado:
1. Se ejecut `& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly`.
   Resultado: `{"ok":true,"stopped":[],"stateFile":"C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\state.json"}` (EXIT=0).
   El script ignora correctamente los procesos externos en el puerto 3000.
2. Al verificar `prisma\dev.db`, se encontr que no exista. Se encontr `dev.db.clean-backup` (no tocado, segn instrucciones). Se restaur el backup histrico limpio sobre `I:\cajaApp-V3\workspace\backend\prisma\dev.db`.
3. Backup histrico limpio: `C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`
4. Se cre copia de campaa: `I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.4\PRE-v1.0.4-cajaapp.db`

Hashes SHA-256:

```
Backup histrico:  BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
dev.db actual:    BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
PRE-v1.0.4:       BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
Coincidencia:     YES
```

Resultado: PASS - SQLite restaurado al estado inicial autorizado.
