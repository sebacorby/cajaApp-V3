# APPCAJA-V3-FE-001 — Preparar frontend desde prototipo obligatorio e integrar pestaña Tarjetas

## 1. Contexto

Estamos construyendo **AppCaja V3** desde cero en:

```txt
I:\cajaApp-V3
```

La primera entrega frontend debe preparar el prototipo obligatorio y agregar la pestaña **Tarjetas**. Esta entrega NO debe implementar todavía el backend real, la lectura real de PDF con IA, la persistencia en BD ni los cálculos reales de cuotas futuras.

El objetivo es dejar funcionando el frontend real de AppCaja V3 a partir del prototipo `.tar` y agregar una pantalla de Tarjetas lista para conectarse después al backend.

---

## 2. Fuentes obligatorias de verdad

### 2.1. Prototipo frontend obligatorio

El prototipo obligatorio está en:

```txt
I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar
```

Este prototipo es la **fuente de verdad visual y estructural del frontend**.

Regla crítica:

> El prototipo debe ser respetado y adaptado. Está prohibido descartarlo, rehacerlo desde cero, simplificarlo o quitar detalles existentes.

El `.tar` contiene un proyecto Next.js completo con, entre otros archivos:

```txt
.env
.gitignore
.zscripts/
Caddyfile
bun.lock
components.json
db/custom.db
eslint.config.mjs
next.config.ts
package.json
postcss.config.mjs
prisma/schema.prisma
public/logo.svg
src/app/api/route.ts
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/components/finance/layout/app-shell.tsx
src/components/finance/layout/sidebar.tsx
src/components/finance/layout/header.tsx
src/components/finance/layout/brand.tsx
src/components/finance/layout/demo-state-control.tsx
src/components/finance/sections/section-router.tsx
src/lib/finance/nav.ts
src/lib/finance/ui-store.ts
src/lib/finance/mock-data.ts
src/lib/finance/types.ts
src/lib/finance/format.ts
src/components/ui/*
tailwind.config.ts
tsconfig.json
```

También contiene `.git/`, por lo tanto la extracción debe hacerse con cuidado para no contaminar ni reemplazar el repo raíz.

### 2.2. PDF de resumen de tarjeta obligatorio

El PDF Galicia/Visa provisto por arquitectura es la **fuente de verdad funcional y de orden** para la pestaña Tarjetas.

Este PDF dicta:

- orden de secciones;
- orden de grupos;
- orden de filas;
- columnas visibles;
- agrupamiento por tarjeta/persona;
- ubicación relativa de consumos, impuestos, total final y cuotas a vencer;
- lectura visual esperada para auditoría rápida.

Regla crítica:

> La pantalla Tarjetas NO debe ordenar datos bajo ningún criterio propio. El PDF manda.

Está prohibido ordenar por:

- fecha;
- tarjeta;
- titular;
- monto;
- moneda;
- cuota;
- comprobante;
- tipo de consumo;
- categoría;
- cualquier criterio derivado.

La UI debe renderizar el orden exacto recibido desde backend/mock, preservando `displayOrder`.

---

## 3. Objetivo de la entrega

Implementar una entrega frontend acotada con dos partes, en este orden:

1. **Preparar el frontend real desde el prototipo `.tar` obligatorio.**
2. **Agregar la pestaña Tarjetas dentro del prototipo, sin romper ni quitar nada existente.**

La pestaña Tarjetas debe permitir visualizar un resumen de tarjeta como una grilla editable tipo Excel, respetando el formato, orden y agrupamiento del PDF fuente.

---

## 4. Alcance permitido

### Incluido en esta entrega

- Descomprimir el `.tar` de forma segura.
- Configurar el prototipo como frontend real en `I:\cajaApp-V3\workspace\frontend`.
- Instalar dependencias.
- Validar que el prototipo compila/corre, si el entorno lo permite.
- Agregar nueva sección `tarjetas`.
- Agregar navegación para `Tarjetas` en sidebar y mobile.
- Crear pantalla `TarjetasSection`.
- Crear tipos frontend para la respuesta normalizada de tarjetas.
- Crear fixture/mock local derivado del PDF.
- Renderizar grilla editable tipo Excel.
- Simular carga de PDF usando fixture local.
- Simular aceptación de datos.
- Simular tabla de valores actualizados desde otro fixture/mock.
- Agregar botón `+` para compra manual del mes en curso.
- Dejar preparada la UI para conectar backend real después.

