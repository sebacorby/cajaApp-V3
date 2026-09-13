# Validación funcional del Asesor IA

## Estado

No se ejecutaron las validaciones funcionales del Asesor IA porque el backend no pudo arrancar.

Secciones no verificadas:

### 15.1 Contexto
- El backend construye el contexto desde servicios reales: no verificado
- No incluye contenido de PDFs ni documentos originales: no verificado
- Cada fuente tiene ID estable, perodo, moneda, valor, regla y accin: no verificado
- ARS y USD permanecen separados: no verificado
- La huella cambia cuando cambia el contexto autoritativo: no verificado

### 15.2 Guardrails
- Fuentes inexistentes: no verificado
- Nmeros que no aparecen en las fuentes citadas: no verificado
- Simulaciones no solicitadas: no verificado
- Lenguaje prescriptivo o de certeza: no verificado
- Respuestas fuera del JSON Schema: no verificado

### 15.3 Simulacin
- Escenario controlado (moneda nica, deltas de ingresos/egresos/compromisos): no verificado
- Coincidencia matemtica con el backend: no verificado
- Etiquetado como simulacin: no verificado
- Persistencia de slo la interaccin del historial: no verificado
- Eliminacin durante cleanup: no verificado

### 15.4 Historial
- Orden descendente: no verificado
- Detalle recuperable por ID: no verificado
- Versin de prompt, hash, modelo, request ID y huella presentes: no verificado
- Eliminacin funcional: no verificado
- Ausencia de documentos originales o secretos: no verificado

Resultado: NOT RUN.
