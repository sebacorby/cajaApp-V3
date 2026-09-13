# Preflight de integridad

## 7.1 Estado del root

Script autoritativo: `I:\cajaApp-V3\cajaapp-headless-up.ps1`

Verificaciones:
- Existe: S
- Comienza con `[CmdletBinding()]`: S
- No contiene script Bash disfrazado: S (PowerShell nativo)
- Acepta `-Status`: S
- Acepta `-Stop`: S
- Acepta `-Restart`: S
- Acepta `-Rebuild`: S
- Acepta `-SkipMigrate`: S
- Acepta `-JsonOnly`: S
- Resuelve explcitamente `node.exe`: S
- Resuelve explcitamente `npm.cmd`: S
- Resuelve explcitamente `cmd.exe`: S
- Resuelve explcitamente `taskkill.exe`: S
- Controla stdout y stderr sin llamar `.Trim()` sobre `$null`: S
- No contiene `taskkill /IM node.exe /F` ni equivalente global: S
- `-Stop -JsonOnly` ignora procesos externos en los puertos por defecto: S (devolvi `ok:true` con `stopped:[]` aunque el puerto 3000 est ocupado por Docker/WSL)
- El arranque sigue siendo estricto: si un puerto solicitado est ocupado por un proceso externo, falla y exige elegir otro puerto: S

Archivos auxiliares en root detectados:
- `cajaapp-headless-up.ps1`: autorizado
- `run-playwright.ps1`: autorizado (mecanismo oficial de Playwright para la campaa)
- `start-cajaapp.ps1`: existe; no se ejecutar segn instruccin de no levantar el entorno a mano
- `detect-env.sh`: no encontrado
- `cajaapp-headless-up.sh`: no encontrado
- `start-cajaapp-temp.ps1`: no encontrado
- `diag-node.ps1`: no encontrado
- `diag-env.ps1`: no encontrado
- `smoke.ps1`: no encontrado
- `playwright-run.ps1`: no encontrado
- `plan.md`: no encontrado

## 7.2 Inventario de duplicados y residuos

Se gener un listado recursivo bajo `I:\cajaApp-V3\workspace`. No se encontraron archivos con nombres que contengan `(1)`, ` copy`, `-copy`, ` copia`, `Copy of` ni bases `dev (1).db`.

Verificaciones cannicas especficas:
- `tests\movements\categories.rules.test.ts`: existe (S)
- `tests\movements\categories (1).rules.test.ts`: no existe (S)
- `tests\imports\ai-job-timeout.test.ts`: existe (S)
- `tests\imports\watchdog-timeout.test.ts`: no existe (S)
- Prueba cannica del Asesor IA en backend: una sola (`tests\ai-advisor\ai-advisor.service.test.ts`) (S)
- Prueba cannica de Salud Financiera en backend: una sola (`tests\financial-health\financial-health.service.test.ts`) (S)
- `tests\categories.spec.ts`: existe (S)
- `tests\categories (1).spec.ts`: no existe (S)
- `category-management-sheet (1).tsx`: no existe (S)
- `tests\ai-advisor.spec.ts`: existe (S)
- Prueba UAT de Salud Financiera en frontend: una sola (`tests\financial-health.spec.ts`) (S)
- `dashboard-trend-visual.spec.ts`: existe como `tests\dashboard-trend-visual.spec.ts` (S)

Resultado: PASS - no hay duplicados ni residuos prohibidos.

## 7.3 Integridad de archivos crticos

```
CF5BC6053902DD1D45FD0905022682D75CF539C76CBD9CE24B388DE4DB1765DF  I:\cajaApp-V3\cajaapp-headless-up.ps1
5411DBA21C46E756E9A3274FF9A81FC1A0D214B7BAE175AFC698070F50B55A64  I:\cajaApp-V3\workspace\backend\package.json
825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87  I:\cajaApp-V3\workspace\backend\package-lock.json
B2C4A28093F6E21FB170E02EFC9C7B86C9651400CD1546FB3836412009CD5147  I:\cajaApp-V3\workspace\backend\prisma\schema.prisma
A2B991674883A5279DE962B4F10CA9FEB7240EEC2720444FB4A1B1E024C54CD0  I:\cajaApp-V3\workspace\backend\src\app.ts
5F03FFED4C187EDFC01A38F8C9A10FE0B6AFE43BB40617A6F7C049A70A97AA4E  I:\cajaApp-V3\workspace\backend\src\config\env.ts
29F6CEED560178B3CB21CBE1696EF367F7031ED02A1BDC6C09F202191EE970B3  I:\cajaApp-V3\workspace\backend\src\modules\financial-health\financial-health.service.ts
B4E309AA82D9B0FB43C9146BE59E96E97C0E5E43F90E8F2966A831B561C661B8  I:\cajaApp-V3\workspace\backend\src\modules\ai-advisor\ai-advisor.service.ts
F4B630432E1576ECBF09D80FEC47F1A24361692E328AA2BA5B7945D13AC71B1C  I:\cajaApp-V3\contracts\prompts\advisor\01-explain-financial-context.md
114D3BB316934EEB2B1E76D64DD414A3DDB3339D8F1A0C906B226DBB7A76C763  I:\cajaApp-V3\contracts\schemas\advisor\ai-advisor-response.schema.json
7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B  I:\cajaApp-V3\workspace\frontend\package.json
DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED  I:\cajaApp-V3\workspace\frontend\package-lock.json
89DE7963FC9128A8F20D1DA6D5802FEABA5DD67AA4A8124C7559F6FABEF812C1  I:\cajaApp-V3\workspace\frontend\src\lib\finance\ui-store.ts
3375B92C7D9EF2E55CAD563577B0D35EF87FAD812134A96423D8E0D63AE76F29  I:\cajaApp-V3\workspace\frontend\src\lib\finance\nav.ts
584360792FE7259785BD58711B3A6E336598B582A4B111C9954FFA4281E864E0  I:\cajaApp-V3\workspace\frontend\src\components\finance\sections\asesor-ia-section.tsx
```

Observacin: `schema.prisma` cambi de hash respecto a versiones anteriores porque se remedi el BOM. El hash actual es `B2C4A28093F6E21FB170E02EFC9C7B86C9651400CD1546FB3836412009CD5147` y comienza con los bytes ASCII de `generator` (`67 65 6E 65 72`). No se detect BOM.

Resultado preflight: PASS.