### Excluido en esta entrega

- Parser real de PDF.
- Llamada real a Ollama Cloud.
- Lectura real de CSV.
- Lectura real de PNG/JPG.
- Persistencia real en base de datos.
- Cálculo real de cuotas futuras.
- Categorías automáticas.
- Reglas financieras reales en frontend.
- Modificación del backend.
- Modificación de Prisma/BD.
- Implementación de autenticación.

---

## 5. Reglas no negociables

### 5.1. Sobre el prototipo

- No borrar archivos existentes del prototipo salvo basura de ejecución (`node_modules`, `.next`, logs).
- No reemplazar el layout.
- No eliminar sidebar.
- No eliminar header.
- No eliminar `DemoStateControl`.
- No eliminar estados `loading`, `empty`, `error`.
- No eliminar secciones existentes.
- No cambiar la identidad visual general.
- No modificar `src/components/ui/*` salvo necesidad extrema y justificada.
- No agregar dependencias nuevas salvo necesidad justificada y documentada.
- No recrear el frontend desde cero.

### 5.2. Sobre Tarjetas

- El frontend sólo renderiza.
- El frontend no calcula montos.
- El frontend no calcula cuotas.
- El frontend no calcula consumos futuros.
- El frontend no convierte dólares a pesos.
- El frontend no normaliza financieramente.
- El frontend no decide agrupamientos.
- El frontend no ordena filas.
- El frontend no reubica secciones.
- El frontend no interpreta PDF.
- Toda acción que parezca cálculo debe simular una respuesta backend usando fixture/mock.

### 5.3. Sobre orden y auditoría

- Cada sección, grupo y fila debe tener `displayOrder`.
- La UI debe iterar los arrays en el orden recibido.
- Está prohibido usar `.sort()` sobre secciones, grupos o filas del resumen de tarjeta.
- Si se necesita ordenar algo ajeno al resumen, debe documentarse y no puede afectar la grilla principal.
- No implementar filtros que cambien el orden de auditoría.
- No implementar paginación que rompa la lectura continua del resumen.

---

## 6. Secuencia obligatoria de trabajo

## Fase A — Preparación segura del prototipo

### A.1. Verificar ubicación inicial

Confirmar que existe:

```txt
I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar
```

Confirmar que el root esperado es:

```txt
I:\cajaApp-V3
```

Confirmar que la ruta destino final del frontend real es:

```txt
I:\cajaApp-V3\workspace\frontend
```

### A.2. No tocar el `.tar` original

El archivo original debe preservarse intacto:

```txt
I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar
```

Está prohibido moverlo, borrarlo o sobrescribirlo.

### A.3. Crear carpeta temporal de extracción

Crear una carpeta temporal controlada:

```txt
I:\cajaApp-V3\workspace\frontend\_prototype_extract
```

Si ya existe, inspeccionarla antes de borrar. No borrar nada sin evidencia previa.

### A.4. Extraer el `.tar` en carpeta temporal

Extraer el `.tar` dentro de `_prototype_extract`, no sobre el repo raíz ni directamente sobre `workspace\frontend`.

Comando sugerido en Windows:

```powershell
tar -xf "I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar" -C "I:\cajaApp-V3\workspace\frontend\_prototype_extract"
```

### A.5. Inspeccionar contenido extraído

Validar que existan al menos:

```txt
package.json
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css
src/components/finance/layout/app-shell.tsx
src/components/finance/layout/sidebar.tsx
src/components/finance/layout/header.tsx
src/components/finance/layout/brand.tsx
src/components/finance/layout/demo-state-control.tsx
src/components/finance/sections/section-router.tsx
src/lib/finance/ui-store.ts
src/lib/finance/nav.ts
src/lib/finance/types.ts
src/lib/finance/mock-data.ts
src/lib/finance/format.ts
```

