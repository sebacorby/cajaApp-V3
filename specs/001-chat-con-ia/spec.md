# Feature Specification: Agente IA Conversacional de CajaApp

**Feature Branch**: `feat/agent-chat`

**Created**: 2026-09-12

**Status**: Ready for Planning

**Input**: PRD autoritativo `specs/001-chat-con-ia/PRD.md` v1.1.0

## User Scenarios & Testing

### User Story 1 - Conversar desde cualquier pantalla (Priority: P1)

Como dueño de CajaApp quiero abrir un agente conversacional desde cualquier sección sin abandonar lo que estoy haciendo, mantener una conversación general y volver a minimizarlo conservando el hilo.

**Why this priority**: Es la experiencia base que convierte al agente en un copiloto global y no en otra sección aislada.

**Independent Test**: Puede validarse abriendo el launcher desde distintas secciones, conversando sobre un tema general, minimizando y reabriendo el panel sin perder el hilo ni cambiar la pantalla principal.

**Acceptance Scenarios**:

1. **Given** cualquier sección abierta, **When** el usuario activa el launcher flotante, **Then** el chat se abre sin reemplazar la sección actual.
2. **Given** una conversación activa, **When** el usuario minimiza y vuelve a abrir el chat, **Then** reaparece el mismo hilo con su estado conservado.
3. **Given** una consulta no relacionada con CajaApp, **When** el usuario la envía, **Then** el agente responde normalmente sin ejecutar acciones innecesarias sobre la aplicación.
4. **Given** un viewport móvil, **When** se abre el agente, **Then** la experiencia ocupa la superficie disponible y mantiene visibles los controles esenciales.

---

### User Story 2 - Consultar datos reales y navegar (Priority: P1)

Como usuario quiero preguntar por mis datos actuales en lenguaje natural y recibir respuestas basadas en información real de CajaApp, con posibilidad de navegar al registro o sección relevante.

**Why this priority**: Sin acceso fiable a datos reales el agente no aporta valor operativo sobre la aplicación.

**Independent Test**: Puede validarse preguntando por gastos, presupuestos o deuda futura, comprobando que la respuesta coincide con los datos actuales y que una petición de navegación abre el destino correcto.

**Acceptance Scenarios**:

1. **Given** datos financieros existentes, **When** el usuario pregunta por su estado actual, **Then** la respuesta se basa en resultados recuperados de CajaApp y no en valores inventados.
2. **Given** una consulta que requiere combinar varias fuentes, **When** el usuario la envía, **Then** el agente puede reunir la información necesaria y explicar una conclusión coherente.
3. **Given** una entidad identificada en la conversación, **When** el usuario pide ir a ella, **Then** CajaApp navega al destino correspondiente mientras el chat permanece disponible.

---

### User Story 3 - Ejecutar acciones normales sin fricción (Priority: P1)

Como usuario quiero pedir acciones cotidianas sobre CajaApp en lenguaje natural y que el agente las ejecute cuando mi intención sea explícita y los datos necesarios sean inequívocos.

**Why this priority**: El agente debe reducir pasos reales de operación, no limitarse a explicar información.

**Independent Test**: Puede validarse pidiendo crear o editar un registro no crítico, comprobando el resultado real y verificando que una petición ambigua no produzca una mutación hasta resolver el candidato correcto.

**Acceptance Scenarios**:

1. **Given** una petición explícita y completa para una acción normal, **When** el usuario la envía, **Then** la acción se ejecuta sin una confirmación redundante y el agente informa el resultado real.
2. **Given** una petición ambigua con varios registros candidatos, **When** el agente no puede determinar uno de forma segura, **Then** solicita la información mínima necesaria antes de modificar datos.
3. **Given** una acción que el agente infiere como paso auxiliar pero que el usuario no pidió explícitamente, **When** sería necesario modificar datos, **Then** el agente solicita confirmación antes de ejecutarla.
4. **Given** un reintento técnico de una acción ya aplicada, **When** se reanuda el mismo trabajo, **Then** la operación no se duplica.

---

### User Story 4 - Aprobar acciones críticas con impacto visible (Priority: P1)

