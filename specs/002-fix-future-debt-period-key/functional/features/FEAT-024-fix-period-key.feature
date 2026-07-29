# language: es
Feature: Period Key Format Correctness
  El endpoint GET /api/future-debt siempre devuelve claves de período válidas en formato YYYY-MM.
  Esto es una corrección del bug que producía "13-Jul-" en lugar de "2026-07".

  Antecedentes:
    Dado que el servidor está funcionando
    Y que la base de datos contiene resúmenes de tarjetas aceptados

  Escenario: currentPeriodKey es YYYY-MM válido cuando existe un resumen activo
    Dado un resumen de tarjeta aceptado con periodKey "2026-07"
    Y el resumen está marcado como isActiveForPeriod
    Cuando consulto GET /api/future-debt?from=2026-07&months=6
    Entonces la respuesta tiene range.currentPeriodKey igual a "2026-07"
    Y range.currentPeriodKey pasa la validación /^\d{4}-(0[1-9]|1[0-2])$/

  Escenario: currentPeriodKey es null cuando no hay resumen activo
    Dado que no existe ningún resumen con isActiveForPeriod=true
    Cuando consulto GET /api/future-debt?from=2026-07&months=6
    Entonces la respuesta tiene range.currentPeriodKey igual a null
    Y la respuesta no contiene errores de validación

  Escenario: statementPeriodKey en cada ocurrencia es YYYY-MM válido
    Dado un resumen aceptado del período "2026-07"
    Y una fila de cuotas con 3 cuotas totales
    Cuando consulto GET /api/future-debt?from=2026-07&months=6
    Entonces cada occurrence tiene statementPeriodKey en formato YYYY-MM
    Y ningún statementPeriodKey contiene caracteres inválidos como "/" o letras sueltas

  # --- Rebound 2 (2026-07-24): backend date normalizer for non-ISO summary fields ---
  # The AI extractor emits dates in multiple formats. The backend normalizes them
  # to ISO YYYY-MM-DD BEFORE the strict Zod schema validation runs.

  Escenario: Aceptar resumen con currentDueDate en formato DD-Mon-YY
    Dado un draft de resumen con summary.currentDueDate "13-Jul-26"
    Cuando el usuario confirma el resumen
    Entonces el backend normaliza currentDueDate a "2026-07-13"
    Y el resumen se acepta con código 200
    Y el resumen aceptado guarda currentDueDate "2026-07-13" en la base de datos

  Escenario: Aceptar resumen con currentDueDate en formato DD/MM/YYYY
    Dado un draft de resumen con summary.currentDueDate "15/07/2026"
    Cuando el usuario confirma el resumen
    Entonces el backend normaliza currentDueDate a "2026-07-15"
    Y el resumen se acepta con código 200

  Escenario: Aceptar resumen con currentDueDate en formato Month DD, YYYY
    Dado un draft de resumen con summary.currentDueDate "July 15, 2026"
    Cuando el usuario confirma el resumen
    Entonces el backend normaliza currentDueDate a "2026-07-15"
    Y el resumen se acepta con código 200

  Escenario: Aceptar resumen con nextDueDate en formato DD/MM/YYYY
    Dado un draft de resumen con summary.currentDueDate "2026-07-13"
    Y summary.nextDueDate "30/07/2026"
    Cuando el usuario confirma el resumen
    Entonces el backend normaliza nextDueDate a "2026-07-30"
    Y el resumen se acepta con código 200

  Escenario: Aceptar currentDueDate sin año asumiendo año actual
    Dado un draft de resumen con summary.currentDueDate "15-Jul"
    Cuando el usuario confirma el resumen
    Entonces el sistema normaliza a "<CURRENT_YEAR>-07-15" y guarda exitosamente

  Escenario: Normalizar cada campo de fecha de forma independiente
    Dado un draft de resumen con summary.currentDueDate "2026-07-13"
    Y summary.nextClosingDate "28-Jul-26"
    Y summary.nextDueDate "15/08/2026"
    Cuando el usuario confirma el resumen
    Entonces el backend normaliza currentDueDate a "2026-07-13"
    Y el backend normaliza nextClosingDate a "2026-07-28"
    Y el backend normaliza nextDueDate a "2026-08-15"
    Y el resumen se acepta con código 200

  # --- Rebound 3 (2026-07-25): wire date normalizer into AI extraction pipeline ---
  # When a PDF is imported, ai-extraction.service.ts normalizeModelResponse() was
  # using asString() without date parsing, causing the strict Zod schema to reject
  # non-ISO dates with HTTP 422. parseAnyDateToISO() is now applied in normalizeModelResponse().

  Escenario: Importar PDF con currentDueDate en formato DD-Mon-YY
    Dado que el servidor está funcionando
    Y existe un archivo PDF de extracto con summary.currentDueDate "13-Jul-26"
    Cuando se importa el PDF mediante POST /api/cards/:cardId/import-pdf
    Entonces la extracción de IA normaliza currentDueDate a "2026-07-13"
    Y la respuesta tiene código de estado 200 o 201
    Y no se obtiene error de validación "must be ISO YYYY-MM-DD"

  Escenario: Importar PDF con nextDueDate en formato DD/MM/YYYY
    Dado que el servidor está funcionando
    Y existe un archivo PDF de extracto con summary.currentDueDate "2026-07-13"
    Y summary.nextDueDate "30/07/2026"
    Cuando se importa el PDF mediante POST /api/cards/:cardId/import-pdf
    Entonces la extracción de IA normaliza nextDueDate a "2026-07-30"
    Y la respuesta tiene código de estado 200 o 201
    Y no se obtiene error de validación "must be ISO YYYY-MM-DD"