### A.6. Copiar/adaptar el prototipo al frontend real

Copiar el contenido útil desde `_prototype_extract` hacia:

```txt
I:\cajaApp-V3\workspace\frontend
```

Excluir obligatoriamente:

```txt
.git/
node_modules/
.next/
dev.log
server.log
```

Preservar obligatoriamente:

```txt
prototype/prototype-AppCaja-v3.tar
```

El `.git/` interno del prototipo NO debe quedar como repo activo dentro del frontend final.

### A.7. Verificar Node.js

Verificar versión de Node.js:

```powershell
node -v
```

Para AppCaja V3, la versión esperada es Node.js `22.x`.

- Si Node.js empieza con `v22.`, continuar.
- Si no empieza con `v22.`, documentar la versión encontrada y bloquear sólo si impide instalar/correr el proyecto.
- No pedir al usuario que ejecute comandos manuales.

### A.8. Instalar dependencias

El prototipo trae `bun.lock`, pero el agente debe adaptarse al entorno real de la PC.

Orden recomendado:

1. Si `bun` existe y funciona, puede usarse.
2. Si `bun` no existe, usar `npm`.
3. No instalar herramientas globales salvo necesidad justificada.
4. No agregar dependencias nuevas para esta entrega.

Comandos posibles:

```powershell
npm install
```

Si se usa Bun:

```powershell
bun install
```

Documentar qué gestor se usó y por qué.

### A.9. Validar prototipo antes de modificar

Antes de agregar Tarjetas, ejecutar validaciones si el entorno lo permite:

```powershell
npm run lint
npm run build
```

Opcionalmente levantar desarrollo:

```powershell
npm run dev
```

Si un comando falla, documentar:

- comando ejecutado;
- error exacto;
- causa probable;
- si se remedia o queda como known issue.

No avanzar a modificar Tarjetas sin dejar asentado el estado base del prototipo.

---

## Fase B — Integrar sección Tarjetas en navegación existente

### B.1. Archivos obligatorios a revisar

Revisar antes de modificar:

```txt
src/lib/finance/ui-store.ts
src/lib/finance/nav.ts
src/components/finance/sections/section-router.tsx
src/components/finance/layout/sidebar.tsx
src/components/finance/layout/header.tsx
src/components/finance/dashboard/section-card.tsx
src/lib/finance/format.ts
src/lib/finance/types.ts
src/lib/finance/mock-data.ts
```

### B.2. Extender `SectionId`

Archivo:

```txt
src/lib/finance/ui-store.ts
```

Agregar la nueva sección:

```ts
export type SectionId =
  | "dashboard"
  | "movimientos"
  | "tarjetas"
  | "presupuestos"
  | "objetivos"
  | "reportes"
  | "configuracion";
```

No eliminar ninguna sección existente.

### B.3. Agregar item de navegación

Archivo:

```txt
src/lib/finance/nav.ts
```

Agregar import:

```ts
import { CreditCard } from "lucide-react";
```

Agregar item en `NAV_ITEMS`, preferentemente después de `Movimientos`:

```ts
{
  id: "tarjetas",
  label: "Tarjetas",
  icon: CreditCard,
  description: "Resumen, cuotas y consumos futuros"
}
```

La navegación desktop y mobile deben funcionar porque ambas usan `Sidebar`.

### B.4. Registrar sección en router

Archivo:

```txt
src/components/finance/sections/section-router.tsx
```

Agregar import:

```ts
import { TarjetasSection } from "./tarjetas-section";
```

Agregar case:

```tsx
case "tarjetas":
  return <TarjetasSection />;
```

---

## Fase C — Crear modelo frontend de datos para resumen de tarjeta

### C.1. Archivo de tipos

Extender o crear tipos en:

```txt
src/lib/finance/types.ts
```

Tipos mínimos requeridos:

```ts
export type CardStatementCurrency = "ARS" | "USD";

export type CardStatementRowType =
  | "section_header"
  | "summary"
  | "consolidated_row"
  | "table_header"
  | "transaction"
  | "group_total"
  | "tax_or_charge"
  | "final_total"
  | "future_installment"
  | "legal_info";

export interface CardStatementRow {
  id: string;
  displayOrder: number;
  sourcePage: number | null;
  sectionId: string;
  sectionLabel: string;
  groupId: string | null;
  groupLabel: string | null;
  rowType: CardStatementRowType;
  editable: boolean;
  dateRaw: string | null;
  markerRaw?: "*" | "K" | null;
  referenceRaw: string | null;
  installmentRaw: string | null;
  receiptRaw: string | null;
  amountPesos: number | null;
  amountDollars: number | null;
  originalText: string;
}

export interface CardStatementGroup {
  id: string;
  displayOrder: number;
  label: string;
  cardLast4: string | null;
  holderName: string | null;
  rows: CardStatementRow[];
  totalPesos: number | null;
  totalDollars: number | null;
}

export interface CardStatementSection {
  id: string;
  displayOrder: number;
  label: string;
  rows?: CardStatementRow[];
  groups?: CardStatementGroup[];
}

export interface CardStatementPreview {
  id: string;
  sourceFileName: string;
  sourceKind: "pdf" | "csv" | "image";
  documentKind: "credit_card_statement";
  bankName: string | null;
  brandName: string | null;
  statementNumber: string | null;
  accountNumber: string | null;
  holderName: string | null;
  periodLabel: string;
  totals: {
    totalPesos: number | null;
    totalDollars: number | null;
    minimumPaymentPesos: number | null;
  };
  billingCycle: Array<{
    displayOrder: number;
    label: string;
    valueRaw: string;
  }>;
  sections: CardStatementSection[];
}

export interface CardStatementCellEdit {
  rowId: string;
  field:
    | "dateRaw"
    | "referenceRaw"
    | "installmentRaw"
    | "receiptRaw"
    | "amountPesos"
    | "amountDollars";
  value: string | number | null;
}
```

Estos tipos son frontend-only para esta entrega. El contrato final backend podrá ajustarlos luego, pero deben servir como base.

---

## Fase D — Crear fixtures/mock del resumen Galicia/Visa

### D.1. Archivo nuevo

Crear:

```txt
src/lib/finance/mock-card-statement.ts
```

Debe exportar al menos:

```ts
export const mockCardStatementPreview: CardStatementPreview = { ... };
export const mockAcceptedCardStatement = { ... };
```

### D.2. Contenido mínimo del fixture

El fixture debe estar derivado del PDF y respetar el orden relativo real.

Debe incluir:

1. Encabezado del resumen.
2. Total a pagar.
3. Ciclo de facturación.
4. Pago mínimo.
5. Límites.
6. Tasas.
7. Consolidado.
8. Detalle del consumo.
9. Grupo `TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA`.
10. Grupo `TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ`.
11. Grupo `TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA`.
12. Grupo `TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ`.
13. Cargos/impuestos posteriores a consumos.
14. `TOTAL A PAGAR`.
15. `Plan V` como bloque informativo no editable.
16. `Cuotas a vencer` como bloque informativo no editable o tabla secundaria.

No hace falta cargar todas las filas del PDF en esta entrega, pero sí suficientes para demostrar:

- orden real;
- grupos reales;
- totales por grupo;
- consumos en pesos;
- consumos en dólares;
- cargos/impuestos;
- total final;
- cuotas futuras.

### D.3. Datos concretos sugeridos para el fixture

Usar estos datos visibles del PDF como muestra:

```txt
Total en pesos: 3.118.842,50
Total en dólares: 161,84
Pago mínimo: 508.000,00
Cierre anterior: 28-May-26
Vencimiento anterior: 05-Jun-26
Cierre actual: 02-Jul-26
Vencimiento actual: 13-Jul-26
Próximo cierre: 30-Jul-26
Próximo vencimiento: 07-Ago-26
```