Como usuario quiero que las acciones críticas se detengan antes de ejecutarse y me muestren claramente qué cambiará, para poder confirmarlas o rechazarlas de forma consciente.

**Why this priority**: Las operaciones destructivas, de cierre, aceptación definitiva o restauración requieren una barrera de seguridad independiente del criterio del modelo.

**Independent Test**: Puede validarse solicitando una acción crítica, comprobando que no ocurre nada antes de confirmar, y verificando tanto el camino de aprobación como el de rechazo.

**Acceptance Scenarios**:

1. **Given** una acción crítica propuesta, **When** todavía no fue confirmada, **Then** CajaApp no modifica el dominio y muestra el impacto, entidad afectada, consecuencias y reversibilidad.
2. **Given** una aprobación válida, **When** el usuario confirma, **Then** continúa el mismo trabajo y se ejecuta exactamente la acción aprobada.
3. **Given** una acción pendiente de aprobación, **When** el usuario la rechaza, **Then** no se ejecuta y el agente continúa la conversación sin intentar el mismo cambio por otra vía.
4. **Given** que cambian los argumentos de una acción pendiente, **When** se intenta reutilizar una aprobación anterior, **Then** esa aprobación deja de ser válida.

---

### User Story 5 - Importar documentos desde la conversación (Priority: P2)

Como usuario quiero adjuntar documentos financieros ya soportados por CajaApp y pedir su importación desde el chat, manteniendo las etapas de revisión existentes antes de materializar datos definitivos.

**Why this priority**: Lleva al agente uno de los flujos más valiosos de CajaApp sin romper el modelo draft/review/accept existente.

**Independent Test**: Puede validarse adjuntando un PDF o CSV soportado, iniciando la importación desde el chat y comprobando que se genera el borrador o preview correspondiente sin aceptarlo automáticamente.

**Acceptance Scenarios**:

1. **Given** un PDF o CSV soportado adjunto al mensaje, **When** el usuario pide importarlo, **Then** CajaApp inicia el flujo de importación correspondiente y conserva la etapa de revisión previa a la aceptación definitiva.
2. **Given** un borrador generado, **When** el usuario pide aceptarlo, **Then** la acción se trata como crítica y requiere aprobación explícita.
3. **Given** un archivo no soportado o que excede el límite permitido, **When** se intenta adjuntarlo, **Then** el sistema lo rechaza con un mensaje claro sin iniciar procesamiento.

---

### User Story 6 - Recuperar conversaciones y trabajos interrumpidos (Priority: P2)

Como usuario quiero retomar una conversación después de reiniciar CajaApp o perder temporalmente la conexión con la respuesta en curso, sin duplicar acciones ni perder referencias importantes.

**Why this priority**: El agente debe ser confiable para trabajos largos y no depender de una sesión visual continua.

**Independent Test**: Puede validarse interrumpiendo una conversación con actividad en curso, reabriendo la aplicación y comprobando que mensajes, acciones, referencias y aprobaciones pendientes se reconstruyen correctamente.

**Acceptance Scenarios**:

1. **Given** una conversación persistida, **When** CajaApp se reinicia y el usuario la vuelve a abrir, **Then** recupera mensajes, acciones registradas y referencias relevantes.
2. **Given** una respuesta en curso cuya conexión visual se interrumpe, **When** la interfaz se reconecta, **Then** recupera el estado sin repetir acciones ya ejecutadas.
3. **Given** una conversación extensa, **When** el usuario continúa trabajando, **Then** el agente conserva las referencias y decisiones críticas necesarias aunque el historial deba compactarse.
4. **Given** una ejecución en curso, **When** el usuario la cancela, **Then** la generación se detiene de forma controlada y ninguna operación ya iniciada queda a medio aplicar.

### Edge Cases

- El usuario refiere a “ese movimiento” pero existen varios candidatos plausibles.
- El agente propone una acción que no forma parte del catálogo permitido.
- Una acción recibe argumentos inválidos o incompletos.
- El usuario modifica los datos de una acción crítica después de haber visto una aprobación previa.
- Se pierde la conexión visual durante una respuesta o después de una acción ya completada.
- El proveedor conversacional deja de responder después de persistir el mensaje del usuario.
- El usuario minimiza el chat mientras existe una respuesta activa o una aprobación pendiente.
- `hideAmounts` está activo mientras el agente muestra resultados financieros estructurados.
- Se intenta adjuntar un archivo distinto de PDF/CSV o superior a 10 MB.
- El usuario elimina una conversación que referencia entidades financieras existentes.
- Una conversación alcanza un historial muy extenso y necesita compactación.
- El usuario envía un mensaje nuevo mientras existe una acción crítica pendiente de aprobación.

