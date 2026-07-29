# Data cleanup
## Intento de detencin con script headless
Comando: cajaapp-headless-up.ps1 -Stop -JsonOnly
Fecha: 2026-07-14T09:52:22.9331047-03:00
Resultado: {"ok":false,"error":"El puerto 3000 est ocupado por un proceso externo a CajaApp (PID 33160, proceso 'wslrelay'). Use -BackendPort/-FrontendPort con puertos libres o libere el puerto fuera de este script.","stateFile":"C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\state.json"}
ExitCode=1
## Restauracin de SQLite
PRE-v1.0.3 hash: BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
dev.db hash: BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
match: YES
## Procesos y puertos finales
Procesos node: 
Puertos: 
LocalPort OwningProcess  State
--------- -------------  -----
     3000         33160 Listen
     3000         28204 Listen



Puerto 11436 ocupado: NO
Puerto 11437 ocupado: NO
Puerto 3000 ocupado por CajaApp: NO (ocupado por Docker/WSL, no por node.exe)
