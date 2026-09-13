# Bloque de Contexto del Proyecto
Última actualización: Etapa 0 — Intake

## Pedido aparente
El dueño pide ayuda para definir una nueva feature de "chat con IA" para CajaApp V3 y llevarla directo a construcción. En las respuestas decide: es un chat nuevo y separado (no una evolución del asesor-IA existente), al estilo chatbot, "sin restricciones de conversación" y con capacidades "sin restricciones".

## Pedido reformulado (hipótesis)
Hipótesis a validar: el dueño, usuario diario de su propia app de finanzas personales, quiere resolver en lenguaje natural lo que hoy resuelve navegando 16 secciones y pantallas deterministas (consultar, entender y eventualmente operar sus movimientos, resúmenes, presupuestos, objetivos y cierres). El problema a investigar es la fricción diaria de acceso/comprensión/acción sobre sus datos financieros; el chatbot es solo una hipótesis de solución.

## Interlocutor (perfil)
Dueño + desarrollador único de CajaApp V3. Usa la app a diario, tiene contexto total del producto y del código, y dispone de tiempo limitado (solo). Registro calibrado a perfil técnico con poco tiempo: preciso, concreto, sin jerga UX innecesaria, con decisiones y riesgos explícitos.

## Solución nombrada (a validar, no a asumir)
"chat nuevo separado al estilo chatbot sin restricciones de conversación" con capacidades "sin restricciones". Se trata como hipótesis de solución en cuarentena, no como requisito. Incluye, por interpretación directa de las respuestas, la pretensión de que el chat pueda tanto conversar de cualquier tema como actuar sobre los registros. No constriñe el diagnóstico.

## Ciclo de vida del producto
Fase: 0→1 (capacidad nueva dentro de un producto maduro)
Confianza: M
Disponibilidad de usuarios: existentes (confianza: H)
Señales: CajaApp V3 es un producto maduro (16 secciones, design system shadcn/new-york, backend Fastify + Prisma + SQLite, asesor-IA explain-only ya existente, grounding v2). El chat como capacidad no tiene usuarios previos ni métricas, lo que lo sitúa en 0→1. La confianza es M porque el alcance es feature-nuevo-en-producto-maduro (doble lectura posible). La disponibilidad es H porque hay un usuario real, alcanzable y de uso diario: el propio dueño ("Solo yo (uso diario)").

## Restricciones conocidas
### Negocio
- Modelo de ingresos: Desconocido: ¿CajaApp es solo uso personal o hay planes de monetizar/compartir? ¿Qué pregunta lo aclararía? No se preguntó por no ser direction-changing para un chat de uso propio en esta ronda.
- KPIs existentes o esperados: Desconocido: no hay KPIs definidos para el chat. Implícito: utilidad diaria para el dueño.
- Stakeholders y decisores: Conocido: el dueño decide solo.
- Plazos o hitos: Desconocido explícito; señal indirecta: "Directo a construir" implica urgencia y salto de validación barata por decisión propia.

### Técnicas
- Stack/plataforma: Conocido: web Next.js 16.1.1 + React 19 + Tailwind 4 + shadcn new-york/neutral, backend Fastify 5.2.1 + Prisma 6.5.0 + SQLite, Node 24.18.0 exacto, Windows x64. UI en español, código en inglés.
- Design system existente: Conocido: sí (48 primitivas shadcn + componentes finance + tokens oklch esmeralda en `globals.css`; `Amount` transversal con `hideAmounts`).
- Integraciones/dependencias: Conocido: Ollama nativo / OpenAI-compatible (`AI_PROVIDER`), modelo `kimi-k2.7-code:cloud`, Ollama en `localhost:11434`, timeouts proveedor 420s < job 480s < stale 600s, worker con poll 2s, uploads 10MB. Existe `ai-advisor` explain-only con citas + simulaciones aisladas (no calcula autoritativamente, no muta, no decide) y `FEAT-017-ai-advisor`. El chat nuevo es SEPARADO por decisión del usuario.
- Desconocido: ¿dónde vive el chat (nueva sección vs. flotante global)? ¿Alcance de herramientas (solo lectura vs. escritura)? ¿Límites de seguridad/confirmación? ¿Persistencia del historial?

### Contexto
- Investigación previa disponible: Grounding `specs/000-grounding/` + `docs/technical.md` presentes; sin investigación UX previa sobre el chat.
- Usuarios identificados o por encontrar: Identificado: el dueño (uso diario). No requiere reclutamiento.
- Equipo de diseño o trabajo solo: Solo (dueño-dev, tiempo limitado).
- Interlocutor: Establecido (dueño + dev único).

## Brechas críticas pendientes
- Alcance real de "sin restricciones": ¿el chat puede mutar/borrar/aceptar registros financieros o solo leer/explicar? Importa porque cambia el diseño de riesgos, permisos y tests (dinero + irreversibilidad). Se marca como hipótesis riesgosa, no se re-pregunta en esta ronda por decisión ya tomada.
- Diferencia frente a asesor-IA existente: ¿qué hace el chat nuevo que el asesor explain-only + búsqueda global no hacen? Importa para no duplicar ni canibalizar.
- Comportamiento esperado en uso diario: ¿qué 3–5 preguntas/acciones diarias motivan el pedido? Importa para delimitar el MVP construible por una sola persona. Queda como hipótesis para el strategist (JTBD + priorización).

## Próxima etapa recomendada
Estrategia (@IADEV-discovery-strategist): encuadrar el 0→1 con Assumption Mapping + delimitación lectura/escritura + JTBD de uso diario, y fijar un norte falsable antes de especificar. Justificación en `diagnostico-inicial.md`.

## Registro de decisiones
- [Intake completado]: Pedido aparente resumido; ciclo clasificado como 0→1 (confianza M) dentro de producto maduro; disponibilidad existentes (confianza H); recomendado @IADEV-discovery-strategist. Decisiones tomadas del Q&A: chat nuevo separado (no evoluciona asesor-IA), estilo chatbot abierto, capacidades "sin restricciones" (en cuarentena crítica), usuario único diario (dueño), equipo solo, directo a construir sin validación barata.
