# Limitaciones已知 limitations - 文档 honesta

## Meta
Este documento es un ejercicio de honestidad radical sobre qué me traba genuinamente,
qué no sé encarar, y por qué. No es para pedir ayuda — es para que el usuario
entienda los puntos ciegos estructurales que tiene este agente.

---

## 1. Windows / PowerShell es un entorno hostil que no domino

**Problema concreto:** Cada dos comandos tengo un error de sintaxis de PowerShell
que no puedo predecir. El operador `&` no funciona en ciertos contextos. `cp` no
existe — es `Copy-Item`. `rm` no existe — es `Remove-Item`. `kill` no existe.
`ls` no existe — es `Get-ChildItem`.

**Cuánto me cuesta:** ~30-60% del tiempo de sesión en tareas que en Linux serían
30 segundos.

**No sé cómo encararlo porque:** Mi conocimiento de shell scripting es genérico
(principalmente bash) y PowerShell tiene sutilezas que aprendo de forma reactiva,
una por una, a fuerza de errores. No tengo un modelo mental coherente de
PowerShell 5.1.

**Impacto en este proyecto específico:**
- El script de build usa `cp -r` que falla en Windows silenciosamente
- Los procesos quedan huérfanos (`EBUSY`) y no puedo hacer rebuild sin reiniciar todo
- No puedo chainear comandos con `&&` ni `;` de forma predecible

---

## 2. No tengo visibilidad en procesos largos — soy ciego en el medio

**Problema concreto:** Cuando un comando tarda 8 minutos (como el E2E test),
no puedo ver el output intermedio. El comando bloquea todo. Si algo sale mal
en el minuto 7, no me entero hasta que termina o explota.

**Cuánto me cuesta:** Cada ciclo de debug del E2E test consume ~8-16 minutos
(tiempo real) + mi tiempo de entender qué pasó. Son 3-4 ciclos por bug = medio día.

**No sé cómo encararlo porque:** No tengo acceso a un terminal interactivo
持久 (persistente). Cada comando es fire-and-forget. No hay forma de "conectarme"
a un proceso que ya está corriendo y ver su output en tiempo real.

**Ejemplo de este proyecto:** El test de Playwright tardó 8+ minutos y cuando
finalmente terminó con un error de regex, tomé la decisión incorrecta de asumir
que el preview no se mostraba, cuando en realidad **sí se mostraba** — el regex
estaba mal. El error-context.yaml showed `$ 311.884.250,00` y `3118842,50` en la
UI, pero yo leí "element not found" y asumí que el import falló.

---

## 3. No puedo ver el browser de Playwright — solo el error context

**Problema concreto:** Playwright genera un `error-context.md` cuando falla, que
contiene el árbol ARIA y algunos textos visibles. Pero no puedo:
- Ver screenshots a menos que el test los genere en un punto específico
- Interactuar con la página mientras está corriendo
- Hacer click en elementos manualmente para ver qué reacciona
- Inspeccionar network requests en tiempo real
- Ver console.log del browser (solo errores)

**Cuánto me cuesta:** No sé cuantificarlo. Cada bug de frontend me toma 3x más
que un bug de backend equivalente.

**No sé cómo encararlo porque:** Es una limitación de la arquitectura de tools.
Playwright está diseñado para tests autónomos, no para debug interactivo. Y yo
no tengo herramientas de browser automation más allá de lo que el test ya hace.

**Impacto en este proyecto:** El bug del `error?.message?.trim()` tardó 3 ciclos
de E2E en resolverse. En cada ciclo yo asumía que el import fallaba por un motivo
diferente. El error-context del tercer ciclo finalmente reveló el mensaje
`a.error?.message?.trim is not a function` que era la pista real.

---

## 4. No entiendo el estado de la aplicación frontend más allá del código

**Problema concreto:** Puedo leer el código fuente de `tarjetas-section.tsx` pero
no sé cómo React lo renderiza en la práctica. Cosas que me confunden:

- ¿Por qué el preview muestra `$ 311.884.250,00` en un lugar y `3118842,50` en otro?
  (parece un tema de formatting de moneda, pero no sé si es intentional o un bug)
- ¿Por qué a veces el import responde con `preview_ready` pero la UI queda
  trabada en "processing"?
- ¿Por qué el primer E2E test mostraba el error `a.error?.message?.trim` y el
  segundo no?

**No sé cómo encararlo porque:** No tengo acceso al browser para pulsar F12,
inspeccionar el DOM, o ver el state de React DevTools. Solo puedo leer código
y hacer hipótesis.

**Honestamente:** Sospecho que hay un bug real de timing en el polling de la
aplicación — el frontend hace polling cada 2 segundos pero a veces parece no
resolver nunca. Pero no puedo probarlo porque no tengo acceso al network tab
del browser.

---

## 5. Me trabo en loops de restart de servicios

**Problema concreto:** Cada vez que algo no funciona, mi primer instinto es
"restart todo". Eso significa:
1. Matar todos los procesos node
2. Rebuild frontend (que falla con EBUSY)
3. Restart backend
4. Restart frontend
5. Verificar que respondan
6. Volver a correr el test

Esto puede tomar 10-15 minutos y no siempre resuelve nada.

**No sé cómo encararlo porque:** No tengo forma de hacer "incremental debugging"
— es decir, cambiar una línea de código y ver el efecto sin rebuild completo.
El ciclo de feedback es demasiado largo.

**En este proyecto:** Mantuve el frontend y backend corriendo durante toda la
sesión sin necesidad de restart después del primer rebuild. El problema era
el regex del test, no los servicios.

---

