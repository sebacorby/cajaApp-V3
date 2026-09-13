# 20-playwright-traces

Las traces de Playwright (`trace.zip` por test fallido) se guardan en el
workspace del proyecto, no en la carpeta de evidencia, para evitar
duplicacion de binarios grandes.

## Ubicacion nativa

```
I:\cajaApp-V3\workspace\frontend\test-results\
```

Cada test fallido tiene su propio subdirectorio con:
- `test-failed-1.png` (screenshot del momento del fallo)
- `error-context.md` (snapshot del DOM)
- `trace.zip` (trace completa, accionable con `npx playwright show-trace`)
- `video.webm` (video de la corrida)

## Tests con trace disponible

- `deuda-futura-future-Deuda--9b781-o-y-permite-abrir-su-origen-chromium`
- `deuda-futura-movements-exp-6f143-xactamente-el-filtro-activo-chromium`
- `deuda-futura-reports-Repor-1cb03-e-el-detalle-en-Movimientos-chromium`
- `card-statement-import-card-06646-nd-renders-the-real-preview-chromium`
- `card-statement-failed-stop-7d57b-retry-when-extraction-fails-chromium`

## Para inspeccionar

```powershell
cd I:\cajaApp-V3\workspace\frontend
npx playwright show-trace "test-results\<directorio>\trace.zip"
```
