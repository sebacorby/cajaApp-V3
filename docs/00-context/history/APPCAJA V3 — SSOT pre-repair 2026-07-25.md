# APPCAJA V3 — SSOT DE EJECUCIÓN VIGENTE

Estado: **VIGENTE — IMPLEMENTACIÓN PAUSADA / VALIDACIÓN FUNCIONAL RECHAZADA**  
Última actualización: **24 de julio de 2026**  
Autoridad: **usuario como aceptación funcional final; arquitecto/asistente como responsable de mantener este SSOT**

## 1. Repositorio y fuente canónica

La única fuente canónica y operativa de CajaApp V3 es Dropbox:

`/Javier Corbella/cajaApp-V3`

Reglas obligatorias:

- No usar Google Drive para buscar, leer, escribir, validar, sincronizar ni documentar CajaApp V3 hasta que el usuario lo autorice explícitamente.
- Todo diseño, código, documentación, evidencia y entrega vigente debe existir dentro del root canónico de Dropbox.
- Las copias locales pueden utilizarse para ejecución, pero no reemplazan a Dropbox como fuente de verdad.
- Ante una diferencia entre una copia local y Dropbox, prevalece Dropbox.

## 2. Decisión operativa vigente

A partir del 24 de julio de 2026, la implementación de CajaApp V3 queda **PAUSADA**.

La pausa fue indicada explícitamente por el usuario después de probar en uso real el bloque de Deuda futura y determinar que **funciona mal**.

Hasta que el usuario defina y apruebe una nueva forma de trabajo, queda prohibido:

- modificar código de backend o frontend;
- corregir automáticamente la lógica de Deuda futura;
- tocar la importación o aceptación de resúmenes;
- modificar prompts, schemas, mappers o extracción del PDF;
- crear migraciones o alterar la base de datos;
- iniciar otro vertical o etapa;
- preparar instrucciones para agentes;
- ejecutar remediaciones funcionales;
- interpretar un build exitoso como aceptación del comportamiento.

La única actividad autorizada en esta transición fue actualizar este SSOT.

## 3. Forma de trabajo

La forma de trabajo anterior queda **suspendida para nuevas implementaciones**.

No debe sustituirse por otra metodología inferida o improvisada. La nueva forma de trabajo se definirá en una conversación posterior con el usuario y deberá incorporarse expresamente a este SSOT antes de retomar cambios de código.

Mientras dure la pausa:

- el arquitecto/asistente no modifica código;
- los agentes no reciben nuevas tareas;
- no se generan entregas de implementación;
- no se avanza por iniciativa propia;
- sólo se permiten lecturas, análisis o documentación cuando el usuario los solicite expresamente.

La aprobación funcional del usuario tiene prioridad sobre typecheck, build, pruebas automatizadas, smoke técnico o cualquier conclusión derivada únicamente del código.

## 4. Intención central del producto

CajaApp V3 debe ser un **motor financiero continuo**, no un visor dependiente de cargas mensuales de documentos.

Flujo conceptual esperado:

1. El usuario realiza una carga inicial o esporádica de resúmenes para establecer y validar la deuda futura.
2. Luego registra ingresos y compromisos externos a tarjetas.
3. Cada compra, ingreso o compromiso nuevo actualiza automáticamente el futuro.
4. Las compras en cuotas se proyectan por secuencia mensual de períodos, nunca sumando treinta días.
5. Los compromisos externos se prorratean según su frecuencia o plan.
6. Un resumen posterior se usa para conciliación y ajuste, no como requisito para mantener vivo el cálculo.

Principio rector:

> El resumen es una fotografía real y una fuente de conciliación ocasional. La aplicación debe mantener el futuro con planes, recurrencias y ocurrencias persistidas.

Esta intención de producto continúa vigente aunque la implementación actual no haya sido aceptada.

## 5. Bloque `APP-CARDS-FUTURE-REDESIGN-001`

Nombre: **Rediseño de Tarjetas y Deuda futura**  
Estado: **PAUSADO — ITERACIÓN DE DEUDA FUTURA NO ACEPTADA**

No existe actualmente un bloque de implementación activo.

El alcance autorizado para la última iteración fue exclusivamente la lógica de Deuda futura. El usuario indicó expresamente:

- no tocar la importación del resumen, porque ese flujo estaba considerado correcto;
- terminar el bloque de Deuda futura;
- permitir una prueba real del usuario;
- refinar sólo después de esa prueba;
- no continuar con el resto del rediseño antes de la aceptación.