## Requirements

### Functional Requirements
- **FR-001**: CajaApp MUST ofrecer un Agente IA global separado del Asesor IA existente y accesible desde cualquier sección mediante un launcher persistente.
- **FR-002**: El usuario MUST poder abrir, minimizar, cerrar y reabrir el agente sin cambiar la sección principal ni perder la conversación activa.
- **FR-003**: El agente MUST adaptar su presentación a desktop y mobile manteniendo siempre accesibles historial, conversación y composer.
- **FR-004**: El usuario MUST poder crear, listar, renombrar, archivar, reactivar y eliminar conversaciones.
- **FR-005**: Las conversaciones MUST persistir entre reinicios con mensajes, referencias relevantes, acciones y aprobaciones pendientes recuperables.
- **FR-006**: El agente MUST responder conversación general sin exigir acceso a datos de CajaApp cuando no sea necesario.
- **FR-007**: Toda afirmación sobre el estado actual de CajaApp MUST basarse en información recuperada mediante capacidades autorizadas de la aplicación.
- **FR-008**: El agente MUST poder combinar múltiples consultas de sólo lectura dentro de un mismo turno cuando sean necesarias para responder correctamente.
- **FR-009**: El agente MUST poder navegar al usuario hacia secciones o registros identificados sin cerrar la conversación.
- **FR-010**: El usuario MUST ver progreso de una respuesta en curso y MUST poder cancelarla.
- **FR-011**: Toda acción ejecutada por el agente MUST quedar registrada con intención, argumentos, resultado, estado y momento de ejecución.
- **FR-012**: Una acción normal solicitada explícitamente MUST ejecutarse sin pedir una confirmación redundante cuando sus argumentos sean completos e inequívocos.
- **FR-013**: Una acción normal inferida por el agente como paso auxiliar MUST requerir confirmación antes de modificar datos.
- **FR-014**: Ante ambigüedad sobre la entidad o datos que determinan una mutación, el agente MUST pedir sólo la información mínima necesaria antes de actuar.
- **FR-015**: El agente MUST NOT inventar montos, fechas, monedas, identificadores ni decisiones faltantes para completar una mutación.
- **FR-016**: Las acciones críticas de aceptación definitiva, borrado, reversión, conciliación, cierre o restauración MUST requerir aprobación explícita antes de ejecutarse.
- **FR-017**: Una aprobación MUST corresponder exactamente a una única acción y conjunto de argumentos; cualquier cambio MUST invalidarla.
- **FR-018**: Rechazar una acción crítica MUST dejar el dominio intacto y MUST impedir que el agente intente el mismo cambio por una vía alternativa.
- **FR-019**: Los reintentos técnicos MUST NOT duplicar una mutación ya aplicada con éxito.
- **FR-020**: El agente MUST aceptar adjuntos PDF/CSV de hasta 10 MB para los flujos de importación soportados y MUST rechazar formatos o tamaños fuera de alcance.
- **FR-021**: Importar un documento MUST conservar la separación entre borrador/revisión y aceptación definitiva ya existente en CajaApp.
- **FR-022**: Eliminar una conversación MUST eliminar sólo datos propios del chat y MUST NOT eliminar entidades financieras referenciadas.
- **FR-023**: El agente MUST conservar referencias relevantes entre turnos para entender expresiones como “ese movimiento” o “el presupuesto anterior”.
- **FR-024**: Las conversaciones extensas MUST poder compactarse sin perder identificadores, decisiones ni acciones pendientes necesarias para continuar el trabajo.
- **FR-025**: Si la conexión visual se corta, el usuario MUST poder recuperar el estado actual del trabajo sin repetir acciones exitosas.
- **FR-026**: Sólo una ejecución activa MUST existir por conversación; una nueva interacción no MUST aprobar automáticamente una acción crítica pendiente.
- **FR-027**: La presentación estructurada de importes MUST respetar la preferencia global de ocultar montos de CajaApp.
- **FR-028**: El usuario MUST poder ver proveedor/modelo y actividad operativa relevante sin que se muestren secretos o credenciales.
- **FR-029**: El catálogo de acciones disponibles MUST ser cerrado y las solicitudes de acciones desconocidas o con argumentos inválidos MUST rechazarse sin ejecutar comportamiento dinámico.
- **FR-030**: El Asesor IA existente MUST conservar su comportamiento funcional y su prohibición de mutar datos.

