# VALIDACIÓN — APP-CARDS-FUTURE-REDESIGN-001 v1.0.0

## Rol

Sos agente de validación. **No tenés autorización para escribir, modificar, formatear, revertir ni eliminar código.**

Si encontrás un error:

1. no lo corrijas;
2. preservá el workspace;
3. capturá el log completo;
4. informá archivo, línea y comando que falló.

## Fuente canónica

Dropbox:

`/Javier Corbella/cajaApp-V3`

No usar Google Drive.

La validación local debe ejecutarse sobre la copia sincronizada correspondiente exactamente a ese root. Si el workspace local no corresponde, detenerse y reportarlo.

## Alcance implementado por el arquitecto

- SSOT actualizado;
- diseño de Tarjetas y Deuda futura;
- nuevo calendario mensual común;
- proyección estricta de cuotas importadas;
- compras manuales ancladas a cierre/vencimiento.

Archivos de código:

- `workspace/backend/src/modules/projections/card-billing-calendar.service.ts`
- `workspace/backend/src/modules/projections/installment-projection.service.ts`
- `workspace/backend/src/modules/manual-purchases/manual-purchases.service.ts`

## Validaciones permitidas

### 1. Entorno

Desde `workspace/backend`:

```powershell
node --version
npm --version
```

Node esperado: `v24.18.0`.

### 2. Dependencias

No modificar versiones ni package files.

Ejecutar `npm ci` solamente si `node_modules` no es utilizable o el build informa dependencias faltantes.

### 3. Prisma

```powershell
npm run prisma:generate
```

No crear ni aplicar migraciones: esta entrega no cambia `schema.prisma`.

### 4. Build obligatorio

```powershell
npm run build
```

Debe finalizar con código 0.

### 5. Arranque local obligatorio

```powershell
npm run start
```

Validar:

- el proceso permanece levantado;
- no hay excepción al importar los nuevos servicios;
- el health endpoint configurado responde HTTP 200;
- los logs no contienen errores de Prisma ni errores de módulos.

### 6. Smoke mínimo permitido

Sin cargar ni alterar datos productivos:

- abrir la aplicación local;
- comprobar que la sección Tarjetas carga;
- comprobar que la sección Deuda futura carga;
- no ejecutar Playwright;
- no importar PDFs;
- no crear compras de prueba salvo que exista una base descartable preparada para smoke.

## Tests

No ejecutar la suite completa. No ejecutar `npm run check` porque encadena todos los tests.

Sólo si el build o arranque necesita aislar el nuevo calendario, se permite un test dirigido existente. No crear tests ni modificar código.

## Evidencia requerida

Crear:

`architecture-handoff/agents-to-architect/pending-validation/APP-CARDS-FUTURE-REDESIGN-001-v1.0.0/`

Incluir:

- `environment.log`;
- `prisma-generate.log`;
- `backend-build.log`;
- `backend-startup.log`;
- `health.log`;
- `validation-summary.md`.

## Formato del resultado

`PASS` solamente si:

- Prisma generate pasa;
- build pasa;
- backend levanta;
- health responde 200;
- Tarjetas y Deuda futura abren en smoke mínimo.

En cualquier otro caso: `FAIL`, con evidencia exacta y sin remediación.