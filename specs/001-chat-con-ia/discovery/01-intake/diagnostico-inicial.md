# Diagnóstico de Intake — Chat con IA (CajaApp V3)

## Diagnóstico de ciclo de vida

| Señal del input | Implicación |
|---|---|
| "quiero definir una nueva feature para implementar chat con ia" + Q2 "chat nuevo separado al estilo chatbot" | Capacidad 0→1: no existe, hay que descubrir su forma y valor antes de optimizar nada |
| "sin restricciones de conversación" / "sin retriscciones [capacidades]" | Alcance abierto por declaración, no por evidencia; exige delimitación de riesgos (lectura vs. escritura sobre dinero) |
| "Solo yo (uso diario)" | Usuario existente y accesible (dueño); habilita investigación primaria directa, sin reclutamiento |
| "Dueño solo" (rol + equipo/tiempo) | Capacidad de construcción limitada a una persona; el MVP debe ser recortable y sostenible |
| "Directo a construir" (salta validación barata) | Decisión consciente que acelera pero eleva riesgo; el diagnóstico debe dejar falsabilidad y riesgos por escrito |
| Producto base maduro: 16 secciones, shadcn, asesor-IA explain-only con citas + `FEAT-017-ai-advisor`, Ollama nativo/OpenAI-compatible | El chat nuevo convive con un asesor que explícitamente no muta ni decide; diferenciarlos es obligatorio para no duplicar ni romper ese contrato |
| Grounding + `docs/technical.md` presentes, monorepo único | Base técnica sólida para especificar; sin deuda de contexto |

## Declaración de confianza
Clasificación 0→1 con confianza M: el producto CajaApp V3 es maduro, pero la capacidad "chat" es nueva sin usuarios ni métricas propias, por lo que el método correcto es el de 0→1 (validación de hipótesis, formativo). No es H porque la doble lectura (producto maduro vs. feature nueva) admite discusión; subiría a H confirmando el top-3 de casos de uso diarios del dueño. Disponibilidad "existentes" con confianza H: hay un usuario real diario y alcanzable.

## Ruta recomendada
Estrategia (@IADEV-discovery-strategist), camino 0→1 recortado para constructor único: (1) Assumption Mapping sobre "sin restricciones" separando deseabilidad/viabilidad/factibilidad; (2) JTBD de uso diario del dueño (qué pregunta/acción hoy duele navegar); (3) delimitación explícita lectura-primero vs. escritura con confirmación, reutilizando el contrato del asesor-IA (explain-only, con citas, sin cómputo autoritativo); (4) norte falsable y criterio de corte del MVP. Justificación: sin esto, "directo a construir + sin restricciones" deriva en un chatbot genérico sin ventaja sobre el asesor existente y con riesgo sobre datos financieros, inabarcable para una sola persona.

## Lo que NO haría aquí y por qué
- **Chat con acciones de escritura irrestrictas en v1 (crear/editar/aceptar/borrar movimientos, borradores, cierres, presupuestos sin confirmación ni rails):** es lo Wrong específico para este contexto porque opera sobre dinero con efectos irreversibles, rompe el contrato explain-only del asesor-IA existente, y multiplica superficie de alucinación + tests para un solo dev. Lo correcto es lectura-primero y, si hay escritura, acotada + confirmada + reversible.
- **Tratarlo como problema de Growth (A/B, optimización de conversión/retención):** no hay base de usuarios ni KPIs del chat; optimizar sin hipótesis validada es medir ruido.
- **Duplicar el asesor-IA con otro nombre:** sin diferenciación explícita se canibaliza lo existente y se duplica costo de LLM (latencia 420s/timeouts, Ollama local) sin valor nuevo.

## ¿Es esto siquiera un problema de build?
- **Alternativa(s) no-build:** (1) Extender lo existente sin construir chat: mejorar búsqueda global + asesor-IA explain-only con consultas guardadas/atajos ("¿cuánto gasté en X este mes?") y citas; podría alcanzar si el dolor real es consultar, no conversar. (2) Proceso/contenido: plantilla de revisión diaria con dashboard + alertas deterministas ya existentes; podría alcanzar si el dolor es hábito, no interfaz. Ninguna alcanza si el dolor real es operar con lenguaje natural ("corrige, clasifica, acepta por mí"), pero eso no está evidenciado todavía.
- **¿Vale la pena perseguirlo como está planteado?:** No como está ("sin restricciones" + directo a build), sí como problema (acceso/acción en lenguaje natural sobre finanzas propias con usuario diario real). La formulación actual es un encuadre de solución abierta, no un problema recortado y construible por uno solo.
- **Falsabilidad de la hipótesis reformulada:** la hipótesis es falsa si, durante 2 semanas de uso diario instrumentado, el dueño sigue resolviendo todo navegando secciones y usa el chat <2 veces/semana, o si el 80% de sus preguntas las responde ya el asesor-IA/búsqueda existentes sin fricción.

## Contraste crítico
- **Supuesto más frágil:** que "sin restricciones" (conversar de todo + actuar sobre cualquier registro) sea deseable y seguro para finanzas personales de uso diario, con un solo dev sosteniéndolo. Si es falso, se cae todo el planteo abierto.
- **Caso en contra:** un chatbot irrestricto sobre dinero combina el peor riesgo (alucinación + mutación irreversible) con el peor costo (superficie enorme, tests, latencia Ollama, soporte) para exactamente un usuario que ya tiene asesor explain-only, búsqueda global, dashboard y alertas. Construirlo así es pagar precio de plataforma por valor de atajo.
- **Alternativa propuesta:** chat de lectura-primero separado del asesor solo por UX conversacional + memoria de contexto, con un set cerrado de intenciones diarias (consultar/explicar/comparar con citas a registros reales) y escritura acotada en fase 2 (solo clasificar/proponer borradores, siempre con confirmación y reversibilidad).
- **Mi recomendación (y por qué):** mi recomendación es **avanzar a estrategia con alcance recortado lectura-primero porque** el problema (fricción diaria de acceso a datos propios) es real y hay usuario diario, pero el encuadre "sin restricciones" es in-construible e inseguro para un solo dev; recortar preserva la decisión "chat nuevo separado" y "directo a construir" sin heredar su riesgo.
- **¿Amerita retroceder?:** no (no hay fase anterior a intake a la que volver).