### Key Entities

- **Conversation**: hilo persistente del usuario, con título, estado, resumen y referencias necesarias para continuar.
- **Message**: intervención del usuario, del agente o resultado operativo asociado a una conversación y ordenada cronológicamente.
- **Attachment**: archivo local adjunto a una conversación, con identidad, tipo, tamaño, integridad y estado de consumo.
- **Run**: ejecución de un turno del agente, con estado, proveedor/modelo, inicio, fin y resultado recuperable.
- **Tool Action**: acción autorizada propuesta o ejecutada por el agente, con riesgo, argumentos, resultado, errores y trazabilidad.
- **Approval**: decisión explícita del usuario sobre una acción crítica concreta; puede estar pendiente, aprobada, rechazada o expirada.
- **Entity Reference**: referencia persistida a una entidad real de CajaApp usada para mantener continuidad entre turnos sin inventar identificadores.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario puede abrir el agente desde cualquier sección con una sola interacción y volver a la misma pantalla al minimizarlo.
- **SC-002**: El 100% de las respuestas que afirman datos actuales de CajaApp son trazables a información real recuperada durante el trabajo o a resultados persistidos todavía válidos.
- **SC-003**: El 100% de las acciones críticas se detienen antes de modificar datos y sólo se ejecutan después de una aprobación explícita asociada a esa acción exacta.
- **SC-004**: El 100% de las mutaciones exitosas quedan auditadas y un reintento del mismo trabajo no crea duplicados.
- **SC-005**: Después de reiniciar CajaApp, el usuario puede reabrir una conversación y continuar usando sus referencias y acciones previas sin reconstruir manualmente el contexto.
- **SC-006**: Una interrupción visual durante una respuesta puede recuperarse sin repetir acciones ya completadas y sin perder el estado terminal del trabajo.
- **SC-007**: El launcher y los controles primarios del chat son operables por teclado y tienen un área interactiva de al menos 44×44 px en desktop y mobile.
- **SC-008**: En un viewport 390×844 y en desktop, el usuario puede leer historial, enviar mensajes, cancelar una respuesta y gestionar una aprobación sin scroll horizontal de la aplicación.
- **SC-009**: Una conversación con 10.000 mensajes puede reabrirse y continuar sin exigir cargar ni reenviar manualmente todo el historial previo.
- **SC-010**: El 100% de los archivos fuera de PDF/CSV o superiores a 10 MB se rechazan antes de iniciar una importación.
- **SC-011**: La activación del nuevo agente no cambia el comportamiento funcional del Asesor IA existente ni su garantía de no mutación.

## Assumptions

- CajaApp sigue siendo una aplicación local de un único dueño/usuario y no se introduce un modelo multiusuario en esta feature.
- Las capacidades financieras existentes y sus reglas de negocio continúan siendo la autoridad; el agente sólo las orquesta.
- Los flujos documentales existentes conservan su separación entre importación, borrador/revisión y aceptación definitiva.
- El agente puede conversar sobre temas generales, pero las afirmaciones sobre datos actuales de CajaApp requieren consultar capacidades autorizadas.
- La preferencia de privacidad visual de importes sigue siendo transversal y aplica también al chat.
- Los adjuntos V1 se limitan a PDF/CSV porque son los formatos ya soportados por los flujos de dominio actuales.
- No forman parte de V1: voz/audio, imágenes arbitrarias, navegación web, tareas autónomas programadas, ejecución de comandos del sistema ni edición de código/configuración por parte del agente.
- La feature debe convivir con el Asesor IA existente como producto separado y no usarlo como subagente.
