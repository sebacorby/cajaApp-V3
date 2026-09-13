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
- Resuelve explcitamente `node.exe`: S (lneas 44, 136, 179)
- Resuelve explcitamente `npm.cmd`: S (lneas 45, 171)
- Resuelve explcitamente `cmd.exe`: S (lneas 40, 210)
- Resuelve explcitamente `taskkill.exe`: S (lneas 41, 274, 283)
- Controla stdout/stderr: parcialmente; presenta `.Trim()` sobre `$result.StdOut` cuando el valor puede ser `$null` (aunque el casting previo a `[string]` reduce el riesgo)

Archivos auxiliares en root detectados:
- `cajaapp-headless-up.ps1`: autorizado
- `run-playwright.ps1`: autorizado (mecanismo oficial de Playwright para la campaa)
- `start-cajaapp.ps1`: existe; no est en la lista explcita de prohibidos pero no se ejecutar segn instruccin de no levantar el entorno a mano
- `detect-env.sh`: no encontrado
- `cajaapp-headless-up.sh`: no encontrado
- `start-cajaapp-temp.ps1`: no encontrado
- `diag-node.ps1`: no encontrado
- `diag-env.ps1`: no encontrado
- `smoke.ps1`: no encontrado
- `playwright-run.ps1`: no encontrado
- `plan.md`: no encontrado

## 7.2 Inventario de duplicados y residuos

Se encontraron mltiples archivos duplicados o con sufijos de copia en `I:\cajaApp-V3\workspace`. Esto constituye un hallazgo estructural de `FAIL` segn la campaa, pero la campaa continuar con los gates seguros.

Duplicados en fuente backend:
- `I:\cajaApp-V3\workspace\backend\src\modules\ai\TEMP-ai-extraction (1).service.ts`
- `I:\cajaApp-V3\workspace\backend\src\modules\global-search\global-search (1).controller.ts`
- `I:\cajaApp-V3\workspace\backend\src\modules\global-search\global-search (1).routes.ts`
- `I:\cajaApp-V3\workspace\backend\src\modules\global-search\global-search (1).schemas.ts`
- `I:\cajaApp-V3\workspace\backend\src\modules\global-search\global-search (1).service.ts`
- `I:\cajaApp-V3\workspace\backend\src\modules\movements\categories (1).service.ts`

Duplicados en tests backend:
- `I:\cajaApp-V3\workspace\backend\tests\movements\categories (1).rules.test.ts`  <-- DUPLICADO EJECUTABLE PROHIBIDO
- `I:\cajaApp-V3\workspace\backend\tests\global-search\global-search (1).service.test.ts`

Duplicados en Prisma:
- `I:\cajaApp-V3\workspace\backend\prisma\dev (1).db`
- `I:\cajaApp-V3\workspace\backend\prisma\migrations\20260711234500_add_category_rules\migration (1).sql`

Duplicados en fuente frontend:
- `I:\cajaApp-V3\workspace\frontend\src\components\finance\search\global-search-dialog (1).tsx`
- `I:\cajaApp-V3\workspace\frontend\src\components\finance\search\search-target-banner (1).tsx`
- `I:\cajaApp-V3\workspace\frontend\src\lib\finance\global-search-api (1).ts`

Duplicados en tests frontend:
- `I:\cajaApp-V3\workspace\frontend\tests\categories (1).spec.ts`  <-- DUPLICADO EJECUTABLE PROHIBIDO

Residuos de build con `(1)` en `.next` y `dist` (demasiados para listar individualmente; ver `03-file-inventory.txt` para el listado completo). Son artefactos de build pero constituyen residuos de campaas previas.

Verificaciones cannicas especficas:
- `tests\movements\categories.rules.test.ts`: existe (S)
- `tests\movements\categories (1).rules.test.ts`: existe (FAIL)
- `tests\imports\ai-job-timeout.test.ts`: existe (S)
- `tests\imports\watchdog-timeout.test.ts`: no existe (S)
- Prueba cannica del Asesor IA en backend: una sola (`tests\ai-advisor\ai-advisor.service.test.ts`) (S)
- Prueba cannica de Salud Financiera en backend: una sola (`tests\financial-health\financial-health.service.test.ts`) (S)
- `tests\categories.spec.ts`: existe (S)
- `tests\categories (1).spec.ts`: existe (FAIL)
- `category-management-sheet (1).tsx`: no existe (S)
- `tests\ai-advisor.spec.ts`: existe (S)
- Prueba UAT de Salud Financiera en frontend: una sola (`tests\financial-health.spec.ts`) (S)
- `dashboard-trend-visual.spec.ts`: existe como `tests\dashboard-trend-visual.spec.ts` (S)

Hallazgo: FAIL por archivos duplicados ejecutables/ambiguos en backend y frontend. La campaa contina segn regla de continuidad.

## 7.3 Integridad de archivos crticos

```
B04A60C6CC1F0A9DDFA6C010FB7367C25DE5B65CB72A7891251666DABC80671D  I:\cajaApp-V3\cajaapp-headless-up.ps1
5411DBA21C46E756E9A3274FF9A81FC1A0D214B7BAE175AFC698070F50B55A64  I:\cajaApp-V3\workspace\backend\package.json
825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87  I:\cajaApp-V3\workspace\backend\package-lock.json
EB33615BEB297AB9F7425C6B039249513D7D06533DEE9DE0E3EAD840FF6C45FB  I:\cajaApp-V3\workspace\backend\prisma\schema.prisma
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

## Observacin sobre script headless

El comando `& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly` fall con el siguiente error:

```
{"ok":false,"error":"No se puede enlazar el argumento con el parmetro 'StoppedPids' porque es una coleccin vaca.","stateFile":"C:\\Users\\javie\\AppData\\Local\\Temp\\cajaapp-headless\\state.json"}
```

Esto indica un defecto en el script: `Stop-ExistingRun` crea una coleccin `List[int]` vaca y la pasa al parmetro `[System.Collections.Generic.List[int]]$StoppedPids` de `Stop-ProcessesOnPort`, lo cual provoca un error de binding en esta versin de PowerShell. Este defecto afecta tanto `-Stop` como el arranque normal (que tambin invoca `Stop-ExistingRun`). Se registrar como FAIL en el gate de arranque headless.

Adems, el puerto 3000 (frontend por defecto) est ocupado por procesos ajenos a CajaApp (`com.docker.backend`, PID 28204; `wslrelay`, PID 33160), lo cual impedir que el frontend arranque en el puerto por defecto incluso si el script se corrigiera.

Resultado preflight: FAIL (duplicados + defecto estructural en script headless + puerto 3000 ocupado externamente).