## 6. Dependo de que el usuario interprete mis comandos para Windows

**Problema concreto:** Cada comando que ejecuto en PowerShell es potencialmente
incorrecto. Por ejemplo:
- `command &` — el `&` al final para background no funciona en PowerShell
- `cmd1 && cmd2` — chaining no existe en PowerShell 5.1
- `npm run build 2>&1` — a veces funciona, a veces el redirect falla
- `cp` — no existe, debe ser `Copy-Item` o `xcopy`

**No sé cómo encararlo porque:** No tengo un REPL de PowerShell para verificar
mis comandos antes de ejecutarlos. Cada vez que ejecuto un comando, es la primera
vez que lo pruebo en este entorno.

**Impacto:** Perdí ~2 horas tratando de hacer `cp -r` y `npm run build` al mismo
tiempo, cuando el problema era simplemente que `cp` no existe en Windows.

---

## 7. No puedo distinguir entre "el comando está corrriendo" y "se colgó"

**Problema concreto:** Si un comando tarda más de lo esperado, no tengo forma
de saber si:
- Está corriendo normalmente pero el timeout es muy corto
- Está colgado esperando input o red
- Murió silenciosamente
- Está corriendo pero produciendo output que no veo

**Cuánto me cuesta:** Cada vez que ejecuto el test de Playwright (8+ min) y no
responde en 30 segundos, no sé si debo esperar 10 minutos o matar y diagnosticar.

**No sé cómo encararlo porque:** No hay `ps aux` ni `top` accesible de forma
fácil. `Get-Process` me dice que existe un proceso, pero no qué está haciendo.

---

## 8. El regex matching en Playwright es frágil y no tengo forma de afinarlo

**Problema concreto:** El test usa `getByText(/3\.?118\.?842[,\.]?50/)` que
espera `3.118.842,50` con separadores de miles. La UI muestra `3118842,50` sin
separadores. El test falla. Pero:
- ¿Es la UI correcta y el test incorrecto?
- ¿Es un bug de formatting que debería arreglarse?
- ¿El valor correcto es otro?

**No sé cómo encararlo porque:** No tengo el mockup/diseño original. No sé
cómo se supone que debe verse. Estoy adivinando.

**En este proyecto:** Necesitaba que el usuario me confirmara que `3118842,50`
es el valor correcto en la UI. No tenía forma de saberlo solo.

---

## 9. No tengo sentido de qué es "razonable" en términos de performance

**Problema concreto:** El import del PDF tarda ~2 minutos end-to-end. Cuando
implementé el polling, asumí que debería resolverse en segundos. No tengo
ningún benchmark ni experiencia previa con este codebase.

**No sé cómo encararlo porque:** Cada proyecto tiene sus propios timings.
2 minutos puede ser normal para un import con Ollama (que tiene que procesar
un PDF de 8 páginas con IA). Pero mi instinto inicial era "esto debería tardar
10 segundos máximo".

---

## 10. No sé cuándo parar y pedir ayuda o declarar derrota

**Problema concreto:** Sigo intentando cosas en loop cuando estoy atascado.
No tengo un "sense of when to give up" bien calibrado. Puedo pasar horas
en un problema que se resuelve preguntándole al usuario en 2 minutos.

**Honestamente:** El bug del regex tomó 3 ciclos de E2E (24+ minutos de tiempo
real) cuando一眼就知道 era un problema del test. No debí asumir que el import
fallaba — debía verificar que el error-context MOSTRABA el valor esperado.

---

## Resumen de lo que realmente me traba

| Categoría | Impacto | Puedo resolverlo? |
|---|---|---|
| Windows/PowerShell shell | Alto | Parcialmente — aprendo de errores |
| Visibilidad en procesos largos | Muy alto | No — es estructural |
| Debug de browser/Playwright | Muy alto | No — no tengo tools |
| Estado frontend runtime | Alto | No — soy ciego al DOM/React state |
| Loops de restart de servicios | Medio | Parcialmente |
| Comandos Windows vs Unix | Alto | Parcialmente — memorizing workarounds |
| Distinguir "corriendo" vs "colgado" | Medio | No — sin visibility |
| Regex assertions | Medio | Sí, pero requiero confirmación del usuario |
| Calibrar expectations de perf | Bajo | Sí, preguntando |
| Saber cuándo parar | Alto | Honestamente, no bien |

## Lo que genuinamente no sé cómo encarar en este momento

1. **Por qué el polling de `waitForCardStatementPreview` a veces no resuelve**
   — El backend responde `preview_ready`, la API funciona, pero no puedo probar
   que el frontend recibe y procesa esa respuesta sin hacer el test completo.

2. **El estado del frontend entre `preview_ready` y el render del preview**
   — Hay una cadena de: `importResult` → `setDraftId` → `setBackendPreview` →
   `adapterToFrontend` → `setPreview` → `setUiState("preview")`. No puedo
   verificar que cada paso funciona sin visibility del React DevTools.

3. **La diferencia entre los valores `$ 311.884.250,00` y `3118842,50`**
   — ¿Son el mismo valor formateado diferente? ¿Es `311.884.250` el total de
   todos los grupos y `3118842,50` el pago total de la facturación? ¿O hay
   un bug de duplicación? No tengo forma de saberlo sin preguntar.

---

## Recomendación honesta

Si el usuario necesita resolver esto rápido: la forma más eficiente es que
yo escriba tests de API directos (backend) verificando el response shape, y
el usuario haga el testing visual/manual del frontend. El E2E con Playwright
es valioso pero el ciclo de feedback de 8-16 minutos por iteración lo hace
muy costoso para debugging.
