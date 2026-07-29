# language: es
Característica: Fix Card Reference in Future Debt Projections
  Como usuario
  Quiero que las cuotas futuras de tarjeta muestren la referencia correcta de la tarjeta
  Para poder identificar claramente qué tarjeta generó cada obligación futura

  Antecedentes:
    Dado que la aplicación está configurada con el backend running
    Y que existe un resumen de tarjeta aceptado con compras en cuotas

  Escenario: Cuota futura muestra la referencia de tarjeta correcta
    Dado un resumen de tarjeta Visa de Banco Galicia aceptado con una compra en 3 cuotas
    Y el resumen tiene los últimos 4 dígitos "4521" registrados en el grupo
    Cuando consulto la deuda futura
    Entonces la cuota futura muestra la referencia de tarjeta
    Y el texto de la tarjeta incluye "Visa" y "•••• 4521"
    Y la cuota está agrupada bajo esa tarjeta en el mes correspondiente
    Y no aparece en la sección de pendientes con "missing_card_reference"

  Escenario: Múltiples cuotas de la misma tarjeta se agrupan correctamente
    Dado un resumen de tarjeta Mastercard aceptado con múltiples compras en cuotas
    Y todas las cuotas pertenecen a la misma tarjeta con últimos 4 dígitos "8832"
    Cuando consulto la deuda futura
    Entonces todas las cuotas futuras de esa tarjeta aparecen agrupadas bajo la misma tarjeta
    Y el total por tarjeta suma correctamente todos los montos en ARS
    Y el total por tarjeta suma correctamente todos los montos en USD

  Escenario: Cuota sin referencia de tarjeta aparece en pendientes
    Dado una proyección de cuota futura sin groupKey válido en la base de datos
    Cuando consulto la deuda futura
    Entonces la cuota aparece en la sección pendientes
    Y el diagnóstico es "missing_card_reference"
    Y el mensaje de detalle indica que no tiene referencia de tarjeta

  Escenario: Identificación de tarjeta a través de la traza de origen
    Dado una cuota futura confirmada con referencia de tarjeta válida
    Cuando consulto el detalle de la cuota
    Entonces puedo ver el cardLabel completo (banco + últimos 4 dígitos)
    Y puedo ver el holderName del titular
    Y puedo ver el originReference que apunta al resumen original