La prueba de uso real posterior dio como resultado: **FAIL funcional comunicado por el usuario**.

Por lo tanto:

- la iteración no está aceptada;
- el bloque no puede declararse cerrado;
- no se debe continuar con refinamientos hasta acordar la nueva forma de trabajo;
- no se debe extender el alcance a importación, frontend, persistencia o conciliación;
- no se debe asumir que las reglas implementadas representan correctamente la necesidad real.

## 6. Implementación existente no aceptada

Durante la última iteración se modificaron estos archivos:

### Servicio

`workspace/backend/src/modules/future/future.service.ts`

- File ID de Dropbox al momento de la entrega: `id:uG5_FLp3gS8AAAAAAAN7Vg`
- Revisión registrada: `657520a4681840a698f3c`
- Resultado técnico observado: el backend compiló.
- Resultado funcional: **NO ACEPTADO por el usuario**.

### Pruebas

`workspace/backend/tests/future/future.service.test.ts`

- File ID de Dropbox al momento de la entrega: `id:uG5_FLp3gS8AAAAAAAN7WA`
- Revisión registrada: `657520b1feeb40a698f3c`
- Estado: pruebas escritas, pero insuficientes para demostrar el comportamiento correcto en uso real.

Estas revisiones documentan el intento implementado, pero **no constituyen una solución aprobada ni una referencia funcional confiable**.

No deben reutilizarse como diseño definitivo sin una revisión nueva del problema junto al usuario.

## 7. Importación de resúmenes

La importación del resumen quedó explícitamente fuera de alcance de la última iteración.

No se modificaron ni deben modificarse por efecto de este bloque:

- extracción del PDF;
- proveedor o prompt de IA;
- JSON normalizado;
- mapper de filas;
- aceptación del resumen;
- orden y agrupación proveniente del documento;
- `cards.service.ts`;
- `installment-projection.service.ts`;
- contratos de importación.

El hecho de que el usuario haya indicado que el import estaba bien significa únicamente que **no debía tocarse en esta iteración**. No habilita cambios indirectos ni reinterpretaciones del flujo.

## 8. Reglas conceptuales que siguen vigentes

Las siguientes reglas continúan siendo intención funcional y deberán revisarse con el usuario antes de una nueva implementación:

### Períodos mensuales

- La deuda se expresa por períodos `YYYY-MM`.
- No se gobiernan cuotas sumando treinta días.
- La fecha de compra no reemplaza por sí sola al período de facturación.
- La fecha más reciente del PDF no debe inventarse como período autoritativo del resumen.

### Cuotas presentes en un resumen

Cuando una fila del resumen representa una cuota actual, el importe mostrado corresponde a esa cuota individual y no debe dividirse nuevamente.

Ejemplo conceptual todavía pendiente de validación completa dentro de la app:

- resumen `2026-07`, cuota `3/6`;
- futuras esperadas: agosto `4/6`, septiembre `5/6`, octubre `6/6`.

Una cuota final como `6/6` o una compra `1/1` no debería generar cuotas posteriores.

### Clasificación financiera

Deben distinguirse:

- hechos reales;
- compromisos confirmados;
- proyecciones estimadas.

Las cuotas restantes de una obligación ya asumida pertenecen conceptualmente a compromisos confirmados.

Estas reglas no validan la implementación rechazada; sólo preservan el objetivo de negocio que deberá ser refinado antes de volver a programar.

## 9. Estado técnico observado

En la ejecución posterior a los cambios:

- el build del backend alcanzó estado exitoso;
- no se registró error de TypeScript asociado a `future.service.ts`;
- el arranque completo tuvo además problemas operativos de conexión con Ollama y de bloqueo del launcher;
- ninguno de esos datos demuestra que Deuda futura funcione correctamente.

Regla obligatoria:

> Un build exitoso sólo demuestra compilación. No demuestra corrección financiera ni aceptación funcional.

La observación del usuario —“funciona mal”— es el resultado autoritativo de esta iteración.

## 10. Estado de las etapas anteriores

La planificación anterior contemplaba:

- Etapa A: calendario mensual común;
- Etapa B: persistencia autoritativa;
- Etapa C: lectura de Deuda futura;
- Etapa D: conciliación.

A partir de esta actualización:

| Etapa | Estado |
|---|---|
| Etapa A | Implementación parcial existente; no revalidada en esta iteración |
| Etapa B | No iniciada dentro del alcance autorizado |
| Etapa C | Intento implementado; validación funcional FAIL |
| Etapa D | No iniciada |