Grupos mínimos:

```txt
TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA
TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ
TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA
TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ
```

Cargos/impuestos mínimos:

```txt
DB IVA $ PLAN V
IMPUESTO DE SELLOS $
IMPUESTO DE SELLOS P $
IVA RG 4240 21%
DB.RG 5617 30%
TOTAL A PAGAR
```

Cuotas a vencer mínimas:

```txt
Julio/26
Agosto/26
Setiembre/26
Octubre/26
Noviembre/26
Diciembre/26
A partir de Enero/27
```

### D.4. Regla del fixture

Aunque el fixture sea parcial, el orden debe ser fiel al PDF.

Prohibido generar un fixture “más ordenado” que el PDF.

---

## Fase E — Crear pantalla Tarjetas

### E.1. Archivo nuevo

Crear:

```txt
src/components/finance/sections/tarjetas-section.tsx
```

La pantalla debe ser un Client Component si usa estado local.

```tsx
"use client";
```

### E.2. Estilo obligatorio

Debe respetar el prototipo existente:

- `SectionCard`;
- botones de `src/components/ui/button`;
- inputs de `src/components/ui/input`;
- cards redondeadas;
- bordes suaves;
- fondos del tema actual;
- estética verde/esmeralda;
- `text-muted-foreground`;
- `tabular-nums` para importes;
- responsive mobile;
- scroll horizontal para grilla;
- header sticky si la grilla tiene scroll vertical.

No inventar un diseño totalmente nuevo.

### E.3. Estado inicial

Cuando no hay resumen cargado, mostrar:

- título: `Tarjetas`;
- subtítulo: `Importá un resumen PDF, revisá los datos extraídos y aceptalos antes de guardar.`;
- card de carga de resumen;
- mensaje: `En esta etapa sólo está soportado PDF. CSV e imágenes quedan para próximas features.`;
- botón: `Importar resumen PDF`.

Como no hay backend real, el botón debe cargar `mockCardStatementPreview` en estado local.

No abrir selector de archivos real si no aporta valor en esta entrega. Si se implementa input file, no debe intentar parsear el archivo.

### E.4. Estado preview

Cuando hay datos cargados, renderizar:

#### A. Resumen superior

Mostrar cards compactas con:

- Total en pesos.
- Total en dólares.
- Pago mínimo.
- Vencimiento actual.
- Próximo cierre.
- Próximo vencimiento.

#### B. Ciclo de facturación

Mostrar las fechas en el mismo orden que el PDF:

1. Cierre anterior.
2. Vencimiento anterior.
3. Cierre actual.
4. Vencimiento actual.
5. Próximo cierre.
6. Próximo vencimiento.

No reordenar cronológicamente si el backend/mock ya trae otro orden. Renderizar por `displayOrder` recibido.

#### C. Grilla editable principal

La grilla debe sentirse como Excel:

- densa;
- editable celda por celda;
- bordes sutiles;
- columnas alineadas;
- scroll horizontal;
- encabezados visibles;
- montos con `tabular-nums`;
- inputs compactos en filas editables;
- filas no editables para secciones, subtotales, total final e información;
- grupos visualmente separados;
- total de grupo destacado;
- total final destacado;
- sin filtros;
- sin ordenamiento;
- sin paginación.

Columnas mínimas:

```txt
Fecha | Marca | Referencia | Cuota | Comprobante | Pesos | Dólares
```

La columna `Marca` puede mostrar `*`, `K` o vacío.

#### D. Edición local

La edición debe ser local y temporal.

Reglas:

- Editar una celda NO guarda en BD.
- Editar una celda NO recalcula nada.
- Editar una celda sólo modifica el estado local de preview.
- Debe quedar visible que hay cambios pendientes.
- El payload de cambios debe poder enviarse luego al backend.

Campos editables mínimos:

- fecha;
- referencia;
- cuota;
- comprobante;
- pesos;
- dólares.

Sólo filas `editable: true` deben permitir edición.

### E.5. Acciones al pie

Al pie del resumen agregar:

- botón primario: `Aceptar datos`;
- botón secundario: `Descartar cambios`;
- botón con símbolo `+` para cargar compra manual del mes en curso.

El botón `Aceptar datos` debe estar después de la grilla, no arriba, para respetar el flujo de revisión.

---

## Fase F — Botón `+` para compra manual

### F.1. Comportamiento

El botón `+` debe permitir cargar una compra del mes en curso efectuada con tarjeta.

Debe abrir un modal/drawer usando componentes existentes de shadcn/ui del prototipo, por ejemplo:

- `Dialog`; o
- `Sheet`; o
- `Drawer`.

### F.2. Campos mínimos

El formulario debe incluir:

```txt
Descripción / comercio
Fecha
Monto
Moneda: ARS / USD
Cantidad de cuotas
Tarjeta
Observación opcional
```

### F.3. Regla de cálculo

El frontend NO debe calcular el impacto de cuotas.

Al confirmar:

- simular envío al backend;
- o agregar una fila local marcada como `pendingBackendCalculation: true`;
- mostrar mensaje claro de que el cálculo definitivo será realizado por backend.

No distribuir cuotas en meses desde React.

---

## Fase G — Botón `Aceptar datos`

### G.1. Comportamiento en esta entrega

En esta entrega, `Aceptar datos` NO persiste en BD.

Al hacer click:

1. Tomar el preview editado localmente.
2. Simular envío al backend.
3. Cambiar estado a `accepted`.
4. Mostrar toast o mensaje de éxito.
5. Mostrar una tabla inferior llamada `Valores actualizados`.

### G.2. Valores actualizados

La tabla `Valores actualizados` debe venir desde fixture/mock:

```txt
mockAcceptedCardStatement
```

No debe calcularse en frontend.

Debe visualizar conceptualmente el resultado que más adelante devolverá el backend luego de:

- validar datos aceptados;
- guardar resumen;
- calcular consumos futuros;
- recalcular cuotas pendientes;
- devolver vista consolidada.

---

## Fase H — Formato monetario

### H.1. Pesos argentinos

Usar formato argentino, con dos decimales para montos del resumen de tarjeta.

Ejemplos esperados:

```txt
$ 3.118.842,50
$ 508.000,00
$ 8.303,49
```

El helper actual `formatCurrency` usa moneda ARS sin decimales. Para Tarjetas puede agregarse un helper nuevo sin romper el existente, por ejemplo:

```ts
export function formatCurrencyARSWithDecimals(value: number): string { ... }
```

### H.2. Dólares

Mostrar dólares sin convertir a pesos.

Ejemplos:

```txt
U$D 161,84
10,00
20,00
```

En grilla, la columna puede llamarse `Dólares` y mostrar sólo el número con coma decimal.

---

## Fase I — Validaciones técnicas

Ejecutar al final, si el entorno lo permite:

```powershell
npm run lint
npm run build
```

Si se levantó la app:

```powershell
npm run dev
```

Validar manualmente:

- sidebar desktop muestra `Tarjetas`;
- menú mobile muestra `Tarjetas`;
- secciones existentes siguen funcionando;
- estado inicial de Tarjetas se ve correcto;
- botón `Importar resumen PDF` carga fixture;
- grilla respeta orden del fixture;
- grupos se ven separados;
- celdas editables funcionan;
- filas no editables no permiten edición;
- botón `+` abre modal/drawer;
- botón `Aceptar datos` muestra estado accepted;
- tabla `Valores actualizados` aparece desde mock;
- no hay cálculos financieros en frontend.

---

## 7. Archivos esperados creados/modificados

### Modificados

```txt
src/lib/finance/ui-store.ts
src/lib/finance/nav.ts
src/components/finance/sections/section-router.tsx
src/lib/finance/types.ts
src/lib/finance/format.ts
```

### Creados

```txt
src/components/finance/sections/tarjetas-section.tsx
src/lib/finance/mock-card-statement.ts
```

Opcionales, sólo si mejora orden sin romper el prototipo:

```txt
src/components/finance/cards/card-statement-grid.tsx
src/components/finance/cards/card-statement-summary.tsx
src/components/finance/cards/manual-card-purchase-dialog.tsx
```

Si se crean componentes adicionales, deben estar bajo:

```txt
src/components/finance/cards/
```

No dispersar componentes de Tarjetas por carpetas ajenas.

---

## 8. Evidencia requerida en la entrega

La entrega debe incluir un reporte con:

1. Ruta donde quedó instalado el frontend real.
2. Confirmación de que el `.tar` original sigue intacto.
3. Confirmación de que `.git/` del prototipo no contaminó el repo raíz.
4. Gestor usado para instalar dependencias: `npm` o `bun`.
5. Versión de Node.js detectada.
6. Resultado de:
   - `npm run lint`;
   - `npm run build`;
   - `npm run dev`, si se ejecutó.
7. Lista de archivos creados.
8. Lista de archivos modificados.
9. Capturas o descripción verificable de:
   - navegación con `Tarjetas`;
   - estado inicial;
   - preview con grilla;
   - agrupamiento por tarjetas;
   - modal/drawer de compra manual;
   - estado accepted;
   - tabla `Valores actualizados`.
10. Known issues honestos.

---

## 9. Definition of Done

La entrega se considera completa sólo si se cumple todo esto:

- El prototipo fue descomprimido/configurado de forma segura.
- El `.tar` original sigue en `prototype/`.
- El `.git/` interno del prototipo no quedó como repo activo del frontend final.
- El frontend real existe en `I:\cajaApp-V3\workspace\frontend`.
- La app conserva layout, sidebar, header, estilos, estados y secciones existentes.
- `Tarjetas` aparece en navegación desktop.
- `Tarjetas` aparece en navegación mobile.
- La sección Tarjetas tiene estado inicial.
- El botón `Importar resumen PDF` carga fixture/mock.
- La grilla editable se renderiza tipo Excel.
- La grilla respeta el orden y agrupamiento definido por el PDF fuente.
- No hay `.sort()` sobre secciones, grupos o filas del resumen.
- Las filas editables permiten edición local.
- Las filas no editables no permiten edición.
- El botón `+` abre flujo de compra manual.
- La compra manual no calcula cuotas en frontend.
- El botón `Aceptar datos` simula aceptación.
- La tabla `Valores actualizados` se renderiza desde mock backend.
- El frontend no calcula importes, cuotas ni consumos futuros.
- El resultado queda preparado para conectar backend real en la próxima entrega.

---

## 10. Criterios de rechazo automático

Rechazar la entrega si ocurre cualquiera de estos puntos:

- El agente reescribe el frontend desde cero.
- El agente elimina detalles del prototipo.
- El agente borra o mueve el `.tar` original.
- El agente copia `.git/` del prototipo como repo activo final.
- El agente implementa cálculos financieros en React.
- El agente ordena consumos por fecha, monto, tarjeta o titular.
- El agente cambia el agrupamiento del PDF.
- El agente mezcla cargos/impuestos dentro de grupos de tarjeta cuando en el PDF aparecen después.
- El agente implementa parser real sin autorización.
- El agente toca BD/Prisma para persistir datos reales.
- El agente agrega dependencias innecesarias.
- El agente rompe secciones existentes del prototipo.
- El agente no entrega evidencia de instalación/configuración.

---

## 11. Nota de arquitectura para próximas entregas

Esta entrega es sólo frontend/mock.

La siguiente entrega debería ser backend:

```txt
APPCAJA-V3-BE-001 — Contrato backend para resumen de tarjeta PDF, prompts markdown auditables y schema normalizado
```

Ese backend deberá:

- recibir PDF;
- detectar tipo de documento;
- elegir prompt markdown;
- llamar a Ollama Cloud configurado por `.env`;
- validar salida del modelo;
- normalizar JSON;
- preservar orden con `displayOrder`;
- devolver estructura lista para render;
- persistir sólo luego de aceptación explícita;
- calcular consumos futuros únicamente en backend.

