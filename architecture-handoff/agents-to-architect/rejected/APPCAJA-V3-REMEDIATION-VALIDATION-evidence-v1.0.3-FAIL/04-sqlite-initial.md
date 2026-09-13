# Resguardo y restauración inicial de SQLite

Procedimiento ejecutado:
1. Se intent ejecutar `& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly`.
2. El script fall con el siguiente error controlado:
   ```json
   {"ok":false,"error":"El puerto 3000 est ocupado por un proceso externo a CajaApp (PID 33160, proceso 'wslrelay'). Use -BackendPort/-FrontendPort con puertos libres o libere el puerto fuera de este script.","stateFile":"C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\state.json"}
   ```
   Esto es esperado porque el puerto 3000 est ocupado por Docker/WSL y no se permite matar procesos externos. El script headless fue reparado para detectar y rechazar esta situacin.
3. Backup histrico limpio: `C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`
4. Se copi el backup histrico sobre `I:\cajaApp-V3\workspace\backend\prisma\dev.db`.
5. Se cre copia de campaa: `I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.3\PRE-v1.0.3-cajaapp.db`

Hashes SHA-256:

```
Backup histrico:  BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
dev.db actual:    BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
PRE-v1.0.3:       BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
Coincidencia:     YES
```

Resultado: PASS - SQLite restaurado al estado inicial autorizado. La detencin del script con puertos por defecto fall por procesos externos en el puerto 3000, pero eso no afecta la integridad de SQLite.