No debe avanzarse de etapa ni corregirse Etapa C hasta definir la nueva forma de trabajo.

## 11. Criterio para reanudar

CajaApp V3 sólo puede retomar implementación cuando el usuario defina expresamente:

1. la nueva forma de trabajo;
2. el alcance del siguiente bloque;
3. qué comportamiento real se considera correcto;
4. cómo se realizará la validación antes de escribir o reemplazar código;
5. qué partes del estado actual deben conservarse, descartarse o revertirse.

Una vez definidos esos puntos, este SSOT deberá actualizarse **antes** de ejecutar nuevas modificaciones.

## 12. Próxima acción autorizada

Estado actual: **ESPERAR DEFINICIÓN DEL USUARIO**.

No hay pendiente técnico autorizado para ejecución inmediata.

No corresponde:

- revisar más logs para remediar;
- corregir Deuda futura;
- cambiar el import;
- tocar el frontend;
- preparar otro bloque;
- asignar validaciones a agentes.

## 13. Historial y rollback

El SSOT previo a esta actualización permanece recuperable mediante el historial de versiones de Dropbox.

Revisión anterior del SSOT canónico:

`6575184a799380a698f3c`

También existe un antecedente histórico en:

`docs/00-context/history/APPCAJA V3 — SSOT pre-rediseño tarjetas-deuda futura 2026-07-23.md`

Los documentos históricos no tienen autoridad operativa frente a este archivo vigente.

---

## 14. Reporte de errores críticos — iteración de UI Deuda Futura (25 jul 2026)

**VIGENTE — agregado principal de esta iteración**

### Resumen ejecutivo

Durante la iteración de pulido de UI de la feature "Deuda Futura" (specs/006), se identificaron y corrigieron múltiples errores críticos en cascada, ninguno de los cuales había sido previsto al cierre del spec original. El más grave fue la **corrupción silenciosa del archivo `FutureDebtView.tsx`** (640 líneas reducidas a 6 líneas de basura), que requirió reconstrucción completa. Adicionalmente, la UI resultante mostraba texto desvanecido/ilegible en todas las filas pendientes ("missing_card_reference") por uso excesivo de `text-muted-foreground` en clases Tailwind, agravado por un componente `Checkbox` con borde casi invisible sobre fondo blanco.

### Errores detectados

#### E1 — Persistencia de `missing_card_reference` después del fix de spec 004
- **Síntoma:** Tras la corrección de `groupKey: r.groupId` → `r.id` (spec 004), todas las cuotas futuras continuaron mostrando diagnóstico `missing_card_reference`.
- **Causa raíz:** Las proyecciones (`CardInstallmentProjection`) se creaban con `rowId: p.rowId` (ID de preview, ej. "g-1") ANTES de insertar las `CardStatementRow` con UUIDs frescos. El lookup `normalizeProjection()` buscaba por `projection.rowId` que nunca coincidía con el UUID persistido.
- **Fix aplicado (spec 005):** Construir un mapa composite-key `(displayOrder:sectionKey:groupKey) → row UUID` después de insertar las rows, y actualizar `projection.rowId` antes de commit.
- **Spec:** `specs/005-fix-future-debt-missing-card-delete`

#### E2 — Corrupción silenciosa de `FutureDebtView.tsx`
- **Síntoma:** El archivo principal del componente Deuda Futura quedó reducido a 6 líneas de código inválido (residuos de template strings mal escapadas: `["use client"; ... ${horizonOption}`).
- **Causa probable:** Una operación de edición previa (durante la sesión de developer de spec 006) dejó el archivo en estado inconsistente; no había backup ni git para recuperar.
- **Recuperación:** Reconstrucción completa de 632 líneas usando como referencia `workspace/frontend/tests/future-debt.spec.ts` (509 líneas con interfaces TypeScript, builders de fixtures y test IDs), `future-debt-api.ts`, y los design docs.
- **Impacto:** El componente completo tuvo que ser reconstruido desde cero, lo que demuestra la necesidad de commits frecuentes en git (repositorio sin historial).

