# Data cleanup
## Intento de detencin con script headless
Comando: cajaapp-headless-up.ps1 -Stop -JsonOnly
Fecha: 2026-07-14T12:27:16.8191667-03:00
Resultado: {"ok":true,"stopped":[],"stateFile":"C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\state.json"}
ExitCode=0
## Restauracin de SQLite
PRE-v1.0.4 hash: BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
dev.db hash: BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552
match: YES
## Procesos y puertos finales
Procesos node: 
   Id Path                                   
   -- ----                                   
 4700 I:\Tools\node-v24.18.0-win-x64\node.exe
13372 I:\Tools\node-v24.18.0-win-x64\node.exe
15916 C:\Users\javie\nodejs\node.exe         
19124 C:\Users\javie\nodejs\node.exe         
34428 C:\Users\javie\nodejs\node.exe         
45616 C:\Users\javie\nodejs\node.exe         
45676 C:\Users\javie\nodejs\node.exe         
46880 I:\Tools\node-v24.18.0-win-x64\node.exe
47048 C:\Users\javie\nodejs\node.exe         
47516 C:\Users\javie\nodejs\node.exe         
50320 C:\Users\javie\nodejs\node.exe         
50432 C:\Users\javie\nodejs\node.exe         
53788 C:\Users\javie\nodejs\node.exe         
54328 C:\Users\javie\nodejs\node.exe         
57172 C:\Users\javie\nodejs\node.exe         
60656 C:\Users\javie\nodejs\node.exe         
62368 C:\Users\javie\nodejs\node.exe         
62908 C:\Users\javie\nodejs\node.exe         
62952 C:\Users\javie\nodejs\node.exe         



Puertos: 
LocalPort OwningProcess  State
--------- -------------  -----
     3000         33160 Listen
     3000         28204 Listen



Puerto 11436 ocupado: NO
Puerto 11437 ocupado: NO
Puerto 3000 ocupado por CajaApp: NO (ocupado por Docker/WSL, no por node.exe)
## Anlisis de procesos node.exe
Se encontraron procesos node.exe activos, pero ninguno pertenece a CajaApp:
PID 4700: IsCajaApp=NO Path=I:\Tools\node-v24.18.0-win-x64\node.exe Cmd="I:\Tools\node-v24.18.0-win-x64\node.exe" ./mcp/server.mjs
PID 13372: IsCajaApp=NO Path=I:\Tools\node-v24.18.0-win-x64\node.exe Cmd="I:\Tools\node-v24.18.0-win-x64\node.exe" ./mcp/server.mjs
PID 15916: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\38bc830389a22c8c\node_modules\.bin\\..\@azure-...
PID 19124: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\38bc830389a22c8c\node_modules\.bin\\..\@azure-...
PID 34428: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @upstas...
PID 45616: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\38bc830389a22c8c\node_modules\.bin\\..\@azure-...
PID 45676: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @azure-...
PID 46880: IsCajaApp=NO Path=I:\Tools\node-v24.18.0-win-x64\node.exe Cmd="I:\Tools\node-v24.18.0-win-x64\node.exe" ./mcp/server.mjs
PID 47048: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @upstas...
PID 47516: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @upstas...
PID 50320: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\eea2bd7412d4593b\node_modules\.bin\\..\@upstas...
PID 50432: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\eea2bd7412d4593b\node_modules\.bin\\..\@upstas...
PID 53788: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\38bc830389a22c8c\node_modules\.bin\\..\@azure-...
PID 54328: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @azure-...
PID 57172: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @azure-...
PID 60656: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\eea2bd7412d4593b\node_modules\.bin\\..\@upstas...
PID 62368: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @azure-...
PID 62908: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="node"   "C:\Users\javie\AppData\Local\npm-cache\_npx\eea2bd7412d4593b\node_modules\.bin\\..\@upstas...
PID 62952: IsCajaApp=NO Path=C:\Users\javie\nodejs\node.exe Cmd="C:\Users\javie\nodejs\node.exe"  "C:\Users\javie\nodejs\node_modules\npm\bin\npx-cli.js" -y @upstas...
Conclusin: no quedan procesos CajaApp activos.