#### E3 — UI con texto desvanecido en todas las filas
- **Síntoma:** En el screenshot del usuario, todas las filas pendientes mostraban "Cuota Agosto-2026", montos ("$ 3.356,37") y badges "missing_card_reference" con opacidad muy reducida, ilegibles.
- **Causa raíz:** Uso excesivo de `text-muted-foreground` (resuelve a `oklch(0.52 0.02 160)` — gris claro de bajo contraste) en 15+ ubicaciones del componente. Adicionalmente, los badges usaban `bg-amber-50 text-amber-700` (amarillo casi imperceptible) y los `Checkbox` del sistema compartían un estilo con borde `oklch(0.93 0.01 155)` (casi blanco sobre blanco).
- **Fix aplicado (Rebound 2 de spec 006):** 14 reemplazos de clases CSS — `text-muted-foreground` → `text-foreground` (12 ocurrencias), `text-amber-800` → `text-amber-900` (badge de diagnóstico), `text-muted-foreground` → `text-amber-900` (detalle de diagnóstico), y `bg-background border-2` explícito en todos los checkboxes para garantizar visibilidad sobre fondos claros.
- **Validación:** `npm run typecheck` exit 0.

#### E4 — `select-all` no incluía filas pendientes
- **Síntoma:** El checkbox "Seleccionar todo" del header solo seleccionaba las filas de cards confirmadas, ignorando las pendientes.
- **Causa raíz:** `allRowIds` se construía solo desde `data.months.flatMap(...)` sin incluir `data.pendientes.rows`.
- **Fix aplicado:** Incluir ambas fuentes en el `useMemo` de `allRowIds`. Adicionalmente se agregó un checkbox select-all propio en el header de la sección pendientes.

#### E5 — Backend zombie ocupando puerto 11436
- **Síntoma:** El backend no podía arrancar por `EADDRINUSE` en puerto 11436.
- **Causa raíz:** `start-app.py` lanzaba procesos `node.exe` como hijos del `python.exe` padre. Cuando el terminal se cerraba abruptamente, los hijos quedaban huérfanos (zombies en Windows, ya que Windows no hace reap automático como Unix). Los puertos quedaban ocupados indefinidamente.
- **Fix operacional:** Script `scripts/kill-ollama-port.bat` (parametrizable por puerto) para liberar puertos desde admin. Adicionalmente, helper Python `start_backend.py` con `subprocess.Popen(..., DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)` para lanzamientos limpios.

### Lecciones aprendidas

1. **Git es imprescindible.** La ausencia de historial en el repositorio causó la pérdida irrecuperable de un archivo de 640 líneas. Acción obligatoria: inicializar git en este repositorio y commitear cada spec cerrada.

2. **Tests E2E con datos mock no revelan problemas de rendering con datos reales.** Los 6/6 tests pasaban, pero el screenshot del usuario mostraba UI rota. Los tests deben ejercitar también el render con datos reales (no solo fixtures pequeñas).

3. **El `text-muted-foreground` por defecto del sistema de diseño es demasiado claro para datos financieros.** Cuando la información ES el producto (no decoración), debe usarse `text-foreground` para contenido principal y reservar el muted solo para captions secundarios.

4. **Validaciones parciales no alcanzan.** El tester de spec 006 reportó PASS porque las pruebas E2E pasaban con fixtures. Faltaba una validación visual final con datos reales antes de cerrar el spec.

5. **Procesos detached en Windows requieren cuidado especial.** `start /B` no redirige output correctamente; `subprocess.Popen` con flags de Windows es más confiable.

### Acciones pendientes

- [ ] Inicializar git en el repositorio y commitear todo el estado actual
- [ ] Agregar tests E2E con datos reales (no solo fixtures) para `FutureDebtView`
- [ ] Revisar todas las features cerradas y validar visualmente con datos reales
- [ ] Documentar el protocolo "kill zombie process" en `docs/07-runbooks/`

### Archivos modificados en esta iteración

- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx` — reconstrucción completa + 14 fixes CSS
- `workspace/frontend/tests/future-debt-row-deletion.spec.ts` — 10 tests (6 FEAT-029 + 4 Rebound 2)
- `scripts/kill-ollama-port.bat` — nuevo, para liberar puertos
- `start_backend.py` — nuevo, launcher detached del backend

### Specs involucradas

- `specs/004-fix-future-debt-card-reference` — fix parcial (no suficiente)
- `specs/005-fix-future-debt-missing-card-delete` — fix completo del bug E1
- `specs/006-future-debt-row-deletion` — feature de eliminación + correcciones de UI (Rebound 1, 2, Emergency Fix)

---

**Estado:** VIGENTE — este reporte documenta la iteración de UI del 25 de julio de 2026.
